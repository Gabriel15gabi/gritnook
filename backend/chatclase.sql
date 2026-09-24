-- ════════════════════════════════════════════════════════════════════
-- ChatClase: el chat de todos los que usan GritNook.
--
-- NO hace falta pasarlo para lanzar la app: el chat sale «Próximamente».
-- Se pega en Supabase → SQL Editor → Run el día que se encienda, DESPUÉS
-- de supabase.sql (usa su función es_admin). Se puede pasar varias veces.
--
-- Cómo está pensado, porque aquí escriben menores de edad:
--   · Solo canales públicos. No hay mensajes privados entre usuarios.
--   · Nadie enseña su correo ni su foto: solo un apodo que elige al entrar,
--     y para entrar hay que aceptar las normas.
--   · Cada mensaje es de quien lo escribe: nadie firma por otro, nadie edita
--     lo de otro. Borrar es un «borrado» que vacía el mensaje para todos.
--   · Cualquiera puede reportar un mensaje; el creador ve los reportes, borra
--     lo que haga falta y puede dejar a alguien sin chat un tiempo.
--   · Tope de velocidad (5 mensajes cada 10 segundos) y de tamaño.
-- La seguridad está aquí: aunque alguien toque la app, Postgres no le deja
-- saltarse nada de esto.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Canales ───────────────────────────────────────────────────────
create table if not exists public.chat_canales (
  id          text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  nombre      text not null check (char_length(nombre) between 2 and 40),
  descripcion text not null default '' check (char_length(descripcion) <= 160),
  orden       int  not null default 0,
  solo_admin  boolean not null default false
);
insert into public.chat_canales (id, nombre, descripcion, orden, solo_admin) values
  ('anuncios',       'Anuncios',            'Novedades de GritNook',                          0, true),
  ('general',        'General',             'Para hablar de todo un poco',                    1, false),
  ('presentaciones', 'Preséntate',          'Quién eres, qué estudias y cómo lo compaginas',  2, false),
  ('dudas',          'Dudas',               'Pregunta lo que no entiendas',                   3, false),
  ('tareas',         'Tareas',              'Comparte lo que has hecho y lo que te queda',     4, false),
  ('eso-bach',       'ESO y Bachillerato',  'Para quien está en el instituto',                5, false),
  ('fp',             'FP',                  'Ciclos medios y superiores',                     6, false),
  ('universidad',    'Universidad',         'Grados y másteres',                              7, false),
  ('oposiciones',    'Oposiciones',         'Temarios, simulacros y ánimo',                   8, false),
  ('idiomas',        'Idiomas',             'Inglés y los demás',                             9, false),
  ('estudiar-y-trabajar', 'Estudiar y trabajar', 'Para quien saca horas de donde no hay',     10, false),
  ('ideas',          'Ideas para GritNook', 'Qué mejorarías de la app',                       11, false)
on conflict (id) do nothing;

-- ── 2. Quién eres en el chat: un apodo, y las normas aceptadas ────────
create table if not exists public.chat_perfiles (
  usuario uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  apodo   text not null check (char_length(btrim(apodo)) between 2 and 24 and apodo !~ '[<>@#]'),
  normas  timestamptz not null default now(),
  creado  timestamptz not null default now()
);

-- ── 3. Los mensajes ──────────────────────────────────────────────────
create table if not exists public.chat_mensajes (
  id          uuid primary key default gen_random_uuid(),
  canal       text not null references public.chat_canales (id) on delete cascade,
  -- al perfil del chat: sin apodo y normas aceptadas no se escribe
  autor       uuid not null default auth.uid() references public.chat_perfiles (usuario) on delete cascade,
  texto       text not null default '' check (char_length(texto) <= 2000),
  respuesta_a uuid references public.chat_mensajes (id) on delete set null,
  tarea       jsonb check (tarea is null or (jsonb_typeof(tarea) = 'object' and pg_column_size(tarea) <= 2048)),
  adjuntos    jsonb not null default '[]'::jsonb
              check (jsonb_typeof(adjuntos) = 'array' and jsonb_array_length(adjuntos) <= 4 and pg_column_size(adjuntos) <= 4096),
  fijado      boolean not null default false,
  borrado     boolean not null default false,
  editado     timestamptz,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  constraint chat_no_vacio check (borrado or char_length(btrim(texto)) > 0 or tarea is not null or jsonb_array_length(adjuntos) > 0)
);
create index if not exists chat_mensajes_canal_creado on public.chat_mensajes (canal, creado desc);
create index if not exists chat_mensajes_canal_actualizado on public.chat_mensajes (canal, actualizado);
create index if not exists chat_mensajes_autor_creado on public.chat_mensajes (autor, creado desc);

