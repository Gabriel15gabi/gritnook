/* El modo opositor. Aquí la mayoría es aritmética —penalizaciones, cortes,
   ritmos—, y un opositor se fía de esos números para decidir si arriesga
   una pregunta o si le da tiempo a una tercera vuelta. Un error aquí es un
   error en su examen. */

/* un opositor con sus bloques, sin temario todavía */
function opositorDePrueba() {
  S.perfil = Object.assign(normalizarPerfil(), { nombre: "Ana", etapa: "oposicion", ciclo: "Auxiliar Administrativo", curso: "", listo: true });
  S.modulos = CAT_OPOSICION.map(([cod, nombre]) => moduloDe([[100, null]], { id: "b" + cod, cod, nombre }));
  S.opo = OPO_DEF();
  return S.opo;
}
const temaDe = (n, extra = {}) => Object.assign({ id: "t" + n, n, titulo: "Tema " + n, modId: "bGEN", grupo: "", vueltas: [], dominado: false, dificultad: "normal", notas: "", ley: "" }, extra);
const haceDias = d => sumaDias(hoyISO(), -d);

grupo("Oposición: la penalización", () => {
  prueba("con cuatro opciones cada fallo resta un tercio", () => {
    esperar(penalizacionDe({ opciones: 4 })).cerca(1 / 3);
  });
  prueba("con tres, la mitad; con dos, un acierto entero", () => {
    esperar(penalizacionDe({ opciones: 3 })).cerca(1 / 2);
    esperar(penalizacionDe({ opciones: 2 })).cerca(1);
  });
  prueba("si la convocatoria dice otra cosa, manda lo que pongas", () => {
    esperar(penalizacionDe({ opciones: 4, penalizacion: 0.25 })).cerca(0.25);
    esperar(penalizacionDe({ opciones: 4, penalizacion: 0 })).igualA(0);
  });
  prueba("dejarlo en blanco vuelve a lo normal", () => {
    esperar(penalizacionDe({ opciones: 4, penalizacion: null })).cerca(1 / 3);
    esperar(penalizacionDe({ opciones: 4, penalizacion: "" })).cerca(1 / 3);
  });
  prueba("se escribe como en las bases", () => {
    esperar(textoPenalizacion(1 / 3)).igualA("1/3");
    esperar(textoPenalizacion(1 / 2)).igualA("1/2");
    esperar(textoPenalizacion(1 / 4)).igualA("1/4");
    esperar(textoPenalizacion(0)).igualA("sin penalización");
    esperar(textoPenalizacion(0.3)).igualA("0,3");
  });
});

grupo("Oposición: netas y nota", () => {
  prueba("las netas restan los fallos", () => {
    esperar(netaDe(68, 22, 1 / 3)).cerca(60.67, 0.01);
  });
  prueba("sin penalización, las netas son los aciertos", () => {
    esperar(netaDe(70, 30, 0)).igualA(70);
  });
  prueba("la nota sobre 10 sale de las netas", () => {
    esperar(nota10De(60, 100)).cerca(6);
    esperar(nota10De(-10, 100)).igualA(0);        /* no hay notas negativas */
    esperar(nota10De(50, 0)).igualA(0);           /* ni división por cero */
  });
});

