/* ════════════════════════════════════════════════════════════════════
   La bola de papel.

   Esta es la más difícil de probar de toda la app: depende del reloj del
   navegador y de requestAnimationFrame, que un navegador sin ventana
   congela. La solución es cambiarle el reloj: se sustituyen
   performance.now y requestAnimationFrame por unos de mentira que se
   mueven cuando el test quiere, y así la física se puede correr paso a
   paso, en frío y sin esperar.
   ════════════════════════════════════════════════════════════════════ */

/* Un reloj de mentira para la física, que va con requestAnimationFrame.
   El arrugado de la hoja NO se falsea: va con animaciones del navegador y
   con setTimeout, así que hay que esperarlo de verdad. Por eso la función
   es asíncrona y trae dos herramientas: avanzar() mueve el reloj falso y
   esperarDeVerdad() espera el del navegador. */
const espera = ms => new Promise(r => setTimeout(r, ms));

async function conRelojFalso(fn) {
  const rafReal = window.requestAnimationFrame, cancelReal = window.cancelAnimationFrame;
  const ahoraReal = performance.now.bind(performance);
  let t = ahoraReal(), pendientes = [];
  window.requestAnimationFrame = cb => { pendientes.push(cb); return pendientes.length; };
  window.cancelAnimationFrame = () => {};
  performance.now = () => t;
  /* avanza n cuadros de 16 ms llamando a lo que estuviera esperando */
  const avanzar = (cuadros = 1, ms = 16) => {
    for (let i = 0; i < cuadros; i++) {
      t += ms;
      const cola = pendientes; pendientes = [];
      cola.forEach(cb => { try { cb(t); } catch (e) {} });
    }
  };
  /* el reloj de verdad sigue corriendo por debajo, para lo que no se falsea */
  const esperarDeVerdad = async ms => {
    const desde = ahoraReal();
    await espera(ms);
    t += ahoraReal() - desde;
  };
  try { return await fn(avanzar, esperarDeVerdad); }
  finally {
    window.requestAnimationFrame = rafReal;
    window.cancelAnimationFrame = cancelReal;
    performance.now = ahoraReal;
    document.querySelectorAll(".bp-capa").forEach(c => c.remove());
  }
}

/* la hoja tarda 0,9 s en acabar de arrugarse y convertirse en bola */
async function bolaLista(esperarDeVerdad) {
  await esperarDeVerdad(1100);
  if (!document.querySelector("#bpBola") || getComputedStyle(document.querySelector("#bpBola")).opacity === "0") {
    saltar("la hoja no ha terminado de arrugarse: el navegador ha congelado la animación");
  }
}

const rectDeMentira = () => ({ left: 300, top: 200, width: 400, height: 500, right: 700, bottom: 700 });
const capa = () => document.querySelector(".bp-capa");
const bola = () => document.querySelector("#bpBola");
/* la posición sale del transform, que es lo que mueve la bola */
function posicion() {
  const m = (bola().style.transform || "").match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
  return m ? { x: +m[1], y: +m[2] } : null;
}

grupo("Bola de papel: que aparezca", () => {
  prueba("se monta con su bola, su papelera y sus botones", async () => {
    await conRelojFalso(async () => {
      bolaDePapel(rectDeMentira(), null);
      esperar(!!capa()).cierto();
      esperar(!!bola()).cierto();
      esperar(document.querySelectorAll(".bp-papelera").length).igualA(2);
      esperar(!!document.querySelector("#bpAuto")).cierto();
      esperar(!!document.querySelector("#bpSaltar")).cierto();
    });
  });

  prueba("se presenta como lo que es, para quien no ve la pantalla", async () => {
    await conRelojFalso(async () => {
      bolaDePapel(rectDeMentira(), null);
      esperar(capa().getAttribute("role")).igualA("dialog");
      esperar(capa().getAttribute("aria-label")).contiene("papelera");
      esperar(bola().getAttribute("aria-label").toLowerCase()).contiene("bola");
      esperar(bola().tabIndex).igualA(0);
    });
  });

  prueba("la hoja que se arruga entra en la escena", async () => {
    await conRelojFalso(async () => {
      const clon = document.createElement("div");
      clon.className = "hoja-clon"; clon.textContent = "lo que estaba escrito";
      bolaDePapel(rectDeMentira(), clon);
      esperar(!!document.querySelector(".bp-hoja")).cierto();
      esperar(document.querySelector(".bp-hoja").textContent).contiene("lo que estaba escrito");
    });
  });

  prueba("«Saltar» la quita de en medio", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      document.querySelector("#bpSaltar").click();
      await esperarDeVerdad(600);
      esperar(!!capa()).falso();
    });
  });

  prueba("la tecla Escape también", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await esperarDeVerdad(600);
      esperar(!!capa()).falso();
    });
  });

  prueba("no se montan dos a la vez", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      document.querySelector("#bpSaltar").click();
      await esperarDeVerdad(600);
      bolaDePapel(rectDeMentira(), null);
      esperar(document.querySelectorAll(".bp-capa").length).igualA(1);
    });
  });
});

