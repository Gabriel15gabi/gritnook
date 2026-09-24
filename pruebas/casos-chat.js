/* ChatClase. Sale «Próximamente», así que primero se prueba eso: que se vea
   aparte y en naranja, y que no llame a ningún chat. Después, encendido solo
   mientras dura cada prueba, el chat entero contra un servidor de mentira que
   se porta como el de verdad: apodos y normas, canales, mensajes, reacciones,
   archivos, tareas, reportes, bloqueos y moderación. Las reglas de la base de
   datos de verdad se prueban aparte, contra Postgres: backend/probar-chat.js. */

/* el chat encima del servidor de las cuentas */
function extenderChat(srv) {
  const C = srv.chat = {
    canales: [
      { id: "anuncios", nombre: "Anuncios", descripcion: "Novedades de GritNook", orden: 0, solo_admin: true },
      { id: "general", nombre: "General", descripcion: "Para hablar de todo un poco", orden: 1, solo_admin: false },
      { id: "dudas", nombre: "Dudas", descripcion: "Pregunta lo que no entiendas", orden: 2, solo_admin: false },
      { id: "tareas", nombre: "Tareas", descripcion: "Comparte lo que has hecho y lo que te queda", orden: 3, solo_admin: false }],
    perfiles: new Map(), mensajes: [], reacciones: [], reportes: [], baneados: new Map(), archivos: new Map(), reloj: 0, despacio: false
  };
  const base = srv.fetch;
  const hora = () => new Date(Date.now() + (++C.reloj)).toISOString();
  const r = (status, obj) => ({ ok: status >= 200 && status < 300, status, text: async () => obj === undefined ? "" : JSON.stringify(obj), blob: async () => obj });
  const uidDe = email => (srv.usuarios.find(u => u.email === email) || {}).id;
  const fila = m => Object.assign({}, m, { chat_perfiles: { apodo: (C.perfiles.get(m.autor) || {}).apodo || "?" },
    chat_reacciones: C.reacciones.filter(x => x.mensaje === m.id).map(x => ({ emoji: x.emoji, usuario: x.usuario })) });
  const baneado = uid => { const b = C.baneados.get(uid); return !!b && b > Date.now(); };
  const esAdmin = uid => { const u = srv.usuarios.find(x => x.id === uid); return !!u && srv.admins.has(u.email); };
  const toca = id => { const m = C.mensajes.find(x => x.id === id); if (m) m.actualizado = hora(); };
  srv.chatPerfil = (email, apodo) => { const id = uidDe(email) || srv.crear(email).id; C.perfiles.set(id, { apodo, normas: hora() }); return id; };
  /* otra persona escribe desde su móvil */
  srv.chatEscribir = (email, canal, texto, extra = {}) => {
    const autor = C.perfiles.has(uidDe(email)) ? uidDe(email) : srv.chatPerfil(email, email.split("@")[0]);
    const t = hora();
    const m = Object.assign({ id: "srv-" + azar(8), canal, autor, texto, respuesta_a: null, tarea: null, adjuntos: [], fijado: false, borrado: false, editado: null, creado: t, actualizado: t }, extra);
    C.mensajes.push(m); return m;
  };
  srv.chatReaccionar = (email, id, emoji) => { C.reacciones.push({ mensaje: id, usuario: uidDe(email), emoji }); toca(id); };
  srv.fetch = async (url, op = {}) => {
    const u = new URL(url), ruta = u.pathname, q = u.searchParams;
    if (!/^\/rest\/v1\/(rpc\/)?chat_|^\/storage\/v1\//.test(ruta)) return base(url, op);
    srv.llamadas.push((op.method || "GET") + " " + ruta);
    if (srv.sinRed) throw new TypeError("Failed to fetch");
    const uid = srv.tokens.get(String((op.headers || {}).Authorization || "").replace("Bearer ", ""));
    if (!uid) return r(401, { code: "PGRST301", message: "JWT expired" });
    const metodo = op.method || "GET";
    const cuerpo = typeof op.body === "string" && op.body.startsWith("{") ? JSON.parse(op.body) : op.body;
    const eq = k => (q.get(k) || "").replace(/^eq\./, "");
    /* los archivos */
    if (ruta.startsWith("/storage/v1/object/")) {
      const resto = decodeURIComponent(ruta.slice("/storage/v1/object/".length));
      if (resto === "list/chat-adjuntos") return r(200, [...C.archivos.keys()].filter(k => k.startsWith(cuerpo.prefix + "/")).map(k => ({ name: k.split("/").pop() })));
      if (resto === "chat-adjuntos" && metodo === "DELETE") { cuerpo.prefixes.forEach(k => { if (k.startsWith(uid + "/")) C.archivos.delete(k); }); return r(200, []); }
      if (resto.startsWith("authenticated/chat-adjuntos/")) {
        const a = C.archivos.get(resto.slice("authenticated/chat-adjuntos/".length));
        return a ? r(200, a.blob) : r(404, { message: "Object not found" });
      }
      const k = resto.replace(/^chat-adjuntos\//, "");
      if (metodo === "DELETE") { if (k.startsWith(uid + "/") || esAdmin(uid)) C.archivos.delete(k); return r(200, []); }
      if (!k.startsWith(uid + "/") || baneado(uid)) return r(403, { message: "new row violates row-level security policy" });
      C.archivos.set(k, { blob: cuerpo, tipo: op.headers["Content-Type"], tam: cuerpo.size });
      return r(200, { Key: "chat-adjuntos/" + k });
    }
    if (ruta === "/rest/v1/chat_perfiles") {
      if (metodo === "GET") { const p = C.perfiles.get(eq("usuario")); return r(200, p ? [p] : []); }
      const ap = String(cuerpo.apodo || "");
      if (ap.trim().length < 2 || ap.length > 24 || /[<>@#]/.test(ap)) return r(400, { code: "23514", message: "violates check constraint" });
      C.perfiles.set(uid, { apodo: ap, normas: cuerpo.normas }); return r(201, [C.perfiles.get(uid)]);
    }
    if (ruta === "/rest/v1/chat_canales") return r(200, C.canales);
    if (ruta === "/rest/v1/rpc/chat_estado") {
      return r(200, { canales: C.canales.map(c => ({ canal: c.id, ultimo: C.mensajes.filter(m => m.canal === c.id && !m.borrado).map(m => m.creado).sort().pop() || null })),
        baneado: baneado(uid) ? new Date(C.baneados.get(uid)).toISOString() : null, admin: esAdmin(uid) });
    }
    if (ruta === "/rest/v1/chat_mensajes") {
      if (metodo === "POST") {
        if (!C.perfiles.has(uid)) return r(409, { code: "23503", message: "violates foreign key constraint" });
        if (baneado(uid)) return r(403, { code: "42501", message: "No puedes escribir en ChatClase por ahora", hint: "chat_baneado" });
        if ((C.canales.find(c => c.id === cuerpo.canal) || {}).solo_admin && !esAdmin(uid)) return r(403, { code: "42501", message: "En este canal solo escribe el equipo de GritNook", hint: "chat_solo_admin" });
        if (C.despacio) return r(400, { code: "P0001", message: "Vas muy rápido: espera unos segundos", hint: "chat_despacio" });
        if ((cuerpo.adjuntos || []).some(a => !String(a.ruta).startsWith(uid + "/"))) return r(400, { code: "22023", message: "Adjunto no válido" });
        if (!String(cuerpo.texto || "").trim() && !cuerpo.tarea && !(cuerpo.adjuntos || []).length) return r(400, { code: "23514", message: "chat_no_vacio" });
        const t = hora();
        const m = { id: cuerpo.id || "m-" + azar(8), canal: cuerpo.canal, autor: uid, texto: cuerpo.texto || "", respuesta_a: cuerpo.respuesta_a || null, tarea: cuerpo.tarea || null,
          adjuntos: cuerpo.adjuntos || [], fijado: false, borrado: false, editado: null, creado: t, actualizado: t };
        C.mensajes.push(m); return r(201, [fila(m)]);
      }
      if (metodo === "PATCH") {
        const m = C.mensajes.find(x => x.id === eq("id") && x.autor === uid && !x.borrado);
        if (!m) return r(200, []);
        m.texto = cuerpo.texto; m.editado = hora(); m.actualizado = m.editado; return r(200, [fila(m)]);
      }
      let l = C.mensajes.filter(m => m.canal === eq("canal"));
      if (q.get("fijado")) l = l.filter(m => m.fijado);
      if (q.get("borrado")) l = l.filter(m => !m.borrado);
      if (q.get("texto")) { const t = q.get("texto").replace(/^ilike\.\*|\*$/g, "").toLowerCase(); l = l.filter(m => m.texto.toLowerCase().includes(t)); }
      if (q.get("creado")) { const x = q.get("creado").replace(/^lt\./, ""); l = l.filter(m => m.creado < x); }
      if (q.get("actualizado")) { const x = q.get("actualizado").replace(/^gt\./, ""); l = l.filter(m => m.actualizado > x); }
      const [campo, dir] = String(q.get("order") || "creado.desc").split(".");
      l.sort((a, b) => dir === "desc" ? b[campo].localeCompare(a[campo]) : a[campo].localeCompare(b[campo]));
      if (q.get("limit")) l = l.slice(0, +q.get("limit"));
      return r(200, l.map(fila));
    }
    if (ruta === "/rest/v1/chat_reacciones") {
      if (metodo === "POST") {
        if (C.reacciones.some(x => x.mensaje === cuerpo.mensaje && x.usuario === uid && x.emoji === cuerpo.emoji)) return r(409, { code: "23505", message: "duplicate key" });
        C.reacciones.push({ mensaje: cuerpo.mensaje, usuario: uid, emoji: cuerpo.emoji }); toca(cuerpo.mensaje); return r(201);
      }
      const id = eq("mensaje"), emoji = eq("emoji"), quien = eq("usuario");
      C.reacciones = C.reacciones.filter(x => !(x.mensaje === id && x.emoji === emoji && x.usuario === quien && quien === uid)); toca(id); return r(204);
    }
    if (ruta === "/rest/v1/chat_reportes") {
      if (C.reportes.some(x => x.mensaje === cuerpo.mensaje && x.usuario === uid)) return r(409, { code: "23505", message: "duplicate key" });
      C.reportes.push({ mensaje: cuerpo.mensaje, usuario: uid, motivo: cuerpo.motivo }); return r(201);
    }
    if (ruta === "/rest/v1/rpc/chat_borrar") {
      const m = C.mensajes.find(x => x.id === cuerpo.p_id);
      if (!m || (m.autor !== uid && !esAdmin(uid))) return r(403, { code: "42501", message: "Ese mensaje no lo puedes borrar" });
      Object.assign(m, { borrado: true, texto: "", adjuntos: [], tarea: null, fijado: false, actualizado: hora() });
      C.reacciones = C.reacciones.filter(x => x.mensaje !== m.id); return r(204);
    }
    if (ruta === "/rest/v1/rpc/chat_fijar") {
      if (!esAdmin(uid)) return r(403, { code: "42501", message: "Solo el creador fija mensajes" });
      const m = C.mensajes.find(x => x.id === cuerpo.p_id); if (m) { m.fijado = cuerpo.p_si; m.actualizado = hora(); } return r(204);
    }
    if (ruta === "/rest/v1/rpc/chat_banear") {
      if (!esAdmin(uid)) return r(403, { code: "42501", message: "Solo el creador bloquea" });
      if (cuerpo.p_horas > 0) C.baneados.set(cuerpo.p_usuario, Date.now() + cuerpo.p_horas * 3600000); else C.baneados.delete(cuerpo.p_usuario);
      return r(204);
    }
    return r(404, { message: "no existe " + ruta });
  };
  return srv;
}
/* una prueba con el chat encendido, con cuenta y ya dentro de #general */
async function conChat(fn, { admin = false, email = "ana@ejemplo.es", apodo = "Ana", entrar = true } = {}) {
  return conNube(async srv => {
    extenderChat(srv); nubeFetch = srv.fetch;
    const antes = { activo: CHAT_ACTIVO, confirmar };
    CHAT_ACTIVO = true; chatOlvidar();
    BV = null; $("#entrada").hidden = true; document.body.classList.remove("en-entrada");
    try {
      await entrarComo(srv, email, { admin });
      if (apodo) srv.chatPerfil(email, apodo);
      if (entrar) { irASeccion("chat"); await hasta(() => !!$("#ccTexto") || !!$("#ccUnirse"), 4000); }
      return await fn(srv);
    } finally {
      chatParar(); CHAT_ACTIVO = antes.activo; confirmar = antes.confirmar; chatOlvidar();
      document.body.classList.remove("en-chat"); const d = $("#dlg"); if (d.open) d.close();
    }
  });
}
const ccEscribe = txt => { const t = $("#ccTexto"); t.value = txt; t.dispatchEvent(new Event("input", { bubbles: true })); return t; };
const ccTecla = (el, key, extra = {}) => el.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
const ccEnviarTexto = async txt => { ccTecla(ccEscribe(txt), "Enter"); await hasta(() => !ccMios().some(m => m.estado === "enviando")); };
const ccUltimo = () => [...document.querySelectorAll("#ccLog .cc-msg")].pop();
async function imagenDePrueba(w = 60, h = 40) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.fillStyle = "#7c6cf0"; x.fillRect(0, 0, w, h);
  return new File([await new Promise(r => c.toBlob(r, "image/png"))], "esquema.png", { type: "image/png" });
}

grupo("ChatClase y TutorIA: salen «Próximamente»", () => {
  prueba("los interruptores salen apagados", () => {
    esperar(CHAT_ACTIVO).falso();
    esperar(chatActivo()).falso();
    esperar(profeActivo()).falso();
  });
  prueba("en el menú van aparte, abajo, con «Próximamente» en naranja", () => conEstado(() => {
    const antes = seccion; seccion = "escritorio"; BV = null; pinta();
    try {
      const g = $("#riel .riel-pronto");
      esperar(!!g).cierto();
      esperar([...g.querySelectorAll(".riel-item")].map(b => b.dataset.sec)).igualA(["tutoria", "chat"]);
      esperar(g.textContent).contiene("TutorIA");
      esperar(g.textContent).contiene("ChatClase");
      esperar(g.querySelectorAll(".riel-pronto-tag").length).igualA(2);
      const color = getComputedStyle(g.querySelector(".riel-pronto-tag")).color;
      const prueba = document.createElement("span"); prueba.style.color = "var(--pronto)"; document.body.append(prueba);
      const naranja = getComputedStyle(prueba).color; prueba.remove();
      esperar(color).igualA(naranja);
      /* y no están mezclados con el resto de secciones */
      esperar($('#riel > .riel-item[data-sec="chat"]')).nulo();
    } finally { seccion = antes; pinta(); }
  }));
  prueba("ChatClase enseña un avance y no llama a ningún chat", async () => {
    const antes = { f: nubeFetch, seccion }; let llamadas = 0;
    nubeFetch = (...a) => { llamadas++; return antes.f(...a); };
    try {
      irASeccion("chat"); await dormir(50);
      esperar($("#contenido").textContent).contiene("Así se verá");
      esperar($("#contenido").textContent).contiene("Próximamente");
      esperar($("#cc")).nulo();
      esperar(llamadas).igualA(0);
      esperar(CHAT.timer).nulo();
    } finally { nubeFetch = antes.f; seccion = antes.seccion; pinta(); }
  });
  prueba("TutorIA enseña su avance, sin ninguna IA detrás", () => conEstado(() => {
    const antes = seccion;
    try {
      irASeccion("tutoria");
      esperar(seccion).igualA("tutoria");
      esperar($("#contenido").textContent).contiene("TutorIA");
      esperar(sample).nulo();
      esperar(document.querySelector('[data-sec="tutor"]')).nulo();
    } finally { seccion = antes; pinta(); }
  }));
  prueba("con el profe encendido, en su sitio sale el de verdad", () => conProfe(() => conEstado(() => {
    const antes = seccion;
    try {
      esperar(secVisibles().map(s => s.id)).noContiene("tutoria");
      seccion = "tutoria"; pinta();
      esperar(seccion).igualA("tutor");
    } finally { seccion = antes; pinta(); }
  })));
  prueba("en la hoja «Más» del móvil van en su propio grupo", () => {
    try {
      abrirHojaMas();
      const h = $("#hojaMas");
      esperar(h.querySelector(".hm-grupo").textContent).contiene("Próximamente");
      esperar(h.querySelectorAll(".hm-m.es-pronto").length).igualA(2);
    } finally { cerrarHojaMas(); }
  });
});

grupo("ChatClase por dentro: entrar", () => {
  prueba("sin cuenta de GritNook, lo explica", () => {
    const antes = { activo: CHAT_ACTIVO, seccion };
    CHAT_ACTIVO = true;
    try { irASeccion("chat"); esperar($("#contenido").textContent).contiene("hace falta una cuenta"); }
    finally { CHAT_ACTIVO = antes.activo; seccion = antes.seccion; pinta(); }
  });
  prueba("la primera vez: apodo y normas, y nada de < > @ #", () => conChat(async srv => {
    esperar(!!$("#ccUnirse")).cierto();
    esperar($("#contenido").textContent).contiene("No hay mensajes privados");
    const envia = async (apodo, normas) => { $("#ccApodo").value = apodo; $("#ccNormasOk").checked = normas; $("#ccUnirse").requestSubmit(); await dormir(30); };
    await envia("A", true); esperar($("#ccUnirseAviso").textContent).contiene("entre 2 y 24");
    await envia("<b>Ana", true); esperar($("#ccUnirseAviso").textContent).contiene("no puede llevar");
    await envia("Ana López", false); esperar($("#ccUnirseAviso").textContent).contiene("aceptar las normas");
    await envia("Ana López", true);
    await hasta(() => !!$("#ccTexto"));
    esperar(srv.chat.perfiles.get(SESION.usuario.id).apodo).igualA("Ana López");
    esperar($("#ccTitulo").textContent).igualA("General");
  }, { apodo: null }));
  prueba("en el ordenador los canales van en el panel; en el móvil, en un cajón", () => conChat(async srv => {
    esperar($("#nav").textContent).contiene("Dudas");
    $("#ccCajon").click();
    esperar(!!$("#ccCajonPanel")).cierto();
    $('#ccCajonPanel [data-cc-canal="dudas"]').click();
    await hasta(() => $("#ccTitulo") && $("#ccTitulo").textContent === "Dudas");
    esperar($("#ccCajonPanel")).nulo();
    esperar(leeLS("chat-canal")).igualA("dudas");
  }));
});

grupo("ChatClase por dentro: escribir", () => {
  prueba("Intro envía: sale en el acto y queda en el servidor; Mayús + Intro, no", () => conChat(async srv => {
    ccTecla(ccEscribe("hola\nsegunda línea"), "Enter", { shiftKey: true });
    esperar(ccMios().length).igualA(0);
    await ccEnviarTexto("¡Hola a todos!");
    esperar(srv.chat.mensajes.map(m => m.texto)).igualA(["¡Hola a todos!"]);
    esperar(srv.chat.mensajes[0].autor).igualA(SESION.usuario.id);
    esperar($("#ccTexto").value).igualA("");
    esperar(ccUltimo().textContent).contiene("¡Hola a todos!");
  }));
  prueba("vacío no se envía, y con más de 2.000 letras tampoco", () => conChat(async srv => {
    ccTecla(ccEscribe("   \n  "), "Enter");
    ccTecla(ccEscribe("x".repeat(2001)), "Enter");
    await dormir(30);
    esperar(srv.chat.mensajes.length).igualA(0);
    esperar($("#ccCuenta").textContent).contiene("2001");
  }));
  prueba("el formato se aplica sobre texto ya escapado: sin colarse nada", () => {
    const h = ccFormato("**negrita** *cursiva* `código` ~~tachado~~ https://gritnook.es/a?b=1&c=2. <img src=x onerror=alert(1)> javascript:alert(1) \"><script>x</script>", "");
    esperar(h).contiene("<strong>negrita</strong>");
    esperar(h).contiene("<em>cursiva</em>");
    esperar(h).contiene('<code class="cc-cod">código</code>');
    esperar(h).contiene("<del>tachado</del>");
    esperar(h).contiene('href="https://gritnook.es/a?b=1&amp;c=2"');
    esperar(h).contiene('rel="noopener noreferrer nofollow ugc"');
    esperar(h).noContiene("<img");
    esperar(h).noContiene("<script");
    esperar(h).noContiene('href="javascript');
    const d = document.createElement("div"); d.innerHTML = h;
    esperar(d.querySelectorAll("img, script, [onerror]").length).igualA(0);
    esperar(ccFormato("```\nconst a = 1;\n```", "")).contiene('<pre class="cc-bloque"><code>const a = 1;</code></pre>');
    esperar(ccFormato('mira https://x.es/"onmouseover="alert(1)', "")).noContiene('onmouseover="alert');
  });
  prueba("mencionar: @apodo se resalta, y si te nombran a ti, se marca el mensaje", () => conChat(async srv => {
    srv.chatEscribir("bea@ejemplo.es", "general", "@Ana ¿me pasas los apuntes de @Luis?");
    await chatTick();
    const m = ccUltimo();
    esperar(m.classList.contains("me-nombra")).cierto();
    esperar(m.querySelector(".cc-mencion.yo").textContent).igualA("@Ana");
    esperar(m.querySelectorAll(".cc-mencion").length).igualA(2);
  }));
  prueba("solo emojis: se ven en grande", () => conChat(async () => {
    await ccEnviarTexto("🎉🔥");
    esperar(!!ccUltimo().querySelector(".cc-jumbo")).cierto();
    esperar(ccSoloEmoji("hola 🎉")).falso();
  }));
  prueba("los mensajes seguidos de la misma persona se juntan", () => conChat(async srv => {
    srv.chatEscribir("bea@ejemplo.es", "general", "uno");
    srv.chatEscribir("bea@ejemplo.es", "general", "dos");
    await chatTick();
    await ccEnviarTexto("tres");
    const l = [...document.querySelectorAll("#ccLog .cc-msg")];
    esperar(l.map(x => x.classList.contains("junto"))).igualA([false, true, false]);
  }));
  prueba("responder: la cita arriba y el mensaje enlazado; Escape lo deja", () => conChat(async srv => {
    const o = srv.chatEscribir("bea@ejemplo.es", "general", "¿Alguien sabe normalizar?");
    await chatTick();
    document.querySelector(`[data-cc-responder="${o.id}"]`).click();
    esperar($("#ccPie").textContent).contiene("Respondiendo a");
    ccTecla($("#ccTexto"), "Escape");
    esperar($("#ccPie").textContent).noContiene("Respondiendo a");
    document.querySelector(`[data-cc-responder="${o.id}"]`).click();
    await ccEnviarTexto("Sí: primera forma normal…");
    esperar(srv.chat.mensajes.pop().respuesta_a).igualA(o.id);
    esperar(ccUltimo().querySelector(".cc-cita").textContent).contiene("normalizar");
  }));
  prueba("editar lo tuyo con la flecha arriba; lo de otro, no se puede", () => conChat(async srv => {
    srv.chatEscribir("bea@ejemplo.es", "general", "de Bea");
    await chatTick();
    await ccEnviarTexto("Hola a todo");
    ccTecla($("#ccTexto"), "ArrowUp");
    esperar($("#ccTexto").value).igualA("Hola a todo");
    await ccEnviarTexto("Hola a todos");
    await hasta(() => srv.chat.mensajes.some(m => m.texto === "Hola a todos" && m.editado));
    esperar(ccUltimo().textContent).contiene("(editado)");
    const deBea = ccMios().find(m => m.texto === "de Bea");
    esperar(document.querySelector(`[data-cc-editar="${deBea.id}"]`)).nulo();
  }));
  prueba("borrar lo tuyo: se vacía para todos", () => conChat(async srv => {
    confirmar = async () => true;
    await ccEnviarTexto("me he equivocado");
    const id = ccMios()[0].id;
    await chatBorrar(id);
    esperar(srv.chat.mensajes[0].borrado).cierto();
    esperar(ccUltimo().textContent).contiene("Mensaje borrado");
  }));
  prueba("lo que escribes no se pierde si la app se vuelve a pintar", () => conChat(async () => {
    const t = ccEscribe("a medias"); t.focus(); t.setSelectionRange(3, 3);
    pinta();
    esperar($("#ccTexto").value).igualA("a medias");
    esperar(document.activeElement.id).igualA("ccTexto");
    esperar($("#ccTexto").selectionStart).igualA(3);
  }));
});

grupo("ChatClase por dentro: emojis y reacciones", () => {
  prueba("el selector busca en castellano y mete el emoji donde está el cursor", () => conChat(async () => {
    const t = ccEscribe("ánimo "); t.setSelectionRange(6, 6);
    $("#ccEmoji").click();
    const b = $("#ccBuscaEmoji"); b.value = "fuego"; b.dispatchEvent(new Event("input", { bubbles: true }));
    esperar([...document.querySelectorAll("#ccEmojis [data-cc-emoji]")].map(x => x.dataset.ccEmoji)).contiene("🔥");
    document.querySelector('#ccEmojis [data-cc-emoji="🔥"]').click();
    esperar($("#ccTexto").value).igualA("ánimo 🔥");
    esperar(leeLS("chat-recientes")[0]).igualA("🔥");
  }));
  prueba("reaccionar y quitarlo; la reacción de otro llega al mirar", () => conChat(async srv => {
    const o = srv.chatEscribir("bea@ejemplo.es", "general", "¡Aprobado!");
    await chatTick();
    await chatReaccionar(o.id, "🎉");
    esperar(srv.chat.reacciones.length).igualA(1);
    let r = document.querySelector(`#ccm-${o.id} .cc-reac.mia`);
    esperar(r.textContent).contiene("1");
    srv.chatReaccionar("luis@ejemplo.es", o.id, "🎉");
    await chatTick();
    r = document.querySelector(`#ccm-${o.id} .cc-reac.mia`);
    esperar(r.querySelector("b").textContent).igualA("2");
    await chatReaccionar(o.id, "🎉");
    esperar(srv.chat.reacciones.map(x => x.usuario)).noContiene(SESION.usuario.id);
  }));
});

grupo("ChatClase por dentro: archivos y tareas", () => {
  prueba("una foto: se ve antes de enviarla, se sube a tu carpeta y sale en el mensaje", () => conChat(async srv => {
    await chatAdjuntar([await imagenDePrueba()]);
    esperar(!!document.querySelector(".cc-previo img")).cierto();
    await ccEnviarTexto("El esquema de hoy");
    const m = srv.chat.mensajes[0];
    esperar(m.adjuntos.length).igualA(1);
    esperar(m.adjuntos[0].ruta.startsWith(SESION.usuario.id + "/")).cierto();
    esperar(m.adjuntos[0].tipo).igualA("image/png");
    esperar([m.adjuntos[0].ancho, m.adjuntos[0].alto]).igualA([60, 40]);
    esperar(srv.chat.archivos.has(m.adjuntos[0].ruta)).cierto();
    esperar(!!ccUltimo().querySelector(".cc-img img")).cierto();
  }));
  prueba("un PDF sale como archivo para descargar", () => conChat(async srv => {
    await chatAdjuntar([new File(["%PDF-1.4 falso"], "tema3.pdf", { type: "application/pdf" })]);
    await ccEnviarTexto("");
    await hasta(() => srv.chat.mensajes.length === 1);
    esperar(ccUltimo().querySelector(".cc-archivo").textContent).contiene("tema3.pdf");
    esperar(!!ccUltimo().querySelector("[data-cc-bajar]")).cierto();
  }));
  prueba("no entra un ejecutable, ni más de 10 MB, ni más de cuatro", () => conChat(async () => {
    await chatAdjuntar([new File(["MZ"], "juego.exe", { type: "application/x-msdownload" })]);
    esperar(CHAT.adjuntos.length).igualA(0);
    esperar($("#avisos").lastElementChild.textContent).contiene("no se puede adjuntar");
    await chatAdjuntar([new File([new Uint8Array(10 * 1024 * 1024 + 1)], "enorme.pdf", { type: "application/pdf" })]);
    esperar(CHAT.adjuntos.length).igualA(0);
    esperar($("#avisos").lastElementChild.textContent).contiene("10 MB");
    await chatAdjuntar(Array.from({ length: 5 }, (_, i) => new File(["hola"], "n" + i + ".txt", { type: "text/plain" })));
    esperar(CHAT.adjuntos.length).igualA(4);
  }));
  prueba("pegar una captura la adjunta", () => conChat(async () => {
    const dt = new DataTransfer(); dt.items.add(await imagenDePrueba());
    $("#ccTexto").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    await hasta(() => CHAT.adjuntos.length === 1);
    esperar(CHAT.adjuntos[0].nombre).igualA("esquema.png");
  }));
  prueba("compartir una tarea hecha y otra pendiente, con su estado", () => conChat(async srv => {
    S.modulos = [moduloDe([[100, null]], { id: "bd", cod: "BD", nombre: "Bases de Datos" })];
    S.tareas = [{ id: "t1", titulo: "Práctica de JOIN", modId: "bd", fecha: sumaDias(hoyISO(), 3), hecha: true, estado: "hecha", sub: [] },
                { id: "t2", titulo: "Ejercicios tema 4", modId: "bd", fecha: sumaDias(hoyISO(), -1), hecha: false, estado: "pendiente", sub: [] }];
    ccPintar();
    $("#ccCompartir").click();
    esperar($("#ccTareas").textContent).contiene("Ejercicios tema 4");
    document.querySelector('[data-cc-tarea="entrega|t1"]').click();
    await ccEnviarTexto("¡Hecha!");
    $("#ccCompartir").click();
    document.querySelector('[data-cc-tarea="entrega|t2"]').click();
    await ccEnviarTexto("Voy tarde con esta");
    esperar(srv.chat.mensajes.map(m => [m.tarea.titulo, m.tarea.hecha, m.tarea.cod])).igualA([["Práctica de JOIN", true, "BD"], ["Ejercicios tema 4", false, "BD"]]);
    const t = [...document.querySelectorAll("#ccLog .cc-tarea")];
    esperar(t.map(x => x.className.replace("cc-tarea ", ""))).igualA(["hecha", "atrasada"]);
    esperar(JSON.stringify(srv.chat.mensajes[0].tarea)).noContiene("notas");
  }));
});

grupo("ChatClase por dentro: llegar, avisar y moderar", () => {
  prueba("lo de otros llega al mirar; otro canal queda sin leer hasta que lo abres", () => conChat(async srv => {
    srv.chatEscribir("bea@ejemplo.es", "general", "¿Hay alguien?");
    srv.chatEscribir("luis@ejemplo.es", "dudas", "Duda de SQL");
    CHAT.ultResumen = 0;
    await chatTick();
    esperar(ccUltimo().textContent).contiene("¿Hay alguien?");
    esperar(!!document.querySelector('.cc-canal.sin-leer[data-cc-canal="dudas"]')).cierto();
    await chatCambiarCanal("dudas");
    await hasta(() => ccMios().length === 1);
    ccMarcarLeido();
    esperar(ccSinLeer("dudas")).falso();
  }));
  prueba("los mensajes anteriores se cargan al pedirlos, sin moverte de donde estás", () => conChat(async srv => {
    for (let i = 0; i < 60; i++) srv.chatEscribir("bea@ejemplo.es", "general", "mensaje " + i);
    chatOlvidar(); CHAT.perfil = undefined; pinta();
    await hasta(() => ccMios().length === 50);
    esperar(!!$("#ccAnteriores")).cierto();
    await chatAnteriores();
    esperar(ccMios().length).igualA(60);
    esperar(ccMios()[0].texto).igualA("mensaje 0");
    esperar($("#ccLog").textContent).contiene("Aquí empieza");
  }));
  prueba("reportar un mensaje", () => conChat(async srv => {
    const o = srv.chatEscribir("bea@ejemplo.es", "general", "algo feo");
    await chatTick();
    chatReportar(o.id);
    esperar($("#dlgCuerpo").textContent).contiene("no sabrá quién lo ha reportado");
    document.querySelectorAll('input[name="ccMotivo"]')[1].checked = true;
    [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Reportar").click();
    await hasta(() => srv.chat.reportes.length === 1);
    esperar(srv.chat.reportes[0].motivo).contiene("Datos personales");
  }));
  prueba("bloquear a alguien: no ves sus mensajes (solo en este dispositivo)", () => conChat(async srv => {
    const o = srv.chatEscribir("bea@ejemplo.es", "general", "pesado");
    await chatTick();
    chatBloquear(o.autor);
    esperar(ccUltimo().textContent).contiene("alguien que has bloqueado");
    esperar(ccUltimo().textContent).noContiene("pesado");
    chatBloquear(o.autor);
    esperar(ccUltimo().textContent).contiene("pesado");
  }));
  prueba("el creador fija y deja sin chat; quien está sin chat no puede escribir", () => conChat(async srv => {
    const o = srv.chatEscribir("bea@ejemplo.es", "general", "Normas del canal");
    await chatTick();
    esperar(ccSoyAdmin()).cierto();
    document.querySelector(`[data-cc-mas="${o.id}"]`).click();
    esperar($("#ccAcciones").textContent).contiene("Dejar sin chat a bea");
    esperar($("#ccAcciones").textContent).contiene("Fijar en el canal");
    CHAT.acciones = null;
    await chatFijar(o.id);
    esperar(srv.chat.mensajes[0].fijado).cierto();
    await ccApi.banear(o.autor, 24, "prueba");
    esperar(srv.chat.baneados.has(o.autor)).cierto();
  }, { admin: true, email: "gabriel_gabiz@hotmail.com", apodo: "Gabriel" }));
  prueba("sin chat: el cuadro de escribir se cambia por el aviso", () => conChat(async srv => {
    srv.chat.baneados.set(SESION.usuario.id, Date.now() + 3600000);
    await ccEstado(); ccPintar();
    esperar($("#ccTexto")).nulo();
    esperar($("#ccPie").textContent).contiene("No puedes escribir en ChatClase");
  }));
  prueba("en Anuncios solo escribe el creador", () => conChat(async () => {
    await chatCambiarCanal("anuncios");
    esperar($("#ccTexto")).nulo();
    esperar($("#ccPie").textContent).contiene("solo escribe el equipo");
  }));
  prueba("si vas muy rápido o no hay red, te lo dice y puedes reintentar", () => conChat(async srv => {
    srv.chat.despacio = true;
    await ccEnviarTexto("uno");
    esperar(ccMios()[0].estado).igualA("error");
    esperar($("#avisos").lastElementChild.textContent).contiene("muy rápido");
    esperar(!!document.querySelector("[data-cc-reintentar]")).cierto();
    srv.chat.despacio = false; srv.sinRed = true;
    await ccMandar(ccMios()[0]);
    esperar(ccMios()[0].estado).igualA("error");
    srv.sinRed = false;
    document.querySelector("[data-cc-reintentar]").click();
    await hasta(() => srv.chat.mensajes.length === 1);
    await hasta(() => !ccMios().some(m => m.estado));
    esperar(srv.chat.mensajes[0].texto).igualA("uno");
  }));
  prueba("al salir de la sección deja de mirar", () => conChat(async srv => {
    esperar(!!CHAT.timer).cierto();
    irASeccion("escritorio");
    esperar(CHAT.timer).nulo();
    const n = srv.llamadas.length; await dormir(60);
    esperar(srv.llamadas.length).igualA(n);
  }));
  prueba("en el chat solo se ve tu apodo: ni tu correo ni tu foto", () => conChat(async () => {
    normalizarPerfil().foto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    await ccEnviarTexto("hola");
    const m = ccUltimo();
    esperar(m.textContent).contiene("Ana");
    esperar(m.innerHTML).noContiene("ana@ejemplo.es");
    esperar(m.innerHTML).noContiene("base64");
  }));
});