create table if not exists public.chat_reacciones (
  mensaje uuid not null references public.chat_mensajes (id) on delete cascade,
  usuario uuid not null default auth.uid() references public.chat_perfiles (usuario) on delete cascade,
  emoji   text not null check (char_length(emoji) between 1 and 16),
  creado  timestamptz not null default now(),
  primary key (mensaje, usuario, emoji)
);

create table if not exists public.chat_reportes (
  id      bigint generated always as identity primary key,
  mensaje uuid not null references public.chat_mensajes (id) on delete cascade,
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  motivo  text not null check (char_length(motivo) between 1 and 500),
  creado  timestamptz not null default now(),
  unique (mensaje, usuario)
);

create table if not exists public.chat_baneados (
  usuario uuid primary key references auth.users (id) on delete cascade,
  hasta   timestamptz not null,
  motivo  text not null default '',
  creado  timestamptz not null default now()
);

-- ── 4. Las reglas que no se pueden saltar ────────────────────────────
-- ¿Tengo el chat bloqueado? (la tabla de bloqueos no la lee nadie más)
create or replace function public.chat_baneado() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.chat_baneados b where b.usuario = auth.uid() and b.hasta > now());
$$;

create or replace function public.chat_antes_de_escribir() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  yo uuid := auth.uid();
  a  jsonb;
begin
  if tg_op = 'INSERT' then
    new.autor := yo;                                   -- nadie firma por otro
    new.creado := now(); new.actualizado := now();
    new.fijado := false; new.borrado := false; new.editado := null;
    if public.chat_baneado() then
      raise exception 'No puedes escribir en ChatClase por ahora' using errcode = '42501', hint = 'chat_baneado';
    end if;
    if exists (select 1 from public.chat_canales c where c.id = new.canal and c.solo_admin) and not public.es_admin() then
      raise exception 'En este canal solo escribe el equipo de GritNook' using errcode = '42501', hint = 'chat_solo_admin';
    end if;
    if (select count(*) from public.chat_mensajes m where m.autor = yo and m.creado > now() - interval '10 seconds') >= 5 then
      raise exception 'Vas muy rápido: espera unos segundos' using errcode = 'P0001', hint = 'chat_despacio';
    end if;
    if new.respuesta_a is not null and not exists (
      select 1 from public.chat_mensajes m where m.id = new.respuesta_a and m.canal = new.canal) then
      raise exception 'Solo se responde a mensajes del mismo canal' using errcode = '22023';
    end if;
    -- cada adjunto, de su carpeta: nadie enlaza archivos de otro
    for a in select * from jsonb_array_elements(new.adjuntos) loop
      if jsonb_typeof(a) <> 'object'
         or coalesce(a ->> 'ruta', '') !~ ('^' || yo::text || '/[A-Za-z0-9._-]{1,120}$')
         or char_length(coalesce(a ->> 'nombre', '')) not between 1 and 140
         or coalesce(a ->> 'tipo', '') !~ '^[a-z]+/[a-z0-9.+-]{1,80}$' then
        raise exception 'Adjunto no válido' using errcode = '22023';
      end if;
    end loop;
    if new.tarea is not null and (
         char_length(coalesce(new.tarea ->> 'titulo', '')) not between 1 and 120
      or coalesce(new.tarea ->> 'tipo', '') not in ('entrega', 'examen')
      or jsonb_typeof(new.tarea -> 'hecha') is distinct from 'boolean') then
      raise exception 'Tarea no válida' using errcode = '22023';
    end if;
  else
    -- al editar solo cambia el texto (lo demás lo protegen los permisos)
    new.actualizado := now();
    if new.texto is distinct from old.texto and not new.borrado then new.editado := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists chat_mensajes_reglas on public.chat_mensajes;
