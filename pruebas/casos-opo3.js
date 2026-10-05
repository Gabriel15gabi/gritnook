/* Oposiciones, tercera tanda: el temario del BOE, el calendario de la
   convocatoria con sus plazos en días hábiles, el plan con turnos de trabajo
   y «ponte a prueba» con su porcentaje de acierto. */

/* la sección de la oposición pintada de verdad, y todo como estaba al acabar */
async function enOpo(fn, { tab = "resumen", prep } = {}) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, tabAntes = opoTab;
  try {
    opositorDePrueba();
    if (prep) prep(S.opo);
    seccion = "oposicion"; opoTab = tab; pinta(); await dormir(20);
    return await fn(S.opo);
  } finally {
    const d = $("#dlg"); if (d.open) d.close();
    const dc = $("#dlgConfirmar"); if (dc.open) dc.close();
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; opoTab = tabAntes; pinta();
  }
}
/* diez temas, los tres primeros ya vistos */
const conDiez = O => { O.temas = Array.from({ length: 10 }, (_, i) => temaDe(i + 1, i < 3 ? { vueltas: [haceDias(3)] } : {})); };

grupo("Oposición: los temarios del BOE", () => {
  prueba("hay diez oposiciones, cada una con sus temas, su boletín y sus reglas", () => {
    esperar(OPO_CATALOGO.length).igualA(10);
    OPO_CATALOGO.forEach(c => {
      esperar(temasCatalogo(c) > 20).cierto();
      esperar(c.fuente.url).contiene("https://www.boe.es/diario_boe/txt.php?id=BOE-A-");
      esperar(esFecha(c.fuente.fecha)).cierto();
      esperar(c.examen.preguntas > 0 && c.examen.minutos > 0 && [3, 4].includes(c.examen.opciones)).cierto();
      c.grupos.forEach(([, l]) => l.forEach(t => { if (t.length < 15 || /^\d/.test(t)) throw new Error(c.id + ": tema raro «" + t + "»"); }));
    });
  });
  prueba("el de Auxiliar del Estado es el del BOE: 16 temas del bloque I y 12 del II", () => {
    const c = opoCatalogo("age-auxiliar");
    esperar(c.grupos.map(g => g[1].length).join("+")).igualA("16+12");
    esperar(c.grupos[0][1][0]).contiene("La Constitución Española de 1978");
    esperar(c.grupos[1][1][11]).contiene("La Red Internet");
    esperar(penalizacionDe(c.examen)).cerca(1 / 3);
  });
  prueba("Policía va con tres opciones (resta la mitad) y Justicia resta un cuarto", () => {
    esperar(penalizacionDe(opoCatalogo("policia-basica").examen)).cerca(1 / 2);
    esperar(penalizacionDe(opoCatalogo("just-tramitacion").examen)).cerca(0.25);
    esperar(temasCatalogo(opoCatalogo("just-gestion"))).igualA(68);
  });
  prueba("se encuentra por su nombre, con o sin tildes", () => {
    esperar(opoCatalogoDe("auxiliar administrativo del estado").id).igualA("age-auxiliar");
    esperar(opoCatalogoDe("Tramitacion Procesal").id).igualA("just-tramitacion");
    esperar(opoCatalogoDe("Bombero")).nulo();
    esperar(opoCatalogoDe("")).nulo();
  });
  prueba("cargarlo pone los temas del 1 al final, las reglas del test y el enlace; la fecha y el corte no se tocan", () => conEstado(() => {
    const O = opositorDePrueba();
    O.examen.fecha = "2027-03-20"; O.examen.corte = 55;
    const n = cargarCatalogo(opoCatalogo("age-auxiliar"), true);
    esperar(n).igualA(28);
    esperar(O.temas.map(t => t.n).join(",")).igualA(Array.from({ length: 28 }, (_, i) => i + 1).join(","));
    esperar(O.temas[16].grupo).igualA("II. Actividad administrativa y ofimática");
    esperar(O.temas[0].modId).igualA("bGEN");
    esperar(O.temas[27].modId).igualA("bESP");
    esperar(O.examen.preguntas).igualA(110);
    esperar(O.examen.minutos).igualA(90);
    esperar(O.examen.fecha).igualA("2027-03-20");
    esperar(O.examen.corte).igualA(55);
    esperar(O.convocatoria.enlace).contiene("BOE-A-2025-26262");
    esperar(O.catalogo).igualA("age-auxiliar");
    esperar(normalizarPerfil().ciclo).igualA("Auxiliar Administrativo del Estado");
  }));
  prueba("los títulos largos del BOE no se cortan al guardar la ficha", async () => {
    await enOpo(async O => {
      cargarCatalogo(opoCatalogo("just-tramitacion"), true); pinta();
      const t = O.temas.find(x => x.titulo.length > 300);
      esperar(!!t).cierto();
      const largo = t.titulo;
      abrirTema(t.id); await dormir(20);
      esperar($("#otTitulo").value).igualA(largo);
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Guardar").click();
      esperar(t.titulo).igualA(largo);
    });
  });
  prueba("montar la oposición ofrece elegirla de la lista; la ficha y el botón cargan el temario", async () => {
    await enOpo(async O => {
      esperar(!!$("#opoElegir")).cierto();
      $("#opoElegir").click(); await dormir(20);
      esperar(getComputedStyle($("#dlgPie .primario")).display).igualA("none");
      esperar(document.querySelectorAll("#catCuerpo [data-cat]").length).igualA(10);
      $('#catCuerpo [data-cat="policia-basica"]').click();
      esperar($("#catCuerpo").textContent).contiene("45");
      esperar($("#catCuerpo").textContent).contiene("BOE del 10 de julio de 2026");
      esperar(getComputedStyle($("#dlgPie .primario")).display).noContiene("none");
      $("#dlgPie .primario").click(); await dormir(20);
      esperar(O.temas.length).igualA(45);
      esperar(O.examen.opciones).igualA(3);
      esperar(opoTab).igualA("temario");
    });
  });
  prueba("si ya tenías vueltas, pregunta antes de sustituir", async () => {
    await enOpo(async O => {
      $("#opoElegir").click(); await dormir(20);
      $('#catCuerpo [data-cat="aeat-agentes"]').click();
      esperar($("#catCuerpo").textContent).contiene("se sustituyen, y con ellos sus vueltas");
      $("#dlgPie .primario").click(); await dormir(30);
      esperar($("#cfTit").textContent).contiene("¿Sustituir el temario?");
      $('#dlgConfirmar [data-cf="no"]').click(); await dormir(10);
      esperar(O.temas.length).igualA(10);
    }, { prep: conDiez, tab: "temario" });
  });
  prueba("en la bienvenida sale la lista, y elegir una rellena el cuerpo", async () => {
    await enLaEntrada(1, "oposicion", async () => {
      const b = document.querySelector('[data-bv-opo="just-auxilio"]');
      esperar(!!b).cierto();
      b.click(); await esperaUn(20);
      esperar(BV.p.ciclo).igualA("Auxilio Judicial");
      esperar(document.querySelector('[data-bv-opo="just-auxilio"]').classList.contains("sel")).cierto();
      esperar($("#bvCiclo").value).igualA("Auxilio Judicial");
    });
  });
  prueba("y al terminar la bienvenida el temario ya viene cargado", async () => {
    const antes = JSON.parse(JSON.stringify(S)), sec = seccion;
    try {
      S.opo = OPO_DEF();
      bvAbrir(false);
      Object.assign(BV.p, { etapa: "oposicion", ciclo: "Auxilio Judicial" });
      bvCargarCatalogo(); BV.pesos = [];
      bvAplicar();
      esperar(S.opo.temas.length).igualA(26);
      esperar(S.opo.catalogo).igualA("just-auxilio");
      esperar(S.opo.examen.penalizacion).cerca(0.25);
    } finally { if (BV) bvCerrar(); S = JSON.parse(JSON.stringify(antes)); seccion = sec; pinta(); }
  });
});

