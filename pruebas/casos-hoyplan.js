/* «Hoy no me toca» y «Añadir a hoy»: quitar y poner asignaturas en el plan
   de hoy, solo para hoy, desde la sesión y desde «Hoy toca». */

async function conPlanHoy(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, reloj = JSON.parse(JSON.stringify(relojDatos()));
  try {
    const p = normalizarPerfil(); p.diasFuertes = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
    p.horasSemana = 10; delete S.config.hoyPlan; T.modId = null; T.activo = false; T.restante = 0;
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
const idsHoy = () => planDeHoy().map(b => b.modId);

grupo("Hoy no me toca: el plan de hoy", () => {
  prueba("quitar una asignatura la saca solo de hoy; mañana vuelve el plan de siempre", () => conPlanHoy(async () => {
    const id = idsHoy()[0];
    esperar(!!id).cierto();
    quitarDeHoy(id);
    esperar(idsHoy().includes(id)).falso();
    esperar(S.config.hoyPlan.fecha).igualA(hoyISO());
    const manana = sumaDias(hoyISO(), 1), dia = s => JSON.stringify((s.find(d => d.fecha === manana) || {}).bloques);
    esperar(dia(planSemana(manana))).igualA(dia(planSemanaBase(manana)));   /* mañana, el plan de siempre */
  }));
  prueba("lo de otro día guardado no cuenta", () => conPlanHoy(async () => {
    const id = idsHoy()[0];
    S.config.hoyPlan = { fecha: sumaDias(hoyISO(), -1), quita: [id], pon: [] };
    esperar(idsHoy().includes(id)).cierto();
  }));
  prueba("añadir una que no estaba pone un rato «Lo has añadido tú»; quitada y añadida otra vez, vuelve como estaba", () => conPlanHoy(async () => {
    const fuera = S.modulos.find(m => !idsHoy().includes(m.id)), dentro = idsHoy()[0], antes = planDeHoy().filter(b => b.modId === dentro).length;
    ponerHoy(fuera.id);
    const b = planDeHoy().find(x => x.modId === fuera.id);
    esperar(b.motivo).igualA("Lo has añadido tú");
    esperar(b.min).igualA(num(S.config.pomodoro, 25));
    quitarDeHoy(dentro); ponerHoy(dentro);
    esperar(planDeHoy().filter(x => x.modId === dentro).length).igualA(antes);
    esperar(S.config.hoyPlan.pon.includes(dentro)).falso();
  }));
  prueba("lo que llega roto o de asignaturas que ya no existen no rompe nada", () => conPlanHoy(async () => {
    S.config.hoyPlan = { fecha: hoyISO(), quita: "x", pon: [null, 3, "no-existe", "<img>"] };
    esperar(Array.isArray(planDeHoy())).cierto();
    S.config.hoyPlan = "basura";
    esperar(Array.isArray(planDeHoy())).cierto();
  }));
});

grupo("Hoy no me toca: los botones", () => {
  prueba("«Hoy toca» sale también en el móvil, con «Hoy no me toca», el ✓ de hecho y «Añadir a hoy»", () => conPlanHoy(async () => {
    const c = $(".hy-hoytoca");
    esperar(getComputedStyle(c).display).igualA("grid");
    esperar(c.querySelectorAll("[data-no-toca]").length).igualA(c.querySelectorAll("[data-hecho-hoy]").length);
    esperar(c.querySelectorAll("[data-plan-empezar]").length).igualA(0);
    esperar(c.querySelector("[data-no-toca]").textContent).igualA("Hoy no me toca");
    esperar(!!c.querySelector("[data-anadir-hoy]")).cierto();
  }));
  prueba("el ✓ apunta lo que faltaba de su plan, la deja hecha y «Deshacer» lo quita", () => conPlanHoy(async () => {
    const id = idsHoy()[0], hoy = hoyISO(), plan = planDeHoy().filter(b => b.modId === id).reduce((s, b) => s + b.min, 0);
    S.horas[id] = S.horas[id] || {}; S.horas[id][hoy] = 10; pinta(); await dormir(20);
    $(`.hy-hoytoca [data-hecho-hoy="${id}"]`).click(); await dormir(30);
    esperar(S.horas[id][hoy]).igualA(Math.max(plan, 11));
    esperar(planDeHoy().filter(b => b.modId === id).every(b => b.hecho)).cierto();
    esperar(!!$(`.hy-hoytoca [data-hecho-hoy="${id}"]`)).falso();
    [...document.querySelectorAll("#avisos .toast-accion")].pop().querySelector("button").click(); await dormir(30);
    esperar(S.horas[id][hoy]).igualA(10);
  }));
  prueba("pulsar «Hoy no me toca» la quita, avisa y «Deshacer» la devuelve", () => conPlanHoy(async () => {
    const b = $(".hy-hoytoca [data-no-toca]"), id = b.dataset.noToca;
    b.click(); await dormir(30);
    esperar(idsHoy().includes(id)).falso();
    esperar(!!$(`.hy-hoytoca [data-no-toca="${id}"]`)).falso();
    const t = [...document.querySelectorAll("#avisos .toast-accion")].pop();
    esperar(t.textContent).contiene("Hoy no te toca");
    t.querySelector("button").click(); await dormir(30);
    esperar(idsHoy().includes(id)).cierto();
  }));
  prueba("en la sesión: si toca hoy, «Hoy no me toca»; si no, «Añadir a hoy»; con el reloj en marcha, nada", () => conPlanHoy(async () => {
    const dentro = modPorId(idsHoy()[0]), fuera = S.modulos.find(m => !idsHoy().includes(m.id));
    esperar(sesPlanHTML(dentro)).contiene("data-no-toca");
    esperar(sesPlanHTML(fuera)).contiene("data-pon-hoy");
    T.activo = true; esperar(sesPlanHTML(dentro).includes("data-no-toca")).falso(); T.activo = false;
    const s = $("#selTimer"); s.value = fuera.id; s.dispatchEvent(new Event("change", { bubbles: true })); await dormir(20);
    esperar($("#sesPlan").textContent).contiene("Añadir a hoy");
    esperar($("#hySesTit").textContent).contiene(fuera.nombre);
    $("#sesPlan [data-pon-hoy]").click(); await dormir(30);
    esperar(idsHoy().includes(fuera.id)).cierto();
  }));
  prueba("quitar la de la sesión pasa a la siguiente que toca", () => conPlanHoy(async () => {
    const [a, b] = idsHoy();
    T.modId = a; pinta(); await dormir(20);
    $("#sesPlan [data-no-toca]").click(); await dormir(30);
    esperar(T.modId).igualA(b);
    esperar($("#hySesTit").textContent).contiene(modPorId(b).nombre);
  }));
  prueba("«Añadir a hoy» enseña lo que falta, primero lo que habías quitado, y elegir lo añade", () => conPlanHoy(async () => {
    const quitada = idsHoy()[0]; quitarDeHoy(quitada); pinta(); await dormir(20);
    $("[data-anadir-hoy]").click(); await dormir(30);
    const ops = [...document.querySelectorAll("#dlgCuerpo [data-pon-hoy]")];
    esperar(ops[0].dataset.ponHoy).igualA(quitada);
    esperar(ops[0].textContent).contiene("La habías quitado");
    esperar(ops.some(o => idsHoy().includes(o.dataset.ponHoy))).falso();
    ops[1].click(); await dormir(30);
    esperar($("#dlg").open).falso();
    esperar(idsHoy().includes(ops[1].dataset.ponHoy)).cierto();
  }));
});
