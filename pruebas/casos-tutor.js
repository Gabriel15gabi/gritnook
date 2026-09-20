/* ════════════════════════════════════════════════════════════════════
   Qué se le manda al profe.

   Esto no es un test normal: es el que comprueba que el aviso de IA
   dice la verdad. En legal/IA.md hay una lista de lo que se envía y una
   frase que dice «no se le manda nada que no esté en esa lista». Si el
   código manda algo más, el documento es falso, y con usuarios menores
   de edad eso no es un detalle.

   Si alguien añade algo nuevo al contexto del profe, estos tests
   fallan. Es a propósito: obligan a actualizar los papeles.
   ════════════════════════════════════════════════════════════════════ */

/* un alumno completo, con de todo, para ver qué sale hacia la IA */
function alumnoDePrueba() {
  S.perfil = Object.assign(normalizarPerfil(), {
    nombre: "Gabriel", etapa: "ciclo-sup", ciclo: "Desarrollo de Aplicaciones Web", curso: "1.º",
    trabaja: "completa", horasSemana: 10, diasFuertes: ["mar", "jue"],
    objetivoNota: 7, cuestaMas: "SECRETO_LO_QUE_ME_CUESTA", motivo: "SECRETO_MI_MOTIVO",
    centro: "SECRETO_MI_CENTRO", listo: true
  });
  S.modulos = [moduloDe([[60, 4], [40, null]], { id: "bd", cod: "BD", nombre: "Bases de Datos", horas: 192, faltas: 9 })];
  S.tareas = [{ id: "t1", titulo: "Ejercicios de JOIN", modId: "bd", fecha: sumaDias(hoyISO(), 3), hecha: false }];
  S.examenes = [];
  S.apuntes = {
    a1: { id: "a1", titulo: "Consultas con JOIN", modId: "bd", cuerpo: "SECRETO_CUERPO_DEL_APUNTE", html: "<div>x</div>", editado: new Date().toISOString() }
  };
  S.casillero = {
    d1: { id: "d1", nombre: "SECRETO_NOMBRE_DE_ARCHIVO.pdf", tipo: "pdf", datos: "SECRETO_CONTENIDO_DEL_ARCHIVO", modId: "bd" }
  };
  S.vocab = [{ id: "v1", en: "SECRETO_PALABRA", es: "SECRETO_TRADUCCION", caja: 1 }];
  S.tarjetas = [{ id: "c1", frente: "SECRETO_PREGUNTA", dorso: "SECRETO_RESPUESTA", caja: 1, proximo: hoyISO() }];
  S.horario = [{ id: "h1", dia: diaDe(hoyISO()), ini: "15:30", fin: "17:30", modId: "bd", aula: "SECRETO_AULA" }];
}

grupo("El profe: qué se le manda de verdad", () => {
  prueba("lo que el aviso promete, está", () => {
    conEstado(() => {
      alumnoDePrueba();
      const c = tutorContexto();
      esperar(c).contiene("BD");                      /* las asignaturas */
      esperar(c).contiene("Bases de Datos");
      esperar(c).contiene("media");                   /* con sus notas */
      esperar(c).contiene("Ejercicios de JOIN");      /* las entregas */
      esperar(c).contiene("Consultas con JOIN");      /* los títulos de los apuntes */
    });
  });

  prueba("el texto de los apuntes NO se manda si no hay ninguno abierto", () => {
    conEstado(() => {
      const antes = apunteActivo;
      try {
        alumnoDePrueba();
        apunteActivo = null;
        esperar(tutorContexto()).noContiene("SECRETO_CUERPO_DEL_APUNTE");
      } finally { apunteActivo = antes; }
    });
  });

  prueba("lo que hay en el casillero NO se manda", () => {
    conEstado(() => {
      alumnoDePrueba();
      const c = tutorContexto();
      esperar(c).noContiene("SECRETO_CONTENIDO_DEL_ARCHIVO");
      esperar(c).noContiene("SECRETO_NOMBRE_DE_ARCHIVO");
    });
  });

  prueba("el vocabulario de inglés NO se manda", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorContexto()).noContiene("SECRETO_PALABRA");
    });
  });

  prueba("el contenido de las tarjetas de repaso NO se manda", () => {
    conEstado(() => {
      alumnoDePrueba();
      const c = tutorContexto();
      esperar(c).noContiene("SECRETO_PREGUNTA");
      esperar(c).noContiene("SECRETO_RESPUESTA");
    });
  });

  prueba("el nombre del centro NO se manda", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorContexto() + tutorInstrucciones()).noContiene("SECRETO_MI_CENTRO");
    });
  });
});

