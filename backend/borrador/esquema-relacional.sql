-- ⚠ NO LO EJECUTES EN SUPABASE. Es un borrador de un diseño relacional
--   (una tabla por cosa) que no usa la app. Choca con el que sí vale,
--   ../supabase.sql: los dos crean una tabla «documentos» distinta.
--   Se queda aquí como idea para más adelante.

-- ════════════════════════════════════════════════════════════════════
--  GritNook · base de datos
--  PostgreSQL (Supabase). Se pega entero en el editor SQL y se ejecuta.
--  Se puede volver a ejecutar sin miedo: todo va con IF NOT EXISTS.
--
--  Dos decisiones que conviene entender antes de leer:
--
--  1. Las claves primarias son TEXT, no UUID. La app ya genera sus
--     propios identificadores con uid() y los usa en el navegador; así
--     lo que ya tiene guardada la gente se puede subir tal cual, sin
--     renumerar nada.
--
--  2. Hay columnas jsonb, y no es pereza. Los dibujos de un apunte o el
--     plan de un examen son documentos de verdad: no se consultan por
--     campos ni se cruzan con otras tablas. Lo que sí es relacional
--     —asignaturas, apartados de nota, entregas, horas— está en tablas
--     como debe ser.
-- ════════════════════════════════════════════════════════════════════


-- ── 1. Perfil ───────────────────────────────────────────────────────
-- Una fila por usuario. La clave es la misma que la de su cuenta, así
-- que no hace falta ni un id propio ni un índice extra.

create table if not exists perfiles (
  id            uuid primary key references auth.users on delete cascade,
  nombre        text        not null default '',
  etapa         text        not null default '',
  curso         text        not null default '',
  rama          text        not null default '',
  ciclo         text        not null default '',
  centro        text        not null default '',
  trabaja       text        not null default 'no',
  horas_semana  int         not null default 12 check (horas_semana between 1 and 60),
  dias_fuertes  text[]      not null default '{}',
  meta          text        not null default 'aprobar',
  objetivo_nota numeric(4,2) not null default 5 check (objetivo_nota between 0 and 10),
  motivo        text        not null default '',
  cuesta_mas    text        not null default '',
  profe         jsonb       not null default '{}'::jsonb,
  edad_ok       boolean     not null default false,
  aceptado      jsonb,                       -- { fecha, v } de los términos
  creado        timestamptz not null default now(),
  editado       timestamptz not null default now()
);

comment on column perfiles.aceptado is
  'Cuándo aceptó los términos y qué versión. Es la prueba del consentimiento.';


-- ── 2. Ajustes ──────────────────────────────────────────────────────
-- Preferencias sueltas (tema, minutos del cronómetro, post-it…). Esto
-- sí es un saco: cambia a menudo y nunca se consulta por campos.

create table if not exists ajustes (
  usuario_id uuid primary key references auth.users on delete cascade,
  config     jsonb       not null default '{}'::jsonb,
  editado    timestamptz not null default now()
);


-- ── 3. Asignaturas y sus apartados de nota ──────────────────────────

create table if not exists modulos (
  id           text primary key,
  usuario_id   uuid not null references auth.users on delete cascade default auth.uid(),
  cod          text not null default '',
  nombre       text not null,
  color        smallint not null default 0,
  color_hex    text,
  horas        int      not null default 0 check (horas >= 0),
  faltas       int      not null default 0 check (faltas >= 0),
  objetivo     numeric(4,2) not null default 5 check (objetivo between 0 and 10),
  meta_semanal int      not null default 2,
  temario      text     not null default '',
  pct_faltas   smallint,                     -- null = el general de ajustes
  orden        int      not null default 0,
  creado       timestamptz not null default now()
);
create index if not exists modulos_usuario on modulos (usuario_id, orden);

-- Cada apartado que puntúa: "Exámenes 60 %", "Prácticas 30 %"…
-- Al borrar la asignatura se van con ella (on delete cascade).
create table if not exists pesos (
  id         text primary key,
  modulo_id  text not null references modulos on delete cascade,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  nombre     text not null default 'Apartado',
  peso       numeric(5,2) not null default 0 check (peso between 0 and 100),
  nota       numeric(4,2) check (nota between 0 and 10),   -- null = aún sin nota
  orden      int  not null default 0
);
create index if not exists pesos_modulo on pesos (modulo_id, orden);


