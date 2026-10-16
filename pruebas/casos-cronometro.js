/* El cronómetro se puede terminar cuando quieras (guarda los minutos enteros,
   nunca redondea hacia arriba); las horas de cada asignatura se ven por
   periodos (hasta «Todo»); y nada se sale de su tarjeta con nombres largos. */

async function conReloj(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, reloj = JSON.parse(JSON.stringify(relojDatos()));
  try {
    clearInterval(T.tick); Object.assign(T, { activo: false, fase: "trabajo", fin: 0, restante: 0, aviso: "", sid: "", cerrada: "", modId: S.modulos[0].id, temaId: "" });
    S.config.pomodoro = 25; seccion = "escritorio"; pinta(); await dormir(20);
    return await fn();
  } finally {
    await dormir(30);
    const d = $("#dlg"); if (d.open) d.close();
    document.querySelectorAll("#avisos .toast").forEach(t => t.remove());
    clearInterval(T.tick); Object.assign(T, reloj, { tick: null });
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; pzPeriodo = "4s"; pinta();
  }
}
const minHoy = id => num((S.horas[id] || {})[hoyISO()]);
/* la sesión en marcha, como si llevara «seg» segundos */
function llevar(seg, activo = true) {
  T.sid = "s-" + Math.random(); T.cerrada = "";
  if (activo) { T.activo = true; T.restante = 0; T.fin = Date.now() + (25 * 60 - seg) * 1000; }
  else { T.activo = false; T.restante = 25 * 60 - seg; }
}

grupo("Cronómetro: terminar cuando quieras", () => {
  prueba("parar en 6:35 suma 6 minutos, no 7", () => conReloj(async () => {
    const id = T.modId, antes = minHoy(id);
    llevar(6 * 60 + 35); pintaReloj();
    esperar($("#btnReset").textContent).igualA("Terminar");
    $("#btnReset").click(); await dormir(30);
    esperar(minHoy(id) - antes).igualA(6);
    esperar(T.activo).falso();
    esperar(T.restante).igualA(0);
    esperar([...document.querySelectorAll("#avisos .toast")].pop().textContent).contiene("6 minutos");
  }));
  prueba("en pausa también: 12:59 suma 12", () => conReloj(async () => {
    const id = T.modId, antes = minHoy(id);
    llevar(12 * 60 + 59, false); pinta(); await dormir(20);
    $("#btnReset").click(); await dormir(30);
    esperar(minHoy(id) - antes).igualA(12);
  }));
  prueba("con menos de un minuto no apunta nada, y lo dice", () => conReloj(async () => {
    const id = T.modId, antes = minHoy(id);
    llevar(40); $("#btnReset").click(); await dormir(30);
    esperar(minHoy(id)).igualA(antes);
    esperar([...document.querySelectorAll("#avisos .toast")].pop().textContent).contiene("no se apunta");
  }));
  prueba("la misma sesión no se apunta dos veces", () => conReloj(async () => {
    const id = T.modId, antes = minHoy(id);
    llevar(10 * 60); const sid = T.sid; terminarAhora();
    T.sid = sid; T.activo = false; T.restante = 15 * 60; terminarAhora();
    esperar(minHoy(id) - antes).igualA(10);
  }));
  prueba("sin sesión a medias el botón sigue siendo «Reiniciar»", () => conReloj(async () => {
    pintaReloj();
    esperar($("#btnReset").textContent).igualA("Reiniciar");
  }));
  prueba("la × del cronómetro pequeño, en pausa, guarda lo hecho en vez de tirarlo", () => conReloj(async () => {
    const id = T.modId, antes = minHoy(id);
    llevar(8 * 60 + 10, false); seccion = "progreso"; pinta(); await dormir(20);
    esperar($("#miniReloj").hidden).falso();
    $("#mrCerrar").click(); await dormir(30);
    esperar(minHoy(id) - antes).igualA(8);
    esperar($("#miniReloj").hidden).cierto();
  }));
});

grupo("Progreso: tus horas por periodo", () => {
  prueba("«Dónde va tu tiempo» deja elegir 4 semanas, 3 meses, 6 meses o todo", () => conReloj(async () => {
    const [a, b] = S.modulos, hoy = hoyISO();
    S.horas[a.id] = { [hoy]: 60, [sumaDias(hoy, -60)]: 120, [sumaDias(hoy, -150)]: 30, [sumaDias(hoy, -300)]: 45 };
    S.horas[b.id] = { [sumaDias(hoy, -5)]: 30 };
    seccion = "progreso"; pinta(); await dormir(20);
    const total = () => $(".pz-reparto .hy-etq").textContent;
    esperar(total()).igualA(horasTxt(90));
    for (const [id, min] of [["3m", 210], ["6m", 240], ["todo", 285]]) {
      $(`[data-pz-periodo="${id}"]`).click(); await dormir(20);
      esperar(total()).igualA(horasTxt(min));
      esperar($(`[data-pz-periodo="${id}"]`).getAttribute("aria-pressed")).igualA("true");
    }
    esperar($(".pz-desde").textContent).contiene("desde el " + fechaCortaAnio(sumaDias(hoy, -300)));
  }));
  prueba("las horas no caducan: lo de hace un año sigue contando en «Todo»", () => conReloj(async () => {
    const a = S.modulos[0], viejo = sumaDias(hoyISO(), -400);
    S.horas[a.id] = { [viejo]: 50 }; pzPeriodo = "todo"; seccion = "progreso"; pinta(); await dormir(20);
    esperar($(".pz-reparto").textContent).contiene(a.nombre);
  }));
});

grupo("Inicio: nada se sale de su tarjeta", () => {
  prueba("con un nombre larguísimo, la sesión cabe entera (botones incluidos)", () => conReloj(async () => {
    S.modulos[0].nombre = "Itinerario Personal para la Empleabilidad I con un nombre todavía más largo"; S.modulos[0].cod = "IPE1";
    T.modId = S.modulos[0].id; pinta(); await dormir(20);
    const c = $(".hy-sesion").getBoundingClientRect();
    [...$(".hy-sesion").querySelectorAll("button, select, h2, .hy-fase")].forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return;
      esperar(r.right <= c.right + 1 && r.left >= c.left - 1).cierto();
    });
  }));
  prueba("«Esta semana»: todos los días a la misma altura", () => conReloj(async () => {
    const tops = [...document.querySelectorAll(".hy-dias .hy-d i")].map(i => Math.round(i.getBoundingClientRect().top));
    esperar(new Set(tops).size).igualA(1);
  }));
});
