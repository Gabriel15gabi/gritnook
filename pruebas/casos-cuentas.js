/* Las cuentas. Contra un Supabase de mentira que se porta como el de
   verdad: usuarios con contraseña, tokens que caducan, cada documento de su
   dueño, el panel solo para el creador y cortes de conexión cuando se pide.
   Las reglas de seguridad de la base de datos de verdad se prueban aparte,
   contra Postgres, en backend/probar-sql.js. */

function servidorFalso() {
  const srv = { usuarios: [], docs: new Map(), actividad: [], admins: new Set(), sinRed: false, visitas: [], origenes: new Map(),
    tokens: new Map(), refrescos: new Map(), reloj: 0, llamadas: [] };
  const hora = () => new Date(Date.UTC(2026, 0, 1) + (++srv.reloj) * 1000).toISOString();
  const resp = (status, obj) => ({ ok: status >= 200 && status < 300, status, text: async () => obj === undefined ? "" : JSON.stringify(obj) });
  const publico = uid => { const u = srv.usuarios.find(x => x.id === uid); return u ? { id: u.id, email: u.email } : null; };
  const sesion = uid => {
    const a = "acc-" + azar(10), r = "ref-" + azar(10);
    srv.tokens.set(a, uid); srv.refrescos.set(r, uid);
    return { access_token: a, refresh_token: r, expires_in: 3600, token_type: "bearer", user: publico(uid) };
  };
  const misDocs = uid => { if (!srv.docs.has(uid)) srv.docs.set(uid, new Map()); return srv.docs.get(uid); };
  srv.crear = (email, pass = "contraseña-larga") => {
    const u = { id: "u" + (srv.usuarios.length + 1), email: email.toLowerCase(), pass, alta: hora() };
    srv.usuarios.push(u); return u;
  };
  srv.doc = (email, clave) => { const u = srv.usuarios.find(x => x.email === email); const d = u && misDocs(u.id).get(clave); return d ? d.datos : undefined; };
  /* otro dispositivo de ese usuario guarda algo */
  srv.escribir = (email, clave, datos) => { const u = srv.usuarios.find(x => x.email === email); misDocs(u.id).set(clave, { datos: JSON.parse(JSON.stringify(datos)), actualizado: hora() }); };
  srv.fetch = async (url, op = {}) => {
    srv.llamadas.push((op.method || "GET") + " " + url);
    if (srv.sinRed) throw new TypeError("Failed to fetch");
    const u = new URL(url), ruta = u.pathname, q = u.searchParams;
    const cuerpo = op.body ? JSON.parse(op.body) : {};
    const uid = srv.tokens.get(String((op.headers || {}).Authorization || "").replace("Bearer ", ""));
    if (ruta === "/auth/v1/signup") {
      const email = String(cuerpo.email || "").toLowerCase();
      if (srv.usuarios.some(x => x.email === email)) return resp(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
      if (String(cuerpo.password || "").length < 8) return resp(422, { code: 422, error_code: "weak_password", msg: "Password should be at least 8 characters." });
      return resp(200, sesion(srv.crear(email, cuerpo.password).id));
    }
    if (ruta === "/auth/v1/token") {
      if (q.get("grant_type") === "password") {
        const x = srv.usuarios.find(y => y.email === String(cuerpo.email).toLowerCase() && y.pass === cuerpo.password);
        return x ? resp(200, sesion(x.id)) : resp(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }
      const r = srv.refrescos.get(cuerpo.refresh_token);
      if (!r) return resp(400, { code: 400, error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
      srv.refrescos.delete(cuerpo.refresh_token);
      return resp(200, sesion(r));
    }
    if (ruta === "/auth/v1/logout") { srv.tokens.delete(String(op.headers.Authorization).replace("Bearer ", "")); return resp(204); }
    if (ruta === "/auth/v1/recover") return resp(200, {});
    if (ruta === "/auth/v1/user") {
      if (!uid) return resp(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
      if (op.method === "PUT") srv.usuarios.find(x => x.id === uid).pass = cuerpo.password;
      return resp(200, publico(uid));
    }
    /* contar una visita no pide cuenta */
    if (ruta === "/rest/v1/rpc/contar_visita") { srv.visitas.push(Object.assign({ conCuenta: !!uid }, cuerpo)); return resp(204); }
    if (!uid) return resp(401, { code: "PGRST301", message: "JWT expired" });
    if (ruta === "/rest/v1/documentos") {
      const mios = misDocs(uid);
      if (op.method === "POST") {
        if (!/^(escritorio|apuntes|casillero)\/[A-Za-z0-9_-]{1,80}$/.test(cuerpo.clave)) return resp(400, { code: "23514", message: "violates check constraint documentos_clave" });
        const fila = { datos: JSON.parse(JSON.stringify(cuerpo.datos)), actualizado: hora() };
        mios.set(cuerpo.clave, fila);
        return resp(201, [{ usuario: uid, clave: cuerpo.clave, datos: fila.datos, actualizado: fila.actualizado }]);
      }
      if (op.method === "DELETE") { mios.delete(decodeURIComponent(String(q.get("clave")).replace(/^eq\./, ""))); return resp(204); }
      const campos = String(q.get("select") || "").split(",");
      const en = q.get("clave") ? String(q.get("clave")).replace(/^in\.\(|\)$/g, "").split(",").map(c => c.replace(/^"|"$/g, "")) : null;
      return resp(200, [...mios].filter(([c]) => !en || en.includes(c))
        .map(([clave, f]) => Object.assign({ clave, actualizado: f.actualizado }, campos.includes("datos") ? { datos: f.datos } : {})));
    }
    const email = publico(uid).email;
    if (ruta === "/rest/v1/rpc/latido") { srv.actividad.push({ uid, dia: hoyISO() }); return resp(204); }
    if (ruta === "/rest/v1/rpc/apuntar_origen") { if (!srv.origenes.has(uid)) srv.origenes.set(uid, { origen: cuerpo.p_origen, dispositivo: cuerpo.p_dispositivo }); return resp(204); }
    if (ruta === "/rest/v1/rpc/es_admin") return resp(200, srv.admins.has(email));
    if (ruta === "/rest/v1/rpc/panel_admin") {
      if (!srv.admins.has(email)) return resp(403, { code: "42501", message: "Solo el creador puede ver el panel" });
      return resp(200, {
        hoy: hoyISO(),
        ahora: 2,
        totales: { usuarios: srv.usuarios.length, hoy: new Set(srv.actividad.map(a => a.uid)).size, semana: 1, mes: 1, altas7: srv.usuarios.length, altas30: srv.usuarios.length, ocupa: 2048 },
        visitas: { hoy: 12, semana: 40, mes: 90, instaladas: 18,
          origen: [{ origen: "instagram", n: 60 }, { origen: "whatsapp", n: 20 }, { origen: "directo", n: 10 }],
          dispositivo: [{ dispositivo: "movil", n: 70 }, { dispositivo: "ordenador", n: 20 }],
          hora: Array.from({ length: 24 }, (_, i) => i === 21 ? 15 : i >= 8 ? 3 : 0) },
        altasOrigen: [{ origen: "instagram", n: 3 }],
        etapas: [{ etapa: "ciclo-sup", n: 2 }, { etapa: "oposicion", n: 1 }],
        retencion: { base: 4, vuelven: 3, base7: 2, semana2: 1 },
        dias: [{ dia: sumaDias(hoyISO(), -1), altas: 0, activos: 0, visitas: 30 }, { dia: hoyISO(), altas: srv.usuarios.length, activos: 1, visitas: 12 }],
        usuarios: srv.usuarios.map(x => ({ email: x.email, alta: x.alta, ultimo: hoyISO(), dias7: 1, dias30: 1, veces: 1, etapa: "ciclo-sup", origen: (srv.origenes.get(x.id) || {}).origen || null, ocupa: 1024 }))
      });
    }
    if (ruta === "/rest/v1/rpc/borrar_mi_cuenta") {
      srv.usuarios = srv.usuarios.filter(x => x.id !== uid); srv.docs.delete(uid);
      [...srv.tokens].forEach(([t, v]) => { if (v === uid) srv.tokens.delete(t); });
      return resp(204);
    }
    return resp(404, { message: "no existe " + ruta });
  };
  return srv;
}

const dormir = ms => new Promise(r => setTimeout(r, ms));
async function hasta(cond, ms = 3000) {
  for (let t = 0; t < ms; t += 25) { if (cond()) return true; await dormir(25); }
  throw new Error("no ha llegado a pasar en " + ms + " ms");
}
/* todo lo de la cuenta, sin dejar rastro: ni la nube, ni la sesión, ni lo guardado */
async function conNube(fn) {
  const antes = { url: NUBE.url, clave: NUBE.clave, fetch: nubeFetch, SESION, db, esAdminNube, seccion, PANEL, confirmar, BV };
  const copia = JSON.parse(JSON.stringify(S));
  const ls = {}; Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => { ls[k] = localStorage.getItem(k); });
  const srv = servidorFalso();
  NUBE.url = "https://falso.supabase.co"; NUBE.clave = "clave-publica";
  nubeFetch = srv.fetch; SESION = null; db = null; esAdminNube = false; nubeLatidoEn = 0; nubeUltimoEstado = "";
  PANEL = { datos: null, cargando: false, error: "" };
  Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => localStorage.removeItem(k));
  try { sessionStorage.removeItem("desk-daw:sesion"); } catch (e) {}
  S = estadoInicial();
  try { return await fn(srv); }
  finally {
    /* que terminen los guardados de esta prueba antes de pasar a la siguiente */
    await dormir(1700);
    NUBE.url = antes.url; NUBE.clave = antes.clave; nubeFetch = antes.fetch; SESION = antes.SESION; db = antes.db;
    esAdminNube = antes.esAdminNube; PANEL = antes.PANEL; confirmar = antes.confirmar; nubeLatidoEn = 0; nubeUltimoEstado = "";
    ACC = null; const a = $("#acceso"); if (a) a.hidden = true;
    BV = antes.BV; $("#entrada").hidden = !BV;
    document.body.classList.remove("en-entrada");
    const d = $("#dlg"); if (d.open) d.close();
    Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => localStorage.removeItem(k));
    Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v));
    try { sessionStorage.removeItem("desk-daw:sesion"); } catch (e) {}
    S = JSON.parse(JSON.stringify(copia)); seccion = antes.seccion; pinta();
  }
}
/* rellenar y mandar el formulario de entrar como lo haría una persona */
async function formulario({ correo, clave, legal } = {}) {
  if (correo !== undefined) $("#accCorreo").value = correo;
  if (clave !== undefined) $("#accClave").value = clave;
  if (legal !== undefined) $("#accLegal").checked = legal;
  $("#accForm").requestSubmit();
  await dormir(20);
  await hasta(() => !ACC || !ACC.cargando);
}
const avisoAcceso = () => ($("#accAviso") || {}).textContent || "";
const accesoVisible = () => !!$("#acceso") && !$("#acceso").hidden;
/* entrar con una cuenta que ya tiene su curso montado, y esperar a que
   termine la primera subida, como pasaría al abrir la app */
