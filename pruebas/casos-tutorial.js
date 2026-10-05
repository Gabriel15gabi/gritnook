/* El tutorial, sección a sección: empieza en Inicio con un mensaje corto y
   «Pasar a Apuntes»; lo que aún no has visto sale en gris en el menú y se
   desbloquea al entrar. Y la app encajada en el móvil, sin zoom. */

/* el tutorial de prueba, y todo como estaba al acabar */
async function conTutorial(fn, { perfil = null } = {}) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion;
  const tut = localStorage.getItem("desk-daw:tutorial"), vis = localStorage.getItem("desk-daw:vistos");
  try {
    if (perfil) S.perfil = Object.assign(normalizarPerfil(), perfil);
    localStorage.removeItem("desk-daw:tutorial");
    return await fn();
  } finally {
    cerrarHojaMas();
    [["desk-daw:tutorial", tut], ["desk-daw:vistos", vis]].forEach(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); });
    S = JSON.parse(JSON.stringify(antes)); seccion = sec;
    const c = $("#tutCarta"); if (c) c.remove();
    document.body.classList.remove("con-tut");
    pinta();
  }
}
const enMenu = id => $('#riel [data-sec="' + id + '"]') || $('#barraMovil [data-sec="' + id + '"]');

grupo("Tutorial: sección a sección", () => {
  prueba("empieza en Inicio y luego toca Apuntes, Agenda y el resto, en ese orden", () => conTutorial(() => {
    const p = tutPasos();
    esperar(p.slice(0, 3)).igualA(["escritorio", "apuntes", "entregas"]);
    esperar(p.includes("oposicion")).falso();
    esperar(p).igualA(TUT_ORDEN.filter(id => secVisibles().some(s => s.id === id)));
  }, { perfil: { etapa: "fp" } }));
  prueba("si opositas, la Oposición entra en el recorrido después de la Agenda", () => conTutorial(() => {
    esperar(tutPasos().slice(0, 4)).igualA(["escritorio", "apuntes", "entregas", "oposicion"]);
  }, { perfil: { etapa: "oposicion" } }));
  prueba("al empezar: Inicio con su mensaje y «Pasar a Apuntes»; lo demás, en gris", () => conTutorial(() => {
    seccion = "repaso"; tutEmpezar();
    esperar(seccion).igualA("escritorio");
    const c = $("#tutCarta");
    esperar(!!c).cierto();
    esperar(c.textContent).contiene("Paso 1 de " + tutPasos().length);
    esperar(c.textContent).contiene("Inicio");
    esperar(c.querySelector("[data-tut-ir]").dataset.tutIr).igualA("apuntes");
    esperar(c.querySelector("[data-tut-ir]").textContent).contiene("Pasar a Apuntes");
    esperar(enMenu("escritorio").classList.contains("tut-gris")).falso();
    esperar(enMenu("apuntes").classList.contains("tut-gris")).cierto();
    esperar(enMenu("apuntes").classList.contains("tut-sig")).cierto();
    esperar(enMenu("entregas").classList.contains("tut-sig")).falso();
  }));
  prueba("«Pasar a Apuntes» te lleva y la desbloquea; la siguiente es la Agenda", () => conTutorial(() => {
    tutEmpezar();
    $("#tutCarta [data-tut-ir]").click();
    esperar(seccion).igualA("apuntes");
    esperar(leeLS("tutorial").vistas).igualA(["escritorio", "apuntes"]);
    esperar(enMenu("apuntes").classList.contains("tut-gris")).falso();
    esperar($("#tutCarta").textContent).contiene("Paso 2 de");
    esperar($("#tutCarta [data-tut-ir]").dataset.tutIr).igualA("entregas");
  }));
  prueba("tocar una sección en gris del menú también la desbloquea", () => conTutorial(() => {
    tutEmpezar();
    irASeccion("progreso");
    esperar(leeLS("tutorial").vistas.includes("progreso")).cierto();
    esperar($("#tutCarta").textContent).contiene("Progreso");
    /* lo siguiente sigue siendo lo primero que falta */
    esperar($("#tutCarta [data-tut-ir]").dataset.tutIr).igualA("apuntes");
  }));
  prueba("en el último paso, «Terminar» lo acaba y vuelve a Inicio", () => conTutorial(() => {
    tutEmpezar();
    const p = tutPasos();
    p.slice(1).forEach(id => irASeccion(id));
    const fin = $("#tutCarta [data-tut-fin]");
    esperar(fin.textContent).igualA("Terminar");
    esperar(!!$("#tutCarta [data-tut-ir]")).falso();
    fin.click();
    esperar(seccion).igualA("escritorio");
    esperar(!!$("#tutCarta")).falso();
    esperar(document.querySelectorAll(".tut-gris, .tut-sig").length).igualA(0);
    esperar(!!vistos().tutorial).cierto();
  }));
  prueba("«Saltar» lo quita todo y te dice dónde volver a verlo", () => conTutorial(() => {
    tutEmpezar();
    $("#tutCarta [data-tut-saltar]").click();
    esperar(!!$("#tutCarta")).falso();
    esperar(document.querySelectorAll(".tut-gris").length).igualA(0);
    esperar(leeLS("tutorial").on).falso();
    esperar(document.body.textContent).contiene("Ver el tutorial");
  }));
  prueba("se vuelve a ver desde tu perfil, desde el principio", () => conTutorial(() => {
    guardaLS("tutorial", { on: false, vistas: tutPasos() });
    seccion = "progreso"; pinta();
    $("#rielYo").click();
    $('#yoMenu [data-yo="tutorial"]').click();
    esperar(seccion).igualA("escritorio");
    esperar(leeLS("tutorial")).igualA({ on: true, vistas: ["escritorio"] });
    esperar(!!$("#tutCarta")).cierto();
  }));
  prueba("sin tutorial, el menú no se toca", () => conTutorial(() => {
    pinta();
    esperar(!!$("#tutCarta")).falso();
    esperar(document.querySelectorAll(".tut-gris, .tut-sig").length).igualA(0);
  }));
  prueba("en la hoja de «Más», lo que falta también sale en gris", () => conTutorial(() => {
    tutEmpezar();
    abrirHojaMas();
    const fila = $('#hojaMas [data-sec="progreso"]');
    esperar(!!fila).cierto();
    esperar(fila.classList.contains("tut-gris")).cierto();
    const aj = $('#hojaMas [data-sec="ajustes"]');
    if (aj) esperar(aj.classList.contains("tut-gris")).falso();
  }));
  prueba("al acabar la bienvenida de una cuenta nueva empieza solo; al reconfigurar, no", () => {
    const src = bvAplicar.toString();
    esperar(src).contiene("tutNuevo = !BV.reconfig");
    esperar(src).contiene("if (tutNuevo) tutEmpezar(); else pinta();");
  });
});

grupo("Móvil: la app encajada, sin zoom", () => {
  prueba("no se puede acercar con dos dedos ni con doble toque", () => {
    const v = document.querySelector('meta[name="viewport"]').content;
    esperar(v).contiene("maximum-scale=1");
    esperar(v).contiene("user-scalable=no");
    esperar(v).contiene("viewport-fit=cover");
    esperar(getComputedStyle(document.documentElement).touchAction).igualA("manipulation");
  });
  prueba("la página no rebota ni se sale por los lados", () => {
    esperar(getComputedStyle(document.body).overscrollBehaviorY).igualA("none");
    esperar(getComputedStyle(document.body).overflowX).igualA("hidden");
  });
});
