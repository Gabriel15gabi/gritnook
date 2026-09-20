/* La libreta es la parte con más código y la que más se usa. Aquí se
   prueba la geometría: simplificar trazos, la goma que corta por donde
   pasa, el imán a la cuadrícula y el deshacer. */

const trazo = (puntos, extra = {}) => Object.assign({ t: "boli", c: "#1D2126", w: 2, p: puntos }, extra);

grupo("Libreta: simplificar el trazo", () => {
  prueba("una línea recta de cien puntos se queda en dos", () => {
    /* Ramer-Douglas-Peucker: los puntos de en medio no aportan nada */
    const p = [];
    for (let i = 0; i <= 100; i++) p.push(i * 5, 100);
    const s = lbSimplificar(p, 1);
    esperar(s.length).igualA(4);
    esperar(s[0]).igualA(0);
    esperar(s[s.length - 2]).igualA(500);
  });

  prueba("una curva no se convierte en una recta", () => {
    const p = [];
    for (let i = 0; i <= 100; i++) p.push(i * 5, 100 + Math.sin(i / 8) * 60);
    const s = lbSimplificar(p, 1);
    esperar(s.length > 10).cierto();
    esperar(s.length < p.length).cierto();
  });

  prueba("los extremos nunca se pierden", () => {
    const p = [10, 10, 50, 12, 90, 11, 130, 10];
    const s = lbSimplificar(p, 5);
    esperar(s[0]).igualA(10);
    esperar(s[1]).igualA(10);
    esperar(s[s.length - 2]).igualA(130);
  });

  prueba("un trazo de dos puntos se queda igual", () => {
    esperar(lbSimplificar([5, 5, 40, 40], 2).length).igualA(4);
  });

  prueba("un punto suelto no rompe nada", () => {
    esperar(lbSimplificar([7, 7], 2).length).igualA(2);
  });

  prueba("un trazo de diez mil puntos no se queda colgado", () => {
    const p = [];
    for (let i = 0; i < 10000; i++) p.push(i % 800, (i * 7) % 1000);
    const t0 = performance.now();
    const s = lbSimplificar(p, 2);
    esperar(performance.now() - t0 < 2000).cierto();
    esperar(s.length > 0).cierto();
  });
});

grupo("Libreta: la goma corta, no borra entero", () => {
  prueba("pasar la goma por el medio parte el trazo en dos", () => {
    const t = trazo([0, 100, 200, 100]);
    const trozos = lbCortar(t, 100, 100, 10);
    esperar(Array.isArray(trozos)).cierto();
    esperar(trozos.length).igualA(2);
  });

  prueba("si la goma no toca, el trazo se queda entero", () => {
    const t = trazo([0, 100, 200, 100]);
    esperar(lbCortar(t, 100, 500, 10)).nulo();
  });

  prueba("un punto suelto tocado desaparece", () => {
    const t = trazo([50, 50]);
    esperar(lbCortar(t, 50, 50, 10)).igualA([]);
  });

  prueba("cortar por una punta deja un solo trozo", () => {
    const t = trazo([0, 100, 200, 100]);
    const trozos = lbCortar(t, 0, 100, 12);
    esperar(trozos.length).igualA(1);
  });

  prueba("lo que sobrevive conserva color y grosor", () => {
    const t = trazo([0, 100, 200, 100], { c: "#D94F4F", w: 4.5, t: "rotu" });
    const trozos = lbCortar(t, 100, 100, 10);
    esperar(trozos[0].c).igualA("#D94F4F");
    esperar(trozos[0].w).igualA(4.5);
  });

  prueba("una goma enorme se lleva el trazo entero", () => {
    const t = trazo([0, 100, 200, 100]);
    esperar(lbCortar(t, 100, 100, 400).length).igualA(0);
  });
});