async function entrarComo(srv, email, { admin = false, pass = "contraseña-larga" } = {}) {
  if (!srv.usuarios.some(u => u.email === email)) srv.crear(email, pass);
  if (admin) srv.admins.add(email);
  if (srv.doc(email, "escritorio/perfil") === undefined)
    srv.escribir(email, "escritorio/perfil", { perfil: Object.assign(perfilDef(), { nombre: email.split("@")[0], etapa: "ciclo-sup", ciclo: "DAW", listo: true }) });
  await nubeEntrar(email, pass);
  await conectarNube();
  await hasta(() => db.pendientes().length === 0);
}

grupo("Cuentas: sin configurar, la app va como siempre", () => {
  prueba("sin la dirección del proyecto, no hay pantalla de entrar", () => {
    esperar(NUBE.url).igualA("");
    esperar(nubeLista()).falso();
  });
});

grupo("Cuentas: entrar y crear la cuenta", () => {
  prueba("con la nube configurada y sin sesión, lo primero es entrar", async () => {
    await conNube(async () => {
      await arrancarNube();
      esperar(accesoVisible()).cierto();
      esperar($("#acceso").textContent).contiene("Entra en GritNook");
    });
  });
  prueba("crear la cuenta valida antes de molestar al servidor", async () => {
    await conNube(async srv => {
      abrirAcceso("crear");
      await formulario({ correo: "no-es-un-correo", clave: "12345678", legal: true });
      esperar(avisoAcceso()).contiene("no parece válido");
      await formulario({ correo: "ana@ejemplo.es", clave: "corta", legal: true });
      esperar(avisoAcceso()).contiene("al menos 8");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga", legal: false });
      esperar(avisoAcceso()).contiene("14 años");
      esperar(srv.llamadas.length).igualA(0);
    });
  });
  prueba("una cuenta nueva entra y empieza por la bienvenida, con lo legal ya aceptado", async () => {
    await conNube(async srv => {
      abrirAcceso("crear");
      await formulario({ correo: "Ana@Ejemplo.es", clave: "contraseña-larga", legal: true });
      await hasta(() => !accesoVisible());
      esperar(SESION.usuario.email).igualA("ana@ejemplo.es");
      esperar(!!BV).cierto();
      esperar(BV.edadOk && BV.legalOk).cierto();
      /* lo de este navegador ya está en su cuenta */
      await hasta(() => srv.doc("ana@ejemplo.es", "escritorio/perfil") !== undefined);
      esperar(Object.keys(DOCS).every(nd => srv.doc("ana@ejemplo.es", "escritorio/" + nd) !== undefined)).cierto();
      esperar(srv.actividad.length).igualA(1);
    });
  });
  prueba("un correo que ya tiene cuenta lo dice claro", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es");
      abrirAcceso("crear");
      await formulario({ correo: "ana@ejemplo.es", clave: "otra-contraseña", legal: true });
      esperar(avisoAcceso()).contiene("Ya hay una cuenta");
      esperar(SESION).nulo();
    });
  });
  prueba("con la contraseña mal no entra, y con la buena sí", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es", "la-de-verdad");
      abrirAcceso("entrar");
      await formulario({ correo: "ana@ejemplo.es", clave: "la-de-mentira" });
      esperar(avisoAcceso()).contiene("no son correctos");
      await formulario({ clave: "la-de-verdad" });
      await hasta(() => !accesoVisible());
      esperar(SESION.usuario.email).igualA("ana@ejemplo.es");
    });
  });
  prueba("una cuenta que ya tenía su curso no pasa por la bienvenida", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es");
      const perfil = Object.assign(perfilDef(), { nombre: "Ana", etapa: "ciclo-sup", ciclo: "DAW", listo: true });
      srv.escribir("ana@ejemplo.es", "escritorio/perfil", { perfil });
      BV = null;
      await entrarComo(srv, "ana@ejemplo.es");
      esperar(normalizarPerfil().nombre).igualA("Ana");
      esperar(!!BV).falso();
    });
  });
  prueba("sin conexión, lo dice en vez de quedarse colgada", async () => {
    await conNube(async srv => {
      srv.sinRed = true;
      abrirAcceso("entrar");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga" });
      esperar(avisoAcceso()).contiene("No hay conexión");
    });
  });
  prueba("«he olvidado la contraseña» no dice si el correo tiene cuenta", async () => {
    await conNube(async () => {
      abrirAcceso("olvido");
      await formulario({ correo: "cualquiera@ejemplo.es" });
      esperar(avisoAcceso()).contiene("Si hay una cuenta con ese correo");
    });
  });
  prueba("el enlace del correo lleva a poner una contraseña nueva, y entra", async () => {
    await conNube(async srv => {
      const u = srv.crear("ana@ejemplo.es", "la-vieja-olvidada");
      const s = { access_token: "acc-recupera", refresh_token: "ref-recupera" };
      srv.tokens.set(s.access_token, u.id); srv.refrescos.set(s.refresh_token, u.id);
      const antes = location.href;
      try {
        history.replaceState(null, "", location.pathname + "#access_token=acc-recupera&refresh_token=ref-recupera&expires_in=3600&type=recovery");
        await arrancarNube();
        esperar(ACC && ACC.modo).igualA("nueva");
        esperar(location.hash).igualA("");
        await formulario({ clave: "la-nueva-buena" });
        await hasta(() => !accesoVisible());
        esperar(srv.usuarios[0].pass).igualA("la-nueva-buena");
      } finally { history.replaceState(null, "", antes.split("#")[0]); }
    });
  });
});

