/* GritNook sale sin el profe. Estas pruebas vigilan dos cosas: que apagado no
   se vea en ningún sitio ni se envíe nada a ninguna IA, y que encendiéndolo
   vuelva todo, para que sacarlo más adelante sea cambiar una línea. */

/* «profe» o «tutor» a la vista, o en lo que lee un lector de pantalla. Quedan
   fuera el profesor de clase de verdad («habla con tu profesor») y el tutor
   legal de un menor, que no son el profe de la app */
const RE_PROFE = /\b(profe|tutor)\b/i;
const LEGITIMO = [/tu padre, tu madre o tu tutor/i];
function nombraAlProfe(raiz) {
  const out = [];
  (raiz.innerText || "").split("\n").forEach(l => {
    if (RE_PROFE.test(l) && !LEGITIMO.some(re => re.test(l))) out.push(l.trim().slice(0, 100));
  });
  raiz.querySelectorAll("[aria-label],[title],[placeholder]").forEach(el => {
    if (!el.getClientRects().length) return;
    ["aria-label", "title", "placeholder"].forEach(a => {
      const v = el.getAttribute(a);
      if (v && RE_PROFE.test(v)) out.push(a + ": " + v.slice(0, 100));
    });
  });
  return out;
}
/* recorrer secciones sin dejar rastro */
const recorrer = fn => conEstado(() => {
  const antes = { seccion, ajTab, lgAbierto };
  try { return fn(); } finally { seccion = antes.seccion; ajTab = antes.ajTab; lgAbierto = antes.lgAbierto; pinta(); }
});

grupo("Sin profe: lo que se publica", () => {
  prueba("el interruptor sale apagado", () => {
    esperar(PROFE_ACTIVO).falso();
    esperar(profeActivo()).falso();
  });
  prueba("ninguna sección nombra al profe, ni en lo que se lee ni en lo que oye un lector de pantalla", () => {
    recorrer(() => {
      S.perfil = Object.assign(normalizarPerfil(), { listo: true });
      const fallos = [];
      secVisibles().forEach(s => { seccion = s.id; pinta(); nombraAlProfe(document.body).forEach(x => fallos.push(s.id + " → " + x)); });
      if (fallos.length) throw new Error(fallos.slice(0, 6).join(" | "));
    });
  });
  prueba("tampoco ninguna pestaña de Ajustes ni la lista de papeles", () => {
    recorrer(() => {
      seccion = "ajustes";
      const fallos = [];
      ajTabs().forEach(([id]) => { ajTab = id; lgAbierto = null; pinta(); nombraAlProfe(document.body).forEach(x => fallos.push(id + " → " + x)); });
      if (fallos.length) throw new Error(fallos.slice(0, 6).join(" | "));
      esperar(ajTabs().map(t => t[0])).noContiene("profe");
    });
  });
  prueba("ni un opositor, con su ficha de tema abierta", () => {
    recorrer(() => {
      opositorDePrueba();
      S.opo.temas = [{ id: "t1", n: 1, titulo: "Tema 1", modId: "bGEN", grupo: "", vueltas: [], dominado: false, dificultad: "normal", notas: "", ley: "" }];
      seccion = "oposicion"; pinta();
      esperar(nombraAlProfe(document.body)).igualA([]);
      try {
        abrirTema("t1");
        esperar(document.querySelector("#otProfe")).nulo();
        esperar(nombraAlProfe($("#dlgCuerpo"))).igualA([]);
      } finally { const d = $("#dlg"); if (d.open) d.close(); }
    });
  });
  prueba("la sección del profe no existe: ni en el menú, ni en la barra del móvil, ni entrando por el enlace", () => {
    recorrer(() => {
      esperar(secVisibles().map(s => s.id)).noContiene("tutor");
      esperar(enBarra()).noContiene("tutor");
      esperar(enBarra()).contiene("modulos");
      seccion = "tutor"; pinta();
      esperar(seccion).igualA("escritorio");
      esperar(document.querySelector('[data-sec="tutor"]')).nulo();
    });
  });
  prueba("en la barra del móvil de un opositor, su hueco es para la oposición", () => {
    conEstado(() => { opositorDePrueba(); esperar(enBarra()).contiene("oposicion"); });
  });
  prueba("la bienvenida tiene seis pasos: el del profe no sale", () => {
    esperar(bvVisibles()).igualA([0, 1, 2, 3, 4, 6]);
  });
  prueba("aunque la IA estuviera disponible, no se usa", () => {
    conEstado(() => {
      const antes = { sampleReal, sample };
      try {
        sampleReal = { finge: "que estamos en Claude" };
        S.config.ia = true;
        ponerIA(true);
        esperar(sample).nulo();
      } finally { sampleReal = antes.sampleReal; sample = antes.sample; }
    });
  });
  prueba("no escribe por su cuenta ni pone objetivos", () => {
    conEstado(() => {
      S.perfil = Object.assign(normalizarPerfil(), { listo: true });
      const T0 = normalizarTutor();
      T0.repasos = [{ id: "r1", tema: "Normalización", modId: "", fecha: hoyISO(), hecho: false }];
      const antes = T0.chat.length;
      tutorMirar();
      esperar(normalizarTutor().chat.length).igualA(antes);
      esperar(objetivosDeHoy().some(o => o.id === "rep:r1")).falso();
    });
  });
  prueba("el plan de un examen no manda resolver dudas «con el profe»", () => {
    conEstado(() => {
      const ex = { id: "e", modId: "", titulo: "Examen", fecha: sumaDias(hoyISO(), 10), temas: "" };
      const plan = planExamenLocal(ex).map(p => p.txt).join(" | ");
      esperar(plan).noContiene("profe");
    });
  });
});

grupo("Sin profe: encenderlo es cambiar una línea", () => {
  prueba("con el interruptor encendido vuelve todo: sección, paso de la bienvenida, pestaña y papel", () => {
    conProfe(() => {
      esperar(secVisibles().map(s => s.id)).contiene("tutor");
      esperar(enBarra()).contiene("tutor");
      esperar(bvVisibles()).contiene(5);
      esperar(ajTabs().map(t => t[0])).contiene("profe");
      recorrer(() => { seccion = "ajustes"; ajTab = "legal"; lgAbierto = null; pinta(); esperar(document.querySelector('[data-lg="ia"]') !== null).cierto(); });
    });
  });
  prueba("y con él, los objetivos que pone el profe", () => {
    conProfe(() => conEstado(() => {
      normalizarTutor().repasos = [{ id: "r1", tema: "Normalización", modId: "", fecha: hoyISO(), hecho: false }];
      esperar(objetivosDeHoy().some(o => o.id === "rep:r1")).cierto();
    }));
  });
  prueba("al salir de una prueba, el interruptor vuelve a quedar apagado", () => {
    conProfe(() => {});
    esperar(PROFE_ACTIVO).falso();
    try { conProfe(() => { throw new Error("a propósito"); }); } catch (e) {}
    esperar(PROFE_ACTIVO).falso();
  });
});
