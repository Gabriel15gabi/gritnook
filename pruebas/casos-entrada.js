/* La pantalla de entrada es el sitio donde más se pierde gente: si algo
   se atasca aquí, no llegan ni a ver la app. Estos tests no prueban
   funciones sueltas, prueban la pantalla de verdad, con sus campos y
   sus clics, porque es donde estaba el fallo que nos comimos. */

const esperaUn = ms => new Promise(r => setTimeout(r, ms));
const escribirEn = (sel, texto) => {
  const c = document.querySelector(sel);
  if (!c) throw new Error("no encuentro el campo " + sel);
  c.value = texto;
  c.dispatchEvent(new Event("input", { bubbles: true }));
  return c;
};
/* abre la entrada en el paso que se pida y la cierra al terminar */
async function enLaEntrada(paso, etapa, fn) {
  const antes = JSON.parse(JSON.stringify(S));
  try {
    bvAbrir(true);
    BV.p.etapa = etapa;
    BV.paso = paso;
    pintaEntrada();
    await esperaUn(60);
    return await fn();
  } finally {
    if (typeof BV !== "undefined" && BV) bvCerrar();
    S = JSON.parse(JSON.stringify(antes));
  }
}

grupo("Entrada: escribir el curso a mano", () => {
  prueba("escribir el ciclo desbloquea el botón de seguir", async () => {
    /* El fallo original: los campos solo se leían al cambiar de paso, así
       que quien escribía su ciclo en vez de pulsar una sugerencia veía el
       botón apagado para siempre. Y los ciclos sugeridos son cuatro de los
       ciento y pico que hay. */
    await enLaEntrada(1, "ciclo-sup", async () => {
      esperar(document.querySelector("#bvSiguiente").disabled).cierto();
      escribirEn("#bvCiclo", "Desarrollo de Aplicaciones Web");
      await esperaUn(40);
      esperar(BV.p.ciclo).igualA("Desarrollo de Aplicaciones Web");
      esperar(document.querySelector("#bvSiguiente").disabled).falso();
    });
  });

  prueba("lo mismo para la universidad", async () => {
    await enLaEntrada(1, "uni", async () => {
      escribirEn("#bvCiclo", "Ingeniería Informática");
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).falso();
    });
  });

  prueba("lo mismo para una oposición", async () => {
    await enLaEntrada(1, "oposicion", async () => {
      escribirEn("#bvCiclo", "Auxiliar Administrativo del Estado");
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).falso();
    });
  });

  prueba("borrarlo vuelve a bloquear el botón", async () => {
    await enLaEntrada(1, "ciclo-sup", async () => {
      escribirEn("#bvCiclo", "Algo");
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).falso();
      escribirEn("#bvCiclo", "");
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).cierto();
    });
  });

  prueba("escribir no mueve el cursor de sitio", async () => {
    /* si al escribir se repintara la pantalla, el cursor saltaría al
       principio y no se podría escribir una palabra entera */
    await enLaEntrada(1, "ciclo-sup", async () => {
      const c = escribirEn("#bvCiclo", "Desarrollo");
      c.focus();
      c.setSelectionRange(4, 4);
      c.dispatchEvent(new Event("input", { bubbles: true }));
      await esperaUn(40);
      esperar(document.activeElement.id).igualA("bvCiclo");
      esperar(document.querySelector("#bvCiclo").selectionStart).igualA(4);
    });
  });
});

grupo("Entrada: la puerta de los 14 años", () => {
  prueba("sin marcar las dos casillas no se puede empezar", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      BV.edadOk = false; BV.legalOk = false; pintaEntrada();
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).cierto();
    });
  });

  prueba("con la edad pero sin los términos, tampoco", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      BV.edadOk = true; BV.legalOk = false; pintaEntrada();
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).cierto();
    });
  });

  prueba("con las dos marcadas, adelante", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      BV.edadOk = true; BV.legalOk = true; pintaEntrada();
      await esperaUn(40);
      esperar(document.querySelector("#bvSiguiente").disabled).falso();
    });
  });

  prueba("los papeles se abren desde la propia entrada", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      const enlaces = [...document.querySelectorAll("#entrada [data-lg-dlg]")].map(b => b.dataset.lgDlg);
      esperar(enlaces).contiene("terminos");
      esperar(enlaces).contiene("privacidad");
      esperar(enlaces).contiene("aviso-legal");
      /* el de cómo funciona el profe, solo si hay profe */
      esperar(enlaces).noContiene("ia");
    });
  });
  prueba("con el profe encendido, también se enlaza cómo funciona", async () => {
    await conProfe(() => enLaEntrada(6, "ciclo-sup", async () => {
      const enlaces = [...document.querySelectorAll("#entrada [data-lg-dlg]")].map(b => b.dataset.lgDlg);
      esperar(enlaces).contiene("ia");
    }));
  });
});