grupo("Cuentas: lo tuyo, en tu cuenta", () => {
  prueba("lo que cambias se sube solo", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tareas.push({ id: "t1", titulo: "Práctica de SQL", modId: "", fecha: hoyISO(), hecha: false });
      guardar("agenda");
      await hasta(() => (srv.doc("ana@ejemplo.es", "escritorio/agenda") || { tareas: [] }).tareas.some(t => t.id === "t1"));
    });
  });
  prueba("lo que se cambia en otro dispositivo llega al volver a la app", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      srv.escribir("ana@ejemplo.es", "escritorio/agenda", { tareas: [{ id: "movil", titulo: "Desde el móvil", modId: "", fecha: hoyISO(), hecha: false }], examenes: [] });
      await db.traer();
      esperar(S.tareas.map(t => t.id)).contiene("movil");
    });
  });
  prueba("lo que estás cambiando aquí no lo pisa lo que llega de otro dispositivo", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tareas = [{ id: "aqui", titulo: "Recién escrita aquí", modId: "", fecha: hoyISO(), hecha: false }];
      guardar("agenda");                                        /* aún no ha salido: espera medio segundo */
      srv.escribir("ana@ejemplo.es", "escritorio/agenda", { tareas: [{ id: "vieja", titulo: "Vieja", modId: "", fecha: hoyISO(), hecha: false }], examenes: [] });
      await db.traer();
      esperar(S.tareas.map(t => t.id)).igualA(["aqui"]);
      esperar(srv.doc("ana@ejemplo.es", "escritorio/agenda").tareas.map(t => t.id)).igualA(["aqui"]);
    });
  });
  prueba("sin conexión se apunta, se avisa arriba y se sube al volver", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      srv.sinRed = true;
      const n = { id: "ap1", titulo: "Apunte en el metro", cuerpo: "sin cobertura", modId: "", tags: [], creado: new Date().toISOString(), editado: new Date().toISOString() };
      S.apuntes[n.id] = n; guardarApunte(n);
      await hasta(() => db.pendientes().includes("apuntes/ap1") && /Sin conexión/.test($("#txtSync").textContent));
      esperar(JSON.parse(localStorage.getItem("desk-daw:nube-pend"))).contiene("apuntes/ap1");
      srv.sinRed = false;
      await db.traer();
      esperar(srv.doc("ana@ejemplo.es", "apuntes/ap1").titulo).igualA("Apunte en el metro");
      esperar(db.pendientes()).igualA([]);
      esperar($("#txtSync").textContent).contiene("En tu cuenta");
    });
  });
  prueba("borrar un apunte lo borra también de la cuenta, y en otro dispositivo desaparece", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      const n = { id: "ap2", titulo: "Para borrar", cuerpo: "", modId: "", tags: [], creado: new Date().toISOString(), editado: new Date().toISOString() };
      S.apuntes[n.id] = n; guardarApunte(n);
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/ap2") !== undefined);
      await db.doc("apuntes/ap2").delete();
      esperar(srv.doc("ana@ejemplo.es", "apuntes/ap2")).igualA(undefined);
      /* y al revés: si se borra en otro sitio, aquí también */
      srv.escribir("ana@ejemplo.es", "apuntes/ap3", { id: "ap3", titulo: "Del otro", cuerpo: "", tags: [] });
      await db.traer();
      esperar(!!S.apuntes.ap3).cierto();
      const u = srv.usuarios[0]; srv.docs.get(u.id).delete("apuntes/ap3");
      await db.traer();
      esperar(!!S.apuntes.ap3).falso();
    });
  });
  prueba("la sesión caducada se renueva sola, sin volver a pedir la contraseña", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      const viejo = SESION.access_token;
      SESION.expira = Date.now() - 1000;
      await db.traer();
      esperar(SESION.access_token !== viejo).cierto();
      esperar(accesoVisible()).falso();
    });
  });
  prueba("si la sesión ya no vale, vuelve a pedir entrar sin perder lo guardado", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tareas = [{ id: "mia", titulo: "No se pierde", modId: "", fecha: hoyISO(), hecha: false }]; guardarLocal();
      srv.refrescos.clear(); SESION.expira = Date.now() - 1000;
      await db.traer().catch(() => {});
      await hasta(() => accesoVisible());
      esperar(avisoAcceso()).contiene("caducado");
      esperar(S.tareas.map(t => t.id)).contiene("mia");
    });
  });
});