grupo("Oposición: los plazos en días hábiles", () => {
  prueba("la Pascua y el Viernes Santo salen bien", () => {
    esperar(pascua(2026)).igualA("2026-04-05");
    esperar(pascua(2027)).igualA("2027-03-28");
    esperar(pascua(2025)).igualA("2025-04-20");
    esperar(festivoNacional("2026-04-03")).cierto();
    esperar(festivoNacional("2026-04-02")).falso();   /* Jueves Santo no es nacional */
  });
  prueba("sin sábados, domingos ni festivos nacionales, desde el día siguiente", () => {
    /* del 30 de septiembre de 2026 (miércoles): el 12 de octubre es fiesta */
    esperar(sumarHabiles("2026-09-30", 10)).igualA("2026-10-15");
    /* del viernes 4 de diciembre: el 8 es fiesta */
    esperar(sumarHabiles("2026-12-04", 3)).igualA("2026-12-10");
    esperar(esHabil("2026-10-10")).falso();
    esperar(sumarHabiles("no es fecha", 3)).igualA("");
  });
});

grupo("Oposición: el calendario de la convocatoria", () => {
  prueba("la lista provisional trae su plazo de subsanar: 10 días hábiles", () => conEstado(() => {
    const O = opositorDePrueba();
    esperar(nuevoHito("admitidos", "2026-09-30")).igualA(2);
    const [a, s] = O.convocatoria.hitos;
    esperar(a.tipo).igualA("admitidos");
    esperar(s.tipo).igualA("subsanacion");
    esperar(s.fecha).igualA("2026-10-15");
    esperar(nuevoHito("plantilla", "2026-12-04", "", false)).igualA(1);
  }));
  prueba("la solicitud y el examen van a donde siempre", () => conEstado(() => {
    const O = opositorDePrueba();
    nuevoHito("plazo", "2026-11-02"); nuevoHito("examen", "2027-02-20");
    esperar(O.convocatoria.plazoFin).igualA("2026-11-02");
    esperar(O.examen.fecha).igualA("2027-02-20");
    esperar(O.convocatoria.hitos.length).igualA(0);
    esperar(lineaConvocatoria().map(x => x.id).join(",")).igualA("plazo,examen");
  }));
  prueba("avisa de lo que hay que hacer en la semana, en rojo a dos días", () => conEstado(() => {
    const O = opositorDePrueba();
    O.convocatoria.hitos = [{ id: "h1", tipo: "impugnacion", fecha: sumaDias(hoyISO(), 2), hecho: false, txt: "" },
      { id: "h2", tipo: "notas", fecha: sumaDias(hoyISO(), 1), hecho: false, txt: "" }];
    const a = avisoHitos();
    esperar(a.h.id).igualA("h1");
    esperar(a.tipo).igualA("urgente");
    esperar(a.txt).contiene("impugnar");
    esperar(opoAlertaPlazo()).contiene("banda urgente");
    O.convocatoria.hitos[0].fecha = sumaDias(hoyISO(), 6);
    esperar(avisoHitos().tipo).igualA("pronto");
    O.convocatoria.hitos[0].hecho = true;
    esperar(avisoHitos()).nulo();
    O.convocatoria.hitos[0].hecho = false; O.convocatoria.hitos[0].fecha = sumaDias(hoyISO(), 9);
    esperar(avisoHitos()).nulo();
  }));
  prueba("las fechas pendientes van al calendario del móvil", () => conEstado(() => {
    const O = opositorDePrueba();
    O.convocatoria.hitos = [{ id: "h1", tipo: "documentacion", fecha: sumaDias(hoyISO(), 5), hecho: false, txt: "" },
      { id: "h2", tipo: "otro", fecha: sumaDias(hoyISO(), 8), hecho: false, txt: "Prueba de inglés" },
      { id: "h3", tipo: "notas", fecha: sumaDias(hoyISO(), -5), hecho: false, txt: "" }];
    const ev = eventosCalendario().filter(e => e.uid.startsWith("opo-hito-")).map(e => e.titulo);
    esperar(ev).contiene("Último día para presentar la documentación");
    esperar(ev).contiene("Prueba de inglés");
    esperar(ev.length).igualA(2);
  }));
  prueba("desde la pestaña se añade, se marca hecho y se quita", async () => {
    await enOpo(async O => {
      esperar(!!$("#opoCalendario")).cierto();
      $("#hiTipo").value = "plantilla"; $("#hiTipo").dispatchEvent(new Event("change", { bubbles: true }));
      esperar($("#hiSigueCampo").classList.contains("oculto")).falso();
      esperar($("#hiSigueTxt").textContent).contiene("3 días hábiles");
      $("#hiFecha").value = sumaDias(hoyISO(), 1);
      $("#hiAdd").click(); await dormir(20);
      esperar(O.convocatoria.hitos.length).igualA(2);
      const imp = O.convocatoria.hitos.find(h => h.tipo === "impugnacion");
      document.querySelector(`[data-hito-hecho="${imp.id}"]`).click(); await dormir(10);
      esperar(imp.hecho).cierto();
      document.querySelector(`[data-hito-quitar="${imp.id}"]`).click(); await dormir(10);
      esperar(O.convocatoria.hitos.length).igualA(1);
      esperar(document.querySelectorAll("#opoCalendario .hito").length).igualA(1);
    }, { tab: "examen" });
  });
  prueba("«Otra fecha» pide nombre", async () => {
    await enOpo(async O => {
      $("#hiTipo").value = "otro"; $("#hiTipo").dispatchEvent(new Event("change", { bubbles: true }));
      esperar($("#hiTxtCampo").classList.contains("oculto")).falso();
      $("#hiFecha").value = sumaDias(hoyISO(), 10);
      $("#hiAdd").click(); await dormir(10);
      esperar(O.convocatoria.hitos.length).igualA(0);
      $("#hiTxt").value = "Reconocimiento médico"; $("#hiAdd").click(); await dormir(10);
      esperar(O.convocatoria.hitos[0].txt).igualA("Reconocimiento médico");
    }, { tab: "examen" });
  });
});

