/* El Progreso sencillo: tu mes, la constancia, semana a semana, dónde va tu
   tiempo y los logros. Todo sale de las horas del cronómetro, las tarjetas y
   las notas; se prueba con un curso de mentira y se deja todo como estaba. */

const pzDia = n => sumaDias(hoyISO(), -n);
async function enProgreso(fn, prepara) {
  const antes = JSON.parse(JSON.stringify(S)), s0 = seccion;
  try {
    S.modulos = [moduloDe([[100, 7]], { id: "pro", cod: "PRO", nombre: "Programación", metaSemanal: 3 }), moduloDe([[100, null]], { id: "bd", cod: "BD", nombre: "Bases de Datos", color: 1, metaSemanal: 2 })];
    S.horas = {}; S.tarjetas = []; S.examenes = [];
    normalizarPerfil().horasSemana = 5;
    if (prepara) prepara();
    seccion = "progreso"; pinta(); await dormir(20);
    return await fn();
  } finally { S = JSON.parse(JSON.stringify(antes)); seccion = s0; pinta(); }
}
const pzApunta = (mod, dias, min) => { S.horas[mod] = S.horas[mod] || {}; dias.forEach(n => { S.horas[mod][pzDia(n)] = min; }); };

grupo("Progreso: tu mes", () => {
  prueba("sin estudio este mes, lo dice sin agobiar", () => enProgreso(() => {
    esperar($(".pz-mes").textContent).contiene("Aún no has estudiado este mes");
  }));
  prueba("las horas del mes, tu asignatura estrella y tu racha", () => enProgreso(() => {
    const t = $(".pz-mes").textContent;
    esperar(t).contiene("Programación");
    esperar(t).contiene("días de constancia");
    esperar($(".pz-grande").textContent.replace(/\s+/g, " ")).contiene("h");
  }, () => { const hoy = Number(hoyISO().slice(8, 10)); pzApunta("pro", [...Array(Math.min(hoy, 3)).keys()], 60); pzApunta("bd", [0], 20); }));
  prueba("compara el ritmo de este mes con el del mes pasado", () => enProgreso(() => {
    esperar($(".pz-tend").textContent).contiene("al día que en");
  }, () => {
    const hoy = hoyISO(), ini = hoy.slice(0, 8) + "01", d = new Date(hoy + "T12:00:00"), ant = hoyISO(new Date(d.getFullYear(), d.getMonth() - 1, 3, 12));
    S.horas.pro = { [ant]: 30, [ini]: 300 };
  }));
  prueba("el día de la semana que más estudias", () => enProgreso(() => {
    const dia = DIAS_NOMBRE[diaDe(pzDia(2))].toLowerCase();
    esperar($(".pz-mes").textContent).contiene(dia);
  }, () => { pzApunta("pro", [2, 9, 16], 90); pzApunta("bd", [3], 10); }));
});

grupo("Progreso: constancia, semanas y reparto", () => {
  prueba("un cuadrito por día: más oscuro cuanto más estudiaste, y los que vienen, vacíos", () => enProgreso(() => {
    const hoy = document.querySelector(".pz-sem i.hoy");
    esperar(hoy.classList.contains("n4")).cierto();
    esperar(document.querySelectorAll(".pz-sem i.n1").length).igualA(1);
    esperar(document.querySelectorAll(".pz-sem i").length).igualA(7 * Number(getComputedStyle($(".pz-mapa")).getPropertyValue("--sem")));
    esperar($(".pz-const").textContent).contiene("2 de");
  }, () => { pzApunta("pro", [0], 150); pzApunta("bd", [1], 10); }));
  prueba("la mejor racha cuenta días seguidos", () => enProgreso(() => {
    esperar(pzMejorRacha()).igualA(4);
  }, () => { pzApunta("pro", [10, 11, 12, 13, 20], 30); }));
  prueba("semana a semana: ocho barras, la raya de la meta y cuántas semanas llegaste", () => enProgreso(() => {
    esperar(document.querySelectorAll(".pz-col").length).igualA(8);
    esperar(!!$(".pz-raya")).cierto();
    esperar($(".pz-semanas").textContent).contiene("1 de 7");
    esperar(document.querySelectorAll(".pz-col.llega").length >= 1).cierto();
  }, () => { pzApunta("pro", [7 + ((Number(new Date().getDay()) + 6) % 7)], 400); }));
  prueba("dónde va tu tiempo: el reparto de las últimas 4 semanas, de más a menos", () => enProgreso(() => {
    esperar([...document.querySelectorAll(".pz-reparto .pz-lista span")].map(x => x.textContent)).igualA(["Bases de Datos", "Programación"]);
    esperar($(".pz-reparto").textContent).contiene("75 %");
  }, () => { pzApunta("bd", [1, 2, 3], 60); pzApunta("pro", [40], 500); pzApunta("pro", [5], 60); }));
  prueba("sin horas apuntadas, el reparto lo explica", () => enProgreso(() => {
    esperar($(".pz-reparto").textContent).contiene("Cuando estudies con el cronómetro");
  }));
});

grupo("Progreso: logros", () => {
  prueba("cuenta los conseguidos y enseña los dos siguientes con lo que falta", () => enProgreso(() => {
    esperar($(".pz-logros .hy-etq").textContent).igualA("3 de " + PZ_LOGROS.length);
    const sig = [...document.querySelectorAll(".pz-prox li")];
    esperar(sig.length).igualA(2);
    esperar(sig[0].textContent).contiene("Diez horas");
    esperar(sig[0].textContent).contiene("Te faltan 8 h");
  }, () => { pzApunta("pro", [0, 1, 2], 40); }));
  prueba("«te falta» o «te faltan» según el número", () => {
    esperar(pzFalta(PZ_LOGROS.find(l => l.id === "r3"), 2)).igualA("Te falta 1 día");
    esperar(pzFalta(PZ_LOGROS.find(l => l.id === "r7"), 2)).igualA("Te faltan 5 días");
    esperar(pzFalta(PZ_LOGROS.find(l => l.id === "h1"), 30)).igualA("Te faltan 30 min");
  });
  prueba("un aprobado y las tarjetas dominadas también cuentan", () => enProgreso(() => {
    const c = pzCuentas();
    esperar(c.aprobadas).igualA(1);
    esperar(c.dominadas).igualA(2);
  }, () => { S.tarjetas = [{ id: "a", frente: "x", dorso: "y", caja: 4, proximo: hoyISO() }, { id: "b", frente: "x", dorso: "y", caja: 5, proximo: hoyISO() }, { id: "c", frente: "x", dorso: "y", caja: 1, proximo: hoyISO() }]; }));
  prueba("los exámenes con nota salen abajo, del más reciente al más antiguo", () => enProgreso(() => {
    esperar([...document.querySelectorAll(".pz-examenes .pz-lista span")].map(x => x.textContent)).igualA(["Parcial 2", "Parcial 1"]);
  }, () => { S.examenes = [{ id: "e1", titulo: "Parcial 1", modId: "pro", fecha: pzDia(30), nota: 6, plan: [] }, { id: "e2", titulo: "Parcial 2", modId: "bd", fecha: pzDia(3), nota: 8.5, plan: [] }, { id: "e3", titulo: "Sin hacer", modId: "bd", fecha: pzDia(-5), nota: null, plan: [] }]; }));
});
