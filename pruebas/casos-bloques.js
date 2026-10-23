/* Sesiones de 25, 40 o 60 minutos; descanso corto (5) o largo (15) según lo que
   llevas seguido; y el empujón cuando a una asignatura le faltan unos minutos
   para la hora redonda de hoy. */

async function conBloques(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, reloj = JSON.parse(JSON.stringify(relojDatos()));
  try {
    clearInterval(T.tick);
    Object.assign(T, { activo: false, fase: "trabajo", fin: 0, restante: 0, aviso: "", sid: "", cerrada: "", modId: S.modulos[0].id, temaId: "",
      min: 0, minProx: 0, dmin: 0, largo: false, seguidos: 0, dia: "", finTrabajo: 0 });
    Object.assign(S.config, { pomodoro: 25, sesion: 25, descansoCorto: 5, descanso: 15 });
    seccion = "escritorio"; pinta(); await dormir(20);
    return await fn();
  } finally {
    await dormir(30);
    const d = $("#dlg"); if (d.open) d.close();
    document.querySelectorAll("#avisos .toast").forEach(t => t.remove());
    clearInterval(T.tick); Object.assign(T, reloj, { tick: null });
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; pinta();
  }
}
const cierraDlg = () => { const d = $("#dlg"); if (d.open) d.close(); };
/* una sesión entera, como si el reloj hubiera llegado a cero */
function acabarSesion() {
  Object.assign(T, { fase: "trabajo", aviso: "", restante: 0, activo: false });
  iniciarTimer(); clearInterval(T.tick); T.fin = Date.now() - 1000;
  terminarFase();
}
/* el descanso que toca, entero */
function hacerDescanso() { cierraDlg(); iniciarTimer(); clearInterval(T.tick); T.fin = Date.now() - 1000; terminarFase(); }
const minHoyDe = id => num((S.horas[id] || {})[hoyISO()]);

grupo("Descansos: corto al empezar, largo cuando llevas 50", () => {
  prueba("con sesiones de 25: descanso de 5, luego de 15, y vuelta a empezar", () => conBloques(async () => {
    acabarSesion();
    esperar(T.dmin).igualA(5); esperar(T.largo).falso();
    esperar($("#dlg").textContent).contiene("descanso corto");
    esperar($("#dlg").textContent).contiene("Empezar descanso · 5 min");
    hacerDescanso();
    acabarSesion();
    esperar(T.seguidos).igualA(50);
    esperar(T.dmin).igualA(15); esperar(T.largo).cierto();
    esperar($("#dlg").textContent).contiene("Llevas 50 minutos: toca un descanso largo");
    esperar($("#dlg").textContent).contiene("Empezar descanso · 15 min");
    hacerDescanso();
    esperar(T.seguidos).igualA(0);
    acabarSesion();
    esperar(T.dmin).igualA(5);
  }));
  prueba("lo que dura el descanso es lo que se apunta como descanso", () => conBloques(async () => {
    const d0 = num((normalizarObjetivos().dias[hoyISO()] || {}).descanso);
    acabarSesion(); hacerDescanso();
    esperar(num(normalizarObjetivos().dias[hoyISO()].descanso) - d0).igualA(5);
  }));
  prueba("con sesiones de 40: 5 y después 15", () => conBloques(async () => {
    S.config.sesion = 40;
    acabarSesion(); esperar(T.dmin).igualA(5);
    hacerDescanso(); acabarSesion();
    esperar(T.seguidos).igualA(80); esperar(T.dmin).igualA(15);
  }));
  prueba("con sesiones de 60 el descanso siempre es largo", () => conBloques(async () => {
    S.config.sesion = 60;
    acabarSesion(); esperar(T.dmin).igualA(15);
    hacerDescanso(); acabarSesion(); esperar(T.dmin).igualA(15);
  }));
  prueba("si llevas un buen rato parado, cuenta como descanso", () => conBloques(async () => {
    Object.assign(T, { seguidos: 25, dia: hoyISO(), finTrabajo: Date.now() - 20 * 60000 });
    acabarSesion();
    esperar(T.seguidos).igualA(25); esperar(T.dmin).igualA(5);
  }));
  prueba("un día nuevo empieza de cero", () => conBloques(async () => {
    Object.assign(T, { seguidos: 40, dia: sumaDias(hoyISO(), -1), finTrabajo: Date.now() - 60000 });
    acabarSesion();
    esperar(T.seguidos).igualA(25); esperar(T.dmin).igualA(5);
  }));
  prueba("si te saltas el largo, el siguiente también es largo", () => conBloques(async () => {
    acabarSesion(); hacerDescanso(); acabarSesion();
    esperar(T.largo).cierto();
    cierraDlg(); acabarSesion();
    esperar(T.seguidos).igualA(75); esperar(T.dmin).igualA(15);
  }));
  prueba("terminar antes también cuenta para el largo", () => conBloques(async () => {
    Object.assign(T, { fase: "trabajo", aviso: "", restante: 0, activo: false });
    iniciarTimer(); clearInterval(T.tick); T.fin = Date.now() + 5 * 60 * 1000;   /* lleva 20 de 25 */
    terminarAhora();
    esperar(T.seguidos).igualA(20);
    acabarSesion();
    esperar(T.seguidos).igualA(45); esperar(T.dmin).igualA(5);
    hacerDescanso(); acabarSesion();
    esperar(T.dmin).igualA(15);
  }));
  prueba("Ajustes deja poner el descanso corto y el largo", () => conBloques(async () => {
    const h = ajCrono();
    esperar(h).contiene('id="apDesCorto"'); esperar(h).contiene('id="apDes"');
    S.config.descansoCorto = 7; S.config.descanso = 20;
    acabarSesion(); esperar(T.dmin).igualA(7);
    hacerDescanso(); acabarSesion(); esperar(T.dmin).igualA(20);
  }));
});