grupo("Oposición: cuántas hay que acertar", () => {
  prueba("contestando todas, 70 aciertos dan justo 60 netas", () => {
    /* A − (100 − A)/3 ≥ 60  →  A ≥ 70 */
    const r = aciertosParaCorte(100, 0, 60, 1 / 3);
    esperar(r.aciertos).igualA(70);
    esperar(r.fallos).igualA(30);
    esperar(r.neta).cerca(60);
  });
  prueba("dejando diez en blanco, hacen falta 68", () => {
    const r = aciertosParaCorte(100, 10, 60, 1 / 3);
    esperar(r.aciertos).igualA(68);
    esperar(r.neta >= 60).cierto();
    /* y con uno menos no llega */
    esperar(netaDe(67, 23, 1 / 3) < 60).cierto();
  });
  prueba("sin penalización, tantos aciertos como el corte", () => {
    esperar(aciertosParaCorte(100, 0, 60, 0).aciertos).igualA(60);
  });
  prueba("si dejas demasiadas en blanco, lo dice en vez de pedir imposibles", () => {
    const r = aciertosParaCorte(100, 50, 60, 1 / 3);
    esperar(r.imposible).cierto();
  });
  prueba("con un corte de cero no hace falta acertar ninguna", () => {
    esperar(aciertosParaCorte(100, 0, 0, 1 / 3).aciertos).igualA(25);
    /* con 25 aciertos y 75 fallos las netas son exactamente 0 */
    esperar(netaDe(25, 75, 1 / 3)).cerca(0);
  });
  prueba("dejar en blanco más que el total no vale", () => {
    esperar(aciertosParaCorte(100, 100, 60, 1 / 3).valido).falso();
    esperar(aciertosParaCorte(100, -3, 60, 1 / 3).valido).falso();
    esperar(aciertosParaCorte(0, 0, 60, 1 / 3).valido).falso();
  });
});

grupo("Oposición: ¿contesto o la dejo en blanco?", () => {
  prueba("a ciegas y con la penalización normal, a la larga da igual", () => {
    esperar(valorDeArriesgar(4, 0, 1 / 3)).cerca(0, 1e-9);
    esperar(valorDeArriesgar(3, 0, 1 / 2)).cerca(0, 1e-9);
  });
  prueba("si descartas una, compensa contestar", () => {
    esperar(valorDeArriesgar(4, 1, 1 / 3) > 0).cierto();
    esperar(valorDeArriesgar(4, 1, 1 / 3)).cerca(1 / 9, 1e-6);
  });
  prueba("descartando dos, todavía más", () => {
    esperar(valorDeArriesgar(4, 2, 1 / 3)).cerca(1 / 3, 1e-6);
  });
  prueba("con una penalización más dura, a ciegas se pierde", () => {
    esperar(valorDeArriesgar(4, 0, 0.5) < 0).cierto();
  });
  prueba("sin penalización, siempre compensa", () => {
    esperar(valorDeArriesgar(4, 0, 0) > 0).cierto();
  });
  prueba("descartar todas no rompe nada", () => {
    esperar(valorDeArriesgar(4, 4, 1 / 3)).igualA(0);
    esperar(valorDeArriesgar(4, 9, 1 / 3)).igualA(0);
  });
});

