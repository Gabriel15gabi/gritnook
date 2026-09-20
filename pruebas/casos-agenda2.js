/* La agenda por dentro: mover cosas entre columnas del tablero, cambiar
   fechas arrastrando en el calendario y convertir una entrega en examen
   sin perder nada por el camino. */

const entregaDe = (extra = {}) => Object.assign({ id: uid(), titulo: "Práctica de Java", modId: "", fecha: sumaDias(hoyISO(), 3), hora: "", peso: 10, hecha: false, creado: new Date().toISOString() }, extra);
const examenDe = (extra = {}) => Object.assign({ id: uid(), titulo: "Examen de BD", modId: "", fecha: sumaDias(hoyISO(), 5), hora: "09:00", plan: [], temas: "", creado: new Date().toISOString() }, extra);

grupo("Agenda: las tres columnas del tablero", () => {
  prueba("todo empieza en pendiente", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      esperar(elementos()[0].estado).igualA("pendiente");
    });
  });

  prueba("mover una tarjeta a «en curso» la cambia de columna", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      const el = elementos()[0];
      ponEstado(el, "curso");
      esperar(elementos()[0].estado).igualA("curso");
      esperar(S.tareas[0].hecha).falso();
    });
  });

  prueba("moverla a «hecho» la marca como hecha y apunta el día", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      ponEstado(elementos()[0], "hecha");
      esperar(S.tareas[0].hecha).cierto();
      esperar(S.tareas[0].hechaEn).igualA(hoyISO());
    });
  });

  prueba("sacarla de «hecho» la desmarca y borra el día", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      ponEstado(elementos()[0], "hecha");
      ponEstado(elementos()[0], "pendiente");
      esperar(S.tareas[0].hecha).falso();
      esperar(S.tareas[0].hechaEn).igualA("");
    });
  });

  prueba("las tres columnas son las que son", () => {
    esperar(ESTADOS.map(e => e[0])).igualA(["pendiente", "curso", "hecha"]);
  });

  prueba("cada tarjeta cae en una sola columna", () => {
    conEstado(() => {
      S.tareas = [entregaDe(), entregaDe(), entregaDe()];
      S.examenes = [examenDe()];
      ponEstado(elementos()[0], "curso");
      ponEstado(elementos()[1], "hecha");
      const porColumna = {};
      ESTADOS.forEach(([k]) => { porColumna[k] = elementos().filter(e => e.estado === k).length; });
      esperar(porColumna.pendiente + porColumna.curso + porColumna.hecha).igualA(4);
      esperar(porColumna.curso).igualA(1);
      esperar(porColumna.hecha).igualA(1);
    });
  });
});

grupo("Agenda: mover de día", () => {
  prueba("arrastrar a otro día le cambia la fecha", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      const nueva = sumaDias(hoyISO(), 10);
      ponFecha(elementos()[0], nueva);
      esperar(S.tareas[0].fecha).igualA(nueva);
    });
  });

  prueba("se puede mover al pasado, que a veces se apunta tarde", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      const ayer = sumaDias(hoyISO(), -1);
      ponFecha(elementos()[0], ayer);
      esperar(S.tareas[0].fecha).igualA(ayer);
    });
  });

  prueba("quitarle la fecha la deja sin fecha, no rota", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      ponFecha(elementos()[0], "");
      esperar(elementos()[0].fecha).igualA("");
      esperar(() => elementos()).distintoDe(undefined);
    });
  });

  prueba("las que no tienen fecha van al final de la lista", () => {
    conEstado(() => {
      S.tareas = [entregaDe({ fecha: "" }), entregaDe({ fecha: sumaDias(hoyISO(), 1) })];
      S.examenes = [];
      const pend = S.tareas.filter(t => !t.hecha).sort((a, b) => (a.fecha || "9999").localeCompare(b.fecha || "9999"));
      esperar(pend[0].fecha).distintoDe("");
      esperar(pend[1].fecha).igualA("");
    });
  });
});

