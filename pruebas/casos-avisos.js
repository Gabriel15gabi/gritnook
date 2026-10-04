/* Entrar sin ver la bienvenida un segundo, el cronómetro que viaja con la
   cuenta, los avisos del sistema y los iconos de Phosphor. */

/* el permiso de avisos y el aviso del sistema, de mentira: el navegador sin
   ventana no los da, y aquí lo que importa es qué se manda y cuándo */
async function conAvisos(fn, { permiso = "granted", on = true, oculto = false } = {}) {
  const antes = { permisoNotif, mostrarNotif, S: JSON.parse(JSON.stringify(S)) };
  const ls = ["avisos-on", "avisos-vistos", "avisos-banda-no", "push-endpoint"].map(k => [k, localStorage.getItem("desk-daw:" + k)]);
  const salen = [];
  permisoNotif = () => permiso;
  mostrarNotif = async (titulo, o = {}) => { salen.push(Object.assign({ titulo }, o)); return true; };
  guardaLS("avisos-on", on); guardaLS("avisos-vistos", {});
  if (oculto) Object.defineProperty(document, "hidden", { value: true, configurable: true });
  try { return await fn(salen); }
  finally {
    if (oculto) delete document.hidden;
    permisoNotif = antes.permisoNotif; mostrarNotif = antes.mostrarNotif;
    S = antes.S;
    ls.forEach(([k, v]) => v === null ? localStorage.removeItem("desk-daw:" + k) : localStorage.setItem("desk-daw:" + k, v));
  }
}
/* el cronómetro como estaba, al acabar */
async function conReloj(fn) {
  const t = JSON.parse(JSON.stringify(Object.assign({}, T, { tick: null }))), antes = JSON.parse(JSON.stringify(S)), ls = localStorage.getItem("desk-daw:timer");
  try { return await fn(); }
  finally {
    clearInterval(T.tick); Object.assign(T, t, { tick: null }); S = antes;
    if (ls === null) localStorage.removeItem("desk-daw:timer"); else localStorage.setItem("desk-daw:timer", ls);
    const d = $("#dlg"); if (d.open) d.close(); pinta();
  }
}
const aLas = (iso, h, m = 0) => new Date(iso + "T" + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00").getTime();

grupo("Entrar: sin ver la bienvenida ni la app vacía", () => {
  prueba("con cuentas, la bienvenida espera a saber si tu cuenta ya tiene curso", async () => {
    esperar(esperaCuenta()).falso();            /* sin servidor, como siempre */
    await conNube(async () => { esperar(esperaCuenta()).cierto(); });
  });
  prueba("al entrar, mientras llegan tus datos se ve «Cargando tu cuenta…» y nunca la bienvenida", async () => {
    await conNube(async srv => {
      srv.crear("ana@ejemplo.es", "contraseña-larga");
      srv.escribir("ana@ejemplo.es", "escritorio/perfil", { perfil: Object.assign(perfilDef(), { nombre: "Ana", etapa: "ciclo-sup", ciclo: "DAW", listo: true }) });
      const real = srv.fetch;
      nubeFetch = async (url, op) => { if (/\/rest\/v1\/documentos/.test(url)) await dormir(300); return real(url, op); };
      abrirAcceso("entrar");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga" });
      esperar(!!$("#cargaCuenta") && !$("#cargaCuenta").hidden).cierto();
      esperar($("#cargaCuenta").textContent).contiene("Cargando tu cuenta");
      esperar(!!BV).falso();
      esperar($("#entrada").hidden).cierto();
      await hasta(() => $("#cargaCuenta").hidden, 5000);
      esperar(normalizarPerfil().nombre).igualA("Ana");
      esperar(!!BV).falso();
    });
  });
  prueba("una cuenta nueva sí acaba en la bienvenida, cuando ya se sabe", async () => {
    await conNube(async srv => {
      srv.crear("bea@ejemplo.es", "contraseña-larga");
      abrirAcceso("entrar");
      await formulario({ correo: "bea@ejemplo.es", clave: "contraseña-larga" });
      await hasta(() => !!BV, 5000);
      esperar($("#cargaCuenta").hidden).cierto();
    });
  });
});

grupo("Cronómetro: el mismo en todos tus dispositivos", () => {
  prueba("va en la cuenta como un documento más", () => {
    esperar(DOCS.reloj).igualA(["reloj"]);
  });
  prueba("cada sesión lleva su número y lo que se guarda es lo mismo que se sube", () => conReloj(() => {
    S.modulos = [moduloDe([[100, null]], { id: "m1", nombre: "Programación", cod: "PRO" })]; T.modId = "m1";
    T.fase = "trabajo"; T.restante = 0; iniciarTimer();
    esperar(T.sid.length > 4).cierto();
    esperar(S.reloj.sid).igualA(T.sid);
    esperar(S.reloj.activo).cierto();
    esperar(leeLS("timer").sid).igualA(T.sid);
    const sid = T.sid;
    pausarTimer(); iniciarTimer();
    esperar(T.sid).igualA(sid);                /* seguir no es empezar otra */
  }));
  prueba("lo que llega de otro dispositivo manda si es más nuevo, y lo viejo o raro no", () => conReloj(() => {
    T.activo = false; T.cambiado = 1000;
    S.reloj = { activo: true, fase: "trabajo", fin: Date.now() + 600000, modId: "m1", temaId: "", restante: 0, aviso: "", sid: "otro", cerrada: "", cambiado: 2000 };
    relojDeFuera();
    esperar(T.activo).cierto(); esperar(T.sid).igualA("otro");
    S.reloj = Object.assign({}, S.reloj, { activo: false, cambiado: 1500 });
    relojDeFuera();
    esperar(T.activo).cierto();
    S.reloj = Object.assign({}, S.reloj, { fase: "inventada", cambiado: 9999 });
    relojDeFuera();
    esperar(T.fase).igualA("trabajo");
  }));
  prueba("una sesión cuenta una sola vez aunque acabe en dos sitios", () => conReloj(() => {
    S.modulos = [moduloDe([[100, null]], { id: "m1", nombre: "Programación", cod: "PRO" })];
    S.horas = {}; S.config.pomodoro = 25;
    Object.assign(T, { activo: true, fase: "trabajo", fin: Date.now() - 1000, modId: "m1", sid: "s1", cerrada: "" });
    terminarFase();
    esperar(S.horas.m1[hoyISO()]).igualA(25);
    esperar(T.cerrada).igualA("s1");
    /* el otro dispositivo, con la misma sesión ya cerrada en la cuenta */
    Object.assign(T, { activo: true, fase: "trabajo", fin: Date.now() - 1000, sid: "s1", cerrada: "s1" });
    terminarFase();
    esperar(S.horas.m1[hoyISO()]).igualA(25);
  }));
  prueba("con la app en segundo plano, al acabar solo avisa: se cierra al volver", async () => {
    await conReloj(() => conAvisos(async salen => {
      S.modulos = [moduloDe([[100, null]], { id: "m1", nombre: "Programación", cod: "PRO" })]; S.horas = {};
      Object.assign(T, { activo: true, fase: "trabajo", fin: Date.now() - 1000, modId: "m1", sid: "s2", cerrada: "" });
      await finDeReloj();
      esperar(T.activo).cierto();                 /* sigue abierta hasta que vuelvas */
      esperar(salen.length).igualA(1);
      esperar(salen[0].titulo).igualA("¡Bien hecho!");
      esperar(salen[0].tag).igualA("reloj");
      esperar(salen[0].icon).contiene("bien-hecho");
      await finDeReloj();
      esperar(salen.length).igualA(1);             /* y no lo repite */
    }, { oculto: true }));
  });
  prueba("mientras corre, la pestaña dice cuánto queda", () => conReloj(() => {
    Object.assign(T, { activo: true, fase: "trabajo", fin: Date.now() + 12 * 60000 + 30000, aviso: "" });
    pintaMini();
    esperar(document.title).contiene("· Concentración");
    esperar(/^1[23]:\d\d · /.test(document.title)).cierto();
    Object.assign(T, { activo: false, aviso: "hecho" }); pintaMini();
    esperar(document.title).contiene("¡Bien hecho!");
  }));
});

grupo("Avisos: qué se avisa y cuándo", () => {
  const hoy = () => hoyISO();
  prueba("un examen: tres días antes y la víspera, a las siete de la tarde", () => conAvisos(() => {
    S.modulos = [moduloDe([[100, null]], { id: "m1", nombre: "Programación", cod: "PRO" })];
    S.examenes = [{ id: "e1", modId: "m1", titulo: "Parcial", fecha: sumaDias(hoy(), 5), hora: "" }];
    S.tareas = []; S.config.avisos = {};
    const l = avisosProximos(aLas(hoy(), 10));
    const ex = l.filter(a => a.clave.startsWith("ex-e1"));
    esperar(ex.map(a => a.clave)).igualA(["ex-e1-3", "ex-e1-1"]);
    esperar(ex[0].cuando).igualA(aLas(sumaDias(hoy(), 2), 19));
    esperar(ex[1].titulo).igualA("Mañana tienes examen");
    esperar(ex[1].cuerpo).igualA("Parcial · Programación");
    esperar(ex[1].url).contiene("#sec=entregas");
    S.config.avisos = { examenes: false };
    esperar(avisosProximos(aLas(hoy(), 10)).some(a => a.clave.startsWith("ex-"))).falso();
  }));
  prueba("una entrega: la víspera a las siete y el mismo día a las ocho; hecha, nada", () => conAvisos(() => {
    S.examenes = []; S.tareas = [{ id: "t1", titulo: "Práctica 3", modId: "", fecha: sumaDias(hoy(), 1), hecha: false }];
    S.config.avisos = {};
    const l = avisosProximos(aLas(hoy(), 10)).filter(a => a.clave.startsWith("en-"));
    esperar(l.map(a => a.cuando)).igualA([aLas(hoy(), 19), aLas(sumaDias(hoy(), 1), 8)]);
    /* lo que ya pasó no se programa */
    esperar(avisosProximos(aLas(hoy(), 20)).filter(a => a.clave.startsWith("en-")).length).igualA(1);
    S.tareas[0].hecha = true;
    esperar(avisosProximos(aLas(hoy(), 10)).some(a => a.clave.startsWith("en-"))).falso();
  }));
  prueba("la racha, solo si llevas días seguidos y hoy aún nada; el repaso, si hay tarjetas", () => conAvisos(() => {
    S.examenes = []; S.tareas = []; S.config.avisos = {};
    S.modulos = [moduloDe([[100, null]], { id: "m1" })];
    S.horas = { m1: { [sumaDias(hoy(), -1)]: 30, [sumaDias(hoy(), -2)]: 25 } };
    let l = avisosProximos(aLas(hoy(), 10));
    const r = l.find(a => a.clave === "racha-" + hoy());
    esperar(r.titulo).igualA("Llevas 2 días seguidos");
    esperar(r.cuando).igualA(aLas(hoy(), 21));
    S.horas.m1[hoy()] = 10;
    esperar(avisosProximos(aLas(hoy(), 10)).some(a => a.clave.startsWith("racha-"))).falso();
    S.tarjetas = [{ id: "c1", modId: "m1", frente: "¿?", dorso: "!", caja: 1, proximo: hoy() }];
    l = avisosProximos(aLas(hoy(), 10));
    esperar(l.find(a => a.clave === "repaso-" + hoy()).cuerpo).contiene("1 tarjeta");
  }));
  prueba("el cronómetro: a la hora en que acaba, con el número de la sesión", () => conReloj(() => conAvisos(() => {
    S.examenes = []; S.tareas = []; S.config.avisos = {}; S.horas = {};
    Object.assign(T, { activo: true, fase: "trabajo", fin: Date.now() + 600000, sid: "s9" });
    const a = avisosProximos().find(x => x.clave.startsWith("reloj-"));
    esperar(a.clave).igualA("reloj-s9-trabajo");
    esperar(a.cuando).igualA(T.fin);
    esperar(a.titulo).igualA("¡Bien hecho!");
  })));
  prueba("la oposición: el examen, la solicitud y los plazos con algo que hacer", () => conAvisos(() => {
    opositorDePrueba();
    S.examenes = []; S.tareas = []; S.config.avisos = {};
    const O = S.opo;
    O.examen.fecha = sumaDias(hoy(), 10);
    O.convocatoria.plazoFin = sumaDias(hoy(), 4); O.convocatoria.presentada = false;
    O.convocatoria.hitos = [{ id: "h1", tipo: "impugnacion", fecha: sumaDias(hoy(), 3), hecho: false, txt: "" }];
    const c = avisosProximos(aLas(hoy(), 10)).map(a => a.clave);
    esperar(c).contiene("opo-ex-7-" + O.examen.fecha);
    esperar(c).contiene("opo-plazo-3-" + O.convocatoria.plazoFin);
    esperar(c).contiene("opo-hito-h1-2");
    O.convocatoria.presentada = true; O.convocatoria.hitos[0].hecho = true;
    const d = avisosProximos(aLas(hoy(), 10)).map(a => a.clave);
    esperar(d.some(k => k.startsWith("opo-plazo") || k.startsWith("opo-hito"))).falso();
  }));
});

grupo("Avisos: cómo llegan", () => {
  prueba("con la app abierta o en segundo plano los lanza ella, una vez cada uno", () => conAvisos(async salen => {
    S.examenes = []; S.config.avisos = {};
    S.tareas = [{ id: "t5", titulo: "Memoria", modId: "", fecha: hoyISO(), hecha: false }];
    const a = aLas(hoyISO(), 8, 5);
    const r = revisarAvisosLocales(a);
    esperar(r.map(x => x.clave)).igualA(["en-t5-0"]);
    esperar(salen[0].titulo).igualA("Hoy se entrega");
    esperar(salen[0].tag).igualA("en-t5-0");
    esperar(revisarAvisosLocales(a + 30000).length).igualA(0);
  }, { oculto: true }));
  prueba("sin permiso o desactivados en este dispositivo, nada", async () => {
    await conAvisos(() => { esperar(avisosActivos()).falso(); esperar(revisarAvisosLocales().length).igualA(0); }, { permiso: "denied" });
    await conAvisos(() => { esperar(avisosActivos()).falso(); }, { on: false });
  });
  prueba("con cuenta y servidor encendido, la lista va al servidor, y solo si cambió", async () => {
    await conNube(async srv => {
      const real = srv.fetch, llamadas = [];
      nubeFetch = async (url, op = {}) => {
        if (/rpc\/push_clave_publica/.test(url)) return { ok: true, status: 200, text: async () => JSON.stringify("CLAVE") };
        if (/rpc\/programar_avisos/.test(url)) { llamadas.push(JSON.parse(op.body)); return { ok: true, status: 200, text: async () => "1" }; }
        return real(url, op);
      };
      await entrarComo(srv, "ana@ejemplo.es");
      await conAvisos(async () => {
        clearTimeout(progTimer);
        guardaLS("push-endpoint", "https://fcm.googleapis.com/fcm/send/x");
        S.tareas = [{ id: "t7", titulo: "Informe", modId: "", fecha: sumaDias(hoyISO(), 2), hecha: false }];
        progUltimo = "";
        esperar(await enviarProgramacion()).cierto();
        esperar(llamadas.length).igualA(1);
        esperar(llamadas[0].lista.some(a => a.clave === "en-t7-1")).cierto();
        esperar(/^\d{4}-\d\d-\d\dT/.test(llamadas[0].lista[0].cuando)).cierto();
        esperar(await enviarProgramacion()).falso();
        esperar(llamadas.length).igualA(1);
      });
    });
  });
  prueba("sin servidor de avisos, no se apunta el dispositivo", async () => {
    await conNube(async srv => {
      const real = srv.fetch;
      nubeFetch = async (url, op = {}) => /rpc\/push_clave_publica/.test(url) ? { ok: true, status: 200, text: async () => "null" } : real(url, op);
      await entrarComo(srv, "ana@ejemplo.es");
      pushListo = null;
      await conAvisos(async () => { esperar(await suscribirPush()).falso(); });
      pushListo = null;
    });
  });
  prueba("el service worker enseña los avisos que llegan y abre la app al tocarlos", async () => {
    const sw = await (await fetch("/sw.js", { cache: "no-store" })).text();
    esperar(sw).contiene('addEventListener("push"');
    esperar(sw).contiene('addEventListener("notificationclick"');
    esperar(sw).contiene('tag: reloj ? "reloj"');
    esperar(sw).contiene("gritnook-v15");
    for (const f of ["/iconos/insignia-96.png", "/iconos/bien-hecho-192.png"]) esperar((await fetch(f, { method: "HEAD", cache: "no-store" })).ok).cierto();
  });
});

grupo("Avisos: en Ajustes y en el Inicio", () => {
  async function enAjustes(fn) {
    const sec = seccion, tab = ajTab;
    try { seccion = "ajustes"; ajTab = "avisos"; pinta(); await dormir(20); return await fn(); }
    finally { seccion = sec; ajTab = tab; pinta(); }
  }
  prueba("hay una pestaña de avisos", () => { esperar(ajTabs().map(x => x[0])).contiene("avisos"); });
  prueba("sin activar, el botón; bloqueados, cómo desbloquearlos; activados, probar y desactivar", async () => {
    await conAvisos(() => enAjustes(() => { esperar(!!$("#avActivar")).cierto(); }), { permiso: "default", on: false });
    await conAvisos(() => enAjustes(() => { esperar($("#contenido").textContent).contiene("Has bloqueado"); esperar(!!$("#avActivar")).falso(); }), { permiso: "denied", on: false });
    await conAvisos(() => enAjustes(() => {
      esperar($("#contenido").textContent).contiene("Activados en este dispositivo");
      esperar(!!$("#avProbar") && !!$("#avDesactivar")).cierto();
    }));
  });
  prueba("lo que avisa se elige y se guarda en la cuenta", async () => {
    await conAvisos(() => enAjustes(() => {
      const c = $('[data-av="racha"]'); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
      esperar(S.config.avisos.racha).falso();
      esperar(S.config.avisos.examenes).cierto();
    }));
  });
  prueba("en el Inicio lo propone si tienes algo con fecha, y «Ahora no» lo quita un mes", async () => {
    await conAvisos(async () => {
      const sec = seccion;
      localStorage.removeItem("desk-daw:avisos-on");
      try {
        S.examenes = [{ id: "e9", modId: "", titulo: "Final", fecha: sumaDias(hoyISO(), 9), hora: "" }];
        seccion = "escritorio"; pinta(); await dormir(20);
        esperar(!!$(".banda.avisos")).cierto();
        $("#avBandaNo").click(); await dormir(20);
        esperar(!!$(".banda.avisos")).falso();
        esperar(leeLS("avisos-banda-no")).igualA(hoyISO());
      } finally { seccion = sec; pinta(); }
    }, { permiso: "default", on: false });
  });
});

grupo("Iconos: Phosphor, sin cuadraditos de color", () => {
  prueba("los iconos de la app son de Phosphor (rellenos, en su rejilla de 256)", () => {
    ["llama", "aviso", "entregas", "reloj", "campana", "oposicion", "ajustes", "papelera"].forEach(n => {
      const s = icono(n);
      esperar(s).contiene('viewBox="0 0 256 256"');
      esperar(s).contiene("ph");
    });
  });
  prueba("las cifras del Inicio: icono pequeño junto a su nombre, sin fondo de color", async () => {
    const antes = JSON.parse(JSON.stringify(S)), sec = seccion;
    try {
      seccion = "escritorio"; pinta(); await dormir(20);
      $("#contenido").innerHTML = vistaEscritorioAntigua();          /* las cifras son del Inicio de antes; «Hoy» lleva anillos */
      const ico = $(".hd-dato-ico");
      esperar(!!ico).cierto();
      const fondo = getComputedStyle(ico).backgroundColor;
      esperar(fondo === "rgba(0, 0, 0, 0)" || fondo === "transparent").cierto();
      esperar(!!$(".hd-dato .hd-dato-cab .meta")).cierto();
    } finally { S = antes; seccion = sec; pinta(); }
  });
  prueba("en riesgo, el número en rojo; sin riesgo, nada de verde ni de rojo", () => {
    esperar(datoInicio(icono("aviso"), "var(--riesgo-txt)", 2, "Módulos en riesgo", true)).contiene('class="hd-dato alerta"');
    esperar(datoInicio(icono("aviso"), "", 0, "Módulos en riesgo")).contiene("--c:var(--ink-3)");
  });
});
