-- ════════════════════════════════════════════════════════════════════
-- GritNook en Supabase: las cuentas, los datos de cada uno y tu panel.
--
-- Se pega entero en Supabase → SQL Editor → New query → Run.
-- Se puede volver a pasar las veces que haga falta: no borra datos.
--
-- La seguridad está aquí, en la base de datos, y no en la app: aunque
-- alguien toque el código de la página, Postgres no le deja leer ni
-- escribir lo que no es suyo, ni ver el panel si no eres tú.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Los datos de cada usuario ─────────────────────────────────────
-- Los mismos documentos que la app ya guarda: «escritorio/perfil»,
-- «escritorio/agenda», «apuntes/<id>», «casillero/<id>»… Cada fila es
-- de un usuario, y solo de él.
create table if not exists public.documentos (
  usuario     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  clave       text        not null,
  datos       jsonb       not null,
  actualizado timestamptz not null default now(),
  primary key (usuario, clave),
  constraint documentos_clave check (clave ~ '^(escritorio|apuntes|casillero)/[A-Za-z0-9_-]{1,80}$'),
  -- tope por documento: un apunte con dibujos o una foto del casillero caben de sobra
  constraint documentos_tamano check (pg_column_size(datos) <= 1048576)
);

-- la hora de cada cambio la pone el servidor, no el reloj del móvil
create or replace function public.tocar_actualizado() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  return new;
end $$;
drop trigger if exists documentos_actualizado on public.documentos;
create trigger documentos_actualizado before insert or update on public.documentos
  for each row execute function public.tocar_actualizado();

alter table public.documentos enable row level security;
drop policy if exists "cada uno lo suyo" on public.documentos;
create policy "cada uno lo suyo" on public.documentos for all to authenticated
  using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);

-- ── 2. Cuándo entra cada uno ─────────────────────────────────────────
-- Un apunte por usuario y día: sirve para saber cuántos la usan y cuánto.
-- Nadie la lee ni la escribe directamente: solo la función latido().
create table if not exists public.actividad (
  usuario uuid        not null references auth.users (id) on delete cascade,
  dia     date        not null default current_date,
  veces   int         not null default 1,
  ultima  timestamptz not null default now(),
  primary key (usuario, dia)
);
alter table public.actividad enable row level security;

-- ── 3. Quién ve el panel del creador ─────────────────────────────────
create table if not exists public.administradores (email text primary key);
alter table public.administradores enable row level security;

-- ── 3b. Las estadísticas del fundador, sin saber quién es nadie ───────
-- Cada vez que alguien abre la app se suma 1 a un contador del día y la
-- hora, con de dónde llega el enlace (Instagram, WhatsApp…), si es un móvil
-- o un ordenador y si la tiene instalada. No se guarda la IP, ni un
-- identificador, ni nada que permita seguir a una persona: solo cuentas.
create table if not exists public.visitas (
  dia         date     not null,
  hora        smallint not null check (hora between 0 and 23),
  origen      text     not null check (origen in ('instagram','tiktok','whatsapp','facebook','x','youtube','telegram','google','directo','app','otro')),
  dispositivo text     not null check (dispositivo in ('movil','tablet','ordenador')),
  instalada   boolean  not null,
  veces       int      not null default 1,
  primary key (dia, hora, origen, dispositivo, instalada)
);
alter table public.visitas enable row level security;

-- De dónde llegó cada cuenta: se apunta una vez, al crearla
create table if not exists public.origenes (
  usuario     uuid        primary key references auth.users (id) on delete cascade,
  origen      text        not null check (origen in ('instagram','tiktok','whatsapp','facebook','x','youtube','telegram','google','directo','app','otro')),
  dispositivo text        not null check (dispositivo in ('movil','tablet','ordenador')),
  creado      timestamptz not null default now()
);
alter table public.origenes enable row level security;

