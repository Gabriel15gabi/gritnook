/* Horas de estudio, racha, objetivos del día y repaso espaciado. Son
   las cuentas que mueven la pantalla de inicio, y todas dependen de la
   fecha, que es donde más fácil es meter la pata. */

grupo("Horas de estudio", () => {
  prueba("registrar minutos los suma al día de hoy", () => {
    conEstado(() => {
      S.horas = {};
      registrarMinutos("m1", 25);
      registrarMinutos("m1", 25);
      esperar(S.horas.m1[hoyISO()]).igualA(50);
    });
  });

  prueba("sin asignatura o sin minutos no apunta nada", () => {
    conEstado(() => {
      S.horas = {};
      registrarMinutos("", 25);
      registrarMinutos("m1", 0);
      esperar(Object.keys(S.horas).length).igualA(0);
    });
  });

  prueba("el total del día suma todas las asignaturas", () => {
    conEstado(() => {
      const hoy = hoyISO();
      S.horas = { a: { [hoy]: 30 }, b: { [hoy]: 45 }, c: { "2020-01-01": 999 } };
      esperar(totalDia(hoy)).igualA(75);
    });
  });

  prueba("un día sin estudiar da cero, no undefined", () => {
    conEstado(() => { S.horas = {}; esperar(totalDia("2026-01-01")).igualA(0); });
  });
});

grupo("La racha", () => {
  prueba("días seguidos estudiando", () => {
    conEstado(() => {
      S.horas = { m1: {} };
      for (let i = 0; i < 5; i++) S.horas.m1[sumaDias(hoyISO(), -i)] = 30;
      esperar(racha()).igualA(5);
    });
  });

  prueba("un día de descanso la corta", () => {
    conEstado(() => {
      S.horas = { m1: {} };
      [0, 1, 3, 4, 5].forEach(i => { S.horas.m1[sumaDias(hoyISO(), -i)] = 30; });
      esperar(racha()).igualA(2);
    });
  });

  prueba("hoy todavía sin estudiar no rompe la racha de ayer", () => {
    /* a las nueve de la mañana aún no has estudiado y la racha sigue viva */
    conEstado(() => {
      S.horas = { m1: {} };
      for (let i = 1; i <= 4; i++) S.horas.m1[sumaDias(hoyISO(), -i)] = 30;
      esperar(racha()).igualA(4);
    });
  });

  prueba("sin nada estudiado, racha de cero", () => {
    conEstado(() => { S.horas = {}; esperar(racha()).igualA(0); });
  });

  prueba("una racha larguísima no se queda dando vueltas", () => {
    conEstado(() => {
      S.horas = { m1: {} };
      for (let i = 0; i < 400; i++) S.horas.m1[sumaDias(hoyISO(), -i)] = 10;
      const t0 = performance.now();
      esperar(racha()).igualA(400);
      esperar(performance.now() - t0 < 1000).cierto();
    });
  });
});

grupo("Minutos de la semana", () => {
  prueba("cuenta la semana de lunes a domingo, no los últimos siete días", () => {
    /* Este test pasaba o fallaba según el día en que se ejecutara: suponía
       «los últimos siete días» y la app cuenta la semana natural. Un lunes
       solo hay un día de semana. Ahora se calcula el lunes igual que la app. */
    conEstado(() => {
      const dow = (new Date().getDay() + 6) % 7, lunes = sumaDias(hoyISO(), -dow);
      S.horas = { m1: {} };
      for (let i = -7; i < 7; i++) S.horas.m1[sumaDias(lunes, i)] = 60;   /* la semana pasada y esta */
      esperar(minutosSemana("m1")).igualA(7 * 60);
    });
  });

  prueba("una asignatura sin horas da cero", () => {
    conEstado(() => { S.horas = {}; esperar(minutosSemana("m1")).igualA(0); });
  });
});