create trigger chat_mensajes_reglas before insert or update on public.chat_mensajes
  for each row execute function public.chat_antes_de_escribir();

-- una reacción nueva o quitada «toca» el mensaje, para que los demás se enteren
create or replace function public.chat_tocar_mensaje() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_mensajes set actualizado = now()
   where id = coalesce(new.mensaje, old.mensaje);
  return null;
end $$;
drop trigger if exists chat_reacciones_tocan on public.chat_reacciones;
create trigger chat_reacciones_tocan after insert or delete on public.chat_reacciones
  for each row execute function public.chat_tocar_mensaje();

-- ── 5. Quién ve y quién toca ─────────────────────────────────────────
alter table public.chat_canales    enable row level security;
alter table public.chat_perfiles   enable row level security;
alter table public.chat_mensajes   enable row level security;
alter table public.chat_reacciones enable row level security;
alter table public.chat_reportes   enable row level security;
alter table public.chat_baneados   enable row level security;

drop policy if exists "leer canales" on public.chat_canales;
create policy "leer canales" on public.chat_canales for select to authenticated using (true);

drop policy if exists "leer apodos" on public.chat_perfiles;
create policy "leer apodos" on public.chat_perfiles for select to authenticated using (true);
drop policy if exists "mi apodo" on public.chat_perfiles;
create policy "mi apodo" on public.chat_perfiles for all to authenticated
  using ((select auth.uid()) = usuario) with check ((select auth.uid()) = usuario);

drop policy if exists "leer mensajes" on public.chat_mensajes;
create policy "leer mensajes" on public.chat_mensajes for select to authenticated using (true);
drop policy if exists "escribir los mios" on public.chat_mensajes;
create policy "escribir los mios" on public.chat_mensajes for insert to authenticated
  with check ((select auth.uid()) = autor);
drop policy if exists "editar los mios" on public.chat_mensajes;
create policy "editar los mios" on public.chat_mensajes for update to authenticated
  using ((select auth.uid()) = autor and not borrado) with check ((select auth.uid()) = autor);

drop policy if exists "leer reacciones" on public.chat_reacciones;
create policy "leer reacciones" on public.chat_reacciones for select to authenticated using (true);
drop policy if exists "mis reacciones" on public.chat_reacciones;
create policy "mis reacciones" on public.chat_reacciones for insert to authenticated with check ((select auth.uid()) = usuario);
drop policy if exists "quitar mis reacciones" on public.chat_reacciones;
create policy "quitar mis reacciones" on public.chat_reacciones for delete to authenticated using ((select auth.uid()) = usuario);

drop policy if exists "reportar" on public.chat_reportes;
create policy "reportar" on public.chat_reportes for insert to authenticated with check ((select auth.uid()) = usuario);
-- chat_baneados: sin políticas. Solo se toca desde las funciones de abajo.

revoke all on public.chat_canales, public.chat_perfiles, public.chat_mensajes, public.chat_reacciones,
  public.chat_reportes, public.chat_baneados from anon, authenticated;
grant select on public.chat_canales, public.chat_perfiles, public.chat_mensajes, public.chat_reacciones to authenticated;
grant insert (apodo, normas), update (apodo, normas), delete on public.chat_perfiles to authenticated;
-- de un mensaje solo se escribe esto; y al editar, solo el texto
grant insert (id, canal, texto, respuesta_a, tarea, adjuntos) on public.chat_mensajes to authenticated;
grant update (texto) on public.chat_mensajes to authenticated;
grant insert (mensaje, emoji), delete on public.chat_reacciones to authenticated;
grant insert (mensaje, motivo) on public.chat_reportes to authenticated;

