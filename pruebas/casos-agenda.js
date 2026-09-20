/* entenderFrase() es lo que convierte «examen de BD el jueves a las 10»
   en una fecha, una hora, un tipo y una asignatura. Se le pasa la fecha
   de hoy como segundo argumento, así que los tests no dependen del día
   en que se ejecuten. */

const HOY = "2026-09-20";        /* un domingo */

grupo("Agenda: fechas escritas a mano", () => {
  prueba("hoy, mañana y pasado mañana", () => {
    esperar(entenderFrase("entregar la práctica hoy", HOY).fecha).igualA("2026-09-20");
    esperar(entenderFrase("entregar la práctica mañana", HOY).fecha).igualA("2026-09-21");
    esperar(entenderFrase("entregar la práctica pasado mañana", HOY).fecha).igualA("2026-09-22");
  });

  prueba("«pasado mañana» no se confunde con «mañana»", () => {
    /* si el orden de las reglas se toca, esto empieza a dar el día 21 */
    esperar(entenderFrase("examen pasado mañana", HOY).fecha).igualA("2026-09-22");
  });

  prueba("dentro de X días", () => {
    esperar(entenderFrase("entrega en 3 días", HOY).fecha).igualA("2026-09-23");
    esperar(entenderFrase("entrega dentro de 10 días", HOY).fecha).igualA("2026-09-30");
  });

  prueba("la semana que viene", () => {
    esperar(entenderFrase("examen la semana que viene", HOY).fecha).igualA("2026-09-27");
  });

  prueba("día y mes escritos con letras", () => {
    esperar(entenderFrase("examen el 5 de octubre", HOY).fecha).igualA("2026-10-05");
    esperar(entenderFrase("examen el 5 de oct", HOY).fecha).igualA("2026-10-05");
  });

  prueba("un mes que ya pasó se entiende como el año que viene", () => {
    /* en septiembre, «3 de febrero» es de 2027, no de 2026 */
    esperar(entenderFrase("examen el 3 de febrero", HOY).fecha).igualA("2027-02-03");
  });

  prueba("con el año puesto, manda el año puesto", () => {
    esperar(entenderFrase("examen el 3 de febrero de 2026", HOY).fecha).igualA("2026-02-03");
  });

  prueba("fechas con barra, en orden español", () => {
    esperar(entenderFrase("entrega el 5/10", HOY).fecha).igualA("2026-10-05");
    esperar(entenderFrase("entrega el 5-10-2026", HOY).fecha).igualA("2026-10-05");
  });

  prueba("una fecha imposible no se inventa", () => {
    /* 45/13 no es nada: mejor sin fecha que con una inventada */
    esperar(entenderFrase("entrega el 45/13", HOY).fecha).igualA("");
  });
});

grupo("Agenda: horas", () => {
  prueba("«a las 10» es una hora, no un día", () => {
    const e = entenderFrase("examen mañana a las 10", HOY);
    esperar(e.hora).igualA("10:00");
    esperar(e.fecha).igualA("2026-09-21");
  });

  prueba("con minutos, con puntos y con la hache", () => {
    esperar(entenderFrase("examen a las 9:30", HOY).hora).igualA("09:30");
    esperar(entenderFrase("examen a las 9.30", HOY).hora).igualA("09:30");
    esperar(entenderFrase("examen 10:15 h", HOY).hora).igualA("10:15");
  });

  prueba("las 25:00 no existen", () => {
    esperar(entenderFrase("examen a las 25:99", HOY).hora).distintoDe("25:99");
  });
});

grupo("Agenda: qué es cada cosa", () => {
  prueba("si dice examen, es un examen", () => {
    esperar(entenderFrase("examen de bases de datos el jueves", HOY).tipo).igualA("examen");
  });

  prueba("por defecto es una entrega", () => {
    esperar(entenderFrase("subir la práctica de Java", HOY).tipo).igualA("entrega");
  });

  prueba("una frase vacía no rompe nada", () => {
    const e = entenderFrase("", HOY);
    esperar(e.fecha).igualA("");
    esperar(e.tipo).igualA("entrega");
  });

  prueba("una frase larguísima tampoco", () => {
    const e = entenderFrase("a".repeat(5000) + " mañana", HOY);
    esperar(e.fecha).igualA("2026-09-21");
  });
});

grupo("Agenda: reconocer la asignatura", () => {
  prueba("por el código de la asignatura", () => {
    conEstado(() => {
      S.modulos = [moduloDe([[100, null]], { id: "bd1", cod: "BD", nombre: "Bases de Datos" })];
      esperar(entenderFrase("examen de BD el jueves", HOY).modId).igualA("bd1");
    });
  });

  prueba("por el nombre entero", () => {
    conEstado(() => {
      S.modulos = [moduloDe([[100, null]], { id: "bd1", cod: "BD", nombre: "Bases de Datos" })];
      esperar(entenderFrase("examen de Bases de Datos el jueves", HOY).modId).igualA("bd1");
    });
  });

  prueba("si no cuadra ninguna, no se inventa una", () => {
    conEstado(() => {
      S.modulos = [moduloDe([[100, null]], { id: "bd1", cod: "BD", nombre: "Bases de Datos" })];
      esperar(entenderFrase("comprar pan mañana", HOY).modId).igualA("");
    });
  });
});

grupo("Fechas: las cuentas de días", () => {
  prueba("sumar días cruzando de mes y de año", () => {
    esperar(sumaDias("2026-09-30", 1)).igualA("2026-10-01");
    esperar(sumaDias("2026-12-31", 1)).igualA("2027-01-01");
    esperar(sumaDias("2026-01-01", -1)).igualA("2025-12-31");
  });

  prueba("el 29 de febrero de un año bisiesto existe", () => {
    esperar(sumaDias("2028-02-28", 1)).igualA("2028-02-29");
  });

  prueba("y en uno normal, no", () => {
    esperar(sumaDias("2026-02-28", 1)).igualA("2026-03-01");
  });

  prueba("los días entre dos fechas", () => {
    esperar(diasEntre("2026-09-25", "2026-09-20")).igualA(5);
    esperar(diasEntre("2026-09-20", "2026-09-25")).igualA(-5);
    esperar(diasEntre("2026-09-20", "2026-09-20")).igualA(0);
  });

  prueba("el cambio de hora de octubre no cuela un día de más", () => {
    /* en España los relojes se atrasan el último domingo de octubre;
       si esto se calculara en UTC sin cuidado, saldrían 8 días */
    esperar(diasEntre("2026-11-01", "2026-10-25")).igualA(7);
  });

  prueba("hoyISO da el día de aquí, no el de Greenwich", () => {
    /* a las 00:30 de la noche en España, en UTC todavía es el día anterior */
    const medianoche = new Date(2026, 8, 20, 0, 30);
    esperar(hoyISO(medianoche)).igualA("2026-09-20");
  });
});
