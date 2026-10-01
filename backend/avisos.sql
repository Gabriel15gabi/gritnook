-- ════════════════════════════════════════════════════════════════════
-- GritNook: los avisos con la app cerrada.
--
-- Se pega entero en Supabase → SQL Editor → New query → Run, después de
-- supabase.sql. Se puede volver a pasar: no borra nada.
--
-- La app decide QUÉ avisar y CUÁNDO (exámenes, entregas, plazos de la
-- oposición, el final del cronómetro…) y lo deja en «avisos»; cada minuto,
-- si alguno ya toca, la base de datos llama a la función «avisos», que lo
-- manda cifrado a los dispositivos que cada uno ha apuntado. Nadie más los
-- ve: ni otros usuarios ni el panel del creador.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Los dispositivos de cada uno ─────────────────────────────────
-- La dirección que da el navegador para mandarle avisos, y sus dos claves
-- públicas (el aviso va cifrado para ese dispositivo y nadie más).
create table if not exists public.push_suscripciones (
  endpoint text        primary key check (endpoint ~ '^https://' and length(endpoint) < 1000),
  usuario  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh   text        not null check (length(p256dh) between 40 and 200),
  auth     text        not null check (length(auth) between 10 and 100),
  creado   timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
drop policy if exists "cada uno los suyos" on public.push_suscripciones;
create policy "cada uno los suyos" on public.push_suscripciones for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

-- ── 2. Lo que hay que avisar ────────────────────────────────────────
create table if not exists public.avisos (
  usuario uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  clave   text        not null check (clave ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  cuando  timestamptz not null,
  titulo  text        not null check (length(titulo) between 1 and 120),
  cuerpo  text        not null default '' check (length(cuerpo) <= 300),
  url     text        not null default './' check (length(url) <= 200),
  enviado timestamptz,
  primary key (usuario, clave)
);
create index if not exists avisos_pendientes on public.avisos (cuando) where enviado is null;
alter table public.avisos enable row level security;
drop policy if exists "cada uno los suyos" on public.avisos;
create policy "cada uno los suyos" on public.avisos for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

-- La app manda su lista entera cada vez que cambia algo: lo que aún no se
-- había mandado se sustituye; lo ya mandado no se repite. Solo entra lo de
-- los próximos 40 días, y como mucho 200.
create or replace function public.programar_avisos(lista jsonb) returns integer
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sin sesión'; end if;
  delete from public.avisos where usuario = auth.uid() and enviado is null;
  insert into public.avisos (usuario, clave, cuando, titulo, cuerpo, url)
  select auth.uid(), s.clave, s.cuando, s.titulo, s.cuerpo, s.url
  from (
    select distinct on (x->>'clave')
      x->>'clave' as clave, (x->>'cuando')::timestamptz as cuando,
      left(x->>'titulo', 120) as titulo, left(coalesce(x->>'cuerpo', ''), 300) as cuerpo, left(coalesce(x->>'url', './'), 200) as url
    from jsonb_array_elements(case when jsonb_typeof(lista) = 'array' then lista else '[]'::jsonb end) as x
    where coalesce(x->>'clave', '') ~ '^[A-Za-z0-9_.:-]{1,100}$' and coalesce(x->>'titulo', '') <> ''
      and coalesce(x->>'cuando', '') ~ '^\d{4}-\d{2}-\d{2}T'
    order by x->>'clave'
  ) s
  where s.cuando between now() - interval '5 minutes' and now() + interval '40 days'
  limit 200
  on conflict (usuario, clave) do update
    set cuando = excluded.cuando, titulo = excluded.titulo, cuerpo = excluded.cuerpo, url = excluded.url
    where public.avisos.enviado is null;
  get diagnostics n = row_count;
  -- lo ya mandado se guarda una semana (para no repetirlo) y luego se va
  delete from public.avisos where usuario = auth.uid() and enviado < now() - interval '7 days';
  return n;
end $$;
revoke all on function public.programar_avisos(jsonb) from public, anon;
grant execute on function public.programar_avisos(jsonb) to authenticated;

-- ── 3. Lo que solo ve el servidor ───────────────────────────────────
-- Las claves con las que el servidor firma los avisos (las crea la propia
-- función la primera vez: nadie las copia a mano) y la contraseña con la
-- que el reloj de la base de datos llama a la función. Sin políticas:
-- ni la app ni nadie con sesión puede leerla.
create table if not exists public.servidor_privado (clave text primary key, valor text not null);
alter table public.servidor_privado enable row level security;
revoke all on public.servidor_privado from anon, authenticated;
insert into public.servidor_privado (clave, valor)
  values ('cron', encode(sha256((random()::text || clock_timestamp()::text || random()::text)::bytea), 'hex'))
  on conflict (clave) do nothing;

-- la clave pública sí la necesita la app, para apuntar el dispositivo
create or replace function public.push_clave_publica() returns text
language sql stable security definer set search_path = '' as $$
  select valor from public.servidor_privado where clave = 'vapid_publica'
$$;
revoke all on function public.push_clave_publica() from public;
grant execute on function public.push_clave_publica() to anon, authenticated;

-- ── 4. El reloj: cada minuto, si hay algo que mandar, llama a la función ──
-- Necesita las extensiones pg_cron y pg_net. Si estas dos líneas dan error,
-- actívalas en Database → Extensions y vuelve a pasar este archivo.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('gritnook-avisos') where exists (select 1 from cron.job where jobname = 'gritnook-avisos');
select cron.schedule('gritnook-avisos', '* * * * *', $cron$
  select net.http_post(
    url := 'https://rbdcjatjslbeljzlpkhv.supabase.co/functions/v1/avisos',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron', (select valor from public.servidor_privado where clave = 'cron')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000)
  where exists (select 1 from public.avisos where enviado is null and cuando <= now() + interval '30 seconds')
     or not exists (select 1 from public.servidor_privado where clave = 'vapid_publica');
$cron$);