grupo("Libreta: saber si la goma toca", () => {
  prueba("encima del trazo, sí", () => {
    esperar(lbToca(trazo([0, 0, 100, 0]), 50, 0, 3)).cierto();
  });
  prueba("lejos, no", () => {
    esperar(lbToca(trazo([0, 0, 100, 0]), 50, 400, 3)).falso();
  });
  prueba("un rectángulo se toca por su borde, no por dentro", () => {
    const r = trazo([0, 0, 100, 100], { t: "rect" });
    esperar(lbToca(r, 0, 50, 3)).cierto();
    esperar(lbToca(r, 50, 50, 3)).falso();
  });
});

grupo("Libreta: el imán a la cuadrícula", () => {
  prueba("cada punto se va al cuadro más cercano", () => {
    esperar(lbImanV(0)).igualA(0);
    esperar(lbImanV(11)).igualA(0);
    esperar(lbImanV(13)).igualA(LB_CUADRO);
    esperar(lbImanV(LB_CUADRO * 3 + 2)).igualA(LB_CUADRO * 3);
  });
  prueba("los negativos también", () => {
    esperar(lbImanV(-13)).igualA(-LB_CUADRO);
  });
});

grupo("Libreta: formas", () => {
  prueba("un rectángulo se dibuja con sus cuatro esquinas", () => {
    const q = lbPoligonal(trazo([0, 0, 100, 50], { t: "rect" }));
    esperar(q.length).igualA(10);      /* cinco puntos: vuelve al principio */
  });
  prueba("un círculo sale con puntos suficientes para verse redondo", () => {
    const q = lbPoligonal(trazo([0, 0, 100, 100], { t: "elipse" }));
    esperar(q.length).igualA(66);
  });
  prueba("un trazo a mano se queda como está", () => {
    const p = [1, 2, 3, 4, 5, 6];
    esperar(lbPoligonal(trazo(p))).igualA(p);
  });
});

grupo("Libreta: deshacer y rehacer", () => {
  prueba("deshacer quita el último trazo y rehacer lo devuelve", () => {
    const antes = LB.trazos, antesHist = LB.hist, antesNota = LB.nota;
    try {
      LB.nota = "prueba"; LB.hist = {}; LB.trazos = [];
      const t = trazo([0, 0, 10, 10]);
      LB.trazos.push(t);
      lbHist().deshacer.push({ tipo: "add", trazo: t });
      lbDeshacer();
      esperar(LB.trazos.length).igualA(0);
      lbRehacer();
      esperar(LB.trazos.length).igualA(1);
    } finally { LB.trazos = antes; LB.hist = antesHist; LB.nota = antesNota; }
  });

  prueba("deshacer sin nada que deshacer no rompe", () => {
    const antes = LB.hist, antesNota = LB.nota;
    try { LB.nota = "vacia"; LB.hist = {}; lbDeshacer(); lbRehacer(); }
    finally { LB.hist = antes; LB.nota = antesNota; }
  });

  prueba("cada apunte tiene su propio historial", () => {
    const antes = LB.hist, antesNota = LB.nota;
    try {
      LB.hist = {};
      LB.nota = "uno"; lbHist().deshacer.push({ tipo: "add", trazo: trazo([0, 0]) });
      LB.nota = "dos";
      esperar(lbHist().deshacer.length).igualA(0);
      LB.nota = "uno";
      esperar(lbHist().deshacer.length).igualA(1);
    } finally { LB.hist = antes; LB.nota = antesNota; }
  });
});

grupo("Libreta: las herramientas", () => {
  prueba("todas tienen tres grosores", () => {
    Object.entries(LB_HERR).forEach(([k, h]) => {
      if (h.grosores.length !== 3) throw new Error(k + " tiene " + h.grosores.length);
    });
  });
  prueba("el subrayador es más gordo que el bolígrafo", () => {
    esperar(LB_HERR.fluor.grosores[0] > LB_HERR.boli.grosores[2]).cierto();
  });
  prueba("hay doce subrayadores pastel y diez tintas", () => {
    esperar(LB_MARCAS.length).igualA(12);
    esperar(LB_TINTAS.length).igualA(10);
  });
  prueba("ningún color se repite", () => {
    const hex = LB_MARCAS.map(m => m[1].toLowerCase());
    esperar(new Set(hex).size).igualA(hex.length);
  });
});
