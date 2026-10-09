/* Empezar de 0: en Ajustes → Perfil y en Datos, una sola ventana que dice
   qué se borra y qué se queda, el botón rojo bloqueado hasta marcar
   «Entiendo…», y un borrado completo que no toca la cuenta ni el tema. */

/* todo como estaba al acabar: datos, lo guardado, el cronómetro, la ventana y la bienvenida */
async function conCero(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, tab = ajTab, bv = BV, reloj = JSON.parse(JSON.stringify(relojDatos()));
  const ls = {}; Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => { ls[k] = localStorage.getItem(k); });
  try { return await fn(); }
  finally {
    await dormir(60);
    const d = $("#dlg"); if (d.open) d.close();
    BV = bv; $("#entrada").hidden = !BV; document.body.classList.remove("en-entrada");
    Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => localStorage.removeItem(k));
    Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v));
    clearInterval(T.tick); Object.assign(T, reloj, { tick: null });
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; ajTab = tab; pinta();
  }
}
async function enAjustesCero(tab) { seccion = "ajustes"; ajTab = tab; pinta(); await dormir(20); }
/* un curso con algo de todo */
function cursoDePrueba() {
  S = estadoInicial();
  S.perfil = Object.assign(perfilDef(), { nombre: "Ana", etapa: "ciclo-sup", ciclo: "DAW", listo: true });
  S.tareas = [{ id: "t1", titulo: "Práctica", modId: S.modulos[0].id, fecha: hoyISO(), peso: 10, hecha: false, sub: [] }];
  S.examenes = [{ id: "e1", titulo: "Examen", modId: S.modulos[0].id, fecha: hoyISO(), hora: "09:00", plan: [] }];
  S.apuntes = { a1: { id: "a1", titulo: "Uno", modId: "", html: "<div>x</div>", cuerpo: "x" }, a2: { id: "a2", titulo: "Dos", modId: "", html: "<div>y</div>", cuerpo: "y" } };
  S.tarjetas = [{ id: "c1", p: "¿SQL?", r: "Sí", modId: "", caja: 1, toca: hoyISO() }];
  S.horas = { [S.modulos[0].id]: { [hoyISO()]: 50 } };
}

grupo("Empezar de 0: dónde está y la ventana", () => {
  prueba("está al final de Ajustes → Perfil y en Ajustes → Datos, con el mismo nombre", () => conCero(async () => {
    await enAjustesCero("perfil");
    esperar(!!$(".cero-panel [data-empezar-cero]")).cierto();
    esperar($(".cero-panel").textContent).contiene("Empezar de 0 y borrar todo");
    await enAjustesCero("datos");
    esperar(!!$("[data-empezar-cero]")).cierto();
    esperar($("[data-empezar-cero]").textContent).contiene("Empezar de 0 y borrar todo");
    esperar(!!$("#apBorrarTodo")).falso();          /* el viejo, con dos «¿seguro?» seguidos, ya no está */
  }));
  prueba("los dos botones abren la misma ventana, que no borra nada por abrirse", () => conCero(async () => {
    cursoDePrueba();
    for (const tab of ["perfil", "datos"]) {
      await enAjustesCero(tab);
      $("[data-empezar-cero]").click(); await dormir(30);
      esperar($("#dlg").open).cierto();
      esperar($("#dlgTit").textContent).igualA("Empezar de 0");
      esperar(Object.keys(S.apuntes).length).igualA(2);
      $("#dlg").close();
    }
  }));
  prueba("dice con números lo que se va, y lo que se queda", () => conCero(async () => {
    cursoDePrueba();
    dlgEmpezarDeCero(); await dormir(30);
    const txt = $("#dlgCuerpo").textContent;
    esperar(txt).contiene("2 apuntes con sus dibujos");
    esperar(txt).contiene("2 cosas de la agenda");
    esperar(txt).contiene("1 tarjeta de repaso");
    esperar(txt).contiene(S.modulos.length + " " + voc(true));
    esperar(txt).contiene("Se queda");
    esperar(txt).contiene("el tema de este dispositivo");
    esperar(txt).contiene("No se puede deshacer");
    esperar(txt.includes("palabras de idiomas")).falso();   /* lo que no tienes, no sale */
  }));
  prueba("el botón rojo no hace nada hasta marcar «Entiendo…»", () => conCero(async () => {
    cursoDePrueba();
    dlgEmpezarDeCero(); await dormir(30);
    const rojo = $("#dlgPie .peligro"), ok = $("#ceroOk");
    esperar(rojo.disabled).cierto();
    rojo.click(); await dormir(30);
    esperar(Object.keys(S.apuntes).length).igualA(2);
    ok.click(); await dormir(10);
    esperar(rojo.disabled).falso();
    ok.click(); await dormir(10);
    esperar(rojo.disabled).cierto();               /* y si lo desmarcas, se bloquea otra vez */
  }));
  prueba("«descarga antes una copia» la baja sin cerrar la ventana", () => conCero(async () => {
    const real = bajarCopia; let n = 0;
    bajarCopia = async () => { n++; };
    try {
      dlgEmpezarDeCero(); await dormir(30);
      $("#ceroBajar").click(); await dormir(30);
      esperar(n).igualA(1);
      esperar($("#dlg").open).cierto();
    } finally { bajarCopia = real; }
  }));
});