-- ── 4. Agenda ───────────────────────────────────────────────────────
-- Las entregas y los exámenes van separados porque no se parecen: un
-- examen tiene plan de estudio y cuenta atrás; una entrega, estado y
-- pasos. El modulo_id admite null: no todo pertenece a una asignatura.

create table if not exists tareas (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete set null,
  titulo     text not null,
  fecha      date,
  hora       text,
  peso       numeric(5,2),
  hecha      boolean not null default false,
  estado     text    not null default 'pendiente',
  pasos      jsonb   not null default '[]'::jsonb,
  notas      text    not null default '',
  creado     timestamptz not null default now()
);
create index if not exists tareas_usuario_fecha on tareas (usuario_id, fecha);

create table if not exists examenes (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete set null,
  titulo     text not null,
  fecha      date,
  hora       text,
  plan       jsonb not null default '[]'::jsonb,
  notas      text  not null default '',
  creado     timestamptz not null default now()
);
create index if not exists examenes_usuario_fecha on examenes (usuario_id, fecha);

create table if not exists horario (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  dia        text not null check (dia in ('lun','mar','mie','jue','vie','sab','dom')),
  ini        text not null,
  fin        text not null,
  modulo_id  text references modulos on delete cascade,
  aula       text not null default ''
);
create index if not exists horario_usuario on horario (usuario_id, dia, ini);


-- ── 5. Horas de estudio ─────────────────────────────────────────────
-- Minutos por asignatura y día. La clave primaria es la combinación de
-- las tres cosas: no tiene sentido guardar dos filas del mismo día y la
-- misma asignatura, y así el "sumar 25 minutos" es un upsert limpio.

create table if not exists horas (
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text not null references modulos on delete cascade,
  dia        date not null,
  minutos    int  not null default 0 check (minutos >= 0),
  primary key (usuario_id, modulo_id, dia)
);
create index if not exists horas_usuario_dia on horas (usuario_id, dia);


-- ── 6. Apuntes ──────────────────────────────────────────────────────
-- html es lo que se ve; cuerpo es el mismo texto en plano, para buscar
-- y para pasárselo al tutor sin etiquetas. dibujos guarda los trazos.

create table if not exists apuntes (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete set null,
  titulo     text not null default '',
  html       text not null default '',
  cuerpo     text not null default '',
  etiquetas  text[] not null default '{}',
  papel      text not null default 'cuadricula',
  letra      text not null default 'normal',
  dibujos    jsonb not null default '[]'::jsonb,
  creado     timestamptz not null default now(),
  editado    timestamptz not null default now()
);
create index if not exists apuntes_usuario on apuntes (usuario_id, editado desc);
-- Buscar dentro de los apuntes en español, sin tildes ni mayúsculas.
create index if not exists apuntes_texto on apuntes
  using gin (to_tsvector('spanish', coalesce(titulo,'') || ' ' || coalesce(cuerpo,'')));


-- ── 7. Casillero ────────────────────────────────────────────────────
-- Los archivos NO van aquí: van al almacenamiento, y esta tabla guarda
-- dónde están. Meter binarios en la base de datos se paga caro.

create table if not exists documentos (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete set null,
  nombre     text not null,
  tipo       text not null default '',        -- pdf, foto, texto, codigo, enlace
  mime       text not null default '',
  tamano     bigint not null default 0,
  ruta       text,                            -- dónde está el archivo
  enlace     text,                            -- o la dirección, si es un enlace
  miniatura  text,                            -- vista previa pequeña
  creado     timestamptz not null default now()
);
create index if not exists documentos_usuario on documentos (usuario_id, creado desc);


-- ── 8. Repaso e inglés ──────────────────────────────────────────────
-- caja y toca son el repaso espaciado: cuanto más alta la caja, más
-- tarda en volver la tarjeta.

create table if not exists tarjetas (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete set null,
  pregunta   text not null,
  respuesta  text not null default '',
  caja       smallint not null default 1 check (caja between 1 and 6),
  toca       date not null default current_date,
  creado     timestamptz not null default now()
);
create index if not exists tarjetas_usuario_toca on tarjetas (usuario_id, toca);

create table if not exists vocab (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  en         text not null,
  es         text not null default '',
  caja       smallint not null default 1 check (caja between 1 and 6),
  toca       date not null default current_date
);
create index if not exists vocab_usuario_toca on vocab (usuario_id, toca);