grupo("Oposición: pegar el índice del temario", () => {
  prueba("«Tema 1.», «Tema 2.»…", () => {
    const r = leerIndice("Tema 1. La Constitución Española de 1978\nTema 2. La Corona");
    esperar(r.temas.length).igualA(2);
    esperar(r.temas[0].n).igualA(1);
    esperar(r.temas[0].titulo).igualA("La Constitución Española de 1978");
    esperar(r.temas[1].titulo).igualA("La Corona");
  });

  prueba("da igual el formato de cada convocatoria", () => {
    const r = leerIndice("1.- Primero\n2) Segundo\n3: Tercero\nT4. Cuarto\nTEMA 5 - Quinto\n6 Sexto");
    esperar(r.temas.map(t => t.n)).igualA([1, 2, 3, 4, 5, 6]);
    esperar(r.temas.map(t => t.titulo)).igualA(["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto"]);
  });

  prueba("los números de dentro del título no se tocan", () => {
    const r = leerIndice("Tema 7. La Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común");
    esperar(r.temas[0].n).igualA(7);
    esperar(r.temas[0].titulo).contiene("39/2015");
    esperar(r.temas[0].titulo).contiene("1 de octubre");
  });

  prueba("si el PDF partió un título en dos líneas, se junta", () => {
    const r = leerIndice("Tema 1. La Constitución Española de 1978: características\ny estructura. Los principios constitucionales\nTema 2. La Corona");
    esperar(r.temas.length).igualA(2);
    esperar(r.temas[0].titulo).contiene("y estructura");
  });

  prueba("un «Tema 1.» sin título coge la línea de abajo", () => {
    const r = leerIndice("Tema 1.\nLa Constitución\nTema 2.\nLa Corona");
    esperar(r.temas.length).igualA(2);
    esperar(r.temas[0].titulo).igualA("La Constitución");
  });

  prueba("los bloques se reconocen y agrupan", () => {
    const r = leerIndice("BLOQUE I. ORGANIZACIÓN PÚBLICA\nTema 1. La Constitución\nTema 2. La Corona\nBloque II. Actividad administrativa\nTema 3. Las fuentes del derecho");
    esperar(r.grupos.length).igualA(2);
    esperar(r.temas[0].grupo).contiene("ORGANIZACIÓN");
    esperar(r.temas[2].grupo).contiene("Actividad");
  });

  prueba("«Parte general» y «Parte específica» también", () => {
    const r = leerIndice("Parte general\n1. Uno\nParte específica\n2. Dos");
    esperar(r.grupos).igualA(["Parte general", "Parte específica"]);
  });

  prueba("un tema en mayúsculas no se confunde con un bloque", () => {
    const r = leerIndice("TEMA 1. LA CONSTITUCIÓN ESPAÑOLA");
    esperar(r.temas.length).igualA(1);
    esperar(r.grupos.length).igualA(0);
  });

  prueba("una lista sin números: cada línea es un tema", () => {
    const r = leerIndice("La Constitución\nLa Corona\nLas Cortes Generales");
    esperar(r.temas.length).igualA(3);
    esperar(r.temas.map(t => t.n)).igualA([1, 2, 3]);
  });

  prueba("las líneas vacías y los espacios de más no cuentan", () => {
    const r = leerIndice("\n\n  Tema 1.    La   Constitución  \n\n\n  Tema 2. La Corona\n\n");
    esperar(r.temas.length).igualA(2);
    esperar(r.temas[0].titulo).igualA("La Constitución");
  });

  prueba("con lo que sea, no revienta", () => {
    [null, undefined, "", "   ", 42, "💥💥💥", "a".repeat(20000), "\r\n\r\n", "Tema\nTema\nTema"].forEach(v => {
      try { leerIndice(v); } catch (e) { throw new Error("leerIndice se rompe con " + JSON.stringify(v).slice(0, 30)); }
    });
    esperar(leerIndice("").temas.length).igualA(0);
  });

  prueba("noventa temas de golpe, sin quedarse colgado", () => {
    const texto = Array.from({ length: 90 }, (_, i) => "Tema " + (i + 1) + ". Título del tema " + (i + 1)).join("\n");
    esperar(leerIndice(texto).temas.length).igualA(90);
  });
});

grupo("Oposición: crear el temario", () => {
  prueba("los temas van al bloque que les toca", () => {
    conEstado(() => {
      opositorDePrueba();
      crearTemas(leerIndice("Parte general\n1. Uno\nParte específica\n2. Dos"), true);
      esperar(S.opo.temas[0].modId).igualA("bGEN");
      esperar(S.opo.temas[1].modId).igualA("bESP");
    });
  });
  prueba("añadir al final sigue la numeración", () => {
    conEstado(() => {
      opositorDePrueba();
      crearTemas(leerIndice("1. Uno\n2. Dos"), true);
      crearTemas(leerIndice("1. Tres\n2. Cuatro"), false);
      esperar(S.opo.temas.map(t => t.n)).igualA([1, 2, 3, 4]);
    });
  });
  prueba("sustituir borra lo anterior", () => {
    conEstado(() => {
      opositorDePrueba();
      crearTemas(leerIndice("1. Uno\n2. Dos\n3. Tres"), true);
      crearTemas(leerIndice("1. Nuevo"), true);
      esperar(S.opo.temas.length).igualA(1);
    });
  });
  prueba("cada tema con su identificador", () => {
    conEstado(() => {
      opositorDePrueba();
      crearTemas(leerIndice(Array.from({ length: 60 }, (_, i) => (i + 1) + ". T").join("\n")), true);
      esperar(new Set(S.opo.temas.map(t => t.id)).size).igualA(60);
    });
  });
});