grupo("Cuentas: mantener la sesión iniciada", () => {
  const enSesion = () => { try { return sessionStorage.getItem("desk-daw:sesion"); } catch (e) { return null; } };
  prueba("la casilla sale marcada al entrar y al crear la cuenta, y la sesión se queda en el dispositivo", async () => {
    await conNube(async srv => {
      abrirAcceso("crear");
      esperar($("#accRecordar").checked).cierto();
      abrirAcceso("entrar");
      esperar($("#accRecordar").checked).cierto();
      srv.crear("marta@correo.es", "contraseña-larga");
      await formulario({ correo: "marta@correo.es", clave: "contraseña-larga" });
      esperar(accesoVisible()).falso();
      esperar(!!localStorage.getItem("desk-daw:sesion")).cierto();
      esperar(enSesion()).nulo();
      esperar(sesionTemporal()).falso();
    });
  });

  prueba("desmarcada, la sesión solo vive mientras el navegador está abierto", async () => {
    await conNube(async srv => {
      srv.crear("luis@correo.es", "contraseña-larga");
      abrirAcceso("entrar");
      $("#accRecordar").checked = false;
      await formulario({ correo: "luis@correo.es", clave: "contraseña-larga" });
      esperar(accesoVisible()).falso();
      esperar(sesionTemporal()).cierto();
      esperar(localStorage.getItem("desk-daw:sesion")).nulo();
      esperar(!!enSesion()).cierto();
      esperar(leerSesion().usuario.email).igualA("luis@correo.es");
      esperar(bloqueCuenta()).contiene("al cerrarlo se cierra la sesión");
    });
  });

  prueba("la casilla no se desmarca sola si el formulario se repinta por un error", async () => {
    await conNube(async () => {
      abrirAcceso("entrar");
      const c = $("#accRecordar"); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
      await formulario({ correo: "mal", clave: "x" });
      esperar(avisoAcceso()).contiene("no parece válido");
      esperar($("#accRecordar").checked).falso();
    });
  });

  prueba("al cerrar la pestaña, la copia de este ordenador se va (y la sesión sigue si solo recargas)", async () => {
    await conNube(async srv => {
      srv.crear("eva@correo.es", "contraseña-larga");
      abrirAcceso("entrar"); $("#accRecordar").checked = false;
      await formulario({ correo: "eva@correo.es", clave: "contraseña-larga" });
      await hasta(() => db && db.pendientes().length === 0);
      guardaLS("tema", "oscuro");
      window.dispatchEvent(new Event("pagehide"));
      const quedan = Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).sort();
      esperar(quedan.filter(k => !["desk-daw:tema", "desk-daw:vistos", "desk-daw:sesion-temporal"].includes(k))).igualA([]);
      esperar(leeLS("tema")).igualA("oscuro");
      esperar(!!enSesion()).cierto();
    });
  });

  prueba("si queda algo sin subir, no se borra al cerrar: se sube al volver", async () => {
    await conNube(async () => {
      guardaLS("sesion-temporal", true); guardaLS("nube-pend", ["apuntes/a1"]); guardaLS("dueno", "u1");
      SESION = { access_token: "t", refresh_token: "r", expira: Date.now() + 3600000, usuario: { id: "u1", email: "x@y.es" } };
      window.dispatchEvent(new Event("pagehide"));
      esperar(leeLS("nube-pend")).igualA(["apuntes/a1"]);
      SESION = null;
    });
  });

  prueba("al abrir otra vez con el navegador cerrado, no queda nada de la persona anterior", async () => {
    await conNube(async () => {
      guardaLS("sesion-temporal", true); guardaLS("dueno", "u-anterior");
      S.apuntes.a1 = { id: "a1", titulo: "De otra persona", cuerpo: "privado" };
      guardarLocal();
      await arrancarNube();
      esperar(accesoVisible()).cierto();
      esperar(leeLS("dueno")).nulo();
      esperar(Object.keys(S.apuntes).length).igualA(0);
      esperar(JSON.stringify(localStorage)).noContiene("De otra persona");
      /* quien venga después también la ve desmarcada: es un ordenador compartido */
      esperar($("#accRecordar").checked).falso();
    });
  });

  prueba("cerrar sesión la quita de los dos sitios", async () => {
    await conNube(async srv => {
      srv.crear("ana@correo.es", "contraseña-larga");
      abrirAcceso("entrar"); $("#accRecordar").checked = false;
      await formulario({ correo: "ana@correo.es", clave: "contraseña-larga" });
      await hasta(() => db && db.pendientes().length === 0);
      await salirCuenta();
      esperar(enSesion()).nulo();
      esperar(localStorage.getItem("desk-daw:sesion")).nulo();
      esperar(accesoVisible()).cierto();
    });
  });
});