grupo("Objetivos del día", () => {
  prueba("cada día tiene su casilla propia", () => {
    conEstado(() => {
      const d = diaObj();
      esperar(typeof d).igualA("object");
      esperar(typeof d.hechos).igualA("object");
      esperar(!!S.objetivos.dias[hoyISO()]).cierto();
    });
  });

  prueba("lo de ayer no se mezcla con lo de hoy", () => {
    conEstado(() => {
      S.objetivos = { activos: {}, propios: [], dias: {} };
      const ayer = sumaDias(hoyISO(), -1);
      diaObj(ayer).hechos.estudio = true;
      const hoy = diaObj();
      esperar(hoy.hechos.estudio).distintoDe(true);
      esperar(S.objetivos.dias[ayer].hechos.estudio).cierto();
    });
  });

  prueba("unos objetivos rotos se rehacen solos", () => {
    conEstado(() => {
      S.objetivos = "esto no es un objeto";
      const O = normalizarObjetivos();
      esperar(typeof O.activos).igualA("object");
      esperar(Array.isArray(O.propios)).cierto();
    });
  });

  prueba("se proponen objetivos, y todos con su título", () => {
    conEstado(() => {
      const l = objetivosDeHoy();
      esperar(Array.isArray(l)).cierto();
      esperar(l.length > 0).cierto();
      l.forEach(o => { if (!o.titulo) throw new Error("un objetivo sin título: " + JSON.stringify(o)); });
    });
  });

  prueba("estudiar marca el objetivo de estudiar", () => {
    conEstado(() => {
      S.horas = {}; S.objetivos = { activos: { estudio: true }, propios: [], dias: {} };
      registrarMinutos("m1", num(S.config.pomodoro, 25));
      const o = objetivosDeHoy().find(x => x.id === "estudio");
      esperar(o.hecho).cierto();
    });
  });
});

grupo("Repaso espaciado: tarjetas", () => {
  const tarjeta = () => ({ id: "t1", frente: "¿?", dorso: "!", caja: 0, proximo: hoyISO(), vistas: 0, aciertos: 0 });

  prueba("acertar sube de caja y la aleja en el tiempo", () => {
    const c = tarjeta();
    responderTarjeta(c, "si");
    esperar(c.caja).igualA(1);
    esperar(c.aciertos).igualA(1);
    esperar(c.proximo).igualA(sumaDias(hoyISO(), CAJAS[1]));
  });

  prueba("subiendo hasta arriba, un mes entero sin volver a verla", () => {
    const c = tarjeta();
    for (let i = 0; i < 5; i++) responderTarjeta(c, "si");
    esperar(c.caja).igualA(5);
    esperar(c.proximo).igualA(sumaDias(hoyISO(), 30));
  });

  prueba("no sube de la caja cinco por mucho que aciertes", () => {
    const c = tarjeta();
    for (let i = 0; i < 20; i++) responderTarjeta(c, "si");
    esperar(c.caja).igualA(5);
  });

  prueba("fallar la manda a la caja uno y vuelve mañana", () => {
    const c = tarjeta();
    for (let i = 0; i < 4; i++) responderTarjeta(c, "si");
    responderTarjeta(c, "no");
    esperar(c.caja).igualA(1);
    esperar(c.proximo).igualA(sumaDias(hoyISO(), 1));
  });

  prueba("dudar no castiga pero tampoco premia", () => {
    const c = tarjeta();
    responderTarjeta(c, "si"); responderTarjeta(c, "si");
    const antes = c.caja;
    responderTarjeta(c, "duda");
    esperar(c.caja).igualA(antes);
    esperar(c.proximo).igualA(sumaDias(hoyISO(), 1));
  });

  prueba("las vistas se cuentan siempre", () => {
    const c = tarjeta();
    responderTarjeta(c, "si"); responderTarjeta(c, "no"); responderTarjeta(c, "duda");
    esperar(c.vistas).igualA(3);
  });

  prueba("una tarjeta con la caja rota se apaña", () => {
    const c = Object.assign(tarjeta(), { caja: "no es un número" });
    responderTarjeta(c, "si");
    esperar(c.caja).entre(0, 5);
    esperar(String(c.proximo).length).igualA(10);
  });
});

grupo("Repaso espaciado: vocabulario de inglés", () => {
  prueba("acertar sube de caja", () => {
    const v = { id: "v1", en: "query", es: "consulta", caja: 1 };
    responderPalabra(v, true);
    esperar(v.caja).igualA(2);
    esperar(v.proximo).igualA(sumaDias(hoyISO(), 2));
  });

  prueba("fallar baja, pero nunca de la caja uno", () => {
    const v = { id: "v1", en: "query", es: "consulta", caja: 1 };
    responderPalabra(v, false);
    esperar(v.caja).igualA(1);
    esperar(v.proximo).igualA(sumaDias(hoyISO(), 1));
  });

  prueba("no pasa de la caja cinco", () => {
    const v = { id: "v1", en: "query", es: "consulta", caja: 1 };
    for (let i = 0; i < 10; i++) responderPalabra(v, true);
    esperar(v.caja).igualA(5);
    esperar(v.proximo).igualA(sumaDias(hoyISO(), 16));
  });

  prueba("una palabra sin caja empieza por la primera", () => {
    const v = { id: "v1", en: "query", es: "consulta" };
    responderPalabra(v, true);
    esperar(v.caja).igualA(2);
  });
});
