/* Dibujar de verdad: se monta la hoja, se mueve un puntero por encima y
   se comprueba qué queda guardado. Es lo más parecido a coger el ratón
   que se puede hacer sin coger el ratón. */

const puntero = (tipo, x, y, extra = {}) => new PointerEvent(tipo, Object.assign({
  bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", button: 0, buttons: tipo === "pointerup" ? 0 : 1,
  clientX: x, clientY: y
}, extra));

/* abre un apunte de verdad con su lienzo montado, y lo deja como estaba */
async function enLaHoja(fn) {
  const antes = JSON.parse(JSON.stringify(S)), antesAp = apunteActivo, antesSec = seccion;
  const id = uid();
  try {
    S.apuntes[id] = { id, titulo: "Para dibujar", modId: "", html: "<div>x</div>", cuerpo: "x", dibujos: [], papel: "cuadricula", letra: "normal", creado: hoyISO(), editado: new Date().toISOString() };
    apunteActivo = id; seccion = "apuntes"; pinta();
    await new Promise(r => setTimeout(r, 350));
    if (!LB.viva) throw new Error("el lienzo no se ha montado");
    return await fn(id);
  } finally {
    apunteActivo = antesAp; seccion = antesSec;
    S = JSON.parse(JSON.stringify(antes));
    pinta();
  }
}

/* coordenadas de pantalla a partir de las de la hoja: la escala sale del
   propio lienzo, que es lo que ve el navegador */
const enPantalla = (x, y) => {
  const r = LB.viva.getBoundingClientRect();
  const e = r.width > 0 ? r.width / LB_ANCHO : 1;
  return [r.left + x * e, r.top + y * e];
};