grupo("Agenda: de entrega a examen y al revés", () => {
  prueba("convertir una entrega en examen conserva lo común", () => {
    conEstado(() => {
      S.tareas = [entregaDe({ titulo: "Trabajo de BD", notas: "Entra el tema 4" })];
      S.examenes = [];
      const fecha = S.tareas[0].fecha;
      cambiarTipo(elementos()[0], "examen");
      esperar(S.tareas.length).igualA(0);
      esperar(S.examenes.length).igualA(1);
      esperar(S.examenes[0].titulo).igualA("Trabajo de BD");
      esperar(S.examenes[0].fecha).igualA(fecha);
      esperar(S.examenes[0].temas).igualA("Entra el tema 4");
    });
  });

  prueba("y al revés, las notas vuelven a su sitio", () => {
    conEstado(() => {
      S.tareas = [];
      S.examenes = [examenDe({ titulo: "Examen de SI", temas: "Particiones y permisos" })];
      cambiarTipo(elementos()[0], "entrega");
      esperar(S.examenes.length).igualA(0);
      esperar(S.tareas.length).igualA(1);
      esperar(S.tareas[0].notas).igualA("Particiones y permisos");
    });
  });

  prueba("convertir a lo que ya es no hace nada", () => {
    conEstado(() => {
      S.tareas = [entregaDe()]; S.examenes = [];
      const antes = S.tareas[0].id;
      cambiarTipo(elementos()[0], "entrega");
      esperar(S.tareas.length).igualA(1);
      esperar(S.tareas[0].id).igualA(antes);
    });
  });
});

grupo("Agenda: crear escribiendo", () => {
  prueba("una frase se convierte en una entrega con su fecha", () => {
    conEstado(() => {
      S.tareas = []; S.examenes = [];
      const e = entenderFrase("entregar la práctica de Java el 5 de octubre", hoyISO());
      const r = crearElemento({ tipo: e.tipo, titulo: "Práctica de Java", modId: e.modId, fecha: e.fecha, hora: e.hora });
      esperar(r.tipo).igualA("entrega");
      esperar(S.tareas.length).igualA(1);
      esperar(S.tareas[0].fecha).igualA(e.fecha);
    });
  });

  prueba("si dice examen, se crea un examen con su plan vacío", () => {
    conEstado(() => {
      S.tareas = []; S.examenes = [];
      const r = crearElemento({ tipo: "examen", titulo: "Examen de BD", modId: "", fecha: sumaDias(hoyISO(), 7), hora: "09:00" });
      esperar(r.tipo).igualA("examen");
      esperar(Array.isArray(S.examenes[0].plan)).cierto();
    });
  });

  prueba("un título vacío no crea algo sin nombre", () => {
    conEstado(() => {
      S.tareas = []; S.examenes = [];
      crearElemento({ tipo: "entrega", titulo: "", modId: "", fecha: "" });
      esperar(S.tareas[0].titulo.length > 0).cierto();
    });
  });

  prueba("un título larguísimo se recorta", () => {
    conEstado(() => {
      S.tareas = []; S.examenes = [];
      crearElemento({ tipo: "entrega", titulo: "a".repeat(500), modId: "", fecha: "" });
      esperar(S.tareas[0].titulo.length <= 120).cierto();
    });
  });
});

grupo("Agenda: los exámenes que vienen", () => {
  prueba("solo salen los que no han pasado y no están hechos", () => {
    conEstado(() => {
      S.tareas = [];
      S.examenes = [
        examenDe({ titulo: "Ya pasó", fecha: sumaDias(hoyISO(), -3) }),
        examenDe({ titulo: "El que viene", fecha: sumaDias(hoyISO(), 4) })
      ];
      const p = examenesPendientes();
      esperar(p.length).igualA(1);
      esperar(p[0].titulo).igualA("El que viene");
    });
  });

  prueba("salen ordenados por fecha, el más cercano primero", () => {
    conEstado(() => {
      S.tareas = [];
      S.examenes = [
        examenDe({ titulo: "Lejos", fecha: sumaDias(hoyISO(), 20) }),
        examenDe({ titulo: "Cerca", fecha: sumaDias(hoyISO(), 2) })
      ];
      esperar(examenesPendientes()[0].titulo).igualA("Cerca");
    });
  });

  prueba("el de hoy todavía cuenta", () => {
    conEstado(() => {
      S.tareas = [];
      S.examenes = [examenDe({ titulo: "Hoy mismo", fecha: hoyISO() })];
      esperar(examenesPendientes().length).igualA(1);
    });
  });
});