grupo("Oposición: el plan con turnos", () => {
  const turnos = (ciclo, min = {}) => ({ ciclo: ciclo.split(""), inicio: hoyISO(), min: Object.assign({ L: 240, M: 150, T: 120, N: 60, P: 60 }, min) });
  prueba("sin turnos, todo como antes", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    esperar(turnosActivos()).nulo();
    esperar(temasDeHoy().turno).nulo();
  }));
  prueba("un día que da el doble lleva el doble de temas, y uno sin rato no lleva ninguno", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    O.examen.fecha = sumaDias(hoyISO(), 60); O.plan.diasSimulacro = 0;
    O.plan.turnos = turnos("NL", { N: 0 });
    const tu = turnosActivos();
    esperar(tu.ref).igualA(240);
    esperar(factorDia(tu, hoyISO())).igualA(0);
    esperar(factorDia(tu, sumaDias(hoyISO(), 1))).igualA(1);
    const h = temasDeHoy();
    esperar(h.cupo).igualA(0);
    esperar(h.turno.nombre).igualA("Noche");
    esperar(metaHoy(h)).contiene("Noche");
    O.plan.turnos.inicio = sumaDias(hoyISO(), -1);
    esperar(temasDeHoy().cupo > 0).cierto();
  }));
  prueba("los días de estudio se cuentan pesando cada día por lo que da de sí", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    O.examen.fecha = sumaDias(hoyISO(), 28); O.plan.diasSimulacro = 0;
    O.plan.turnos = turnos("MMMMMLL");
    const pl = planOpo();
    esperar(pl.turnos).cierto();
    /* 28 días: cuatro ciclos, cada uno vale 7 días «normales» */
    esperar(pl.diasEstudio).igualA(28);
    O.plan.turnos = turnos("MMMMMLL", { L: 0 });
    esperar(planOpo().diasEstudio).igualA(20);
  }));
  prueba("lo que llega roto se tira: ciclo vacío, turnos que no existen, fecha mala", () => conEstado(() => {
    const O = opositorDePrueba();
    O.plan.turnos = { ciclo: [], inicio: hoyISO() }; normalizarOpo(); esperar(O.plan.turnos).nulo();
    O.plan.turnos = { ciclo: ["M", "Z"], inicio: hoyISO() }; normalizarOpo(); esperar(O.plan.turnos).nulo();
    O.plan.turnos = { ciclo: ["M"], inicio: "ayer" }; normalizarOpo(); esperar(O.plan.turnos).nulo();
    O.plan.turnos = { ciclo: ["M"], inicio: hoyISO(), min: { M: 99999 } }; normalizarOpo(); esperar(O.plan.turnos.min.M).igualA(720);
    O.plan.turnos = { ciclo: ["N"], inicio: hoyISO(), min: { N: 0 } }; esperar(turnosActivos()).nulo();
  }));
  prueba("se configuran con un modelo, se retocan día a día y se ven los próximos 14 días", async () => {
    await enOpo(async O => {
      const c = $("#opoTurnosOn"); c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); await dormir(20);
      esperar($("#dlgTit").textContent).igualA("Tus turnos");
      document.querySelector('[data-tu-modelo="3"]').click();
      esperar(document.querySelectorAll("#tuCiclo [data-tu-dia]").length).igualA(14);
      document.querySelector('[data-tu-dia="0"]').click();
      esperar(document.querySelector('[data-tu-dia="0"] b').textContent).igualA("T");
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Guardar").click(); await dormir(20);
      esperar(O.plan.turnos.ciclo.length).igualA(14);
      esperar(O.plan.turnos.ciclo[0]).igualA("T");
      esperar(document.querySelectorAll(".tu-tira .tu-dia").length).igualA(14);
      esperar($("#opoTurnosOn").checked).cierto();
      esperar(getComputedStyle(document.getElementById("plan.diasSemana").closest("label")).display).igualA("none");
    }, { tab: "examen", prep: conDiez });
  });
});

