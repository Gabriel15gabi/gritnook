/* El Inicio en piezas: mover, estirar, ocultar y ordenar. Lo que no puede
   pasar nunca es que un panel quede encima de otro o fuera de la rejilla, ni
   que quien no toque nada vea su Inicio cambiado. */

const pieza = (id, x, y, w, h) => ({ id, x, y, w, h });
const solapes = lista => {
  const v = lista.filter(i => !i.oculto); let n = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (chocan(v[i], v[j])) n++;
  return n;
};
/* editar el Inicio sin dejar rastro: sección, modo edición y arrastre como estaban */
const enInicio = fn => conEstado(() => {
  const antes = { seccion, ilEditando };
  try { seccion = "escritorio"; return fn(); }
  finally { IL = null; ilEditando = antes.ilEditando; seccion = antes.seccion; pinta(); }
});

grupo("Inicio: las cuentas de la rejilla", () => {
  prueba("dos piezas chocan si se pisan, y no si solo se tocan", () => {
    esperar(chocan(pieza("a", 0, 0, 6, 10), pieza("b", 5, 5, 6, 10))).cierto();
    esperar(chocan(pieza("a", 0, 0, 6, 10), pieza("b", 6, 0, 6, 10))).falso();
    esperar(chocan(pieza("a", 0, 0, 6, 10), pieza("b", 0, 10, 6, 10))).falso();
  });
  prueba("ninguna pieza se sale de la rejilla ni baja de su mínimo", () => {
    const it = limitarWidget(pieza("sesion", 11, -5, 9, 2));
    esperar(it.w).igualA(9);
    esperar(it.x).igualA(3);                                   /* 3 + 9 = 12, justo el borde */
    esperar(it.y).igualA(0);
    esperar(it.h).igualA(WIDGETS.sesion.minH);
    esperar(limitarWidget(pieza("nota", 0, 0, 1, 1)).w).igualA(WIDGETS.nota.minW);
    esperar(limitarWidget(pieza("hoy", 0, 0, 40, 9999)).w).igualA(12);
  });
  prueba("la que mueves se queda donde la dejas y las demás se apartan hacia abajo", () => {
    const L = [pieza("objetivos", 0, 0, 12, 20), pieza("hoy", 0, 20, 12, 20), pieza("nota", 0, 40, 6, 10)];
    moverWidget(L, "nota", 0, 5);
    const nota = L.find(i => i.id === "nota");
    esperar([nota.x, nota.y]).igualA([0, 5]);
    esperar(solapes(L)).igualA(0);
  });
  prueba("al llevar una hacia abajo por encima de otra, la otra sube a su hueco", () => {
    const L = [pieza("objetivos", 0, 0, 12, 20), pieza("hoy", 0, 20, 12, 20)];
    moverWidget(L, "objetivos", 0, 24);
    esperar(L.find(i => i.id === "hoy").y).igualA(4);
    esperar(L.find(i => i.id === "objetivos").y).igualA(24);
    esperar(solapes(L)).igualA(0);
  });
  prueba("los huecos que dejas se quedan: es libre", () => {
    const L = [pieza("objetivos", 0, 0, 12, 20), pieza("hoy", 0, 60, 12, 20)];
    colocar(L, null);
    esperar(L.find(i => i.id === "hoy").y).igualA(60);
  });
  prueba("«juntar huecos» los recoge sin cambiar el orden", () => {
    const L = [pieza("objetivos", 0, 10, 12, 20), pieza("hoy", 0, 60, 12, 20), pieza("nota", 0, 100, 6, 12)];
    juntar(L);
    esperar(L.map(i => i.y)).igualA([0, 20, 40]);
    esperar(ordenLectura(L)).igualA(["objetivos", "hoy", "nota"]);
  });
  prueba("mil disposiciones al azar: nunca queda nada encima de nada", () => {
    const ids = Object.keys(WIDGETS);
    for (let k = 0; k < 1000; k++) {
      const L = ids.map(id => limitarWidget(pieza(id, azarEntero(12), azarEntero(80), 2 + azarEntero(11), 12 + azarEntero(40))));
      const movida = L[azarEntero(L.length)], x = azarEntero(12), y = azarEntero(90);
      moverWidget(L, movida.id, x, y);
      if (solapes(L)) throw new Error("solape en la vuelta " + k + ": " + JSON.stringify(L));
      if (L.some(i => i.x < 0 || i.x + i.w > 12 || i.y < 0)) throw new Error("fuera de la rejilla en la vuelta " + k);
      const m = L.find(i => i.id === movida.id);
      if (m.y !== clamp(y, 0, 4000) || m.x !== clamp(x, 0, 12 - m.w)) throw new Error("la movida no se quedó donde se dejó en la vuelta " + k);
    }
  });
  prueba("estirar respeta el borde y los mínimos, y aparta a las de abajo", () => {
    const L = [pieza("hoy", 6, 0, 6, 20), pieza("nota", 6, 20, 6, 12)];
    estirarWidget(L, "hoy", 20, 30);
    const hoy = L.find(i => i.id === "hoy");
    esperar(hoy.x + hoy.w).igualA(12);
    esperar(hoy.h).igualA(30);
    esperar(L.find(i => i.id === "nota").y).igualA(30);
    estirarWidget(L, "hoy", 1, 1);
    esperar([hoy.w, hoy.h]).igualA([WIDGETS.hoy.minW, WIDGETS.hoy.minH]);
  });
});