-- ── 6. Lo que la app puede pedir ─────────────────────────────────────
-- Cómo están los canales para mí: el último mensaje de cada uno, si soy
-- el creador y si tengo el chat bloqueado.
create or replace function public.chat_estado() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'canales', (select coalesce(json_agg(json_build_object('canal', c.id, 'ultimo',
                  (select max(m.creado) from public.chat_mensajes m where m.canal = c.id and not m.borrado)) order by c.orden), '[]'::json)
                from public.chat_canales c),
    'baneado', (select b.hasta from public.chat_baneados b where b.usuario = auth.uid() and b.hasta > now()),
    'admin', public.es_admin());
$$;

-- Borrar un mensaje: el tuyo, o cualquiera si eres el creador. Se vacía
-- para todos y queda la marca de «mensaje borrado».
create or replace function public.chat_borrar(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.chat_mensajes m where m.id = p_id and (m.autor = auth.uid() or public.es_admin())) then
    raise exception 'Ese mensaje no lo puedes borrar' using errcode = '42501';
  end if;
  update public.chat_mensajes
     set borrado = true, texto = '', adjuntos = '[]'::jsonb, tarea = null, fijado = false
   where id = p_id;
  delete from public.chat_reacciones where mensaje = p_id;
end $$;

-- Fijar un mensaje arriba del canal (solo el creador)
create or replace function public.chat_fijar(p_id uuid, p_si boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el creador fija mensajes' using errcode = '42501'; end if;
  update public.chat_mensajes set fijado = p_si where id = p_id and not borrado;
end $$;

-- Dejar a alguien sin chat unas horas (solo el creador). 0 horas lo levanta.
create or replace function public.chat_banear(p_usuario uuid, p_horas int, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el creador bloquea' using errcode = '42501'; end if;
  if p_horas <= 0 then delete from public.chat_baneados where usuario = p_usuario; return; end if;
  insert into public.chat_baneados (usuario, hasta, motivo)
  values (p_usuario, now() + make_interval(hours => least(p_horas, 24 * 365)), left(coalesce(p_motivo, ''), 300))
  on conflict (usuario) do update set hasta = excluded.hasta, motivo = excluded.motivo;
end $$;

-- Los reportes, con el mensaje y los apodos (solo el creador)
create or replace function public.chat_reportes_ver() returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el creador ve los reportes' using errcode = '42501'; end if;
  return (select coalesce(json_agg(json_build_object(
      'id', r.id, 'motivo', r.motivo, 'creado', r.creado, 'mensaje', m.id, 'canal', m.canal,
      'texto', m.texto, 'borrado', m.borrado, 'autor', m.autor, 'apodo', pa.apodo, 'quien', pr.apodo) order by r.creado desc), '[]'::json)
    from public.chat_reportes r
    join public.chat_mensajes m on m.id = r.mensaje
    left join public.chat_perfiles pa on pa.usuario = m.autor
    left join public.chat_perfiles pr on pr.usuario = r.usuario);
end $$;

revoke all on function public.chat_baneado(), public.chat_estado(), public.chat_borrar(uuid), public.chat_fijar(uuid, boolean),
  public.chat_banear(uuid, int, text), public.chat_reportes_ver(),
  public.chat_antes_de_escribir(), public.chat_tocar_mensaje() from public, anon;
grant execute on function public.chat_baneado(), public.chat_estado(), public.chat_borrar(uuid), public.chat_fijar(uuid, boolean),
  public.chat_banear(uuid, int, text), public.chat_reportes_ver() to authenticated;

-- ── 7. Los archivos adjuntos ─────────────────────────────────────────
-- Un cajón privado: solo lo ve quien tiene cuenta, cada uno sube a su
-- carpeta y borra lo suyo (el creador, cualquiera). 10 MB y tipos contados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-adjuntos', 'chat-adjuntos', false, 10485760, array[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation', 'application/msword', 'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint', 'application/zip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat: leer adjuntos" on storage.objects;
create policy "chat: leer adjuntos" on storage.objects for select to authenticated
  using (bucket_id = 'chat-adjuntos');
drop policy if exists "chat: subir a mi carpeta" on storage.objects;
create policy "chat: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-adjuntos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and not public.chat_baneado());
drop policy if exists "chat: borrar lo mio" on storage.objects;
create policy "chat: borrar lo mio" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-adjuntos'
    and ((storage.foldername(name))[1] = (select auth.uid()::text) or public.es_admin()));