grupo("Sesiones de 25, 40 o 60", () => {
  prueba("la tarjeta deja elegir 25, 40 o 60 y el reloj cambia", () => conBloques(async () => {
    const b = [...document.querySelectorAll(".hy-sesion [data-dur]")].map(x => x.dataset.dur);
    esperar(b).igualA(["25", "40", "60"]);
    $('.hy-sesion [data-dur="40"]').click(); await dormir(20);
    esperar(S.config.sesion).igualA(40);
    esperar($("#reloj").textContent).igualA("40:00");
    esperar($('.hy-sesion [data-dur="40"]').getAttribute("aria-pressed")).igualA("true");
  }));
  prueba("una sesión de 40 apunta 40 minutos", () => conBloques(async () => {
    const id = T.modId, antes = minHoyDe(id);
    S.config.sesion = 40; acabarSesion();
    esperar(minHoyDe(id) - antes).igualA(40);
    esperar($("#dlg").textContent).contiene("40 minutos");
  }));
  prueba("mientras corre no se puede cambiar", () => conBloques(async () => {
    $("#btnTimer").click(); await dormir(20);
    esperar($('.hy-sesion [data-dur="60"]').disabled).cierto();
    $('.hy-sesion [data-dur="60"]').click(); await dormir(20);
    esperar(S.config.sesion).igualA(25);
    esperar(T.min).igualA(25);
  }));
  prueba("terminar antes en una de 40: a los 12:30 apunta 12", () => conBloques(async () => {
    const id = T.modId, antes = minHoyDe(id);
    S.config.sesion = 40;
    Object.assign(T, { fase: "trabajo", aviso: "", restante: 0, activo: false });
    iniciarTimer(); clearInterval(T.tick); T.fin = Date.now() + (40 * 60 - (12 * 60 + 30)) * 1000;
    terminarAhora();
    esperar(minHoyDe(id) - antes).igualA(12);
  }));
  prueba("cambiar la sesión no revuelve el plan de la semana", () => conBloques(async () => {
    const antes = JSON.stringify(planSemana(hoyISO()));
    $('.hy-sesion [data-dur="60"]').click(); await dormir(20);
    esperar(JSON.stringify(planSemana(hoyISO()))).igualA(antes);
  }));
  prueba("una sesión de antes (sin minutos guardados) sigue con los de Ajustes", () => conBloques(async () => {
    Object.assign(T, { fase: "trabajo", aviso: "", restante: 0, activo: true, min: 0, sid: "viejo", fin: Date.now() + 15 * 60000 });
    esperar(minTrabajo()).igualA(25);
    esperar(minutosHechos()).igualA(10);
  }));
  prueba("el aviso del final dice qué descanso toca", () => conBloques(async () => {
    Object.assign(T, { fase: "trabajo", activo: true, min: 25, sid: "s-aviso", fin: Date.now() + 60000 });
    esperar(textoDescansoAviso()).igualA("Ahora, 5 min de descanso.");
    T.seguidos = 25; T.dia = hoyISO();
    esperar(textoDescansoAviso()).igualA("Ahora, 15 min de descanso.");
  }));
  prueba("lo que llega de otro dispositivo se limpia", () => conBloques(async () => {
    bloqueDeFuera({ min: 999, minProx: -3, dmin: "x", largo: "sí", seguidos: -5, dia: "ayer", finTrabajo: "z" });
    esperar([T.min, T.minProx, T.dmin, T.largo, T.seguidos, T.dia, T.finTrabajo]).igualA([90, 0, 0, false, 0, "", 0]);
    bloqueDeFuera({ min: 40, minProx: 15, dmin: 5, largo: true, seguidos: 50, dia: hoyISO(), finTrabajo: 123 });
    esperar([T.min, T.minProx, T.dmin, T.largo, T.seguidos, T.dia]).igualA([40, 15, 5, true, 50, hoyISO()]);
    esperar(relojDatos().seguidos).igualA(50);
  }));
});