grupo("Inicio: el móvil lleva su propio orden", () => {
  prueba("mover un puesto es un puesto, aunque en el ordenador compartan fila", () => {
    conEstado(() => {
      S.inicio = { lg: [pieza("objetivos", 0, 0, 12, 20), pieza("hoy", 0, 20, 6, 20), pieza("sesion", 6, 20, 6, 20), pieza("semana", 0, 40, 12, 20)], ocultos: [] };
      const base = ordenMovil(listaInicio());
      esperar(base.slice(0, 4)).igualA(["objetivos", "hoy", "sesion", "semana"]);
      moverEnMovil("objetivos", 1);
      esperar(ordenMovil(listaInicio()).slice(0, 3)).igualA(["hoy", "objetivos", "sesion"]);
    });
  });
  prueba("ordenar en el móvil no descoloca el ordenador", () => {
    conEstado(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: [] };
      normalizarInicio();
      const antes = JSON.stringify(S.inicio.lg);
      moverEnMovil("hoy", -1); moverEnMovil("nota", -1);
      esperar(JSON.stringify(S.inicio.lg)).igualA(antes);
    });
  });
  prueba("en los extremos no hace nada raro", () => {
    esperar(moverEnOrden(["a", "b", "c"], "a", -1)).igualA(["a", "b", "c"]);
    esperar(moverEnOrden(["a", "b", "c"], "c", 1)).igualA(["a", "b", "c"]);
    esperar(moverEnOrden(["a", "b", "c"], "z", 1)).igualA(["a", "b", "c"]);
  });
  prueba("un panel nuevo, o uno que vuelves a mostrar, aparece aunque el orden del móvil no lo tuviera", () => {
    conEstado(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: [], orden: ["nota", "hoy"] };
      const o = ordenMovil(listaInicio());
      esperar(o.slice(0, 2)).igualA(["nota", "hoy"]);
      esperar(o).contiene("objetivos");
      esperar(o.length).igualA(ordenLectura(listaInicio()).length);
    });
  });
});

grupo("Inicio: lo guardado, de cualquier manera", () => {
  prueba("sin tocar nada, no hay nada guardado y el Inicio es el de siempre", () => {
    esperar(estadoInicial().inicio).nulo();
    esperar(DOCS.inicio).igualA(["inicio"]);
    enInicio(() => {
      S.inicio = null;
      const h = vistaEscritorio();
      esperar(h).contiene("rejilla-12");
      esperar(h).noContiene("il-rejilla");
      esperar(h).contiene('data-widget="objetivos"');
    });
  });
  prueba("basura, o un Inicio de otra app, se descarta", () => {
    conEstado(() => {
      ["texto", 42, [], { lg: "no" }, { hola: 1 }, null].forEach(v => { S.inicio = v; esperar(normalizarInicio()).nulo(); });
    });
  });
  prueba("piezas que no existen o repetidas se quitan; las que faltan se añaden al final", () => {
    conEstado(() => {
      S.inicio = { lg: [pieza("hoy", 0, 0, 12, 20), pieza("hoy", 0, 40, 6, 20), pieza("inventada", 0, 0, 3, 3), null, "x"], ocultos: ["nota", "fantasma"] };
      const I = normalizarInicio();
      esperar(I.lg.filter(i => i.id === "hoy").length).igualA(1);
      esperar(I.lg.some(i => i.id === "inventada")).falso();
      esperar(I.lg.map(i => i.id).sort()).igualA(Object.keys(WIDGETS).sort());
      esperar(I.ocultos).igualA(["nota"]);
      esperar(I.lg.find(i => i.id === "objetivos").y >= 20).cierto();
    });
  });
  prueba("un Inicio guardado con piezas montadas se arregla solo", () => {
    conEstado(() => {
      S.inicio = { lg: Object.keys(WIDGETS).map(id => pieza(id, 0, 0, 12, 20)), ocultos: [] };
      esperar(solapes(listaInicio())).igualA(0);
    });
  });
  prueba("la oposición solo cuenta si opositas", () => {
    conEstado(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: [] };
      S.perfil = Object.assign(normalizarPerfil(), { etapa: "ciclo-sup" });
      esperar(listaInicio().find(i => i.id === "oposicion").oculto).cierto();
      esperar(ordenLectura(listaInicio())).noContiene("oposicion");
    });
  });
});

