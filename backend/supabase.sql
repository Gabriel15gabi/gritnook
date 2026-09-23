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

-- ── 4. Lo que la app puede pedir ─────────────────────────────────────
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
begin
  if not public.es_admin() then
    raise exception 'Solo el creador puede ver el panel' using errcode = '42501';
  end if;
  return json_build_object(
    'hoy', current_date,
    'totales', json_build_object(
      'usuarios', (select count(*) from auth.users),
      'hoy',      (select count(distinct usuario) from public.actividad where dia = current_date),
      'semana',   (select count(distinct usuario) from public.actividad where dia > current_date - 7),
      'mes',      (select count(distinct usuario) from public.actividad where dia > current_date - 30),
      'altas7',   (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'ocupa',    (select coalesce(sum(pg_column_size(datos)), 0) from public.documentos)),
    'dias', (
      select coalesce(json_agg(json_build_object('dia', d.dia, 'altas', coalesce(al.n, 0), 'activos', coalesce(ac.n, 0)) order by d.dia), '[]'::json)
      from (select generate_series(current_date - 29, current_date, interval '1 day')::date as dia) d
      left join (select created_at::date as dia, count(*) as n from auth.users group by 1) al on al.dia = d.dia
      left join (select dia, count(*) as n from public.actividad group by 1) ac on ac.dia = d.dia),
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
revoke all on public.documentos, public.actividad, public.administradores from anon;
revoke all on public.actividad, public.administradores from authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
revoke all on function public.latido(), public.es_admin(), public.panel_admin(), public.borrar_mi_cuenta() from public, anon;
grant execute on function public.latido(), public.es_admin(), public.panel_admin(), public.borrar_mi_cuenta() to authenticated;

-- ── 6. Tú ─────────────────────────────────────────────────────────────
-- El correo con el que te crees la cuenta en la app. Si usas otro,
-- cámbialo aquí y vuelve a pasar solo esta línea.
insert into public.administradores (email) values ('gabriel_gabiz@hotmail.com') on conflict do nothing;