grupo("El empujón para redondear la hora", () => {
  const conMin = async min => { S.horas[T.modId] = Object.assign({}, S.horas[T.modId], { [hoyISO()]: min }); pinta(); await dormir(20); };
  prueba("con 1 h 45 de hoy anima a hacer los 15 que faltan para las 2 h", () => conBloques(async () => {
    await conMin(105);
    const e = $(".hy-sesion .hy-empujon");
    esperar(!!e).cierto();
    esperar(e.tagName).igualA("BUTTON");
    esperar(e.dataset.empujon).igualA("15");
    esperar(e.querySelector(".hy-emp-t b").textContent).igualA("Completar las 2 h");
    esperar(e.querySelector(".hy-emp-t small").textContent).contiene("1 h 45 min de 2 h");
    esperar(e.querySelector(".hy-emp-min").textContent).igualA("15 min");
    /* el botón se rellena hasta lo que llevas: 105 de 120 */
    esperar(e.querySelector(".hy-emp-relleno").style.width).igualA("87.5%");
  }));
  prueba("con 40 minutos, «Completar la hora»", () => conBloques(async () => {
    await conMin(40);
    esperar($(".hy-sesion .hy-empujon .hy-emp-t b").textContent).igualA("Completar la hora");
    esperar($(".hy-sesion .hy-empujon").dataset.empujon).igualA("20");
  }));
  prueba("el botón arranca una sesión de 15 y apunta 15", () => conBloques(async () => {
    const id = T.modId;
    await conMin(105);
    $(".hy-sesion [data-empujon]").click(); await dormir(20);
    esperar(T.activo).cierto(); esperar(T.min).igualA(15);
    esperar(segsRestantes()).entre(890, 900);
    esperar(getComputedStyle($(".hy-sesion .hy-empujon")).display).igualA("none");
    clearInterval(T.tick); T.fin = Date.now() - 1000; terminarFase();
    esperar(minHoyDe(id)).igualA(120);
    hacerDescanso(); pinta(); await dormir(20);
    esperar(!!$(".hy-sesion .hy-empujon")).falso();
    esperar($("#reloj").textContent).igualA("25:00");
  }));
  prueba("solo cuando faltan entre 5 y 20 minutos, y con media hora hecha", () => conBloques(async () => {
    for (const [min, sale] of [[40, true], [100, true], [115, true], [118, false], [90, false], [20, false], [120, false]]) {
      await conMin(min);
      esperar([min, !!$(".hy-sesion .hy-empujon")]).igualA([min, sale]);
    }
  }));
  prueba("al acabar la sesión lo recuerda para después del descanso", () => conBloques(async () => {
    await conMin(80);
    acabarSesion();
    esperar($("#dlg").textContent).contiene("Con 15 min más llegas a 2 h");
  }));
  prueba("durante el descanso no sale; al acabarlo, sí", () => conBloques(async () => {
    await conMin(80);
    acabarSesion(); cierraDlg(); iniciarTimer(); clearInterval(T.tick); pinta(); await dormir(20);
    esperar(getComputedStyle($(".hy-sesion .hy-empujon")).display).igualA("none");
    T.fin = Date.now() - 1000; terminarFase(); pinta(); await dormir(20);
    esperar(getComputedStyle($(".hy-sesion .hy-empujon")).display).distintoDe("none");
  }));
});