grupo("Oposición: ponte a prueba, la corrección", () => {
  prueba("las palabras que cuentan: sin «de», «la», «que», y dan igual plurales y tildes", () => {
    const c = prClaves("La Constitución de los derechos fundamentales").map(x => x.r);
    esperar(c).contiene("constit");
    esperar(c).noContiene("la");
    esperar(prRaiz("Artículos")).igualA(prRaiz("articulo"));
    esperar(prRaiz("funciones")).igualA(prRaiz("función"));
    esperar(prRaiz("39/2015")).igualA("39/2015");
  });
  prueba("una idea se toca con seis de cada diez de sus palabras", () => {
    const r = corregirTexto(["La Constitución se aprobó en referéndum en 1978", "Tiene 169 artículos"],
      "La constitucion se votó por referendum el 6 de diciembre de 1978, con muchos artículos");
    esperar(r.total).igualA(2);
    esperar(r.ideas[0].ok).cierto();
    esperar(r.ideas[1].ok).falso();
    esperar(r.ideas[1].faltan).contiene("169");
    esperar(r.pct).igualA(50);
  });
  prueba("sin escribir nada, cero; con todo, cien", () => {
    const ideas = ["Plazo del recurso de alzada: un mes", "Recurso potestativo de reposición"];
    esperar(corregirTexto(ideas, "").pct).igualA(0);
    esperar(corregirTexto(ideas, "El recurso de alzada tiene un plazo de un mes; el potestativo de reposición también").pct).igualA(100);
  });
  prueba("las ideas salen de su campo o, si está vacío, de las notas; los guiones y números de lista se quitan", () => {
    esperar(fuenteIdeas({ ideas: "- Uno de los órganos\n2) Otra cosa distinta", notas: "nota" }).lista).igualA(["Uno de los órganos", "Otra cosa distinta"]);
    esperar(fuenteIdeas({ ideas: "", notas: "El Defensor del Pueblo\n\nArtículo 54" }).de).igualA("notas");
    esperar(fuenteIdeas({ ideas: "  ", notas: "" }).lista.length).igualA(0);
  });
  prueba("el tema sale de los ya vistos, y pesan más los que nunca has probado", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    esperar(temasVistos().length).igualA(3);
    for (let i = 0; i < 20; i++) { const t = elegirTemaPrueba(); esperar(["t1", "t2", "t3"]).contiene(t.id); }
    esperar(elegirTemaPrueba("", () => 0).id).igualA("t1");
    O.pruebas = [{ id: "p1", fecha: hoyISO(), temaId: "t1", pct: 90 }, { id: "p2", fecha: hoyISO(), temaId: "t2", pct: 95 }];
    /* t3 nunca probado: con el azar a mitad, sale él */
    esperar(elegirTemaPrueba("", () => 5e5).id).igualA("t3");
    esperar(elegirTemaPrueba("t3", () => 0).id).igualA("t1");
    O.temas.forEach(t => { t.vueltas = []; });
    esperar(elegirTemaPrueba()).nulo();
  }));
  prueba("una prueba por debajo del 50 % pone el tema entre los flojos", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    O.pruebas = [{ id: "p1", fecha: hoyISO(), temaId: "t2", pct: 30 }];
    const f = temasFlojos();
    esperar(f.map(x => x.t.id)).contiene("t2");
    esperar(f.find(x => x.t.id === "t2").prueba.pct).igualA(30);
  }));
});