grupo("Empezar de 0: lo que hace", () => {
  prueba("borra todo lo tuyo, para el cronómetro, deja el tema y abre la bienvenida", () => conCero(async () => {
    cursoDePrueba(); guardarLocal();
    guardaLS("copia", "2026-10-01"); guardaLS("tema", "dark"); guardaLS("reto-no", "2026-10-09");
    Object.assign(T, { activo: true, fin: Date.now() + 600000, modId: S.modulos[0].id, sid: "s1" });
    dlgEmpezarDeCero(); await dormir(30);
    $("#ceroOk").click(); $("#dlgPie .peligro").click(); await dormir(60);
    esperar($("#dlg").open).falso();
    esperar(Object.keys(S.apuntes).length).igualA(0);
    esperar(S.tareas.length + S.examenes.length + S.tarjetas.length).igualA(0);
    esperar(Object.keys(S.horas).length).igualA(0);
    esperar(S.perfil.listo).falso();
    esperar(T.activo).falso();
    esperar(leeLS("timer").activo).falso();
    esperar(leeLS("copia")).nulo();
    esperar(leeLS("reto-no")).nulo();
    esperar(leeLS("tema")).igualA("dark");
    esperar(JSON.parse(localStorage.getItem("desk-daw:estado")).apuntes).igualA({});
    esperar(!!BV).cierto();
    esperar($("#entrada").hidden).falso();
  }));
  prueba("con cuenta: lo dice, la cuenta y la sesión siguen, y en la nube queda vacío", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      S.tarjetas = [{ id: "c", p: "¿SQL?", r: "Sí", caja: 1, toca: hoyISO() }];
      const ap = { id: "ap1", titulo: "Mío", cuerpo: "", modId: "", html: "" }; S.apuntes.ap1 = ap; guardarApunte(ap);
      Object.keys(DOCS).forEach(nd => guardar(nd));
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/ap1") !== undefined);
      await hasta(() => ((srv.doc("ana@ejemplo.es", "escritorio/repaso") || {}).tarjetas || []).length === 1);
      seccion = "ajustes"; ajTab = "perfil"; pinta(); await dormir(20);
      esperar($(".cero-panel").textContent).contiene("Tu cuenta no se borra");
      $(".cero-panel [data-empezar-cero]").click(); await dormir(30);
      esperar($("#dlgCuerpo").textContent).contiene("tu cuenta (ana@ejemplo.es) y la sesión");
      esperar($("#dlgCuerpo").textContent).contiene("en todos tus dispositivos");
      $("#ceroOk").click(); $("#dlgPie .peligro").click();
      await hasta(() => srv.doc("ana@ejemplo.es", "apuntes/ap1") === undefined);
      await hasta(() => ((srv.doc("ana@ejemplo.es", "escritorio/repaso") || { tarjetas: [1] }).tarjetas || [1]).length === 0);
      esperar(srv.usuarios.length).igualA(1);
      esperar(SESION !== null).cierto();
      if (BV) { BV = null; $("#entrada").hidden = true; }
    });
  });
});