grupo("Entrada: el paso a paso", () => {
  prueba("la etapa manda en lo que se pregunta después", async () => {
    await enLaEntrada(1, "eso", async () => {
      /* en la ESO se elige curso con botones, no se escribe nada */
      esperar(document.querySelectorAll("[data-bv-curso]").length > 0).cierto();
    });
  });

  prueba("todos los pasos se pintan sin romperse", async () => {
    await enLaEntrada(0, "ciclo-sup", async () => {
      BV.p.ciclo = "DAW";
      for (let p = 0; p <= 6; p++) {
        BV.paso = p;
        if (p >= 2 && !BV.asigs.length) bvCargarCatalogo();
        pintaEntrada();
        await esperaUn(20);
        esperar(document.querySelector("#entrada .ent-cuerpo").children.length > 0).cierto();
      }
    });
  });
});

grupo("Entrada: el catálogo de asignaturas", () => {
  prueba("reconoce el ciclo escrito de cualquier forma", () => {
    const p = { etapa: "ciclo-sup", curso: "1.º" };
    const formas = [
      "DAW · Desarrollo de Aplicaciones Web",
      "DAW", "daw",
      "Desarrollo de Aplicaciones Web",
      "desarrollo de aplicaciones web"
    ];
    formas.forEach(f => {
      const lista = catalogoDe(Object.assign({}, p, { ciclo: f }));
      if (!lista.length) throw new Error("con «" + f + "» no encuentra nada");
    });
  });

  prueba("las tildes no importan", () => {
    const con = catalogoDe({ etapa: "ciclo-sup", curso: "1.º", ciclo: "Administración y Finanzas" });
    const sin = catalogoDe({ etapa: "ciclo-sup", curso: "1.º", ciclo: "Administracion y Finanzas" });
    esperar(sin.length).igualA(con.length);
  });

  prueba("un ciclo que no existe no devuelve el de otro", () => {
    esperar(catalogoDe({ etapa: "ciclo-sup", curso: "1.º", ciclo: "Pastelería Industrial Avanzada" }).length).igualA(0);
  });

  prueba("dos letras sueltas no valen para acertar un ciclo", () => {
    /* que «de» no acabe trayendo Desarrollo de Aplicaciones Web */
    esperar(catalogoDe({ etapa: "ciclo-sup", curso: "1.º", ciclo: "de" }).length).igualA(0);
  });

  prueba("de un curso desconocido salen filas en blanco, no una pantalla vacía", async () => {
    await enLaEntrada(2, "ciclo-sup", async () => {
      BV.p.ciclo = "Un ciclo que no existe en ningún sitio";
      BV.asigs = [];
      bvCargarCatalogo();
      esperar(BV.asigs.length).igualA(3);
      esperar(BV.asigs[0].nombre).igualA("");
    });
  });

  prueba("con las filas en blanco todavía no se puede seguir", async () => {
    await enLaEntrada(2, "ciclo-sup", async () => {
      BV.p.ciclo = "Un ciclo que no existe en ningún sitio";
      BV.asigs = [];
      bvCargarCatalogo();
      pintaEntrada();
      esperar(bvPuedeSeguir()).falso();
      /* en cuanto se escribe una, sí */
      BV.asigs[0].nombre = "Taller";
      esperar(bvPuedeSeguir()).cierto();
    });
  });

  prueba("un ciclo conocido sí trae sus asignaturas de verdad", async () => {
    await enLaEntrada(2, "ciclo-sup", async () => {
      BV.p.ciclo = "Desarrollo de Aplicaciones Web";
      BV.p.curso = "1.º";
      BV.asigs = [];
      bvCargarCatalogo();
      esperar(BV.asigs.length > 3).cierto();
      esperar(BV.asigs.map(a => a.cod)).contiene("PRO");
    });
  });
});