-- ── 4. Lo que la app puede pedir ─────────────────────────────────────
-- «Se ha abierto la app»: lo puede decir cualquiera, con cuenta o sin ella.
-- Lo que no es de la lista se cuenta como «otro»: así nadie mete basura.
create or replace function public.contar_visita(p_origen text, p_dispositivo text, p_instalada boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare ahora timestamp := now() at time zone 'Europe/Madrid';
begin
  insert into public.visitas (dia, hora, origen, dispositivo, instalada)
  values (ahora::date, extract(hour from ahora)::smallint,
          case when p_origen in ('instagram','tiktok','whatsapp','facebook','x','youtube','telegram','google','directo','app','otro') then p_origen else 'otro' end,
          case when p_dispositivo in ('movil','tablet','ordenador') then p_dispositivo else 'ordenador' end,
          coalesce(p_instalada, false))
  on conflict (dia, hora, origen, dispositivo, instalada) do update set veces = public.visitas.veces + 1;
end $$;

-- «Llegué desde aquí»: una vez por cuenta, la primera
create or replace function public.apuntar_origen(p_origen text, p_dispositivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.origenes (usuario, origen, dispositivo)
  values (auth.uid(),
          case when p_origen in ('instagram','tiktok','whatsapp','facebook','x','youtube','telegram','google','directo','app','otro') then p_origen else 'otro' end,
          case when p_dispositivo in ('movil','tablet','ordenador') then p_dispositivo else 'ordenador' end)
  on conflict (usuario) do nothing;
end $$;

-- «He entrado hoy»
create or replace function public.latido() returns void
language sql security definer set search_path = '' as $$
  insert into public.actividad (usuario, dia) values (auth.uid(), current_date)
  on conflict (usuario, dia) do update
    set veces = public.actividad.veces + 1, ultima = now();
$$;

-- ¿Soy el creador?
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.administradores a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid());
$$;

-- El panel: cuántos hay, cuántos entran y quién es cada uno. Solo para el
-- creador. Ni notas, ni apuntes, ni nada de lo que escriben: solo el
-- correo, cuándo se apuntaron, cuándo entran, qué estudian y cuánto ocupan.
create or replace function public.panel_admin() returns json
language plpgsql stable security definer set search_path = '' as $$
declare hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if not public.es_admin() then
    raise exception 'Solo el creador puede ver el panel' using errcode = '42501';
  end if;
  return json_build_object(
    'hoy', hoy,
    'ahora', (select count(distinct usuario) from public.actividad where ultima > now() - interval '1 hour'),
    'totales', json_build_object(
      'usuarios', (select count(*) from auth.users),
      'hoy',      (select count(distinct usuario) from public.actividad where dia = current_date),
      'semana',   (select count(distinct usuario) from public.actividad where dia > current_date - 7),
      'mes',      (select count(distinct usuario) from public.actividad where dia > current_date - 30),
      'altas7',   (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'altas30',  (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'ocupa',    (select coalesce(sum(pg_column_size(datos)), 0) from public.documentos)),
    'visitas', json_build_object(
      'hoy',        (select coalesce(sum(veces), 0) from public.visitas where dia = hoy),
      'semana',     (select coalesce(sum(veces), 0) from public.visitas where dia > hoy - 7),
      'mes',        (select coalesce(sum(veces), 0) from public.visitas where dia > hoy - 30),
      'instaladas', (select coalesce(sum(veces), 0) from public.visitas where dia > hoy - 30 and instalada),
      'origen', (select coalesce(json_agg(json_build_object('origen', o.origen, 'n', o.n) order by o.n desc), '[]'::json)
                 from (select origen, sum(veces) as n from public.visitas where dia > hoy - 30 group by origen) o),
      'dispositivo', (select coalesce(json_agg(json_build_object('dispositivo', o.dispositivo, 'n', o.n) order by o.n desc), '[]'::json)
                 from (select dispositivo, sum(veces) as n from public.visitas where dia > hoy - 30 group by dispositivo) o),
      'hora', (select json_agg(coalesce(v.n, 0) order by g.h)
               from generate_series(0, 23) as g(h)
               left join (select hora, sum(veces) as n from public.visitas where dia > hoy - 30 group by hora) v on v.hora = g.h)),
    'altasOrigen', (select coalesce(json_agg(json_build_object('origen', o.origen, 'n', o.n) order by o.n desc), '[]'::json)
                    from (select origen, count(*) as n from public.origenes group by origen) o),
    'etapas', (select coalesce(json_agg(json_build_object('etapa', e.etapa, 'n', e.n) order by e.n desc), '[]'::json)
               from (select coalesce(nullif(d.datos -> 'perfil' ->> 'etapa', ''), '') as etapa, count(*) as n
                     from auth.users us left join public.documentos d on d.usuario = us.id and d.clave = 'escritorio/perfil'
                     group by 1) e),
    'retencion', json_build_object(
      'base',    (select count(*) from auth.users where created_at::date < current_date),
      'vuelven', (select count(*) from auth.users us where us.created_at::date < current_date
                   and exists (select 1 from public.actividad a where a.usuario = us.id and a.dia > us.created_at::date)),
      'base7',   (select count(*) from auth.users where created_at::date <= current_date - 7),
      'semana2', (select count(*) from auth.users us where us.created_at::date <= current_date - 7
                   and exists (select 1 from public.actividad a where a.usuario = us.id and a.dia >= us.created_at::date + 7))),
    'dias', (
      select coalesce(json_agg(json_build_object('dia', d.dia, 'altas', coalesce(al.n, 0), 'activos', coalesce(ac.n, 0), 'visitas', coalesce(vi.n, 0)) order by d.dia), '[]'::json)
      from (select generate_series(current_date - 29, current_date, interval '1 day')::date as dia) d
      left join (select created_at::date as dia, count(*) as n from auth.users group by 1) al on al.dia = d.dia
      left join (select dia, count(*) as n from public.actividad group by 1) ac on ac.dia = d.dia
      left join (select dia, sum(veces) as n from public.visitas group by 1) vi on vi.dia = d.dia),
    'usuarios', (
      select coalesce(json_agg(u order by u.ultimo desc nulls last, u.alta desc), '[]'::json)
      from (
        select us.email,
               us.created_at as alta,
               (select max(a.dia) from public.actividad a where a.usuario = us.id) as ultimo,
               (select count(*) from public.actividad a where a.usuario = us.id and a.dia > current_date - 7) as dias7,
               (select count(*) from public.actividad a where a.usuario = us.id and a.dia > current_date - 30) as dias30,
               (select coalesce(sum(a.veces), 0) from public.actividad a where a.usuario = us.id) as veces,
               (select d.datos -> 'perfil' ->> 'etapa' from public.documentos d
                 where d.usuario = us.id and d.clave = 'escritorio/perfil') as etapa,
               (select o.origen from public.origenes o where o.usuario = us.id) as origen,
               (select coalesce(sum(pg_column_size(d.datos)), 0) from public.documentos d where d.usuario = us.id) as ocupa
        from auth.users us) u));
end $$;

-- Borrar mi cuenta: se va el usuario y, en cascada, todos sus datos
create or replace function public.borrar_mi_cuenta() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

-- ── 5. Quién puede qué ───────────────────────────────────────────────
-- Sin cuenta no se toca nada. Con cuenta, solo tus documentos y estas
-- cuatro funciones.
revoke all on public.documentos, public.actividad, public.administradores, public.visitas, public.origenes from anon;
revoke all on public.actividad, public.administradores, public.visitas, public.origenes from authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
revoke all on function public.latido(), public.es_admin(), public.panel_admin(), public.borrar_mi_cuenta(),
  public.contar_visita(text, text, boolean), public.apuntar_origen(text, text) from public, anon;
grant execute on function public.latido(), public.es_admin(), public.panel_admin(), public.borrar_mi_cuenta(),
  public.apuntar_origen(text, text) to authenticated;
-- contar una visita no pide cuenta: también cuenta quien aún no se ha apuntado
grant execute on function public.contar_visita(text, text, boolean) to anon, authenticated;

-- ── 6. Tú ─────────────────────────────────────────────────────────────
-- El correo con el que te crees la cuenta en la app. Si usas otro,
-- cámbialo aquí y vuelve a pasar solo esta línea.
insert into public.administradores (email) values ('gabriel_gabiz@hotmail.com') on conflict do nothing;
