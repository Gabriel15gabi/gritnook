/* El estado es lo único que hay. Si se corrompe o si una copia vieja
   no se puede volver a abrir, se pierde un curso entero de trabajo.
   Estos tests son los que protegen los datos de la gente. */

grupo("Estado: empezar de cero", () => {
  prueba("el estado inicial trae todas sus piezas", () => {
    const e = estadoInicial();
    ["config", "modulos", "tareas", "examenes", "apuntes", "casillero", "horas",
     "tarjetas", "vocab", "objetivos", "tutor", "perfil", "horario", "progreso"]
      .forEach(k => { if (e[k] === undefined) throw new Error("falta " + k); });
    esperar(Array.isArray(e.modulos)).cierto();
  });

  prueba("cada asignatura nueva nace con su identificador propio", () => {
    const e = estadoInicial();
    const ids = new Set(e.modulos.map(m => m.id));
    esperar(ids.size).igualA(e.modulos.length);
  });

  prueba("los pesos de la plantilla suman 100", () => {
    const e = estadoInicial();
    e.modulos.forEach(m => {
      const suma = m.pesos.reduce((s, p) => s + num(p.peso), 0);
      if (Math.abs(suma - 100) > 0.01) throw new Error(m.cod + " suma " + suma);
    });
  });
});

grupo("Estado: perfiles a medio hacer", () => {
  prueba("un perfil vacío se rellena solo, sin quejarse", () => {
    conEstado(() => {
      S.perfil = {};
      const p = normalizarPerfil();
      esperar(p.nombre).igualA("");
      esperar(p.horasSemana).igualA(12);
      esperar(p.profe.nombre).igualA("Profe");
    });
  });

  prueba("un perfil que no es ni un objeto no rompe la app", () => {
    conEstado(() => {
      S.perfil = "esto no debería estar aquí";
      esperar(normalizarPerfil().etapa).igualA("");
    });
  });

  prueba("lo que ya estaba puesto no se pisa", () => {
    conEstado(() => {
      S.perfil = { nombre: "Gabriel", horasSemana: 30 };
      const p = normalizarPerfil();
      esperar(p.nombre).igualA("Gabriel");
      esperar(p.horasSemana).igualA(30);
    });
  });

  prueba("un perfil de una versión vieja estrena los campos nuevos", () => {
    /* alguien que entró antes de que existiera la puerta de los 14 años */
    conEstado(() => {
      S.perfil = { nombre: "Antigua", listo: true };
      const p = normalizarPerfil();
      esperar(p.edadOk).falso();
      esperar(p.aceptado).nulo();
    });
  });

  prueba("el tutor se arregla igual", () => {
    conEstado(() => {
      S.tutor = { chat: "esto tampoco debería ser un texto" };
      const t = normalizarTutor();
      esperar(Array.isArray(t.chat)).cierto();
      esperar(Array.isArray(t.repasos)).cierto();
    });
  });
});

grupo("Estado: la copia de seguridad", () => {
  prueba("el estado entero sobrevive a ir y volver de JSON", () => {
    conEstado(() => {
      S.modulos[0].pesos[0].nota = 7.5;
      S.perfil.nombre = "Gabriel";
      const vuelta = JSON.parse(JSON.stringify(S));
      esperar(vuelta.modulos[0].pesos[0].nota).igualA(7.5);
      esperar(vuelta.perfil.nombre).igualA("Gabriel");
    });
  });

  prueba("clonar() devuelve una copia de verdad, no el mismo objeto", () => {
    const a = { lista: [1, 2, 3], dentro: { x: 1 } };
    const b = clonar(a);
    b.dentro.x = 99;
    b.lista.push(4);
    esperar(a.dentro.x).igualA(1);
    esperar(a.lista.length).igualA(3);
  });
});

grupo("Guardar en el navegador", () => {
  prueba("lo que se guarda se lee igual", () => {
    guardaLS("__prueba", { hola: "qué tal", n: 42 });
    esperar(leeLS("__prueba").hola).igualA("qué tal");
    esperar(leeLS("__prueba").n).igualA(42);
    localStorage.removeItem("desk-daw:__prueba");
  });

  prueba("leer algo que no existe da null, no un error", () => {
    esperar(leeLS("__no_existe_ni_de_broma")).nulo();
  });

  prueba("un JSON roto en el navegador no tira la app abajo", () => {
    /* pasa de verdad: una pestaña que se cierra a medio guardar */
    localStorage.setItem("desk-daw:__roto", "{esto no es JSON");
    esperar(leeLS("__roto")).nulo();
    localStorage.removeItem("desk-daw:__roto");
  });
});

grupo("El reparto de horas", () => {
  prueba("las horas de la semana se reparten entre las asignaturas", () => {
    conEstado(() => {
      S.modulos = [
        moduloDe([[100, null]], { id: "a", horas: 100 }),
        moduloDe([[100, null]], { id: "b", horas: 200 })
      ];
      repartirMetas(12);
      const suma = S.modulos.reduce((s, m) => s + m.metaSemanal, 0);
      esperar(suma).entre(10, 14);
      /* la que tiene el doble de horas se lleva más */
      esperar(S.modulos[1].metaSemanal >= S.modulos[0].metaSemanal).cierto();
    });
  });

  prueba("ninguna asignatura se queda en cero horas", () => {
    conEstado(() => {
      S.modulos = [
        moduloDe([[100, null]], { id: "a", horas: 1 }),
        moduloDe([[100, null]], { id: "b", horas: 500 })
      ];
      repartirMetas(4);
      esperar(S.modulos[0].metaSemanal >= 1).cierto();
    });
  });

  prueba("sin asignaturas no revienta", () => {
    conEstado(() => { S.modulos = []; repartirMetas(10); esperar(S.modulos.length).igualA(0); });
  });
});

grupo("El interruptor de la IA", () => {
  prueba("apagado quiere decir apagado", () => {
    conEstado(() => {
      S.config.ia = false;
      esperar(iaApagada()).cierto();
      S.config.ia = true;
      esperar(iaApagada()).falso();
    });
  });

  prueba("si nadie lo ha tocado, está encendido", () => {
    conEstado(() => { delete S.config.ia; esperar(iaApagada()).falso(); });
  });

  prueba("el aviso habla según dónde estés", () => {
    conEstado(() => {
      S.config.ia = false;
      esperar(avisoIA()).contiene("apagado");
      S.config.ia = true;
      /* en los tests no hay Claude, así que toca el texto de la versión pública */
      esperar(avisoIA()).contiene("Esta versión");
    });
  });
});