-- ── 9. Objetivos del día y progreso ─────────────────────────────────

create table if not exists objetivos (
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  fecha      date not null default current_date,
  lista      jsonb not null default '[]'::jsonb,
  primary key (usuario_id, fecha)
);

-- Una fila cada vez que cambia una nota: así se dibuja la evolución.
create table if not exists progreso (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  modulo_id  text references modulos on delete cascade,
  fecha      date not null default current_date,
  nota       numeric(4,2)
);
create index if not exists progreso_usuario on progreso (usuario_id, fecha);


-- ── 10. El tutor ────────────────────────────────────────────────────
-- Los mensajes van en filas, uno a uno, para poder pedir solo los
-- últimos veinte en vez de traerse la conversación entera cada vez.

create table if not exists tutor_mensajes (
  id         text primary key,
  usuario_id uuid not null references auth.users on delete cascade default auth.uid(),
  rol        text not null check (rol in ('tu','profe')),
  texto      text not null default '',
  adjuntos   jsonb not null default '[]'::jsonb,
  creado     timestamptz not null default now()
);
create index if not exists tutor_usuario_creado on tutor_mensajes (usuario_id, creado desc);

create table if not exists tutor_estado (
  usuario_id uuid primary key references auth.users on delete cascade,
  nombre     text not null default 'Profe',
  temas      text[] not null default '{}',
  repasos    jsonb  not null default '[]'::jsonb,
  avisos     jsonb  not null default '{}'::jsonb
);


-- ════════════════════════════════════════════════════════════════════
--  SEGURIDAD
--
--  Esto es lo más importante del archivo. Row Level Security hace que
--  la propia base de datos filtre por usuario: aunque alguien se lleve
--  la clave pública de la app y consulte a mano, PostgreSQL solo le
--  devuelve sus filas. La seguridad no depende de que el JavaScript
--  pida bien las cosas.
--
--  Sin estas líneas, cualquiera podría leer los apuntes de todos.
-- ════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'perfiles','ajustes','modulos','pesos','tareas','examenes','horario',
    'horas','apuntes','documentos','tarjetas','vocab','objetivos',
    'progreso','tutor_mensajes','tutor_estado'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "cada uno lo suyo" on %I', t);
  end loop;
end $$;

-- En perfiles la columna que identifica al dueño se llama id;
-- en el resto, usuario_id.
create policy "cada uno lo suyo" on perfiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'ajustes','modulos','pesos','tareas','examenes','horario','horas',
    'apuntes','documentos','tarjetas','vocab','objetivos','progreso',
    'tutor_mensajes','tutor_estado'
  ]
  loop
    execute format(
      'create policy "cada uno lo suyo" on %I for all
         using (auth.uid() = usuario_id)
         with check (auth.uid() = usuario_id)', t);
  end loop;
end $$;


-- ── Crear el perfil solo, al registrarse ────────────────────────────
-- Sin esto, un usuario nuevo entraría sin fila en perfiles y la app
-- tendría que apañárselas. security definer es necesario porque el
-- disparador corre antes de que exista la sesión.

create or replace function public.al_registrarse()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id) values (new.id) on conflict do nothing;
  insert into public.ajustes  (usuario_id) values (new.id) on conflict do nothing;
  insert into public.tutor_estado (usuario_id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse
  after insert on auth.users
  for each row execute function public.al_registrarse();


-- ── La fecha de edición, sola ───────────────────────────────────────

create or replace function public.marca_editado()
returns trigger language plpgsql as $$
begin new.editado = now(); return new; end $$;

drop trigger if exists apuntes_editado on apuntes;
create trigger apuntes_editado before update on apuntes
  for each row execute function public.marca_editado();

drop trigger if exists perfiles_editado on perfiles;
create trigger perfiles_editado before update on perfiles
  for each row execute function public.marca_editado();


-- ════════════════════════════════════════════════════════════════════
--  ARCHIVOS DEL CASILLERO
--  Un cubo privado. Cada usuario guarda dentro de una carpeta con su
--  identificador, y las reglas solo le dejan entrar en la suya.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit)
values ('casillero', 'casillero', false, 20971520)   -- 20 MB
on conflict (id) do nothing;

drop policy if exists "sus archivos" on storage.objects;
create policy "sus archivos" on storage.objects
  for all
  using (bucket_id = 'casillero' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'casillero' and (storage.foldername(name))[1] = auth.uid()::text);