grupo("Oposición: vueltas y temas que se enfrían", () => {
  prueba("dar una vuelta la apunta con la fecha de hoy", () => {
    conEstado(() => {
      opositorDePrueba();
      const t = temaDe(1); S.opo.temas = [t];
      darVuelta(t);
      esperar(t.vueltas).igualA([hoyISO()]);
    });
  });
  prueba("dos veces el mismo día cuentan como una", () => {
    conEstado(() => {
      opositorDePrueba();
      const t = temaDe(1); S.opo.temas = [t];
      darVuelta(t); darVuelta(t);
      esperar(vueltasDe(t)).igualA(1);
    });
  });
  prueba("el estado sigue a las vueltas", () => {
    esperar(estadoTema(temaDe(1))).igualA("nada");
    esperar(estadoTema(temaDe(1, { vueltas: [haceDias(9)] }))).igualA("v1");
    esperar(estadoTema(temaDe(1, { vueltas: [haceDias(20), haceDias(9)] }))).igualA("v2");
    esperar(estadoTema(temaDe(1, { vueltas: [haceDias(30), haceDias(20), haceDias(9)] }))).igualA("v3");
    esperar(estadoTema(temaDe(1, { dominado: true }))).igualA("dom");
  });
  prueba("un tema con una vuelta hace quince días ya se está enfriando", () => {
    esperar(retrasoTema(temaDe(1, { vueltas: [haceDias(15)] }))).igualA(5);
  });
  prueba("con una vuelta hace cinco días, todavía no", () => {
    esperar(retrasoTema(temaDe(1, { vueltas: [haceDias(5)] }))).igualA(0);
  });
  prueba("cuantas más vueltas, más aguanta sin tocarlo", () => {
    const una = temaDe(1, { vueltas: [haceDias(15)] });
    const tres = temaDe(2, { vueltas: [haceDias(60), haceDias(40), haceDias(15)] });
    esperar(retrasoTema(una) > 0).cierto();
    esperar(retrasoTema(tres)).igualA(0);
  });
  prueba("lo que está sin empezar no se enfría", () => {
    esperar(retrasoTema(temaDe(1))).igualA(0);
  });
  prueba("lo dominado no se enfría nunca", () => {
    esperar(retrasoTema(temaDe(1, { vueltas: [haceDias(300)], dominado: true }))).igualA(0);
  });
  prueba("los más fríos salen primero", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { vueltas: [haceDias(12)] }), temaDe(2, { vueltas: [haceDias(40)] }), temaDe(3, { vueltas: [haceDias(20)] })];
      esperar(temasFrios().map(t => t.n)).igualA([2, 3, 1]);
    });
  });
});

