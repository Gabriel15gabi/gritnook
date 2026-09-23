/* Prueba backend/supabase.sql contra un Postgres 16 de verdad (PGlite).
   Imita lo que pone Supabase: el esquema auth con sus usuarios, auth.uid()
   leyendo el usuario del token y los roles anon y authenticated.

   Para pasarla (no hace falta tener Supabase ni Postgres instalados):
     npm i --no-save @electric-sql/pglite
     node backend/probar-sql.js */
const { PGlite } = require("@electric-sql/pglite");
const fs = require("fs");
const SQL = fs.readFileSync(__dirname + "/supabase.sql", "utf8");

let ok = 0, mal = 0;
const prueba = async (nombre, fn) => {
  try { await fn(); ok++; console.log("  ✓ " + nombre); }
  catch (e) { mal++; console.log("  ✗ " + nombre + "\n      " + e.message); }
};
const esperar = (v, msg) => { if (!v) throw new Error(msg || "no se cumple"); };

(async () => {
  const db = new PGlite();
  /* lo que Supabase trae de serie */
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  /* el esquema, dos veces: tiene que poder pasarse otra vez sin romper nada */
  await db.exec(SQL);
  await db.exec(SQL);
  console.log("El esquema entra, y entra dos veces.");

  const [ana, bea, gab] = (await db.query(`insert into auth.users (email, created_at) values
    ('ana@ejemplo.es', now() - interval '20 days'), ('bea@ejemplo.es', now() - interval '2 days'), ('Gabriel_Gabiz@hotmail.com', now() - interval '40 days')
    returning id`)).rows.map(r => r.id);

  /* hablar como un usuario con sesión, como anónimo, o como el dueño */
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

  console.log("\nCada uno lo suyo");
  await prueba("Ana guarda sus documentos sin decir de quién son", async () => {
    await como(ana, `insert into public.documentos (clave, datos) values ('escritorio/perfil', '{"perfil":{"etapa":"ciclo-sup","nombre":"Ana"}}'), ('apuntes/a1', '{"titulo":"SQL"}')`);
    const r = await como(ana, "select clave from public.documentos order by clave");
    esperar(r.rows.length === 2, "tiene " + r.rows.length);
  });
  await prueba("Bea no ve nada de Ana", async () => {
    const r = await como(bea, "select * from public.documentos");
    esperar(r.rows.length === 0, "ve " + r.rows.length);
  });
  await prueba("Bea no puede escribir a nombre de Ana", async () => {
    await falla(() => como(bea, `insert into public.documentos (usuario, clave, datos) values ($1, 'apuntes/trampa', '{}')`, [ana]), /row-level security/);
  });
  await prueba("Bea no puede cambiar ni borrar lo de Ana (no le llega ni la fila)", async () => {
    const u = await como(bea, `update public.documentos set datos = '{"x":1}' where usuario = $1`, [ana]);
    const d = await como(bea, `delete from public.documentos where usuario = $1`, [ana]);
    esperar(u.affectedRows === 0 && d.affectedRows === 0, "tocó " + u.affectedRows + " y borró " + d.affectedRows);
    const r = await db.query("select count(*)::int n from public.documentos where usuario = $1", [ana]);
    esperar(r.rows[0].n === 2, "a Ana le quedan " + r.rows[0].n);
  });
  await prueba("sin sesión no se lee ni se escribe nada", async () => {
    await falla(() => como(null, "select * from public.documentos"), /permission denied/);
    await falla(() => como(null, `insert into public.documentos (clave, datos) values ('apuntes/x', '{}')`), /permission denied/);
  });
  await prueba("una clave rara no entra", async () => {
    await falla(() => como(ana, `insert into public.documentos (clave, datos) values ('../../etc', '{}')`), /documentos_clave/);
    await falla(() => como(ana, `insert into public.documentos (clave, datos) values ('otra/cosa', '{}')`), /documentos_clave/);
  });
  await prueba("un documento de más de 1 MB no entra", async () => {
    await falla(() => como(ana, `insert into public.documentos (clave, datos) values ('apuntes/gordo', jsonb_build_object('x', repeat(md5(random()::text), 70000)))`), /documentos_tamano/);
  });
  await prueba("guardar otra vez lo mismo lo sustituye, y la hora la pone el servidor", async () => {
    const antes = (await db.query("select actualizado from public.documentos where usuario = $1 and clave = 'apuntes/a1'", [ana])).rows[0].actualizado;
    await new Promise(r => setTimeout(r, 20));
    await como(ana, `insert into public.documentos (clave, datos, actualizado) values ('apuntes/a1', '{"titulo":"SQL 2"}', '2000-01-01')
      on conflict (usuario, clave) do update set datos = excluded.datos`);
    const r = (await db.query("select datos, actualizado from public.documentos where usuario = $1 and clave = 'apuntes/a1'", [ana])).rows[0];
    esperar(r.datos.titulo === "SQL 2", "no se sustituyó");
    esperar(new Date(r.actualizado) > new Date(antes), "la hora no avanzó");
    esperar(new Date(r.actualizado).getFullYear() > 2000, "se coló la hora del cliente");
  });

  console.log("\nLa actividad");
  await prueba("latido apunta el día una vez y cuenta las veces", async () => {
    await como(ana, "select public.latido()");
    await como(ana, "select public.latido()");
    await como(bea, "select public.latido()");
    const r = await db.query("select usuario, veces from public.actividad order by veces desc");
    esperar(r.rows.length === 2, "hay " + r.rows.length + " filas");
    esperar(r.rows[0].veces === 2, "Ana tiene " + r.rows[0].veces);
  });
  await prueba("nadie lee la actividad directamente", async () => {
    await falla(() => como(ana, "select * from public.actividad"), /permission denied/);
  });
  await prueba("sin sesión no hay latido", async () => {
    await falla(() => como(null, "select public.latido()"), /permission denied/);
  });

  console.log("\nEl panel del creador");
  await prueba("Ana no es la creadora y no ve el panel", async () => {
    const r = await como(ana, "select public.es_admin() as si");
    esperar(r.rows[0].si === false);
    await falla(() => como(ana, "select public.panel_admin()"), /Solo el creador/);
  });
  await prueba("nadie puede leer ni tocar la lista de administradores", async () => {
    await falla(() => como(ana, "select * from public.administradores"), /permission denied/);
    await falla(() => como(ana, "insert into public.administradores values ('ana@ejemplo.es')"), /permission denied/);
  });
  await prueba("el creador lo es aunque escriba su correo con otras mayúsculas", async () => {
    const r = await como(gab, "select public.es_admin() as si");
    esperar(r.rows[0].si === true);
  });
  await prueba("el panel cuenta usuarios, activos y altas, y trae a cada uno", async () => {
    await db.exec(`insert into public.actividad (usuario, dia, veces) values ('${ana}', current_date - 3, 4), ('${ana}', current_date - 12, 1), ('${gab}', current_date - 40, 2)`);
    const p = (await como(gab, "select public.panel_admin() as p")).rows[0].p;
    esperar(p.totales.usuarios === 3, "usuarios " + p.totales.usuarios);
    esperar(p.totales.hoy === 2, "hoy " + p.totales.hoy);
    esperar(p.totales.semana === 2, "semana " + p.totales.semana);
    esperar(p.totales.mes === 2, "mes " + p.totales.mes);
    esperar(p.totales.altas7 === 1, "altas7 " + p.totales.altas7);
    esperar(p.dias.length === 30, "días " + p.dias.length);
    const a = p.usuarios.find(u => u.email === "ana@ejemplo.es");
    esperar(a.dias7 === 2 && a.dias30 === 3, "Ana dias7 " + a.dias7 + " dias30 " + a.dias30);
    esperar(a.veces === 7, "Ana veces " + a.veces);
    esperar(a.etapa === "ciclo-sup", "Ana etapa " + a.etapa);
    esperar(a.ocupa > 0, "Ana no ocupa nada");
    esperar(!JSON.stringify(p).includes("SQL 2"), "el panel enseña contenido de los apuntes");
    esperar(p.usuarios[0].email !== "Gabriel_Gabiz@hotmail.com", "el que lleva más sin entrar sale primero");
  });

  console.log("\nBorrar la cuenta");
  await prueba("Bea borra su cuenta y se va con todo lo suyo", async () => {
    await como(bea, `insert into public.documentos (clave, datos) values ('escritorio/agenda', '{}')`);
    await como(bea, "select public.borrar_mi_cuenta()");
    const u = await db.query("select count(*)::int n from auth.users where id = $1", [bea]);
    const d = await db.query("select count(*)::int n from public.documentos where usuario = $1", [bea]);
    const a = await db.query("select count(*)::int n from public.actividad where usuario = $1", [bea]);
    esperar(u.rows[0].n === 0 && d.rows[0].n === 0 && a.rows[0].n === 0, "queda algo: " + [u.rows[0].n, d.rows[0].n, a.rows[0].n]);
  });
  await prueba("borrar la cuenta solo borra la tuya", async () => {
    await como(ana, "select public.borrar_mi_cuenta()").catch(() => {});
    const u = await db.query("select count(*)::int n from auth.users");
    esperar(u.rows[0].n === 1, "quedan " + u.rows[0].n + " usuarios");
  });
  await prueba("sin sesión no se borra nada", async () => {
    await falla(() => como(null, "select public.borrar_mi_cuenta()"), /permission denied/);
  });

  console.log("\n" + ok + " bien, " + mal + " mal");
  process.exit(mal ? 1 : 0);
})().catch(e => { console.error("Se ha roto la prueba:", e.message); process.exit(2); });