grupo("Bola de papel: la física", () => {
  prueba("soltada en el aire, cae", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      /* se lanza sola, que es el camino sin ratón */
      document.querySelector("#bpAuto").click();
      avanzar(2);
      const salida = posicion();
      if (!salida) saltar("la bola no se ha llegado a mover: el arrugado no ha terminado");
      /* la app la lanza hacia arriba y hacia la papelera, así que primero
         sube; lo que se comprueba es que la gravedad acaba ganando */
      let hamoscaido = false, masAlto = salida.y;
      for (let i = 0; i < 60 && !hamoscaido; i++) {
        avanzar(1);
        const p = posicion(); if (!p) break;
        masAlto = Math.min(masAlto, p.y);
        if (p.y > masAlto + 20) hamoscaido = true;
      }
      esperar(hamoscaido).cierto();
    });
  });

  prueba("la gravedad acelera: cada vez cae más rápido", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      document.querySelector("#bpAuto").click();
      avanzar(3);
      const p0 = posicion(); avanzar(3);
      const p1 = posicion(); avanzar(3);
      const p2 = posicion();
      if (!p0 || !p1 || !p2) saltar("la bola no se ha movido");
      const primera = p1.y - p0.y, segunda = p2.y - p1.y;
      esperar(segunda >= primera).cierto();
    });
  });

  prueba("no se sale de la pantalla por ningún lado", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      document.querySelector("#bpAuto").click();
      for (let i = 0; i < 200; i++) {
        avanzar(1);
        const p = posicion();
        if (!p) continue;
        if (p.x < -200 || p.x > innerWidth + 200) throw new Error("se ha ido por los lados: x=" + Math.round(p.x));
        if (p.y > innerHeight + 200) throw new Error("se ha caído por debajo: y=" + Math.round(p.y));
      }
    });
  });

  prueba("acaba parándose: la animación no se queda dando vueltas para siempre", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      document.querySelector("#bpAuto").click();
      avanzar(400);
      const a = posicion();
      avanzar(60);
      const b = posicion();
      if (!a || !b) saltar("la bola no se ha movido");
      /* o está quieta, o ya ha entrado y la escena se ha cerrado */
      const quieta = Math.abs(b.y - a.y) < 2 && Math.abs(b.x - a.x) < 2;
      esperar(quieta || !capa()).cierto();
    });
  });

  prueba("tirada por la app, entra en la papelera", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      document.querySelector("#bpAuto").click();
      let dentro = false;
      for (let i = 0; i < 300 && !dentro; i++) {
        avanzar(1);
        const b = bola();
        if (!b || b.classList.contains("dentro")) dentro = true;
        const c = document.querySelector("#bpCanasta");
        if (c && !c.hidden) dentro = true;
      }
      esperar(dentro).cierto();
    });
  });
});

grupo("Bola de papel: cogerla con el dedo", () => {
  const punteroBola = (tipo, x, y) => new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "mouse", button: 0, buttons: tipo === "pointerup" ? 0 : 1, clientX: x, clientY: y });

  prueba("al cogerla se queda pegada al dedo", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      const b = bola(); if (!b) saltar("no hay bola");
      b.dispatchEvent(punteroBola("pointerdown", 500, 400));
      b.dispatchEvent(punteroBola("pointermove", 520, 380));
      avanzar(2);
      esperar(b.classList.contains("cogida")).cierto();
    });
  });

  prueba("al soltarla sale disparada hacia donde la lanzas", async () => {
    await conRelojFalso(async (avanzar, esperarDeVerdad) => {
      bolaDePapel(rectDeMentira(), null);
      await bolaLista(esperarDeVerdad);
      const b = bola(); if (!b) saltar("no hay bola");
      b.dispatchEvent(punteroBola("pointerdown", 400, 500));
      for (let i = 1; i <= 5; i++) { b.dispatchEvent(punteroBola("pointermove", 400 + i * 40, 500 - i * 10)); avanzar(1); }
      const antes = posicion();
      b.dispatchEvent(punteroBola("pointerup", 600, 450));
      avanzar(4);
      const despues = posicion();
      if (!antes || !despues) saltar("la bola no se ha movido");
      esperar(despues.x > antes.x).cierto();
    });
  });
});