grupo("Inicio: pintarlo", () => {
  prueba("con un Inicio a tu manera, cada panel en su sitio de la rejilla", () => {
    enInicio(() => {
      S.inicio = { lg: [pieza("objetivos", 0, 0, 12, 30), pieza("sesion", 7, 30, 5, 38)], ocultos: [] };
      const h = vistaEscritorio();
      esperar(h).contiene("il-rejilla");
      esperar(h).contiene('data-w="sesion" style="--x:8;--w:5;--y:31;--h:38');
    });
  });
  prueba("lo oculto no se pinta, y editando sale para volver a ponerlo", () => {
    enInicio(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: ["modulos"] };
      esperar(vistaEscritorio()).noContiene('data-w="modulos"');
      ilEditando = true;
      const h = vistaEscritorio();
      esperar(h).contiene('data-il-mostrar="modulos"');
      esperar(h).contiene('data-il-grip="hoy"');
      esperar(h).contiene("ilListo");
    });
  });
  prueba("el título de las asignaturas habla como el resto de la app", () => {
    enInicio(() => {
      S.perfil = Object.assign(normalizarPerfil(), { etapa: "eso", listo: true });
      esperar(vistaEscritorio()).contiene("Estado de las asignaturas");
      S.perfil.etapa = "ciclo-sup";
      esperar(vistaEscritorio()).contiene("Estado de los módulos");
    });
  });
  prueba("la primera vez que editas, se mide el Inicio tal y como se ve", () => {
    enInicio(() => {
      S.inicio = null; ilEditando = false; pinta();
      empezarAEditar();
      esperar(ilEditando).cierto();
      const L = listaInicio();
      esperar(solapes(L)).igualA(0);
      const obj = L.find(i => i.id === "objetivos"), ses = L.find(i => i.id === "sesion"), sem = L.find(i => i.id === "semana");
      esperar([obj.x, obj.w]).igualA([0, 12]);
      esperar(ses.x + ses.w <= sem.x).cierto();                  /* sesión a la izquierda de la semana, como se ve */
      esperar(ses.y).igualA(sem.y);
    });
  });
  prueba("«volver al original» lo deja como si no se hubiera tocado", () => {
    enInicio(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: ["nota"], orden: ["hoy"] };
      ilEditando = true;
      volverAlOriginal();
      esperar(S.inicio).nulo();
      esperar(ilEditando).falso();
      esperar(vistaEscritorio()).contiene("rejilla-12");
    });
  });
  prueba("si te vas del Inicio a medio editar, se da por terminado", () => {
    enInicio(() => {
      S.inicio = { lg: layoutPorDefecto(), ocultos: [] };
      ilEditando = true; seccion = "entregas"; pinta();
      esperar(ilEditando).falso();
    });
  });
});

