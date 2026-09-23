/* Lo que hace falta para usarla de verdad y para dejársela a alguien: que dos
   pestañas no se pisen, que las fechas salten en el calendario del móvil, que
   se avise de las copias y que el informe de fallos no lleve nada personal. */

grupo("Pestañas: dos abiertas a la vez", () => {
  prueba("lo que guarda la otra pestaña llega a esta", () => {
    conEstado(() => {
      const antes = seccion;
      try {
        seccion = "escritorio";
        S.tareas = [];
        const otro = clonar(S);
        otro.tareas = [{ id: "t-otra", titulo: "Entrega desde la otra pestaña", modId: S.modulos[0].id, fecha: hoyISO(), hecha: false }];
        esperar(estadoDeOtraPestana(JSON.stringify(otro))).cierto();
        esperar(S.tareas.length).igualA(1);
        esperar(S.tareas[0].titulo).contiene("otra pestaña");
      } finally { seccion = antes; pinta(); }
    });
  });
  prueba("lo que estás escribiendo ahora mismo no se pisa", () => {
    conEstado(() => {
      const antesSec = seccion, antesAp = apunteActivo;
      try {
        const id = "ap-escribiendo";
        S.apuntes[id] = { id, titulo: "Lo que estoy escribiendo", cuerpo: "MI TEXTO NUEVO", html: "<p>MI TEXTO NUEVO</p>",
          modId: S.modulos[0].id, tags: [], creado: new Date().toISOString(), editado: new Date().toISOString() };
        apunteActivo = id; seccion = "apuntes"; pinta();
        const caja = $("#apCuerpo"); if (caja) caja.focus();          /* así editando() dice que sí */
        const otro = clonar(S);
        otro.apuntes[id].cuerpo = "LO VIEJO DE LA OTRA PESTAÑA";
        otro.apuntes[id].html = "<p>LO VIEJO DE LA OTRA PESTAÑA</p>";
        otro.tareas = [{ id: "t2", titulo: "Algo de la otra", modId: S.modulos[0].id, fecha: hoyISO(), hecha: false }];
        estadoDeOtraPestana(JSON.stringify(otro));
        if (editando()) esperar(S.apuntes[id].cuerpo).igualA("MI TEXTO NUEVO");
        esperar(S.tareas.some(t => t.id === "t2")).cierto();          /* lo demás sí entra */
      } finally { apunteActivo = antesAp; seccion = antesSec; pinta(); }
    });
  });
  prueba("basura o un estado de otra app no se cargan", () => {
    conEstado(() => {
      const marca = S.modulos.length;
      ["", "{", "null", '{"hola":1}', '{"modulos":"texto"}', "[1,2,3]"].forEach(t => esperar(estadoDeOtraPestana(t)).falso());
      esperar(S.modulos.length).igualA(marca);
    });
  });
});