grupo("El profe: lo que sí se manda y el aviso no contaba", () => {
  /* Estos cuatro fallaban cuando se escribieron: el código mandaba más de lo
     que prometía legal/IA.md. Se arreglaron los papeles, no el código, porque
     todo esto le hace falta al profe para ser útil. Si alguien añade algo
     nuevo al contexto, que se acuerde de contarlo también. */

  prueba("el apunte que tengas abierto se manda entero, sin pedirlo", () => {
    conEstado(() => {
      const antes = apunteActivo;
      try {
        alumnoDePrueba();
        apunteActivo = "a1";
        esperar(tutorContexto()).contiene("SECRETO_CUERPO_DEL_APUNTE");
      } finally { apunteActivo = antes; }
    });
  });

  prueba("lo que te cuesta y para qué estudias se le cuentan", () => {
    conEstado(() => {
      alumnoDePrueba();
      const todo = tutorInstrucciones();
      esperar(todo).contiene("SECRETO_LO_QUE_ME_CUESTA");
      esperar(todo).contiene("SECRETO_MI_MOTIVO");
    });
  });

  prueba("si trabajas y cuántas horas estudias, también", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorInstrucciones()).contiene("jornada completa");
      esperar(tutorContexto()).contiene("Ha estudiado");
      esperar(tutorContexto()).contiene("se ha propuesto");
      esperar(tutorContexto()).contiene("puede ponerse");   /* los días fuertes */
    });
  });

  prueba("tu horario de clases, también", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorContexto()).contiene("15:30");
    });
  });

  prueba("las faltas solo cuando ya aprietan", () => {
    conEstado(() => {
      alumnoDePrueba();
      /* con pocas faltas no se mencionan; pasado el 70 % del máximo, sí */
      esperar(tutorContexto()).noContiene("faltas al");
      S.modulos[0].faltas = 27;   /* de 29 que permite el 15 % de 192 horas */
      esperar(tutorContexto()).contiene("faltas al");
    });
  });

  prueba("los objetivos del día y los repasos pendientes, también", () => {
    conEstado(() => {
      alumnoDePrueba();
      const c = tutorContexto();
      esperar(c).contiene("Objetivos de hoy");
      esperar(c).contiene("tarjetas de repaso pendientes");
    });
  });

  prueba("pero del aula solo la hora, no su nombre", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorContexto()).noContiene("SECRETO_AULA");
    });
  });
});

grupo("El profe: sus normas", () => {
  prueba("le dicen de qué curso es especialista", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorInstrucciones()).contiene("Desarrollo de Aplicaciones Web");
    });
  });

  prueba("le prohíben salirse del tema y de lo personal", () => {
    conEstado(() => {
      alumnoDePrueba();
      const i = tutorInstrucciones().toLowerCase();
      esperar(i).contiene("ciclo");
      esperar(/personal|vida|fuera de/.test(i)).cierto();
    });
  });

  prueba("le obligan a decir que es una IA", () => {
    conEstado(() => {
      alumnoDePrueba();
      const i = tutorInstrucciones().toLowerCase();
      esperar(/inteligencia artificial|una ia|soy una m[áa]quina/.test(i)).cierto();
    });
  });

  prueba("le dicen qué hacer si alguien lo está pasando mal", () => {
    conEstado(() => {
      alumnoDePrueba();
      esperar(tutorInstrucciones()).contiene("024");
    });
  });

  prueba("el tono y la caña se respetan", () => {
    conEstado(() => {
      alumnoDePrueba();
      S.perfil.profe.cana = "directo";
      esperar(tutorInstrucciones()).contiene("DIRECTO");
      S.perfil.profe.tono = "exigente";
      esperar(tutorInstrucciones().toLowerCase()).contiene("exigente");
    });
  });
});

grupo("El profe: sin datos, sin romperse", () => {
  prueba("un alumno recién llegado, sin nada puesto", () => {
    conEstado(() => {
      S = estadoInicial();
      S.modulos = []; S.tareas = []; S.apuntes = {};
      esperar(typeof tutorContexto()).igualA("string");
      esperar(typeof tutorInstrucciones()).igualA("string");
    });
  });

  prueba("con el estado lleno de basura tampoco", () => {
    conEstado(() => {
      S.modulos = [{ id: "x" }];
      S.tareas = [{ id: "t", titulo: null, fecha: "fecha rota" }];
      S.apuntes = { a: { id: "a" } };
      try { tutorContexto(); } catch (e) { throw new Error("el contexto se rompe: " + e.message); }
    });
  });

  prueba("el contexto no se dispara de tamaño con mil asignaturas", () => {
    conEstado(() => {
      alumnoDePrueba();
      for (let i = 0; i < 1000; i++) S.modulos.push(moduloDe([[100, 5]], { id: "m" + i, cod: "M" + i }));
      const c = tutorContexto();
      /* mil asignaturas son mucho, pero que no se vaya a megabytes */
      esperar(c.length < 300000).cierto();
    });
  });
});
