/* El repaso general: lo que un opositor o un estudiante lee en pantalla.
   Salió de un opositor de verdad que no sabía qué eran las «netas»; de paso,
   las concordancias («todas tus bloques»), las fechas en ISO, el contraste
   de los grises y los nombres cortados. */

const sinEtiquetas = html => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
/* un opositor con temario, corte y simulacros apuntados */
function opositorConSimulacros() {
  opositorDePrueba();
  S.opo.temas = Array.from({ length: 12 }, (_, i) => temaDe(i + 1, { vueltas: i % 2 ? [haceDias(i + 1)] : [] }));
  S.opo.examen.fecha = sumaDias(hoyISO(), 90); S.opo.examen.corte = 58.25;
  S.opo.simulacros = [
    { id: "s1", fecha: haceDias(8), tipo: "completo", preguntas: 100, aciertos: 62, fallos: 23 },
    { id: "s2", fecha: haceDias(1), tipo: "completo", preguntas: 100, aciertos: 71, fallos: 19 }
  ];
}
/* la luminosidad relativa de un color de CSS, para medir el contraste como la WCAG */
function luzDe(css) {
  const c = document.createElement("canvas").getContext("2d");
  c.fillStyle = "#000"; c.fillStyle = css.trim();
  const h = c.fillStyle.replace("#", "");
  return h.match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
}
const contrasteEntre = (a, b) => { const x = luzDe(a), y = luzDe(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function conTema(tema, fn) {
  const r = document.documentElement, antes = r.getAttribute("data-theme");
  r.setAttribute("data-theme", tema);
  try { return fn(getComputedStyle(r)); } finally { if (antes === null) r.removeAttribute("data-theme"); else r.setAttribute("data-theme", antes); }
}

grupo("Repaso: la oposición habla claro", () => {
  prueba("ninguna pestaña dice «netas» a secas", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorConSimulacros();
        OPO_TABS.forEach(([id]) => { opoTab = id; esperar(/\bnetas\b/i.test(sinEtiquetas(vistaOposicion()))).falso(); });
      } finally { opoTab = antesTab; }
    });
  });
  prueba("el último simulacro sale en aciertos netos y sobre 10", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorConSimulacros(); opoTab = "resumen";
        const t = sinEtiquetas(vistaOposicion()), c = calcSimulacro(S.opo.simulacros[1], penalizacionDe(S.opo.examen));
        esperar(t).contiene(nota(c.neta) + " aciertos netos");
        esperar(t).contiene(nota(c.nota10) + " sobre 10");
      } finally { opoTab = antesTab; }
    });
  });
  prueba("Simulacros explica qué son los aciertos netos", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorConSimulacros(); opoTab = "simulacros";
        const t = sinEtiquetas(vistaOposicion());
        esperar(t).contiene("aciertos − fallos × 1/3");
        esperar(t).contiene("se compara con la nota de corte");
        esperar(t).contiene("Aciertos · fallos · en blanco");
        esperar(t).noContiene("A · F · B");
        /* sin penalización no hay nada que restar */
        S.opo.examen.penalizacion = 0;
        esperar(sinEtiquetas(vistaOposicion())).contiene("los fallos no restan");
      } finally { opoTab = antesTab; }
    });
  });
  prueba("Examen y plan dice qué resta un fallo y en qué va el corte", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorConSimulacros(); opoTab = "examen";
        const t = sinEtiquetas(vistaOposicion());
        esperar(t).contiene("Nota de corte (en aciertos netos)");
        esperar(t).contiene("Aciertos menos lo que restan los fallos son tus aciertos netos");
      } finally { opoTab = antesTab; }
    });
  });
  prueba("la comparación con la semana de antes se entiende", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorConSimulacros(); opoTab = "resumen";
        const t = sinEtiquetas(vistaOposicion());
        esperar(t).noContiene("que la anterior ");
        if (/semana anterior/.test(t)) esperar(/(más|menos) que la semana anterior|Igual que la semana anterior/.test(t)).cierto();
      } finally { opoTab = antesTab; }
    });
  });
  prueba("en Módulos, a un opositor no se le cuentan las faltas (hasta que se acerque al límite)", () => {
    conEstado(() => {
      opositorDePrueba();
      esperar(sinEtiquetas(vistaModulos())).noContiene("Faltas:");
      S.perfil.etapa = "ciclo-sup";
      esperar(sinEtiquetas(vistaModulos())).contiene("Faltas:");
    });
  });
  prueba("Progreso es «Tu oposición» para un opositor y «Tu curso» para los demás", () => {
    conEstado(() => {
      opositorDePrueba();
      esperar(vistaProgreso()).contiene("Tu oposición");
      S.perfil.etapa = "uni";
      esperar(vistaProgreso()).contiene("Tu curso");
    });
  });
});