grupo("Calendario: el archivo .ics", () => {
  const conFechas = () => {
    S.modulos = [moduloDe([[100, null]], { id: "m1", cod: "BD", nombre: "Bases de Datos" })];
    S.examenes = [{ id: "e1", modId: "m1", titulo: "Examen de BD", fecha: sumaDias(hoyISO(), 10), hora: "10:00", temas: "Tema 1, 2 y 3", nota: null, plan: [] }];
    S.tareas = [{ id: "t1", modId: "m1", titulo: "Práctica 3", fecha: sumaDias(hoyISO(), 5), hora: "", hecha: false, peso: 20 },
                { id: "t2", modId: "m1", titulo: "Ya entregada", fecha: sumaDias(hoyISO(), 6), hecha: true },
                { id: "t3", modId: "m1", titulo: "De la semana pasada", fecha: sumaDias(hoyISO(), -7), hecha: false }];
  };
  prueba("coge lo que viene, no lo entregado ni lo pasado", () => {
    conEstado(() => {
      conFechas();
      const ev = eventosCalendario();
      esperar(ev.length).igualA(2);
      esperar(ev.map(e => e.titulo).join(" ")).contiene("Práctica 3");
      esperar(ev.map(e => e.titulo).join(" ")).noContiene("Ya entregada");
      esperar(ev.map(e => e.titulo).join(" ")).noContiene("De la semana pasada");
    });
  });
  prueba("un examen con hora sale con hora, y una entrega sin hora ocupa el día", () => {
    conEstado(() => {
      conFechas();
      const ics = textoICS(eventosCalendario());
      esperar(ics).contiene("BEGIN:VCALENDAR");
      esperar(ics).contiene("END:VCALENDAR");
      esperar(ics).contiene("SUMMARY:Examen: Examen de BD");
      esperar(ics).contiene("DTSTART:" + sumaDias(hoyISO(), 10).replace(/-/g, "") + "T100000");
      esperar(ics).contiene("DTSTART;VALUE=DATE:" + sumaDias(hoyISO(), 5).replace(/-/g, ""));
      /* el día entero acaba al día siguiente, que es como se escribe */
      esperar(ics).contiene("DTEND;VALUE=DATE:" + sumaDias(hoyISO(), 6).replace(/-/g, ""));
    });
  });
  prueba("lleva avisos: el día antes, y una hora antes si tiene hora", () => {
    conEstado(() => {
      conFechas();
      const ics = textoICS(eventosCalendario());
      esperar(ics).contiene("TRIGGER:-P1D");
      esperar(ics).contiene("TRIGGER:-PT1H");
      esperar(ics).contiene("TRIGGER:-PT15H");
      esperar((ics.match(/BEGIN:VALARM/g) || []).length).igualA(3);
    });
  });
  prueba("las comas y los puntos y coma de un título no rompen el archivo", () => {
    esperar(escapaICS("Examen: temas 1, 2; y 3")).igualA("Examen: temas 1\\, 2\\; y 3");
    esperar(escapaICS("dos\nlíneas")).igualA("dos\\nlíneas");
    esperar(escapaICS("con \\ barra")).igualA("con \\\\ barra");
    esperar(escapaICS(null)).igualA("");
  });
  prueba("ninguna línea pasa de 75 octetos, ni con tildes ni con emojis", () => {
    conEstado(() => {
      conFechas();
      S.examenes[0].titulo = "Exámen larguísimo de configuración de sistemas 🎓 con acentos y más cosas para pasarse de largo";
      const ics = textoICS(eventosCalendario());
      ics.split("\r\n").forEach(l => {
        const oct = new Blob([l]).size;
        if (oct > 75) throw new Error("línea de " + oct + " octetos: " + l.slice(0, 40));
      });
      /* y al desplegarlo vuelve a salir el título entero */
      const plano = ics.replace(/\r\n /g, "");
      esperar(plano).contiene("configuración de sistemas");
    });
  });
  prueba("al opositor le mete el examen y el plazo de la solicitud", () => {
    conEstado(() => {
      opositorDePrueba();
      S.examenes = []; S.tareas = [];
      S.opo.examen.fecha = sumaDias(hoyISO(), 60);
      S.opo.convocatoria.plazoFin = sumaDias(hoyISO(), 8);
      const ev = eventosCalendario();
      esperar(ev.map(e => e.uid)).contiene("opo-examen");
      esperar(ev.map(e => e.uid)).contiene("opo-plazo");
      /* si ya la presentó, el plazo deja de salir */
      S.opo.convocatoria.presentada = true;
      esperar(eventosCalendario().map(e => e.uid)).noContiene("opo-plazo");
    });
  });
  prueba("sin nada que meter, el archivo sigue siendo válido", () => {
    conEstado(() => {
      S.examenes = []; S.tareas = [];
      const ics = textoICS(eventosCalendario());
      esperar(ics).contiene("BEGIN:VCALENDAR");
      esperar(ics).noContiene("BEGIN:VEVENT");
    });
  });
});

grupo("Copias de seguridad: el recordatorio", () => {
  const sinCopia = () => { localStorage.removeItem("desk-daw:copia"); };
  prueba("se apunta cuándo fue la última", () => {
    conEstado(() => {
      try {
        sinCopia();
        esperar(diasSinCopia()).nulo();
        marcarCopia(sumaDias(hoyISO(), -5));
        esperar(diasSinCopia()).igualA(5);
        marcarCopia();
        esperar(diasSinCopia()).igualA(0);
      } finally { sinCopia(); }
    });
  });
  prueba("avisa a las tres semanas, y no antes", () => {
    conEstado(() => {
      try {
        S.perfil = Object.assign(normalizarPerfil(), { listo: true, creado: sumaDias(hoyISO(), -60) });
        S.tareas = [{ id: "t", titulo: "algo", fecha: hoyISO(), hecha: false }];
        marcarCopia(sumaDias(hoyISO(), -10));
        esperar(tocaRecordarCopia()).falso();
        marcarCopia(sumaDias(hoyISO(), -22));
        esperar(tocaRecordarCopia()).cierto();
      } finally { sinCopia(); }
    });
  });
  prueba("si no ha hecho ninguna, espera a que lleve una semana usándola", () => {
    conEstado(() => {
      try {
        sinCopia();
        S.tareas = [{ id: "t", titulo: "algo", fecha: hoyISO(), hecha: false }];
        S.perfil = Object.assign(normalizarPerfil(), { listo: true, creado: sumaDias(hoyISO(), -2) });
        esperar(tocaRecordarCopia()).falso();
        S.perfil.creado = sumaDias(hoyISO(), -9);
        esperar(tocaRecordarCopia()).cierto();
      } finally { sinCopia(); }
    });
  });
  prueba("«ahora no» lo calla una semana", () => {
    conEstado(() => {
      try {
        S.perfil = Object.assign(normalizarPerfil(), { listo: true, creado: sumaDias(hoyISO(), -60) });
        S.tareas = [{ id: "t", titulo: "algo", fecha: hoyISO(), hecha: false }];
        marcarCopia(sumaDias(hoyISO(), -30));
        esperar(tocaRecordarCopia()).cierto();
        posponerCopia();
        esperar(tocaRecordarCopia()).falso();
        posponerCopia(sumaDias(hoyISO(), -8));
        esperar(tocaRecordarCopia()).cierto();
      } finally { sinCopia(); }
    });
  });
  prueba("sin nada que perder no molesta", () => {
    conEstado(() => {
      try {
        sinCopia();
        S.perfil = Object.assign(normalizarPerfil(), { listo: true, creado: sumaDias(hoyISO(), -60) });
        S.tareas = []; S.examenes = []; S.apuntes = {}; S.horas = {}; S.opo = OPO_DEF();
        esperar(hayCosasQuePerder()).falso();
        esperar(tocaRecordarCopia()).falso();
      } finally { sinCopia(); }
    });
  });
  prueba("la banda sale en Inicio cuando toca", () => {
    conEstado(() => {
      try {
        S.perfil = Object.assign(normalizarPerfil(), { listo: true, creado: sumaDias(hoyISO(), -60) });
        S.tareas = [{ id: "t", titulo: "algo", fecha: hoyISO(), hecha: false }];
        marcarCopia(sumaDias(hoyISO(), -40));
        esperar(vistaEscritorio()).contiene("bcCopia");
        posponerCopia();
        esperar(vistaEscritorio()).noContiene("bcCopia");
      } finally { sinCopia(); }
    });
  });
});

