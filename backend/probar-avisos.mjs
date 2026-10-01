/* Los avisos con la app cerrada, probados sin Supabase:
   · backend/avisos.sql contra un Postgres 16 de verdad (PGlite), con el
     esquema auth y los roles que pone Supabase (menos el reloj, pg_cron, que
     PGlite no trae);
   · el cifrado y la firma de la función (backend/funciones/avisos/index.ts):
     lo que cifra se descifra con http_ece, la librería de referencia de
     RFC 8188 (la que usa web-push), y la firma VAPID se comprueba con la
     clave pública.
   Para pasarlo (Node 22.6 o más, por lo de leer TypeScript):
     npm i --no-save @electric-sql/pglite http_ece@1.2.0
     node backend/probar-avisos.mjs */
import { PGlite } from "@electric-sql/pglite";
import ece from "http_ece";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
let ok = 0, mal = 0;
const prueba = async (n, fn) => { try { await fn(); ok++; console.log("  ✓ " + n); } catch (e) { mal++; console.log("  ✗ " + n + "\n      " + e.message); } };
const esperar = (c, m) => { if (!c) throw new Error(m || "no se cumple"); };
const falla = async (fn, patron) => {
  let error = null; try { await fn(); } catch (e) { error = e; }
  if (!error) throw new Error("tenía que fallar y no ha fallado");
  if (patron && !patron.test(error.message)) throw new Error("falla, pero por otra cosa: " + error.message);
};

/* ── 1. El SQL ── */
const SQL = fs.readFileSync(path.join(aqui, "avisos.sql"), "utf8");
const sinReloj = SQL.slice(0, SQL.indexOf("-- ── 4."));
const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);
await db.exec(sinReloj); await db.exec(sinReloj);
console.log("El SQL entra, y entra dos veces.");
const [ana, bea] = (await db.query("insert into auth.users (email) values ('ana@ejemplo.es'), ('bea@ejemplo.es') returning id")).rows.map(r => r.id);
const como = async (uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
  await db.exec(uid ? "set role authenticated" : "set role anon");
  try { return await db.query(sql, params); } finally { await db.exec("reset role"); }
};
const en = min => new Date(Date.now() + min * 60000).toISOString();

console.log("\nCada uno lo suyo");
await prueba("Ana apunta su dispositivo y Bea no lo ve", async () => {
  await como(ana, "insert into public.push_suscripciones (endpoint, p256dh, auth) values ($1, $2, $3)", ["https://fcm.googleapis.com/fcm/send/ana1", "B".repeat(87), "a".repeat(22)]);
  esperar((await como(ana, "select * from public.push_suscripciones")).rows.length === 1);
  esperar((await como(bea, "select * from public.push_suscripciones")).rows.length === 0);
});
await prueba("Bea no puede apuntar un dispositivo a nombre de Ana", async () => {
  await falla(() => como(bea, "insert into public.push_suscripciones (endpoint, usuario, p256dh, auth) values ('https://x.y/z', $1, $2, $3)", [ana, "B".repeat(87), "a".repeat(22)]), /row-level security/);
});
await prueba("una dirección que no es https no entra", async () => {
  await falla(() => como(ana, "insert into public.push_suscripciones (endpoint, p256dh, auth) values ('http://malo', $1, $2)", ["B".repeat(87), "a".repeat(22)]), /check/);
});

console.log("\nProgramar");
await prueba("la lista de Ana entra, con su hora; lo que no tiene título o forma, no", async () => {
  const n = (await como(ana, "select public.programar_avisos($1::jsonb) as n", [JSON.stringify([
    { clave: "ex-1-1", cuando: en(60), titulo: "Mañana tienes examen", cuerpo: "Programación" },
    { clave: "en-2-0", cuando: en(120), titulo: "Hoy se entrega", cuerpo: "Práctica 3", url: "./#sec=entregas" },
    { clave: "sin titulo", cuando: en(30), titulo: "" },
    { clave: "fecha-mala", cuando: "mañana", titulo: "x" },
    { clave: "muy-lejos", cuando: en(60 * 24 * 60), titulo: "Dentro de dos meses" }
  ])])).rows[0].n;
  esperar(n === 2, "entran " + n);
  esperar((await como(bea, "select * from public.avisos")).rows.length === 0, "Bea ve los de Ana");
});
await prueba("volver a programar sustituye lo pendiente", async () => {
  await como(ana, "select public.programar_avisos($1::jsonb)", [JSON.stringify([{ clave: "ex-1-1", cuando: en(90), titulo: "Mañana tienes examen" }])]);
  const r = (await como(ana, "select clave from public.avisos order by clave")).rows.map(x => x.clave);
  esperar(r.join() === "ex-1-1", r.join());
});
await prueba("lo ya mandado no se vuelve a mandar aunque la app lo pida otra vez", async () => {
  await db.query("update public.avisos set enviado = now() where clave = 'ex-1-1'");
  await como(ana, "select public.programar_avisos($1::jsonb)", [JSON.stringify([{ clave: "ex-1-1", cuando: en(95), titulo: "Mañana tienes examen" }])]);
  const r = (await db.query("select enviado from public.avisos where clave = 'ex-1-1'")).rows[0];
  esperar(r.enviado !== null, "se ha vuelto a poner pendiente");
});
await prueba("claves repetidas en la lista no rompen nada: se queda una", async () => {
  await como(ana, "select public.programar_avisos($1::jsonb)", [JSON.stringify([{ clave: "racha-hoy", cuando: en(10), titulo: "A" }, { clave: "racha-hoy", cuando: en(20), titulo: "B" }])]);
  esperar((await db.query("select count(*)::int n from public.avisos where clave = 'racha-hoy'")).rows[0].n === 1);
});
await prueba("sin sesión no se programa nada", async () => {
  await falla(() => como(null, "select public.programar_avisos('[]'::jsonb)"), /permission denied|sin sesión/);
});