grupo("Cuentas: salir, cambiar de persona y borrar la cuenta", () => {
  prueba("al salir se va lo de este navegador y vuelve la pantalla de entrar", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tareas = [{ id: "t", titulo: "SECRETO_DE_ANA", modId: "", fecha: hoyISO(), hecha: false }]; guardarLocal();
      await salirCuenta();
      esperar(SESION).nulo();
      esperar(accesoVisible()).cierto();
      esperar(JSON.stringify(S)).noContiene("SECRETO_DE_ANA");
      esperar(localStorage.getItem("desk-daw:estado") || "").noContiene("SECRETO_DE_ANA");
    });
  });
  prueba("si entra otra persona en el mismo navegador, no ve nada de la anterior", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tareas = [{ id: "t", titulo: "SECRETO_DE_ANA", modId: "", fecha: hoyISO(), hecha: false }]; guardarLocal();
      srv.crear("bea@ejemplo.es");
      await nubeEntrar("bea@ejemplo.es", "contraseña-larga");      /* sin salir antes */
      await conectarNube();
      esperar(JSON.stringify(S)).noContiene("SECRETO_DE_ANA");
      esperar(srv.doc("bea@ejemplo.es", "escritorio/agenda") && JSON.stringify(srv.doc("bea@ejemplo.es", "escritorio/agenda"))).noContiene("SECRETO_DE_ANA");
    });
  });
  prueba("con cambios sin subir, pregunta antes de salir", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      srv.sinRed = true;
      db.pendiente("escritorio/agenda");
      let preguntado = "";
      confirmar = async txt => { preguntado = txt; return false; };
      await salirCuenta();
      esperar(preguntado).contiene("no se han subido");
      esperar(SESION !== null).cierto();                       /* dijo que no: sigue dentro */
    });
  });
  prueba("borrar la cuenta se lo lleva todo, aquí y en el servidor", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      await hasta(() => srv.doc("ana@ejemplo.es", "escritorio/perfil") !== undefined);
      confirmar = async () => true;
      await borrarCuenta();
      esperar(srv.usuarios.length).igualA(0);
      esperar(srv.docs.size).igualA(0);
      esperar(SESION).nulo();
      esperar(accesoVisible()).cierto();
      esperar(avisoAcceso()).contiene("borrado");
    });
  });
  prueba("Ajustes → Datos enseña con qué cuenta has entrado", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      seccion = "ajustes"; ajTab = "datos"; pinta();
      esperar($("#contenido").textContent).contiene("ana@ejemplo.es");
      esperar(!!$("#accSalir") && !!$("#accBorrar")).cierto();
      esperar($("#contenido").textContent).contiene("En tu cuenta de GritNook");
    });
  });
});