grupo("Oposición: ponte a prueba, de principio a fin", () => {
  prueba("empezar, escribir, repintar sin perder el cursor y entregar", async () => {
    await enOpo(async O => {
      O.temas[1].ideas = "El Presidente del Gobierno\nEl Consejo de Ministros\nLa moción de censura";
      prepararPrueba("t2"); await dormir(20);
      esperar($("#dlgTit").textContent).igualA("Ponte a prueba");
      esperar($("#dlgCuerpo").textContent).contiene("3 ideas clave");
      $("#prMin").value = "10";
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Empezar").click(); await dormir(30);
      esperar(O.prueba.temaId).igualA("t2");
      esperar(O.prueba.minutos).igualA(10);
      const ta = $("#prTexto"); esperar(!!ta).cierto();
      esperar(!!$(".oz-tabs")).cierto();
      esperar(!!$(".opo-lista")).falso();   /* mientras dura, solo la prueba */
      ta.focus(); ta.value = "El presidente del gobierno y el consejo de ministros"; ta.setSelectionRange(5, 5);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      esperar(O.prueba.texto).contiene("presidente");
      pinta();
      esperar(document.activeElement.id).igualA("prTexto");
      esperar(document.activeElement.selectionStart).igualA(5);
      esperar($("#prTexto").value).contiene("consejo de ministros");
      $("#prEntregar").click(); await dormir(30);
      esperar(O.prueba).nulo();
      esperar(O.pruebas.length).igualA(1);
      esperar(O.pruebas[0].pct).igualA(67);
      esperar($("#dlgTit").textContent).igualA("Así te ha ido");
      esperar($("#dlgCuerpo").textContent).contiene("67 %");
      esperar(O.temas[1].minutos >= 1).cierto();
      /* la tercera la dijo con otras palabras: se marca y cuenta */
      document.querySelector('[data-pc="2"]').click();
      esperar(O.pruebas[0].pct).igualA(100);
      esperar($("#dlgCuerpo").textContent).contiene("100 %");
    }, { prep: conDiez });
  });
  prueba("abandonar pregunta y no cuenta", async () => {
    await enOpo(async O => {
      empezarPrueba("t1", 15); await dormir(20);
      $("#prAbandonar").click(); await dormir(20);
      esperar($("#cfTit").textContent).contiene("¿Abandonar la prueba?");
      $('#dlgConfirmar [data-cf="si"]').click(); await dormir(20);
      esperar(O.prueba).nulo();
      esperar(O.pruebas.length).igualA(0);
    }, { prep: conDiez });
  });
  prueba("sin ideas clave, se escriben al acabar y quedan en el tema", async () => {
    await enOpo(async O => {
      empezarPrueba("t3", 15); await dormir(20);
      $("#prTexto").value = "Las Cortes Generales tienen dos cámaras"; $("#prTexto").dispatchEvent(new Event("input", { bubbles: true }));
      $("#prEntregar").click(); await dormir(20);
      esperar($("#dlgTit").textContent).igualA("¿Con qué te corrijo?");
      $("#pcIdeas").value = "Las Cortes Generales\nEl Congreso y el Senado";
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Corregir con estas ideas").click(); await dormir(40);
      esperar(O.temas[2].ideas).contiene("Congreso");
      esperar($("#dlgTit").textContent).igualA("Así te ha ido");
      esperar(O.pruebas[0].pct).igualA(50);
    }, { prep: conDiez });
  });
  prueba("o te puntúas tú", async () => {
    await enOpo(async O => {
      empezarPrueba("t3", 15); await dormir(20);
      $("#prEntregar").click(); await dormir(20);
      $("#pcAuto").value = "70";
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Puntuarme yo").click(); await dormir(20);
      esperar(O.pruebas[0].pct).igualA(70);
      esperar(O.pruebas[0].auto).falso();
    }, { prep: conDiez });
  });
  prueba("lo escrito se puede guardar como apunte", async () => {
    await enOpo(async O => {
      O.temas[0].ideas = "Una idea cualquiera";
      empezarPrueba("t1", 15); await dormir(20);
      $("#prTexto").value = "Mi desarrollo del tema"; $("#prTexto").dispatchEvent(new Event("input", { bubbles: true }));
      $("#prEntregar").click(); await dormir(20);
      const antes = Object.keys(S.apuntes).length;
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Guardar como apunte").click();
      esperar(Object.keys(S.apuntes).length).igualA(antes + 1);
      const n = Object.values(S.apuntes).find(a => /^Prueba del tema 1/.test(a.titulo));
      esperar(!!n).cierto();
      esperar(n.tags).contiene("prueba");
    }, { prep: conDiez });
  });
  prueba("la ficha del tema tiene las ideas clave y el botón si ya lo has visto", async () => {
    await enOpo(async O => {
      abrirTema("t1"); await dormir(20);
      esperar(!!$("#otIdeas")).cierto();
      esperar(!!$("#otPrueba")).cierto();
      $("#otIdeas").value = "Idea A\nIdea B";
      [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Guardar").click();
      esperar(O.temas[0].ideas).igualA("Idea A\nIdea B");
      abrirTema("t9"); await dormir(20);
      esperar(!!$("#otPrueba")).falso();
    }, { prep: conDiez });
  });
  prueba("lo que llega roto se arregla: pruebas que no son objetos, una prueba a medias sin tema", () => conEstado(() => {
    const O = opositorDePrueba();
    O.pruebas = [null, 3, { id: "x", pct: 50 }]; O.prueba = { temaId: "", inicio: 0 };
    O.convocatoria.hitos = [{ id: "a", tipo: "inventado", fecha: hoyISO() }, { id: "b", tipo: "notas", fecha: "mal" }, { id: "c", tipo: "notas", fecha: hoyISO() }];
    normalizarOpo();
    esperar(O.pruebas.length).igualA(1);
    esperar(O.prueba).nulo();
    esperar(O.convocatoria.hitos.map(h => h.id)).igualA(["c"]);
  }));
});

grupo("Oposición: el reto sorpresa", () => {
  const diaConReto = (si = true) => { for (let i = 0; i < 60; i++) { const d = sumaDias("2026-10-01", i); if (tocaReto(d) === si) return d; } return ""; };
  prueba("hace falta haber visto tres temas; unos cuatro días de cada diez", () => conEstado(() => {
    const O = opositorDePrueba();
    O.temas = [temaDe(1, { vueltas: [haceDias(2)] }), temaDe(2, { vueltas: [haceDias(2)] })];
    esperar(diaConReto()).igualA("");
    conDiez(O);
    let n = 0; for (let i = 0; i < 200; i++) if (tocaReto(sumaDias("2026-01-01", i))) n++;
    esperar(n > 50 && n < 110).cierto();
  }));
  prueba("si ya te has probado hoy, o dijiste «hoy no», no sale", () => conEstado(() => {
    const O = opositorDePrueba(); conDiez(O);
    const d = diaConReto();
    esperar(tocaReto(d)).cierto();
    O.pruebas = [{ id: "p", fecha: d, temaId: "t1", pct: 80 }];
    esperar(tocaReto(d)).falso();
    O.pruebas = [];
    guardaLS("reto-no", d);
    try { esperar(tocaReto(d)).falso(); } finally { localStorage.removeItem("desk-daw:reto-no"); }
  }));
  prueba("sale en el Resumen y lleva a la prueba; «Hoy no» lo quita", async () => {
    await enOpo(async O => {
      esperar(tocaReto()).cierto();
      esperar(!!$(".banda.reto")).cierto();
      document.querySelector(".banda.reto [data-prb-empezar]").click(); await dormir(20);
      esperar($("#dlgTit").textContent).igualA("Ponte a prueba");
      $("#dlg").close();
      document.querySelector("[data-prb-hoyno]").click(); await dormir(20);
      try { esperar(!!$(".banda.reto")).falso(); } finally { localStorage.removeItem("desk-daw:reto-no"); }
    }, { prep: O => { conDiez(O); for (let k = 0; k < 200 && !tocaReto(); k++) O.temas[0].id = "s" + k; } });
  });
  prueba("«Ponme a prueba» está siempre en el Resumen si has visto algún tema", async () => {
    await enOpo(async () => {
      esperar(!!$(".prb-entrada [data-prb-empezar]")).cierto();
    }, { prep: conDiez });
    await enOpo(async () => {
      esperar(!!$(".prb-entrada")).falso();
    });
  });
});