grupo("Repaso: cada palabra con su género", () => {
  prueba("«todos tus bloques», «todos tus módulos», «todas tus asignaturas»", () => {
    conEstado(() => {
      S.perfil.etapa = "oposicion"; esperar(vocG("todos", "todas") + " tus " + voc(true)).igualA("todos tus bloques");
      S.perfil.etapa = "ciclo-sup"; esperar(vocG("todos", "todas") + " tus " + voc(true)).igualA("todos tus módulos");
      S.perfil.etapa = "uni"; esperar(vocG("todos", "todas") + " tus " + voc(true)).igualA("todas tus asignaturas");
      S.perfil.etapa = "idioma"; esperar(vocG("todos", "todas") + " tus " + voc(true)).igualA("todas tus destrezas");
    });
  });
  prueba("Ajustes → Evaluación concuerda", () => {
    conEstado(() => {
      S.perfil.etapa = "oposicion";
      const t = sinEtiquetas(ajEval(normalizarPerfil()));
      esperar(t).contiene("todos tus bloques");
      esperar(t).contiene("Aplicar a todos mis bloques");
      esperar(t).noContiene("todas tus bloques");
      esperar(t).noContiene("Cada una se puede");
    });
  });
  prueba("el cronómetro pide «un bloque» o «una asignatura», no «un módulo» a todo el mundo", () => {
    conEstado(() => {
      const antes = seccion;
      try {
        S.perfil.etapa = "oposicion"; seccion = "escritorio"; pinta();
        const sel = $("#selTimer"); if (!sel) saltar("sin cronómetro en el Inicio");
        esperar(sel.options[0].textContent).igualA("Elige un bloque…");
        S.perfil.etapa = "uni"; pinta();
        esperar($("#selTimer").options[0].textContent).igualA("Elige una asignatura…");
      } finally { seccion = antes; pinta(); }
    });
  });
  prueba("el plan de la semana dice «ese bloque» o «esa asignatura»", () => {
    conEstado(() => {
      S.perfil.etapa = "oposicion"; esperar(sinEtiquetas(agPlan())).contiene("al estudiar ese bloque");
      S.perfil.etapa = "uni"; esperar(sinEtiquetas(agPlan())).contiene("al estudiar esa asignatura");
    });
  });
  prueba("uno es singular: «1 tarjeta», «1 apunte»", () => {
    esperar(cuantos(1, "tarjeta", "tarjetas")).igualA("1 tarjeta");
    esperar(cuantos(0, "apunte", "apuntes")).igualA("0 apuntes");
    esperar(cuantos(3, "documento", "documentos")).igualA("3 documentos");
  });
});

