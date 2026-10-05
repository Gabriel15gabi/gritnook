/* Oposición, en sencillo: arriba tu camino al examen en una sola tarjeta
   (cuenta atrás con su etapa, la vuelta con su anillo y el ritmo), lo de
   hoy, tus simulacros contra el corte en barras, y lo que se enfría y lo
   flojo, cortos. Las pestañas y lo de dentro son lo de siempre. */

const conTreinta = O => {
  O.temas = Array.from({ length: 30 }, (_, i) => temaDe(i + 1, { vueltas: i < 20 ? [haceDias(10 + (i % 15))] : [] }));
  O.examen.fecha = sumaDias(hoyISO(), 95); O.examen.corte = 60;
};
const simDe = (dias, aciertos, fallos) => ({ id: "s" + dias + aciertos, fecha: haceDias(dias), tipo: "completo", preguntas: 100, aciertos, fallos });

grupo("Oposición en sencillo: tu camino al examen", () => {
  prueba("la etapa sale de los días que quedan", () => {
    esperar(ozEtapa(0)[1]).igualA("Es hoy");
    esperar(ozEtapa(5)[1]).igualA("Esta semana");
    esperar(ozEtapa(20)[1]).igualA("Recta final");
    esperar(ozEtapa(60)[1]).igualA("A buen paso");
    esperar(ozEtapa(200)[1]).igualA("Aún hay margen");
    esperar(ozEtapa(-1)).nulo();
    esperar(ozEtapa(undefined)).nulo();
  });
  prueba("arriba, los días, la etapa, la vuelta en la que vas y tu temario", () => enOpo(() => {
    const h = $("#principal .oz-hero");
    esperar(!!h).cierto();
    esperar(h.querySelector(".oz-cuenta b").textContent).igualA(String(planOpo().dias));
    esperar(h.textContent).contiene("días para el examen");
    esperar(h.textContent).contiene("Aún hay margen");
    esperar(h.textContent).contiene("Vuelta 1 de");
    esperar(h.textContent).contiene("20 de 30 temas");
    esperar(h.textContent).contiene("Te faltan 10 temas");
    esperar(!!h.querySelector(".oz-aro .oz-lleno")).cierto();
    esperar(h.textContent).contiene("sin empezar");
  }, { prep: conTreinta }));
  prueba("sin fecha de examen, te dice que la pongas y te lleva a ponerla", () => enOpo(async () => {
    const h = $("#principal .oz-hero");
    esperar(h.textContent).contiene("Sin fecha de examen");
    h.querySelector('[data-opo-tab="examen"]').click(); await dormir(10);
    esperar(opoTab).igualA("examen");
  }, { prep: O => { conTreinta(O); O.examen.fecha = ""; } }));
  prueba("sin temario, lo primero es montarlo", () => enOpo(() => {
    esperar(!!$("#principal .oz")).falso();
    esperar($("#principal").textContent).contiene("Monta tu oposición");
  }));
});

grupo("Oposición en sencillo: hoy, simulacros y lo que se enfría", () => {
  prueba("los simulacros, en aciertos netos y sobre 10, contra la línea del corte", () => enOpo(() => {
    const s = $("#principal .oz-sim");
    esperar(s.textContent).contiene("aciertos netos");
    esperar(s.textContent).contiene("sobre 10");
    esperar(s.textContent).noContiene("netas");
    esperar(!!s.querySelector(".oz-corte")).cierto();
    esperar(s.querySelectorAll(".oz-col").length).igualA(3);
    esperar(s.querySelectorAll(".oz-col.pasa").length).igualA(1);
  }, { prep: O => { conTreinta(O); O.simulacros = [simDe(9, 50, 30), simDe(5, 58, 20), simDe(1, 70, 15)]; } }));
  prueba("sin simulacros, te invita a apuntar el primero", () => enOpo(() => {
    const s = $("#principal .oz-sim");
    esperar(s.textContent).contiene("Apunta tu primer simulacro");
    esperar(!!s.querySelector('[data-opo-tab="simulacros"]')).cierto();
  }, { prep: conTreinta }));
  prueba("lo que se enfría: los cuatro primeros y «Ver los N» al temario", () => enOpo(async () => {
    const f = $("#principal .oz-frios");
    const n = temasFrios().length;
    esperar(n > 4).cierto();
    esperar(f.querySelectorAll(".opo-fila").length).igualA(4);
    const ver = f.querySelector('[data-opo-tab="temario"]');
    esperar(ver.textContent).igualA("Ver los " + n);
    ver.click(); await dormir(10);
    esperar(opoTab).igualA("temario");
  }, { prep: O => { conTreinta(O); O.temas.forEach((t, i) => { if (i < 12) t.vueltas = [haceDias(40)]; }); } }));
  prueba("las pestañas, como en el resto de la app, y «Examen y plan» se acorta en el móvil", () => enOpo(() => {
    const tabs = [...document.querySelectorAll("#principal .oz-tabs [data-opo-tab]")];
    esperar(tabs.map(b => b.dataset.opoTab)).igualA(OPO_TABS.map(t => t[0]));
    esperar(tabs.find(b => b.getAttribute("aria-selected") === "true").dataset.opoTab).igualA("resumen");
    esperar(!!tabs[3].querySelector(".oz-largo")).cierto();
    esperar(tabs[3].textContent).igualA("Examen y plan");
  }, { prep: conTreinta }));
  prueba("cada pestaña se sigue pintando con lo de siempre", () => enOpo(async () => {
    for (const [id] of OPO_TABS) {
      opoTab = id; pinta(); await dormir(5);
      esperar($("#principal .oz-tabs [aria-selected=true]").dataset.opoTab).igualA(id);
      esperar($("#principal .opo-cuerpo").innerHTML.length > 200).cierto();
    }
  }, { prep: conTreinta }));
});