grupo("Contar un fallo: qué se copia", () => {
  prueba("lleva el navegador y los contadores", () => {
    conEstado(() => {
      const i = informeTecnico();
      esperar(i).contiene("GritNook");
      esperar(i).contiene("Navegador:");
      esperar(i).contiene("Datos:");
    });
  });
  prueba("NO lleva tu nombre, ni tus notas, ni tus apuntes", () => {
    conEstado(() => {
      S.perfil = Object.assign(normalizarPerfil(), { nombre: "NOMBRE_SECRETO", ciclo: "CICLO_SECRETO", listo: true });
      S.modulos = [moduloDe([[100, 3.5]], { id: "m1", cod: "SECRETO_COD", nombre: "SECRETO_MODULO" })];
      S.apuntes = { a: { id: "a", titulo: "TITULO_SECRETO", cuerpo: "CUERPO_SECRETO", modId: "m1", tags: [] } };
      const i = informeTecnico();
      ["NOMBRE_SECRETO", "CICLO_SECRETO", "SECRETO_COD", "SECRETO_MODULO", "TITULO_SECRETO", "CUERPO_SECRETO", "3,5"].forEach(x => esperar(i).noContiene(x));
    });
  });
});

grupo("El sitio donde se usa", () => {
  prueba("este navegador no es de los antiguos", () => {
    esperar(navegadorViejo()).falso();
  });
  prueba("sabe si está instalada y si es un iPhone, sin romperse", () => {
    esperar(typeof instalada()).igualA("boolean");
    esperar(typeof enIOS()).igualA("boolean");
  });
  prueba("la versión se enseña en Ajustes", () => {
    conEstado(() => {
      const antes = [seccion, ajTab];
      try {
        seccion = "ajustes"; ajTab = "datos";
        const h = vistaAjustes();
        esperar(h).contiene("GritNook " + VERSION);
        esperar(h).contiene("apFallo");
        esperar(h).contiene("apICS");
      } finally { seccion = antes[0]; ajTab = antes[1]; }
    });
  });
});

grupo("Cómo habla la app", () => {
  prueba("el artículo concuerda con lo que estudies", () => {
    conEstado(() => {
      S.perfil = Object.assign(normalizarPerfil(), { etapa: "ciclo-sup", listo: true });
      esperar(vocArt(true)).igualA("los módulos");
      S.perfil.etapa = "eso";
      esperar(vocArt(true)).igualA("las asignaturas");
      esperar(vocArt(false)).igualA("la asignatura");
      esperar(vocArt(true, true)).igualA("Las asignaturas");
      S.perfil.etapa = "oposicion";
      esperar(vocArt(true)).igualA("los bloques");
    });
  });
  prueba("y en Ajustes no sale «las módulos»", () => {
    conEstado(() => {
      const antes = [seccion, ajTab];
      try {
        S.perfil = Object.assign(normalizarPerfil(), { etapa: "ciclo-sup", listo: true });
        seccion = "ajustes"; ajTab = "datos";
        const h = vistaAjustes();
        esperar(h).contiene("los módulos");
        esperar(h).noContiene("las módulos");
      } finally { seccion = antes[0]; ajTab = antes[1]; }
    });
  });
});