grupo("Cuentas: lo que se arregló por el camino", () => {
  prueba("«Borrar todo» pone a cero en la cuenta también el horario, las tarjetas, el progreso, la oposición y el Inicio", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.horario = [{ id: "h", dia: 1, ini: "09:00", fin: "10:00", modId: "" }];
      S.tarjetas = [{ id: "c", frente: "¿SQL?", dorso: "Sí", caja: 1, proximo: hoyISO() }];
      Object.keys(DOCS).forEach(nd => guardar(nd));
      await hasta(() => (srv.doc("ana@ejemplo.es", "escritorio/repaso") || {}).tarjetas && srv.doc("ana@ejemplo.es", "escritorio/repaso").tarjetas.length === 1);
      seccion = "ajustes"; ajTab = "datos"; pinta();
      confirmar = async () => true;
      $("#apBorrarTodo").click();
      await hasta(() => (srv.doc("ana@ejemplo.es", "escritorio/repaso") || { tarjetas: [1] }).tarjetas.length === 0);
      await hasta(() => (srv.doc("ana@ejemplo.es", "escritorio/horario") || { horario: [1] }).horario.length === 0);
      if (BV) { BV = null; $("#entrada").hidden = true; }
    });
  });
  prueba("cargar una copia la sube entera, casillero incluido, y quita lo que no estaba en ella", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      const viejo = { id: "viejo", titulo: "No está en la copia", cuerpo: "", modId: "", tags: [] };
      S.apuntes.viejo = viejo; guardarApunte(viejo);
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/viejo") !== undefined);
      const copia = Object.assign(estadoInicial(), {
        tarjetas: [{ id: "c1", frente: "¿De la copia?", dorso: "Sí", caja: 1, proximo: hoyISO() }],
        apuntes: { nuevo: { id: "nuevo", titulo: "De la copia", cuerpo: "", modId: "", tags: [] } },
        casillero: { d1: { id: "d1", titulo: "enlace", tipo: "enlace", url: "https://example.org", modId: "" } }
      });
      seccion = "ajustes"; ajTab = "datos"; pinta();
      confirmar = async () => true;
      const inp = $("#apInputImportar"), dt = new DataTransfer();
      dt.items.add(new File([JSON.stringify(copia)], "copia.json", { type: "application/json" }));
      inp.files = dt.files;
      inp.dispatchEvent(new Event("change", { bubbles: true }));
      await hasta(() => srv.doc("ana@ejemplo.es", "casillero/d1") !== undefined);
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/viejo") === undefined);
      await hasta(() => ((srv.doc("ana@ejemplo.es", "escritorio/repaso") || {}).tarjetas || []).some(c => c.id === "c1"));
      esperar(srv.doc("ana@ejemplo.es", "apuntes/nuevo").titulo).igualA("De la copia");
    });
  });
});

