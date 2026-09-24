/* Prueba backend/chatclase.sql contra un Postgres 16 de verdad (PGlite),
   montado encima de supabase.sql como en Supabase. Imita lo que Supabase
   trae de serie: el esquema auth, auth.uid() leyendo el token, los roles
   anon y authenticated, y el almacenamiento de archivos (storage).

   Para pasarla:
     npm i --no-save @electric-sql/pglite
     node backend/probar-chat.js */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("fs");
const BASE = fs.readFileSync(__dirname + "/supabase.sql", "utf8");
const CHAT = fs.readFileSync(__dirname + "/chatclase.sql", "utf8");

let ok = 0, mal = 0;
const prueba = async (nombre, fn) => {
  try { await fn(); ok++; console.log("  ✓ " + nombre); }
  catch (e) { mal++; console.log("  ✗ " + nombre + "\n      " + e.message); }
};
const esperar = (v, msg) => { if (!v) throw new Error(msg || "no se cumple"); };

(async () => {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
    -- lo mínimo del almacenamiento de Supabase
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid());
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, delete on storage.objects to authenticated;
    grant execute on function storage.foldername(text) to authenticated;
  `);
  await db.exec(BASE);
  await db.exec(CHAT);
  await db.exec(CHAT);
  console.log("El chat entra encima de lo de siempre, y entra dos veces.");

  const [ana, bea, gab] = (await db.query(`insert into auth.users (email) values
    ('ana@ejemplo.es'), ('bea@ejemplo.es'), ('Gabriel_Gabiz@hotmail.com') returning id`)).rows.map(r => r.id);
  const como = async (uid, sql, params) => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    await db.exec(uid ? "set role authenticated" : "set role anon");
    try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
  };
  const falla = async (fn, patron) => {
    let error = null;
    try { await fn(); } catch (e) { error = e; }
    if (!error) throw new Error("tenía que fallar y no ha fallado");
    if (patron && !patron.test(error.message)) throw new Error("falla, pero por otra cosa: " + error.message);
  };
  const escribe = (uid, canal, texto, extra = "") => como(uid,
    `insert into public.chat_mensajes (canal, texto${extra ? ", " + extra.split("=")[0] : ""}) values ($1, $2${extra ? ", " + extra.split("=").slice(1).join("=") : ""}) returning id`, [canal, texto]);
  /* el tope de velocidad cuenta los últimos 10 s: para no tropezar con él entre pruebas */
  const envejecer = () => db.query("update public.chat_mensajes set creado = creado - interval '1 minute'");

  console.log("\nEntrar al chat");
  await prueba("sin apodo ni normas aceptadas no se escribe", async () => {
    await falla(() => escribe(ana, "general", "hola"), /foreign key|violates/);
  });
  await prueba("el apodo tiene que ser un apodo: ni corto, ni con < > @ #", async () => {
    for (const malo of ["a", "<b>ana</b>", "@ana", "#ana", "x".repeat(25)])
      await falla(() => como(ana, "insert into public.chat_perfiles (apodo) values ($1)", [malo]), /check/);
  });
  await prueba("con apodo, entras; y tu perfil es tuyo aunque digas otro usuario", async () => {
    await como(ana, "insert into public.chat_perfiles (apodo) values ('Ana')");
    await como(bea, "insert into public.chat_perfiles (apodo) values ('Bea')");
    await como(gab, "insert into public.chat_perfiles (apodo) values ('Gabriel')");
    await falla(() => como(ana, "insert into public.chat_perfiles (usuario, apodo) values ($1, 'Falsa')", [bea]), /permission denied/);
    const r = await como(bea, "select apodo from public.chat_perfiles order by apodo");
    esperar(r.rows.map(x => x.apodo).join() === "Ana,Bea,Gabriel", "ve " + r.rows.map(x => x.apodo));
  });

  console.log("\nEscribir");
  let m1;
  await prueba("un mensaje es de quien lo escribe, y no se puede firmar por otro", async () => {
    m1 = (await escribe(ana, "general", "Hola a todos")).rows[0].id;
    const r = await db.query("select autor, editado from public.chat_mensajes where id = $1", [m1]);
    esperar(r.rows[0].autor === ana && r.rows[0].editado === null, "autor " + r.rows[0].autor);
    await falla(() => como(bea, "insert into public.chat_mensajes (canal, texto, autor) values ('general', 'soy Ana', $1)", [ana]), /permission denied/);
  });
  await prueba("todos los que tienen cuenta lo leen; sin cuenta, nadie", async () => {
    const r = await como(bea, "select texto from public.chat_mensajes where id = $1", [m1]);
    esperar(r.rows.length === 1, "Bea no lo ve");
    await falla(() => como(null, "select * from public.chat_mensajes"), /permission denied/);
    await falla(() => como(null, "select * from public.chat_perfiles"), /permission denied/);
  });
  await prueba("vacío o de más de 2.000 letras, no entra", async () => {
    await falla(() => escribe(bea, "general", "   "), /chat_no_vacio/);
    await falla(() => escribe(bea, "general", "x".repeat(2001)), /check/);
  });
  await prueba("editar: solo lo tuyo, solo el texto, y queda marcado como editado", async () => {
    await como(ana, "update public.chat_mensajes set texto = 'Hola a todas' where id = $1", [m1]);
    const r = await db.query("select texto, editado from public.chat_mensajes where id = $1", [m1]);
    esperar(r.rows[0].texto === "Hola a todas" && r.rows[0].editado !== null, "no se ha editado");
    await como(bea, "update public.chat_mensajes set texto = 'hackeado' where id = $1", [m1]);
    const r2 = await db.query("select texto from public.chat_mensajes where id = $1", [m1]);
    esperar(r2.rows[0].texto === "Hola a todas", "Bea ha cambiado el mensaje de Ana");
    await falla(() => como(ana, "update public.chat_mensajes set fijado = true where id = $1", [m1]), /permission denied/);
    await falla(() => como(ana, "update public.chat_mensajes set canal = 'dudas' where id = $1", [m1]), /permission denied/);
    await falla(() => como(ana, "delete from public.chat_mensajes where id = $1", [m1]), /permission denied/);
  });
  await prueba("responder, solo dentro del mismo canal", async () => {
    await envejecer();
    await como(bea, "insert into public.chat_mensajes (canal, texto, respuesta_a) values ('general', 'Hola Ana', $1)", [m1]);
    await falla(() => como(bea, "insert into public.chat_mensajes (canal, texto, respuesta_a) values ('dudas', 'aquí no', $1)", [m1]), /mismo canal/);
  });
  await prueba("más de 5 mensajes en 10 segundos: frena", async () => {
    await envejecer();
    for (let i = 0; i < 5; i++) await escribe(bea, "general", "mensaje " + i);
    await falla(() => escribe(bea, "general", "el sexto"), /muy rápido/);
    await envejecer();
  });
  await prueba("en Anuncios solo escribe el creador", async () => {
    await falla(() => escribe(ana, "anuncios", "hola"), /solo escribe el equipo/);
    await escribe(gab, "anuncios", "¡Bienvenidos a ChatClase!");
  });

  console.log("\nAdjuntos y tareas");
  await prueba("un adjunto tiene que estar en tu carpeta, con nombre y tipo", async () => {
    const bueno = JSON.stringify([{ ruta: ana + "/f1.png", nombre: "esquema.png", tipo: "image/png", tam: 1200 }]);
    await como(ana, "insert into public.chat_mensajes (canal, adjuntos) values ('dudas', $1::jsonb)", [bueno]);
    const deBea = JSON.stringify([{ ruta: bea + "/f1.png", nombre: "suyo.png", tipo: "image/png" }]);
    await falla(() => como(ana, "insert into public.chat_mensajes (canal, adjuntos) values ('dudas', $1::jsonb)", [deBea]), /Adjunto no válido/);
    const trampa = JSON.stringify([{ ruta: ana + "/../" + bea + "/f.png", nombre: "x", tipo: "image/png" }]);
    await falla(() => como(ana, "insert into public.chat_mensajes (canal, adjuntos) values ('dudas', $1::jsonb)", [trampa]), /Adjunto no válido/);
    const cinco = JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ ruta: ana + "/f" + i + ".png", nombre: "f", tipo: "image/png" })));
    await falla(() => como(ana, "insert into public.chat_mensajes (canal, adjuntos) values ('dudas', $1::jsonb)", [cinco]), /check/);
  });
  await prueba("una tarea compartida lleva título, tipo y si está hecha", async () => {
    await envejecer();
    const t = JSON.stringify({ tipo: "entrega", titulo: "Práctica de SQL", cod: "BD", fecha: "2026-10-03", hecha: true });
    await como(ana, "insert into public.chat_mensajes (canal, texto, tarea) values ('tareas', '¡Hecha!', $1::jsonb)", [t]);
    await falla(() => como(ana, "insert into public.chat_mensajes (canal, tarea) values ('tareas', $1::jsonb)", [JSON.stringify({ tipo: "otra", titulo: "x", hecha: true })]), /Tarea no válida/);
    await falla(() => como(ana, "insert into public.chat_mensajes (canal, tarea) values ('tareas', $1::jsonb)", [JSON.stringify({ tipo: "examen", titulo: "x", hecha: "sí" })]), /Tarea no válida/);
  });

  console.log("\nReacciones");
  await prueba("cada uno reacciona una vez con cada emoji, y avisa a los demás", async () => {
    const antes = (await db.query("select actualizado from public.chat_mensajes where id = $1", [m1])).rows[0].actualizado;
    await new Promise(r => setTimeout(r, 15));
    await como(bea, "insert into public.chat_reacciones (mensaje, emoji) values ($1, '👍')", [m1]);
    await falla(() => como(bea, "insert into public.chat_reacciones (mensaje, emoji) values ($1, '👍')", [m1]), /duplicate|unique/);
    await como(gab, "insert into public.chat_reacciones (mensaje, emoji) values ($1, '👍')", [m1]);
    const despues = (await db.query("select actualizado from public.chat_mensajes where id = $1", [m1])).rows[0].actualizado;
    esperar(new Date(despues) > new Date(antes), "el mensaje no se ha tocado");
    await falla(() => como(ana, "insert into public.chat_reacciones (mensaje, usuario, emoji) values ($1, $2, '😂')", [m1, bea]), /permission denied/);
  });
  await prueba("quitar reacciones: solo las tuyas", async () => {
    await como(ana, "delete from public.chat_reacciones where mensaje = $1", [m1]);
    const r = await db.query("select count(*)::int n from public.chat_reacciones where mensaje = $1", [m1]);
    esperar(r.rows[0].n === 2, "Ana ha quitado reacciones ajenas: quedan " + r.rows[0].n);
    await como(bea, "delete from public.chat_reacciones where mensaje = $1", [m1]);
    const r2 = await db.query("select count(*)::int n from public.chat_reacciones where mensaje = $1", [m1]);
    esperar(r2.rows[0].n === 1, "quedan " + r2.rows[0].n);
  });

  console.log("\nModeración");
  let m2;
  await prueba("reportar un mensaje; los reportes solo los ve el creador", async () => {
    await envejecer();
    m2 = (await escribe(bea, "general", "mensaje feo")).rows[0].id;
    await como(ana, "insert into public.chat_reportes (mensaje, motivo) values ($1, 'Insulta')", [m2]);
    await falla(() => como(ana, "select * from public.chat_reportes"), /permission denied/);
    await falla(() => como(ana, "select public.chat_reportes_ver()"), /Solo el creador/);
    const r = await como(gab, "select public.chat_reportes_ver() as j");
    const j = r.rows[0].j;
    esperar(j.length === 1 && j[0].apodo === "Bea" && j[0].quien === "Ana" && j[0].texto === "mensaje feo", JSON.stringify(j));
  });
  await prueba("borrar: lo tuyo sí, lo de otro no; el creador, cualquiera", async () => {
    await falla(() => como(ana, "select public.chat_borrar($1)", [m2]), /no lo puedes borrar/);
    await como(gab, "select public.chat_borrar($1)", [m2]);
    const r = await db.query("select texto, borrado from public.chat_mensajes where id = $1", [m2]);
    esperar(r.rows[0].borrado === true && r.rows[0].texto === "", "sigue ahí: " + JSON.stringify(r.rows[0]));
    await como(ana, "select public.chat_borrar($1)", [m1]);
    const r2 = await db.query("select borrado from public.chat_mensajes where id = $1", [m1]);
    esperar(r2.rows[0].borrado === true, "Ana no ha podido borrar lo suyo");
    const re = await db.query("select count(*)::int n from public.chat_reacciones where mensaje = $1", [m1]);
    esperar(re.rows[0].n === 0, "quedan reacciones en un mensaje borrado");
  });
  await prueba("un mensaje borrado ya no se edita", async () => {
    await como(ana, "update public.chat_mensajes set texto = 'resucitado' where id = $1", [m1]);
    const r = await db.query("select texto from public.chat_mensajes where id = $1", [m1]);
    esperar(r.rows[0].texto === "", "se ha editado un mensaje borrado");
  });
  await prueba("fijar y dejar sin chat: solo el creador", async () => {
    await envejecer();
    const m3 = (await escribe(ana, "general", "Normas del canal")).rows[0].id;
    await falla(() => como(ana, "select public.chat_fijar($1, true)", [m3]), /Solo el creador/);
    await como(gab, "select public.chat_fijar($1, true)", [m3]);
    const r = await db.query("select fijado from public.chat_mensajes where id = $1", [m3]);
    esperar(r.rows[0].fijado === true, "no se ha fijado");
    await falla(() => como(ana, "select public.chat_banear($1, 24, 'no')", [bea]), /Solo el creador/);
  });
  await prueba("quien está sin chat no escribe ni sube archivos, y la app lo sabe", async () => {
    await como(gab, "select public.chat_banear($1, 24, 'Insultos')", [bea]);
    await falla(() => escribe(bea, "general", "hola?"), /No puedes escribir/);
    await falla(() => como(bea, "insert into storage.objects (bucket_id, name) values ('chat-adjuntos', $1)", [bea + "/x.png"]), /row-level security/);
    const e = (await como(bea, "select public.chat_estado() as j")).rows[0].j;
    esperar(e.baneado && e.admin === false, JSON.stringify(e));
    await como(gab, "select public.chat_banear($1, 0, '')", [bea]);
    await escribe(bea, "general", "ya puedo");
  });
  await prueba("el estado dice el último mensaje de cada canal y si eres el creador", async () => {
    const e = (await como(gab, "select public.chat_estado() as j")).rows[0].j;
    const g = e.canales.find(c => c.canal === "general");
    esperar(e.admin === true && g && g.ultimo, JSON.stringify(e).slice(0, 200));
  });

  console.log("\nArchivos");
  await prueba("cada uno sube a su carpeta y borra lo suyo; el creador, cualquiera", async () => {
    await como(ana, "insert into storage.objects (bucket_id, name) values ('chat-adjuntos', $1)", [ana + "/a.png"]);
    await falla(() => como(ana, "insert into storage.objects (bucket_id, name) values ('chat-adjuntos', $1)", [bea + "/b.png"]), /row-level security/);
    await como(bea, "delete from storage.objects where name = $1", [ana + "/a.png"]);
    let r = await db.query("select count(*)::int n from storage.objects where name = $1", [ana + "/a.png"]);
    esperar(r.rows[0].n === 1, "Bea ha borrado un archivo de Ana");
    await como(gab, "delete from storage.objects where name = $1", [ana + "/a.png"]);
    r = await db.query("select count(*)::int n from storage.objects where name = $1", [ana + "/a.png"]);
    esperar(r.rows[0].n === 0, "el creador no ha podido borrarlo");
    const b = await db.query("select public, file_size_limit from storage.buckets where id = 'chat-adjuntos'");
    esperar(b.rows[0].public === false && Number(b.rows[0].file_size_limit) === 10485760, JSON.stringify(b.rows[0]));
  });

  console.log("\nBorrar la cuenta");
  await prueba("quien borra su cuenta se lleva su apodo, sus mensajes y sus reacciones", async () => {
    await como(bea, "select public.borrar_mi_cuenta()");
    const q = async sql => (await db.query(sql, [bea])).rows[0].n;
    const p = await q("select count(*)::int n from public.chat_perfiles where usuario = $1");
    const m = await q("select count(*)::int n from public.chat_mensajes where autor = $1");
    const re = await q("select count(*)::int n from public.chat_reacciones where usuario = $1");
    esperar(p === 0 && m === 0 && re === 0, "queda algo: " + [p, m, re]);
  });

  console.log("\n" + ok + " bien, " + mal + " mal");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error("Se ha roto la prueba:", e.message); process.exit(2); });
