/* Las cuentas de las notas: la parte de la app en la que más se fía la
   gente y la que peor se ve a ojo. Si algo de aquí falla, un alumno
   estudia lo que no toca o se confía cuando no debe. */

grupo("Notas: la media", () => {
  prueba("sin ninguna nota puesta, la media es null y no cero", () => {
    const c = calcModulo(moduloDe([[60, null], [40, null]]));
    esperar(c.media).nulo();
    esperar(c.pesoEval).igualA(0);
  });

  prueba("con todo puntuado, la media es la ponderada", () => {
    /* 8 × 60 % + 5 × 40 % = 6,8 */
    const c = calcModulo(moduloDe([[60, 8], [40, 5]]));
    esperar(c.media).cerca(6.8);
    esperar(c.acumulado).cerca(6.8);
    esperar(c.restante).igualA(0);
  });

  prueba("a medias, la media es de lo corregido, no del curso entero", () => {
    /* solo está el 60 %, con un 8: la media es 8, no 4,8 */
    const c = calcModulo(moduloDe([[60, 8], [40, null]]));
    esperar(c.media).cerca(8);
    esperar(c.acumulado).cerca(4.8);
    esperar(c.restante).cerca(40);
  });

  prueba("un cero cuenta como nota, no como apartado sin corregir", () => {
    const c = calcModulo(moduloDe([[50, 0], [50, 10]]));
    esperar(c.media).cerca(5);
    esperar(c.restante).igualA(0);
  });

  prueba("si los pesos no suman 100, se usa lo que sumen", () => {
    /* dos apartados de 30: 7 y 9 → media 8 */
    const c = calcModulo(moduloDe([[30, 7], [30, 9]]));
    esperar(c.media).cerca(8);
  });
});

grupo("Notas: qué necesitas en lo que queda", () => {
  prueba("un 8 en el 60 % todavía no es un aprobado hecho", () => {
    /* llevas 4,8 de 10: si sacas un 0 en el 40 % que queda, suspendes.
       Da el pego que ya está, y no lo está: hace falta medio punto más. */
    const c = calcModulo(moduloDe([[60, 8], [40, null]], { objetivo: 5 }));
    esperar(c.yaEsta).falso();
    esperar(c.necesita).cerca(0.5);
  });

  prueba("con un 9 en el 60 % sí está hecho, saques lo que saques", () => {
    /* 5,4 acumulado sobre 10: ya pasa del 5 aunque el resto sea un cero */
    const c = calcModulo(moduloDe([[60, 9], [40, null]], { objetivo: 5 }));
    esperar(c.yaEsta).cierto();
    esperar(c.necesita).igualA(0);
  });

  prueba("dice exactamente cuánto falta", () => {
    /* llevas 4,8 de 10; para un 7 necesitas 2,2 más en el 40 % → 5,5 */
    const c = calcModulo(moduloDe([[60, 8], [40, null]], { objetivo: 7 }));
    esperar(c.necesita).cerca(5.5);
    esperar(c.imposible).falso();
  });

  prueba("cuando ni con un 10 llegas, lo dice en vez de pedir un 11", () => {
    /* 2 en el 70 %; para un 5 harían falta más de 10 en el 30 % */
    const c = calcModulo(moduloDe([[70, 2], [30, null]], { objetivo: 5 }));
    esperar(c.imposible).cierto();
    esperar(c.txt).igualA("Solo con recuperación");
  });

  prueba("justo un 10 clavado todavía es posible", () => {
    /* 4 en el 50 %; para un 7 hace falta exactamente un 10 en el otro 50 % */
    const c = calcModulo(moduloDe([[50, 4], [50, null]], { objetivo: 7 }));
    esperar(c.necesita).cerca(10);
    esperar(c.imposible).falso();
  });

  prueba("con el curso cerrado no pide nota ninguna", () => {
    const c = calcModulo(moduloDe([[100, 6]], { objetivo: 5 }));
    esperar(c.necesita).nulo();
    esperar(c.yaEsta).cierto();
  });
});

grupo("Notas: el estado que se enseña", () => {
  prueba("vas bien cuando vas bien", () => {
    esperar(calcModulo(moduloDe([[50, 8], [50, null]], { objetivo: 5 })).est).igualA("ok");
  });

  prueba("por debajo del 5 sí es suspenso", () => {
    const c = calcModulo(moduloDe([[50, 3], [50, null]], { objetivo: 5 }));
    esperar(c.est).igualA("riesgo");
    esperar(c.txt).igualA("Suspenso ahora");
  });

  prueba("por debajo del objetivo pero aprobando, no se dice suspenso", () => {
    /* un 6,67 con objetivo 7 no es un suspenso y no hay que asustar */
    const c = calcModulo(moduloDe([[60, 6.5], [30, 7], [10, null]], { objetivo: 7 }));
    esperar(c.txt).igualA("Por debajo de tu objetivo");
    esperar(c.txt).noContiene("Suspenso");
  });

  prueba("sin notas todavía, avisa pero no alarma", () => {
    const c = calcModulo(moduloDe([[100, null]]));
    esperar(c.est).igualA("aviso");
    esperar(c.txt).igualA("Sin notas aún");
  });
});

grupo("Faltas", () => {
  prueba("el máximo sale del porcentaje sobre las horas del curso", () => {
    /* 15 % de 100 horas = 15 faltas */
    const c = calcModulo(moduloDe([[100, 5]], { horas: 100, faltas: 0, pctFaltas: 15 }));
    esperar(c.faltasMax).igualA(15);
    esperar(c.faltasPct).igualA(0);
  });

  prueba("al llegar al límite, manda sobre la nota", () => {
    /* con un 10 de media pero las faltas al tope, lo que importa son las faltas */
    const c = calcModulo(moduloDe([[50, 10], [50, null]], { horas: 100, faltas: 15, pctFaltas: 15, objetivo: 5 }));
    esperar(c.est).igualA("riesgo");
    esperar(c.txt).igualA("Faltas al límite");
  });

  prueba("cerca del límite avisa antes de que sea tarde", () => {
    const c = calcModulo(moduloDe([[50, 8], [50, null]], { horas: 100, faltas: 11, pctFaltas: 15, objetivo: 5 }));
    esperar(c.txt).igualA("Ojo con las faltas");
  });

  prueba("una asignatura sin horas puestas no dispara el aviso de faltas", () => {
    const c = calcModulo(moduloDe([[50, 8], [50, null]], { horas: 0, faltas: 3, objetivo: 5 }));
    esperar(c.faltasMax).igualA(0);
    esperar(c.txt).distintoDe("Faltas al límite");
  });
});

grupo("Notas: escribirlas", () => {
  prueba("se enseñan con coma y sin decimales de sobra", () => {
    esperar(nota(7)).igualA("7");
    esperar(nota(7.5)).igualA("7,5");
    esperar(nota(6.666)).igualA("6,67");
  });

  prueba("num() traga la coma que escribe cualquiera en España", () => {
    esperar(num("7,5")).igualA(7.5);
    esperar(num("7.5")).igualA(7.5);
    esperar(num("", 3)).igualA(3);
    esperar(num("cuatro", 0)).igualA(0);
  });

  prueba("clamp no deja poner un 12 ni un -3", () => {
    esperar(clamp(12, 0, 10)).igualA(10);
    esperar(clamp(-3, 0, 10)).igualA(0);
    esperar(clamp(7, 0, 10)).igualA(7);
  });
});