grupo("Oposición: el plan de vueltas", () => {
  prueba("sin fecha de examen no inventa un ritmo", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1)];
      esperar(planOpo().sinFecha).cierto();
      esperar(planOpo().porDia).igualA(undefined);
    });
  });
  prueba("60 temas, 3 vueltas y 120 días salen a 2 temas por día", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = Array.from({ length: 60 }, (_, i) => temaDe(i + 1));
      S.opo.examen.fecha = sumaDias(hoyISO(), 120);
      S.opo.plan = { vueltas: 3, diasSemana: 6, diasSimulacro: 14 };
      const p = planOpo();
      esperar(p.pendiente).igualA(180);
      esperar(p.utiles).igualA(106);
      esperar(p.diasEstudio).igualA(90);
      esperar(p.porDia).cerca(2);
    });
  });
  prueba("lo dominado ya no cuenta como pendiente", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { dominado: true }), temaDe(2)];
      esperar(planOpo().pendiente).igualA(3);
    });
  });
  prueba("mide tu ritmo de las dos últimas semanas, por día de estudio", () => {
    conEstado(() => {
      opositorDePrueba();
      /* 12 vueltas en dos semanas estudiando 6 días de 7 son 12 días de estudio: uno por día */
      S.opo.plan.diasSemana = 6;
      S.opo.temas = Array.from({ length: 12 }, (_, i) => temaDe(i + 1, { vueltas: [haceDias(i)] }));
      esperar(planOpo().ritmo).cerca(1);
      /* y estudiando los siete, esas mismas 12 son menos de una por día */
      S.opo.plan.diasSemana = 7;
      esperar(planOpo().ritmo).cerca(12 / 14);
    });
  });

  prueba("el ritmo y lo que hace falta se miden igual", () => {
    /* Fallaba: el ritmo iba por día natural y lo necesario por día de estudio,
       y se comparaban como si fueran lo mismo. Si vas justo al ritmo que hace
       falta, tiene que decir que llegas. */
    conEstado(() => {
      opositorDePrueba();
      S.opo.plan = { vueltas: 1, diasSemana: 6, diasSimulacro: 0 };
      S.opo.examen.fecha = sumaDias(hoyISO(), 70);
      /* 60 temas por empezar y 60 días de estudio: hace falta 1 al día */
      S.opo.temas = Array.from({ length: 72 }, (_, i) => temaDe(i + 1, { vueltas: i < 12 ? [haceDias(i)] : [] }));
      const p = planOpo();
      esperar(p.porDia).cerca(1);
      esperar(p.ritmo).cerca(1);
      esperar(p.llegas).cierto();
    });
  });
  prueba("quien va justo a tiempo, llega: sin errores de redondeo", () => {
    /* con 17 pendientes y 17 vueltas en dos semanas, 17 / (17 / 14) da
       14,000000000000002 días; redondeado hacia arriba eran 15 y salía que no
       llegaba a un examen que está justo a 14 días */
    conEstado(() => {
      opositorDePrueba();
      S.opo.plan = { vueltas: 1, diasSemana: 7, diasSimulacro: 0 };
      S.opo.examen.fecha = sumaDias(hoyISO(), 14);
      S.opo.temas = Array.from({ length: 34 }, (_, i) => temaDe(i + 1, { vueltas: i < 17 ? [haceDias(i % 14)] : [] }));
      const p = planOpo();
      esperar(p.pendiente).igualA(17);
      esperar(p.utiles).igualA(14);
      esperar(p.llegas).cierto();
    });
  });

  prueba("te dice si llegas o no", () => {
    conEstado(() => {
      opositorDePrueba();
      /* 30 temas, 3 vueltas, examen en 30 días, y has ido a un tema al día */
      S.opo.temas = Array.from({ length: 30 }, (_, i) => temaDe(i + 1, { vueltas: i < 14 ? [haceDias(i)] : [] }));
      S.opo.examen.fecha = sumaDias(hoyISO(), 30);
      S.opo.plan.diasSimulacro = 5;
      const p = planOpo();
      esperar(p.llegas).falso();
      esperar(!!p.acabas).cierto();
    });
  });
  prueba("en las últimas semanas cambia a modo simulacros", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1)];
      S.opo.examen.fecha = sumaDias(hoyISO(), 7);
      S.opo.plan.diasSimulacro = 14;
      esperar(planOpo().fase).igualA("final");
    });
  });
  prueba("con el examen ya pasado no hace cuentas raras", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1)];
      S.opo.examen.fecha = haceDias(3);
      esperar(planOpo().pasado).cierto();
    });
  });
});