grupo("Dibujar: el trazo queda", () => {
  prueba("una raya con el bolígrafo se guarda", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x1, y1] = enPantalla(100, 100), [x2, y2] = enPantalla(300, 100);
      LB.viva.dispatchEvent(puntero("pointerdown", x1, y1));
      LB.viva.dispatchEvent(puntero("pointermove", (x1 + x2) / 2, y1));
      LB.viva.dispatchEvent(puntero("pointermove", x2, y2));
      LB.viva.dispatchEvent(puntero("pointerup", x2, y2));
      await new Promise(r => setTimeout(r, 120));
      esperar(LB.trazos.length).igualA(1);
      esperar(LB.trazos[0].t).igualA("boli");
      esperar(LB.trazos[0].p.length >= 4).cierto();
    });
  });

  prueba("en modo escribir no se dibuja nada", async () => {
    await enLaHoja(async () => {
      LB.modo = "escribir"; LB.trazos = [];
      const [x, y] = enPantalla(100, 100);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y));
      LB.viva.dispatchEvent(puntero("pointermove", x + 50, y));
      LB.viva.dispatchEvent(puntero("pointerup", x + 50, y));
      await new Promise(r => setTimeout(r, 100));
      esperar(LB.trazos.length).igualA(0);
    });
  });

  prueba("el botón derecho no pinta", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x, y] = enPantalla(100, 100);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y, { button: 2, buttons: 2 }));
      LB.viva.dispatchEvent(puntero("pointerup", x, y));
      await new Promise(r => setTimeout(r, 100));
      esperar(LB.trazos.length).igualA(0);
    });
  });

  prueba("el color y el grosor elegidos son los que se guardan", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "rotu"; LB.grosor = 2; LB.tinta = LB_TINTAS[3][1]; LB.trazos = [];
      const [x, y] = enPantalla(120, 200);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y));
      LB.viva.dispatchEvent(puntero("pointermove", x + 40, y + 10));
      LB.viva.dispatchEvent(puntero("pointerup", x + 40, y + 10));
      await new Promise(r => setTimeout(r, 120));
      esperar(LB.trazos[0].c).igualA(LB_TINTAS[3][1]);
      esperar(LB.trazos[0].w).igualA(LB_HERR.rotu.grosores[2]);
    });
  });

  prueba("el subrayador usa su propio color, no el del bolígrafo", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "fluor"; LB.tinta = "#111111"; LB.fluor = LB_MARCAS[0][1]; LB.trazos = [];
      const [x, y] = enPantalla(100, 300);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y));
      LB.viva.dispatchEvent(puntero("pointermove", x + 60, y));
      LB.viva.dispatchEvent(puntero("pointerup", x + 60, y));
      await new Promise(r => setTimeout(r, 120));
      esperar(LB.trazos[0].c).igualA(LB_MARCAS[0][1]);
    });
  });

  prueba("dibujar y deshacer deja la hoja como estaba", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x, y] = enPantalla(150, 400);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y));
      LB.viva.dispatchEvent(puntero("pointermove", x + 80, y + 20));
      LB.viva.dispatchEvent(puntero("pointerup", x + 80, y + 20));
      await new Promise(r => setTimeout(r, 120));
      esperar(LB.trazos.length).igualA(1);
      lbDeshacer();
      esperar(LB.trazos.length).igualA(0);
      lbRehacer();
      esperar(LB.trazos.length).igualA(1);
    });
  });

  prueba("la goma pasada por encima corta lo dibujado", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x1, y1] = enPantalla(50, 500), [x2, y2] = enPantalla(400, 500);
      LB.viva.dispatchEvent(puntero("pointerdown", x1, y1));
      LB.viva.dispatchEvent(puntero("pointermove", x2, y2));
      LB.viva.dispatchEvent(puntero("pointerup", x2, y2));
      await new Promise(r => setTimeout(r, 120));
      esperar(LB.trazos.length).igualA(1);

      LB.herr = "goma"; LB.grosor = 1;
      const [gx, gy] = enPantalla(225, 500);
      LB.viva.dispatchEvent(puntero("pointerdown", gx, gy));
      LB.viva.dispatchEvent(puntero("pointerup", gx, gy));
      await new Promise(r => setTimeout(r, 120));
      /* la raya se parte en dos trozos: la goma corta, no borra entero */
      esperar(LB.trazos.length).igualA(2);
    });
  });

  prueba("un trazo larguísimo se simplifica al soltarlo", async () => {
    await enLaHoja(async () => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x0, y0] = enPantalla(60, 600);
      LB.viva.dispatchEvent(puntero("pointerdown", x0, y0));
      for (let i = 1; i <= 200; i++) LB.viva.dispatchEvent(puntero("pointermove", x0 + i, y0));
      LB.viva.dispatchEvent(puntero("pointerup", x0 + 200, y0));
      await new Promise(r => setTimeout(r, 200));
      esperar(LB.trazos.length).igualA(1);
      /* doscientos puntos en línea recta no se guardan como doscientos */
      esperar(LB.trazos[0].p.length < 120).cierto();
    });
  });
});

grupo("Dibujar: lo que se guarda en el apunte", () => {
  prueba("los trazos acaban dentro del apunte, no en el aire", async () => {
    await enLaHoja(async id => {
      LB.modo = "dibujar"; LB.herr = "boli"; LB.trazos = [];
      const [x, y] = enPantalla(200, 700);
      LB.viva.dispatchEvent(puntero("pointerdown", x, y));
      LB.viva.dispatchEvent(puntero("pointermove", x + 50, y + 30));
      LB.viva.dispatchEvent(puntero("pointerup", x + 50, y + 30));
      await new Promise(r => setTimeout(r, 900));   /* el guardado espera 600 ms */
      const n = S.apuntes[id];
      esperar(!!n.dibujo).cierto();
      esperar(n.dibujo.trazos.length).igualA(1);
      esperar(n.dibujo.v).igualA(1);            /* la versión del formato */
      esperar(n.editado.slice(0, 10)).igualA(hoyISO());
    });
  });
});