console.log("\nLo privado del servidor");
await prueba("la contraseña del reloj existe y nadie con sesión la puede leer", async () => {
  esperar((await db.query("select length(valor) n from public.servidor_privado where clave = 'cron'")).rows[0].n === 64);
  await falla(() => como(ana, "select * from public.servidor_privado"), /permission denied/);
  await falla(() => como(null, "select * from public.servidor_privado"), /permission denied/);
});
await prueba("la clave pública sale por su función; la privada, nunca", async () => {
  esperar((await como(null, "select public.push_clave_publica() as k")).rows[0].k === null, "sin claves todavía tiene que ser null");
  await db.query("insert into public.servidor_privado values ('vapid_publica', 'PUBLICA'), ('vapid_privada', 'PRIVADA')");
  esperar((await como(ana, "select public.push_clave_publica() as k")).rows[0].k === "PUBLICA");
  esperar((await como(null, "select public.push_clave_publica() as k")).rows[0].k === "PUBLICA");
});
await prueba("borrar la cuenta se lleva sus avisos y sus dispositivos", async () => {
  await db.query("delete from auth.users where id = $1", [ana]);
  esperar((await db.query("select count(*)::int n from public.avisos")).rows[0].n === 0);
  esperar((await db.query("select count(*)::int n from public.push_suscripciones")).rows[0].n === 0);
});

/* ── 2. El cifrado y la firma de la función ── */
console.log("\nLa función");
const ts = fs.readFileSync(path.join(aqui, "funciones", "avisos", "index.ts"), "utf8");
const nucleo = path.join(os.tmpdir(), "gritnook-avisos-nucleo-" + process.pid + ".mts");
fs.writeFileSync(nucleo, ts.slice(0, ts.indexOf("// ── lo que hace la función")));
const { cifrarAviso, crearClavesVapid, cabeceraVapid } = await import(pathToFileURL(nucleo).href);
const b64u = b => Buffer.from(b).toString("base64url");
const disp = crypto.createECDH("prime256v1"); disp.generateKeys();
const auth = crypto.randomBytes(16), p256dh = b64u(disp.getPublicKey()), authTxt = b64u(auth);
const descifrar = (cuerpo, clave = disp) => ece.decrypt(Buffer.from(cuerpo), { version: "aes128gcm", privateKey: clave, authSecret: auth }).toString("utf8");
await prueba("el aviso cifrado lo descifra el dispositivo, letra a letra", async () => {
  const datos = { clave: "reloj-abc-trabajo", titulo: "¡Bien hecho!", cuerpo: "25 minutos de Programación. Ahora, a descansar.", url: "./#sec=escritorio" };
  esperar(descifrar(await cifrarAviso(new TextEncoder().encode(JSON.stringify(datos)), p256dh, authTxt)) === JSON.stringify(datos));
});
await prueba("dos avisos iguales no se parecen (sal y clave de un solo uso) y llevan la cabecera bien", async () => {
  const a = await cifrarAviso(new TextEncoder().encode("hola"), p256dh, authTxt), b = await cifrarAviso(new TextEncoder().encode("hola"), p256dh, authTxt);
  esperar(Buffer.compare(Buffer.from(a), Buffer.from(b)) !== 0);
  esperar(a[16] === 0 && a[17] === 0 && a[18] === 16 && a[19] === 0 && a[20] === 65);
});
await prueba("con la clave de otro dispositivo no se puede leer", async () => {
  const otro = crypto.createECDH("prime256v1"); otro.generateKeys();
  const c = await cifrarAviso(new TextEncoder().encode("secreto"), p256dh, authTxt);
  await falla(async () => descifrar(c, otro));
});
await prueba("la firma VAPID vale con la clave pública, es para el servicio de avisos y caduca en 12 horas", async () => {
  const v = await crearClavesVapid();
  const m = (await cabeceraVapid("https://fcm.googleapis.com/fcm/send/abc:123", v.publica, v.privada)).match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  esperar(m);
  const c = JSON.parse(Buffer.from(m[2], "base64url"));
  esperar(c.aud === "https://fcm.googleapis.com" && c.sub === "mailto:hola@gritnook.com" && c.exp <= Date.now() / 1000 + 12 * 3600 + 5);
  const pub = await crypto.webcrypto.subtle.importKey("raw", Buffer.from(m[4], "base64url"), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  esperar(await crypto.webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, Buffer.from(m[3], "base64url"), new TextEncoder().encode(m[1] + "." + m[2])));
});
fs.rmSync(nucleo, { force: true });

console.log(`\n${ok} bien, ${mal} mal`);
process.exit(mal ? 1 : 0);