grupo("Inicio: con el ratón y con el teclado", () => {
  const preparar = () => {
    S.inicio = { lg: [pieza("objetivos", 0, 0, 12, 30), pieza("sesion", 0, 30, 5, 38), pieza("semana", 5, 30, 7, 38)], ocultos: ["hoy", "proximo", "nota", "modulos"] };
    ilEditando = true; pinta();
    if (ilEstrecho()) saltar("la ventana de pruebas es demasiado estrecha para la rejilla");
  };
  const puntero = (el, tipo, x, y) => el.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, button: 0, isPrimary: true }));
  prueba("arrastrar por el nombre lo mueve: dos columnas a la derecha y diez filas abajo", () => {
    enInicio(() => {
      preparar();
      const g = document.querySelector('[data-il-grip="sesion"]'), r = g.getBoundingClientRect();
      const rej = document.querySelector(".il-rejilla").getBoundingClientRect();
      const paso = (rej.width - 11 * 16) / 12 + 16;
      puntero(g, "pointerdown", r.left + 10, r.top + 10);
      puntero(g, "pointermove", r.left + 10 + paso * 2, r.top + 10 + 80);
      esperar(document.querySelector(".il-hueco") !== null).cierto();   /* el recuadro de dónde va a caer */
      puntero(g, "pointerup", r.left + 10 + paso * 2, r.top + 10 + 80);
      const s = S.inicio.lg.find(i => i.id === "sesion");
      esperar([s.x, s.y]).igualA([2, 40]);
      esperar(solapes(listaInicio())).igualA(0);
      esperar(document.querySelector(".il-hueco")).nulo();
    });
  });
  prueba("estirar por la esquina le da una columna más", () => {
    enInicio(() => {
      preparar();
      S.inicio.lg = [pieza("objetivos", 0, 0, 12, 30), pieza("sesion", 0, 30, 5, 38)]; pinta();
      const c = document.querySelector('[data-il-estirar="sesion"]'), r = c.getBoundingClientRect();
      const rej = document.querySelector(".il-rejilla").getBoundingClientRect();
      const paso = (rej.width - 11 * 16) / 12 + 16;
      puntero(c, "pointerdown", r.left + 5, r.top + 5);
      puntero(c, "pointermove", r.left + 5 + paso, r.top + 5 + 16);
      puntero(c, "pointerup", r.left + 5 + paso, r.top + 5 + 16);
      const s = S.inicio.lg.find(i => i.id === "sesion");
      esperar([s.w, s.h]).igualA([6, 40]);
    });
  });
  prueba("sin estar editando, arrastrar no hace nada", () => {
    enInicio(() => {
      preparar(); ilEditando = false; pinta();
      esperar(document.querySelector("[data-il-grip]")).nulo();
    });
  });
  prueba("con el teclado: flechas para mover, Mayúsculas y flechas para el tamaño", () => {
    enInicio(() => {
      preparar();
      let g = document.querySelector('[data-il-grip="semana"]'); g.focus();
      g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      esperar(S.inicio.lg.find(i => i.id === "semana").x).igualA(4);
      g = document.querySelector('[data-il-grip="semana"]');
      g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, bubbles: true }));
      esperar(S.inicio.lg.find(i => i.id === "semana").h).igualA(42);
      esperar(document.activeElement && document.activeElement.dataset.ilGrip).igualA("semana");
      esperar($("#ilVoz").textContent).contiene("Esta semana");
    });
  });
  prueba("ocultar y volver a mostrar, sin que nada quede encima de nada", () => {
    enInicio(() => {
      preparar();
      document.querySelector('[data-il-ocultar="semana"]').click();
      esperar(S.inicio.ocultos).contiene("semana");
      esperar(document.querySelector('.il-w[data-w="semana"]')).nulo();
      document.querySelector('[data-il-mostrar="semana"]').click();
      esperar(S.inicio.ocultos).noContiene("semana");
      esperar(document.querySelector('.il-w[data-w="semana"]') !== null).cierto();
      esperar(solapes(listaInicio())).igualA(0);
    });
  });
});

grupo("Inicio: datos absurdos", () => {
  const BASURA_IL = [undefined, null, NaN, Infinity, -Infinity, -1, 1e308, "", "abc", "12", [], {}, [1, 2], true, "<script>alert(1)</script>", "a".repeat(5000)];
  prueba("cualquier cosa en cualquier campo acaba en una rejilla válida", () => {
    enInicio(() => {
      BASURA_IL.forEach(v => {
        S.inicio = { lg: Object.keys(WIDGETS).map(id => ({ id, x: v, y: v, w: v, h: v })), ocultos: v, orden: v };
        const L = listaInicio();
        if (!L || solapes(L)) throw new Error("se rompe con " + String(v).slice(0, 20));
        if (L.some(i => !Number.isFinite(i.x) || !Number.isFinite(i.y) || i.x + i.w > 12 || i.w < 1)) throw new Error("fuera de la rejilla con " + String(v).slice(0, 20));
        vistaEscritorio(); ilEditando = true; vistaEscritorio(); ilEditando = false;
      });
    });
  });
  prueba("un identificador con HTML dentro no llega a la página", () => {
    enInicio(() => {
      S.inicio = { lg: [{ id: '"><img src=x onerror=alert(1)>', x: 0, y: 0, w: 6, h: 20 }], ocultos: ['"><b>'], orden: ['"><i>'] };
      ilEditando = true;
      const h = vistaEscritorio();
      esperar(h).noContiene("onerror");
      esperar(h).noContiene('"><b>');
    });
  });
});