grupo("Oposición: lo que toca hoy", () => {
  prueba("primero lo que se enfría, luego lo que lleva menos vueltas", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { vueltas: [haceDias(3)] }), temaDe(2), temaDe(3, { vueltas: [haceDias(30)] })];
      const h = temasDeHoy();
      esperar(h.lista[0].n).igualA(3);          /* el frío */
      esperar(h.lista[1].n).igualA(2);          /* el que no se ha empezado */
    });
  });
  prueba("lo que ya has hecho hoy no vuelve a salir", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { vueltas: [hoyISO()] }), temaDe(2), temaDe(3)];
      const h = temasDeHoy();
      esperar(h.hechos).igualA(1);
      esperar(h.lista.map(t => t.n)).noContiene(1);
    });
  });
  prueba("lo dominado no se propone", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { dominado: true }), temaDe(2)];
      esperar(temasDeHoy().lista.map(t => t.n)).igualA([2]);
    });
  });
  prueba("no propone más temas de los que caben en el día", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = Array.from({ length: 60 }, (_, i) => temaDe(i + 1));
      S.opo.examen.fecha = sumaDias(hoyISO(), 120);
      esperar(temasDeHoy().lista.length).igualA(2);
    });
  });
  prueba("con todo hecho, lista vacía y sin errores", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { dominado: true })];
      esperar(temasDeHoy().lista.length).igualA(0);
    });
  });
});

grupo("Oposición: los simulacros", () => {
  prueba("los blancos salen solos", () => {
    const c = calcSimulacro({ preguntas: 100, aciertos: 60, fallos: 25 }, 1 / 3);
    esperar(c.blancos).igualA(15);
    esperar(c.neta).cerca(51.67, 0.01);
  });
  prueba("aciertos y fallos que no caben se recortan en vez de dar notas imposibles", () => {
    const c = calcSimulacro({ preguntas: 100, aciertos: 90, fallos: 50 }, 1 / 3);
    esperar(c.aciertos + c.fallos <= 100).cierto();
    esperar(c.blancos >= 0).cierto();
  });
  prueba("mide cuánto arriesgas y cuánto aciertas de lo que contestas", () => {
    const c = calcSimulacro({ preguntas: 100, aciertos: 60, fallos: 20 }, 1 / 3);
    esperar(c.riesgo).cerca(0.8);
    esperar(c.acierto).cerca(0.75);
  });
  prueba("el resumen coge los completos, ordenados por fecha", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.simulacros = [
        { id: "s2", fecha: haceDias(2), tipo: "completo", preguntas: 100, aciertos: 70, fallos: 20 },
        { id: "s1", fecha: haceDias(9), tipo: "completo", preguntas: 100, aciertos: 50, fallos: 30 },
        { id: "s3", fecha: haceDias(1), tipo: "tema", ref: "t1", preguntas: 20, aciertos: 5, fallos: 15 }
      ];
      const r = resumenSimulacros();
      esperar(r.n).igualA(2);
      esperar(r.ultima.s.id).igualA("s2");
      esperar(r.mejor.s.id).igualA("s2");
    });
  });
  prueba("la tendencia compara los cinco últimos con los cinco de antes", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.simulacros = Array.from({ length: 10 }, (_, i) => ({ id: "s" + i, fecha: haceDias(20 - i), tipo: "completo", preguntas: 100, aciertos: 40 + i * 4, fallos: 10 }));
      esperar(resumenSimulacros().tendencia > 0).cierto();
    });
  });
  prueba("sin simulacros, nada que resumir y sin errores", () => {
    conEstado(() => { opositorDePrueba(); esperar(resumenSimulacros().n).igualA(0); });
  });
  prueba("los temas que más se fallan salen como flojos", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1), temaDe(2)];
      S.opo.simulacros = [{ id: "a", tipo: "tema", ref: "t2", preguntas: 20, aciertos: 8, fallos: 12 }];
      esperar(temasFlojos()[0].t.n).igualA(2);
    });
  });
  prueba("marcar un tema como difícil también lo saca", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { dificultad: "dificil" }), temaDe(2)];
      esperar(temasFlojos().map(x => x.t.n)).igualA([1]);
    });
  });
});

grupo("Oposición: la nota de corte", () => {
  prueba("la tuya manda sobre la de otros años", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.examen.corte = 62;
      S.opo.convocatoria.cortes = [{ anio: 2024, corte: 55 }];
      esperar(corteDe().valor).igualA(62);
    });
  });
  prueba("si no pones la tuya, la del año más reciente", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.convocatoria.cortes = [{ anio: 2022, corte: 50 }, { anio: 2024, corte: 58 }, { anio: 2023, corte: 54 }];
      esperar(corteDe().valor).igualA(58);
      esperar(corteDe().de).igualA("de 2024");
    });
  });
  prueba("sin ninguna, no se inventa", () => {
    conEstado(() => { opositorDePrueba(); esperar(corteDe()).nulo(); });
  });
});