grupo("Repaso: el plan y el Inicio", () => {
  prueba("los bloques de 25 min de una misma asignatura van en una fila", () => {
    const g = juntarBloques([
      { modId: "a", min: 25, hecho: true, motivo: "Lo que toca" }, { modId: "a", min: 25, hecho: false, motivo: "Lo que toca" },
      { modId: "b", min: 25, hecho: false, motivo: "Vas justo" }, { modId: "a", min: 25, hecho: false, motivo: "Lo que toca" }
    ]);
    esperar(g.length).igualA(2);
    esperar(g[0].min).igualA(75);
    esperar(g[0].hecho).falso();
    esperar(quedanBloque(g[0])).igualA(" · te quedan 50 min");
    esperar(quedanBloque(g[1])).igualA("");
  });
  prueba("sin notas todavía, el plan no dice «hay que apretar»", () => {
    conEstado(() => {
      S.perfil.horasSemana = 10; S.perfil.diasFuertes = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
      S.modulos = [moduloDe([[100, null]], { id: "x1", cod: "UNO", metaSemanal: 3 }), moduloDe([[100, null]], { id: "x2", cod: "DOS", metaSemanal: 2 })];
      const motivos = planSemana().flatMap(d => d.bloques.map(b => b.motivo));
      esperar(motivos.length > 0).cierto();
      esperar(motivos.includes("Hay que apretar")).falso();
    });
  });
  prueba("el panel de hoy no dice «Te toca estudiar» si hoy no toca", () => {
    conEstado(() => {
      S.perfil.horasSemana = 10;
      S.perfil.diasFuertes = DIAS_ORDEN.filter(d => d !== diaDe(hoyISO()));
      esperar(planDeHoy().length).igualA(0);
      esperar(panelHoy()).noContiene("Te toca estudiar");
      S.perfil.diasFuertes = [diaDe(hoyISO())];
      if (planDeHoy().length) esperar(panelHoy()).contiene("Te toca estudiar");
    });
  });
  prueba("lo próximo que vence lleva la fecha en castellano, no «2026-09-27»", () => conCursoLargo(async () => {
    seccion = "escritorio"; pinta(); await new Promise(r => setTimeout(r, 60));
    const p = document.querySelector('.panel[aria-labelledby="tProx"]'); if (!p) saltar("sin el panel en el Inicio");
    esperar(/\d{4}-\d{2}-\d{2}/.test(p.textContent)).falso();
  }));
  prueba("Ajustes → Aspecto no habla como un diseñador", () => {
    conEstado(() => {
      const antes = ajTab;
      try { ajTab = "aspecto"; const t = sinEtiquetas(vistaAjustes()); esperar(t).noContiene("rampas"); esperar(t).noContiene("blurple"); }
      finally { ajTab = antes; }
    });
  });
});

grupo("Repaso: que se lea bien", () => {
  prueba("el gris más claro tiene contraste de sobra en los dos temas (4,5:1)", () => {
    for (const tema of ["light", "dark"]) conTema(tema, cs => {
      const tinta = cs.getPropertyValue("--ink-4");
      for (const fondo of ["--surface", "--surface-2", "--bg"]) esperar(contrasteEntre(tinta, cs.getPropertyValue(fondo)) >= 4.5).cierto();
    });
  });
  prueba("el verde y el ámbar de las pastillas, también en claro", () => {
    conTema("light", cs => {
      for (const t of ["--verde-texto", "--aviso-txt"]) for (const f of ["--surface", "--bg"])
        esperar(contrasteEntre(cs.getPropertyValue(t), cs.getPropertyValue(f)) >= 4.5).cierto();
    });
  });
  prueba("la gráfica de simulacros se dibuja al ancho que tiene", () => {
    conEstado(() => {
      opositorConSimulacros();
      const w = anchoGraficaOpo();
      esperar(w >= 280 && w <= 1100).cierto();
      esperar(graficaSimulacros(resumenSimulacros(), corteDe(), 100)).contiene(`viewBox="0 0 ${w} `);
    });
  });
  prueba("en el móvil la gráfica no se encoge: sus letras miden lo mismo", () => enElMovil(async () => {
    esperar(anchoGraficaOpo() < 400).cierto();
  }));
  prueba("en Módulos los nombres largos se leen enteros", () => conCursoLargo(async () => {
    S.modulos.forEach((m, i) => { if (i < 3) m.nombre = ["Formación y Orientación Laboral", "Lenguajes de Marcas y Sistemas de Gestión", "Entornos de Desarrollo"][i]; });
    seccion = "modulos"; modAbierto = null; pinta(); await new Promise(r => setTimeout(r, 80));
    const nombres = [...document.querySelectorAll(".m2-t")];
    esperar(nombres.length > 0).cierto();
    for (const n of nombres) { esperar(n.scrollWidth <= n.clientWidth + 1).cierto(); esperar(n.scrollHeight <= n.clientHeight + 1).cierto(); }
  }));
  prueba("la letra de los días en los objetivos no baja de 11 px", () => {
    const b = document.createElement("span"); b.className = "dia-obj"; b.innerHTML = "<b>L</b>";
    $("#contenido").appendChild(b);
    try { esperar(parseFloat(getComputedStyle(b.firstChild).fontSize) >= 11).cierto(); } finally { b.remove(); }
  });
});
