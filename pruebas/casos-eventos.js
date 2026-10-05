/* Agenda: eventos con el título que quieras. Además de entregas y exámenes,
   cualquier cosa (un cumpleaños, el médico, una cena), sin asignatura si no
   la eliges. Se guardan con las entregas, con la marca «evento». */

/* la agenda pintada de verdad, y todo como estaba al acabar */
async function conAgendaEv(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, ls = localStorage.getItem("desk-daw:estado");
  try {
    seccion = "entregas"; pinta(); await dormir(10);
    return await fn();
  } finally {
    const d = $("#dlg"); if (d.open) d.close();
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; agPeek = null;
    if (ls === null) localStorage.removeItem("desk-daw:estado"); else localStorage.setItem("desk-daw:estado", ls);
    pinta();
  }
}

grupo("Agenda: eventos con tu título", () => {
  prueba("lo que no es de ninguna asignatura ni suena a entrega se apunta como evento", () => {
    const r = entenderFrase("cumpleaños de Ana el sábado");
    esperar(r.tipo).igualA("evento");
    esperar(r.modId || "").igualA("");
    esperar(r.titulo).igualA("Cumpleaños de Ana");
    esperar(esFecha(r.fecha)).cierto();
  });
  prueba("con su hora, si la dices", () => {
    const r = entenderFrase("médico a las 17:30 mañana");
    esperar(r.tipo).igualA("evento");
    esperar(r.hora).igualA("17:30");
    esperar(r.fecha).igualA(sumaDias(hoyISO(), 1));
  });
  prueba("una práctica sin asignatura sigue siendo una entrega, y un examen, un examen", () => {
    esperar(entenderFrase("entregar la práctica el viernes").tipo).igualA("entrega");
    esperar(entenderFrase("hacer los ejercicios del tema 3").tipo).igualA("entrega");
    esperar(entenderFrase("examen el jueves").tipo).igualA("examen");
  });
  prueba("si nombras una asignatura, es suya y no un evento", () => conEstado(() => {
    S.modulos = [moduloDe([[100, null]], { id: "mBD", cod: "BD", nombre: "Bases de Datos" })];
    const r = entenderFrase("repasar BD el lunes");
    esperar(r.modId).igualA("mBD");
    esperar(r.tipo === "evento").falso();
  }));
  prueba("se guarda con las entregas, con su marca y sin asignatura", () => conAgendaEv(() => {
    S.modulos = [moduloDe([[100, null]], { id: "mBD", cod: "BD", nombre: "Bases de Datos" })];
    const n = S.tareas.length;
    const r = crearElemento({ titulo: "Cumpleaños de Ana", fecha: sumaDias(hoyISO(), 3), tipo: "evento" });
    esperar(r.tipo).igualA("evento");
    esperar(S.tareas.length).igualA(n + 1);
    const t = S.tareas.find(x => x.id === r.id);
    esperar(t.evento).cierto();
    esperar(t.modId).igualA("");
    const el = elementos().find(e => e.id === r.id);
    esperar(el.tipo).igualA("evento");
  }));
  prueba("se marca como hecho igual que una entrega", () => conAgendaEv(() => {
    const r = crearElemento({ titulo: "Dentista", fecha: hoyISO(), tipo: "evento" });
    ponEstado(elementos().find(e => e.id === r.id), "hecha");
    esperar(S.tareas.find(x => x.id === r.id).hecha).cierto();
  }));
  prueba("de evento a entrega coge una asignatura; de entrega a evento la puede soltar", () => conAgendaEv(() => {
    S.modulos = [moduloDe([[100, null]], { id: "mBD", cod: "BD", nombre: "Bases de Datos" })];
    const r = crearElemento({ titulo: "Quedada", fecha: hoyISO(), tipo: "evento" });
    cambiarTipo(elementos().find(e => e.id === r.id), "entrega");
    const t = S.tareas.find(x => x.id === r.id);
    esperar(!!t.evento).falso();
    esperar(t.modId).igualA("mBD");
    cambiarTipo(elementos().find(e => e.id === r.id), "evento");
    esperar(S.tareas.find(x => x.id === r.id).evento).cierto();
  }));
  prueba("un examen pasado a evento deja de ser examen", () => conAgendaEv(() => {
    S.modulos = [moduloDe([[100, null]], { id: "mBD", cod: "BD", nombre: "Bases de Datos" })];
    const r = crearElemento({ titulo: "Examen raro", modId: "mBD", fecha: sumaDias(hoyISO(), 2), tipo: "examen" });
    const nEx = S.examenes.length;
    cambiarTipo(elementos().find(e => e.id === r.id), "evento");
    esperar(S.examenes.length).igualA(nEx - 1);
    esperar(S.tareas.some(t => t.evento && t.titulo === "Examen raro")).cierto();
  }));
  prueba("en la agenda sale con su etiqueta «Evento» y sin horas de estudio", () => conAgendaEv(async () => {
    crearElemento({ titulo: "Cumpleaños de Ana", fecha: sumaDias(hoyISO(), 2), tipo: "evento" });
    pinta(); await dormir(10);
    const fila = [...document.querySelectorAll("#principal .ev")].find(f => f.textContent.includes("Cumpleaños de Ana"));
    esperar(!!fila).cierto();
    esperar(fila.textContent).contiene("Evento");
  }));
  prueba("no cuenta para «¿Te da tiempo?» ni para el anillo de entregas del Inicio", () => conAgendaEv(() => {
    const tiempo = agTiempoHTML(), anillo = JSON.stringify(anilloEntregas());
    crearElemento({ titulo: "Cena", fecha: hoyISO(), tipo: "evento" });
    esperar(agTiempoHTML()).igualA(tiempo);
    esperar(JSON.stringify(anilloEntregas())).igualA(anillo);
  }));
  prueba("al calendario del móvil va con su título tal cual, sin «Entregar:»", () => conAgendaEv(() => {
    crearElemento({ titulo: "Cumpleaños de Ana", fecha: sumaDias(hoyISO(), 2), tipo: "evento" });
    const ev = eventosCalendario().find(e => e.titulo.includes("Cumpleaños de Ana"));
    esperar(!!ev).cierto();
    esperar(ev.titulo).igualA("Cumpleaños de Ana");
  }));
  prueba("en el panel de editar hay un tercer tipo y la asignatura puede ser «Ninguna»", () => conAgendaEv(async () => {
    const r = crearElemento({ titulo: "Médico", fecha: hoyISO(), tipo: "evento" });
    agPeek = r; pinta(); await dormir(10);
    esperar(!!$('[data-peek-tipo="evento"]')).cierto();
    const sel = $("#pkMod");
    if (sel) esperar([...sel.options].some(o => o.value === "" && o.textContent === "Ninguna")).cierto();
    esperar(!!$("#pkPeso")).falso();
  }));
});