grupo("Oposición: guardar los campos", () => {
  prueba("los números se quedan dentro de lo razonable", () => {
    conEstado(() => {
      opositorDePrueba();
      ponCampoOpo("examen.opciones", "9");
      esperar(S.opo.examen.opciones).igualA(5);
      ponCampoOpo("examen.preguntas", "0");
      esperar(S.opo.examen.preguntas).igualA(1);
      ponCampoOpo("plan.vueltas", "-2");
      esperar(S.opo.plan.vueltas).igualA(1);
    });
  });
  prueba("un número que no es un número vuelve al de siempre", () => {
    conEstado(() => {
      opositorDePrueba();
      ponCampoOpo("examen.preguntas", "muchas");
      esperar(S.opo.examen.preguntas).igualA(100);
    });
  });
  prueba("borrar la penalización o el corte los deja vacíos, no a cero", () => {
    conEstado(() => {
      opositorDePrueba();
      ponCampoOpo("examen.penalizacion", "0.25"); ponCampoOpo("examen.penalizacion", "");
      esperar(S.opo.examen.penalizacion).nulo();
      ponCampoOpo("examen.corte", "");
      esperar(S.opo.examen.corte).nulo();
    });
  });
  prueba("una fecha que no es fecha no se guarda", () => {
    conEstado(() => {
      opositorDePrueba();
      ponCampoOpo("examen.fecha", "mañana por la tarde");
      esperar(S.opo.examen.fecha).igualA("");
      ponCampoOpo("examen.fecha", "2027-05-10");
      esperar(S.opo.examen.fecha).igualA("2027-05-10");
    });
  });
  prueba("un campo que no existe no se cuela en el estado", () => {
    conEstado(() => {
      opositorDePrueba();
      ponCampoOpo("examen.__proto__", "x");
      ponCampoOpo("inventado.campo", "x");
      esperar(S.opo.inventado).igualA(undefined);
    });
  });
});

grupo("Oposición: estados raros", () => {
  prueba("un estado sin nada de la oposición se rellena solo", () => {
    conEstado(() => {
      delete S.opo;
      const O = normalizarOpo();
      esperar(Array.isArray(O.temas)).cierto();
      esperar(O.examen.preguntas).igualA(100);
    });
  });
  prueba("con basura dentro, se queda con lo que sirve", () => {
    conEstado(() => {
      S.opo = { temas: [null, "texto", { titulo: "Bueno", vueltas: ["2026-01-01", "ayer", 42] }], examen: "roto", simulacros: "tampoco" };
      const O = normalizarOpo();
      esperar(O.temas.length).igualA(1);
      esperar(O.temas[0].vueltas).igualA(["2026-01-01"]);
      esperar(O.examen.opciones).igualA(4);
      esperar(Array.isArray(O.simulacros)).cierto();
    });
  });
  prueba("un estado de antes de existir la oposición carga igual", () => {
    conEstado(() => {
      S.opo = "no debería ser un texto";
      esperar(typeof normalizarOpo().plan.vueltas).igualA("number");
    });
  });
});