grupo("Cuentas: el panel del creador", () => {
  prueba("quien no es el creador no lo tiene, ni entrando por la dirección", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      esperar(esAdminNube).falso();
      esperar(secVisibles().map(s => s.id)).noContiene("panel");
      seccion = "panel"; pinta();
      esperar(seccion).igualA("escritorio");
    });
  });
  prueba("el creador lo ve, con cada cuenta y su actividad", async () => {
    await conNube(async srv => {
      srv.crear("bea@ejemplo.es"); srv.crear("carlos@ejemplo.es");
      await entrarComo(srv, "gabriel_gabiz@hotmail.com", { admin: true });
      esperar(esAdminNube).cierto();
      esperar(secVisibles().map(s => s.id)).contiene("panel");
      seccion = "panel";
      await cargarPanel();
      const txt = $("#contenido").textContent;
      esperar(txt).contiene("Panel del creador");
      esperar(txt).contiene("bea@ejemplo.es");
      esperar(txt).contiene("carlos@ejemplo.es");
      esperar(txt).contiene("Cuentas · 3");
    });
  });
  prueba("si el servidor no se lo da, lo dice en vez de enseñar nada", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "gabriel_gabiz@hotmail.com", { admin: true });
      srv.admins.clear();
      seccion = "panel";
      await cargarPanel();
      esperar($("#contenido").textContent).contiene("Solo el creador");
    });
  });
  prueba("la hoja para Excel protege los correos que parezcan una fórmula", async () => {
    await conNube(async () => {
      PANEL.datos = { usuarios: [{ email: "=HYPERLINK(\"x\")@malo.es", alta: "2026-09-01T10:00:00Z", ultimo: null, dias7: 0, dias30: 0, veces: 0, etapa: null, ocupa: 0 }] };
      const csv = csvPanel();
      esperar(csv.charCodeAt(0)).igualA(0xFEFF);
      esperar(csv).contiene("'=HYPERLINK");
      esperar(csv).noContiene(";=HYPERLINK");
    });
  });
});