grupo("Oposición: dentro de la app", () => {
  prueba("la sección solo se ve si opositas", () => {
    conEstado(() => {
      opositorDePrueba();
      esperar(secVisibles().map(s => s.id)).contiene("oposicion");
      S.perfil.etapa = "ciclo-sup";
      esperar(secVisibles().map(s => s.id)).noContiene("oposicion");
    });
  });
  prueba("si dejas de opositar, no te quedas atrapado en la sección", () => {
    conEstado(() => {
      const antes = seccion;
      try {
        opositorDePrueba(); seccion = "oposicion";
        S.perfil.etapa = "ciclo-sup"; pinta();
        esperar(seccion).igualA("escritorio");
      } finally { seccion = antes; pinta(); }
    });
  });
  prueba("todas las pestañas se pintan, vacías y llenas", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorDePrueba();
        OPO_TABS.forEach(([id]) => { opoTab = id; const h = vistaOposicion(); if (!h || h.length < 200) throw new Error(id + " vacía"); });
        S.opo.temas = Array.from({ length: 30 }, (_, i) => temaDe(i + 1, { vueltas: i % 3 ? [haceDias(i)] : [] }));
        S.opo.examen.fecha = sumaDias(hoyISO(), 90); S.opo.examen.corte = 60;
        S.opo.simulacros = [{ id: "s", fecha: haceDias(1), tipo: "completo", preguntas: 100, aciertos: 65, fallos: 20 }];
        OPO_TABS.forEach(([id]) => { opoTab = id; const h = vistaOposicion(); if (!h.includes("panel")) throw new Error(id + " sin paneles"); });
      } finally { opoTab = antesTab; }
    });
  });
  prueba("los títulos de los temas se escapan al pintarlos", () => {
    conEstado(() => {
      const antesTab = opoTab;
      try {
        opositorDePrueba();
        S.opo.temas = [temaDe(1, { titulo: '<img src=x onerror="alert(1)">' })];
        opoTab = "temario";
        esperar(vistaOposicion()).noContiene("<img src=x");
      } finally { opoTab = antesTab; }
    });
  });
  prueba("el menú cuenta los temas que te tocan hoy", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1), temaDe(2)];
      esperar(cuentasNav().oposicion).igualA(temasDeHoy().lista.length);
      S.perfil.etapa = "eso";
      esperar(cuentasNav().oposicion).igualA(0);
    });
  });
  prueba("se sincroniza y viene en el estado nuevo", () => {
    esperar(DOCS.oposicion).igualA(["opo"]);
    esperar(typeof estadoInicial().opo).igualA("object");
  });
  prueba("Inicio le enseña su oposición al opositor, y a nadie más", () => {
    conEstado(() => {
      opositorDePrueba();
      esperar(vistaEscritorio()).contiene("opo-inicio");
      S.perfil.etapa = "ciclo-sup";
      esperar(vistaEscritorio()).noContiene("opo-inicio");
    });
  });
});

grupo("Oposición: lo que se le cuenta al profe", () => {
  prueba("le llega la oposición, el examen y cómo va", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { vueltas: [haceDias(30)] }), temaDe(2)];
      S.opo.examen.fecha = sumaDias(hoyISO(), 60);
      const c = tutorContexto();
      esperar(c).contiene("LA OPOSICIÓN");
      esperar(c).contiene("100 preguntas");
      esperar(c).contiene("resta 1/3");
    });
  });
  prueba("tus notas de cada tema NO se le mandan", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { notas: "SECRETO_NOTA_DEL_TEMA", vueltas: [haceDias(30)] })];
      esperar(tutorContexto()).noContiene("SECRETO_NOTA_DEL_TEMA");
    });
  });
  prueba("ni los enlaces que guardes", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1, { ley: "https://SECRETO_ENLACE.example", vueltas: [haceDias(30)] })];
      S.opo.convocatoria.enlace = "https://SECRETO_BASES.example";
      const c = tutorContexto();
      esperar(c).noContiene("SECRETO_ENLACE");
      esperar(c).noContiene("SECRETO_BASES");
    });
  });
  prueba("a quien no oposita no se le manda nada de esto", () => {
    conEstado(() => {
      opositorDePrueba();
      S.opo.temas = [temaDe(1)];
      S.perfil.etapa = "ciclo-sup";
      esperar(tutorContexto()).noContiene("LA OPOSICIÓN");
    });
  });
  prueba("al opositor le prohíbe inventarse artículos de ley", () => {
    conEstado(() => {
      opositorDePrueba();
      const i = tutorInstrucciones();
      esperar(i).contiene("SI OPOSITA");
      esperar(i).contiene("BOE");
      esperar(i).contiene("Nunca te inventes un artículo");
    });
  });
});