grupo("Cuentas: las estadísticas del fundador", () => {
  prueba("de dónde llega la visita: el ?ref= del enlace manda, luego la app y luego la web de la que viene", () => {
    const o = (url, ref = "", ua = "", instal = false) => origenVisita({ url, ref, ua, instal });
    const aqui = location.origin + "/";
    esperar(o(aqui + "?ref=instagram")).igualA("instagram");
    esperar(o(aqui + "?ref=IG")).igualA("instagram");
    esperar(o(aqui + "?utm_source=whatsapp")).igualA("whatsapp");
    esperar(o(aqui + "?ref=<script>")).igualA("otro");
    esperar(o(aqui, "", "Mozilla/5.0 Instagram 300.0")).igualA("instagram");
    esperar(o(aqui, "https://l.instagram.com/?u=x")).igualA("instagram");
    esperar(o(aqui, "https://t.co/abc")).igualA("x");
    esperar(o(aqui, "https://www.google.es/")).igualA("google");
    esperar(o(aqui, "https://wa.me/123")).igualA("whatsapp");
    esperar(o(aqui, "https://blog.cualquiera.com/")).igualA("otro");
    esperar(o(aqui, "")).igualA("directo");
    esperar(o(aqui, "", "", true)).igualA("app");
  });
  prueba("con qué entra: móvil, tableta u ordenador", () => {
    esperar(dispositivoVisita(390, true)).igualA("movil");
    esperar(dispositivoVisita(1440, false)).igualA("ordenador");
    esperar(["tablet", "movil"]).contiene(dispositivoVisita(820, true));
  });
  prueba("abrir la app suma 1, sin cuenta y sin nada que te identifique, y solo una vez", async () => {
    await conNube(async srv => {
      visitaContada = false;
      contarVisita(); contarVisita();
      await hasta(() => srv.visitas.length === 1);
      await dormir(30);
      esperar(srv.visitas.length).igualA(1);
      esperar(Object.keys(srv.visitas[0]).sort()).igualA(["conCuenta", "p_dispositivo", "p_instalada", "p_origen"]);
      esperar(srv.visitas[0].conCuenta).falso();
    });
  });
  prueba("el ?ref= se apunta y se quita de la barra de direcciones", async () => {
    const antes = location.pathname + location.search + location.hash;
    await conNube(async srv => {
      try {
        history.replaceState(history.state, "", location.pathname + "?ref=tiktok&utm_medium=bio");
        visitaContada = false; contarVisita();
        await hasta(() => srv.visitas.length === 1);
        esperar(srv.visitas[0].p_origen).igualA("tiktok");
        esperar(location.search).igualA("");
      } finally { history.replaceState(history.state, "", antes); }
    });
  });
  prueba("quien lo apaga en Ajustes no cuenta", async () => {
    await conNube(async srv => {
      BV = null; $("#entrada").hidden = true;
      seccion = "ajustes"; ajTab = "datos"; pinta();
      const c = $("#acEstad");
      esperar(c.checked).cierto();
      c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
      esperar(leeLS("sin-estadisticas")).cierto();
      visitaContada = false; contarVisita(); await dormir(30);
      esperar(srv.visitas.length).igualA(0);
    });
  });
  prueba("al crear la cuenta se apunta de dónde llegó, una sola vez", async () => {
    await conNube(async srv => {
      visitaContada = false; ORIGEN_SESION = "";
      history.replaceState(history.state, "", location.pathname + "?ref=whatsapp");
      contarVisita();
      abrirAcceso("crear");
      await formulario({ correo: "nueva@ejemplo.es", clave: "una-clave-larga", legal: true });
      await hasta(() => srv.origenes.size === 1);
      esperar([...srv.origenes.values()][0]).igualA({ origen: "whatsapp", dispositivo: dispositivoVisita() });
    });
  });
  prueba("el panel lo cuenta todo: ahora, visitas, de dónde, con qué, a qué hora, qué estudian y si vuelven", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "gabriel_gabiz@hotmail.com", { admin: true });
      seccion = "panel";
      await cargarPanel();
      const c = $("#contenido"), t = c.textContent;
      ["Ahora", "en la última hora", "90", "De visita a quedarse", "Instagram", "WhatsApp", "Móvil", "Ordenador", "20 % con la app instalada",
        "Más a las 21:00", "75 %", "50 %", etapaDe("ciclo-sup").nombre, etapaDe("oposicion").nombre, "Llegó por", "?ref=instagram", "Al día a las"]
        .forEach(x => esperar(t).contiene(x));
      esperar(c.querySelectorAll(".pa-hora").length).igualA(24);
      esperar(c.querySelector(".pa-hora.pico").getAttribute("title")).contiene("21:00");
      esperar(c.querySelectorAll(".pa-visita").length).igualA(2);
    });
  });
  prueba("mientras está abierto se pone al día solo, sin parpadear", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "gabriel_gabiz@hotmail.com", { admin: true });
      seccion = "panel"; await cargarPanel();
      const n = srv.llamadas.filter(l => l.includes("panel_admin")).length;
      refrescoPanel();
      esperar(srv.llamadas.filter(l => l.includes("panel_admin")).length).igualA(n);
      PANEL.en = Date.now() - 60000;
      refrescoPanel();
      esperar(PANEL.cargando).cierto();
      esperar($("#paActualizar").disabled).falso();
      await hasta(() => !PANEL.cargando);
      esperar(srv.llamadas.filter(l => l.includes("panel_admin")).length).igualA(n + 1);
    });
  });
});
