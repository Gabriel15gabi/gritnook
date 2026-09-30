/* La edad mínima y los menores: 14 años cumplidos, preguntados con la fecha
   de nacimiento (no con una casilla que ya dice la respuesta), sin la puerta
   de «con permiso de tus padres» que no había forma de comprobar, la ESO
   desde 3.º y el aviso dentro de la app cuando cambian los papeles. */

const AHORA_Y = new Date().getFullYear();
const sinBloqueo = () => localStorage.removeItem("desk-daw:edad-no");
function elegirFecha(pref, { d, m, a }) {
  $("#" + pref + "D").value = d; $("#" + pref + "M").value = m; $("#" + pref + "A").value = a;
  $("#" + pref + "A").dispatchEvent(new Event("change", { bubbles: true }));
}

grupo("Menores: la cuenta de la edad", () => {
  prueba("la edad mínima es 14 y se cuenta bien el día del cumpleaños y la víspera", () => {
    esperar(EDAD_MIN).igualA(14);
    const hoy = new Date(2026, 8, 30);
    esperar(edadCon(30, 9, 2012, hoy)).igualA(14);
    esperar(edadCon(1, 10, 2012, hoy)).igualA(13);
    esperar(edadCon(31, 12, 2011, hoy)).igualA(14);
    /* nacido un 29 de febrero: el 28 aún no los ha cumplido */
    esperar(edadCon(29, 2, 2012, new Date(2026, 1, 28))).igualA(13);
  });
  prueba("la fecha: si falta algo, si no existe, si no llega y si vale (solo mes y año)", () => {
    sinBloqueo();
    try {
      esperar(juzgarNac({ d: "", m: "5", a: "2000" })).igualA("");
      esperar(juzgarNac({ d: 31, m: 2, a: 2000 })).igualA("mal");
      esperar(juzgarNac({ d: 1, m: 1, a: AHORA_Y + 1 })).igualA("mal");
      esperar(juzgarNac({ d: 12, m: 5, a: 2000 })).igualA("2000-05");
      esperar(nacTexto("2000-05")).igualA("mayo de 2000");
    } finally { sinBloqueo(); }
  });
  prueba("si no llega a los 14, cambiar el año al momento no sirve: se queda un día", () => {
    sinBloqueo();
    try {
      esperar(juzgarNac({ d: 1, m: 1, a: AHORA_Y - 10 })).igualA("no");
      esperar(juzgarNac({ d: 12, m: 5, a: 2000 })).igualA("no");
      esperar(edadBloqueada()).cierto();
      /* pasado el día, sí */
      guardaLS("edad-no", Date.now() - 864e5 - 1000);
      esperar(juzgarNac({ d: 12, m: 5, a: 2000 })).igualA("2000-05");
    } finally { sinBloqueo(); }
  });
  prueba("los años llegan hasta hoy: nadie tiene que mentir para poder contestar", () => {
    const caja = document.createElement("div");
    caja.innerHTML = fechaNacHTML("xx");
    const anios = [...caja.querySelectorAll("#xxA option")].map(o => o.value).filter(Boolean).map(Number);
    esperar(anios[0]).igualA(AHORA_Y);
    esperar(anios.includes(AHORA_Y - 10)).cierto();
    esperar(caja.querySelectorAll("#xxD option").length).igualA(32);
    esperar(caja.textContent).contiene("Solo se guardan el mes y el año");
  });
});

grupo("Menores: crear la cuenta", () => {
  prueba("el formulario pide la fecha y la casilla ya no dice «tengo 14 años»", async () => {
    await conNube(async () => {
      abrirAcceso("crear"); await dormir(30);
      esperar(!!$("#accNacD") && !!$("#accNacM") && !!$("#accNacA")).cierto();
      esperar($("#accLegal").closest("label").textContent).noContiene("14 años");
      esperar($("#accLegal").closest("label").textContent).contiene("Acepto los");
    });
  });
  prueba("con menos de 14 no se manda nada al servidor, y el día siguiente tampoco vale otra fecha", async () => {
    await conNube(async srv => {
      abrirAcceso("crear");
      await formulario({ correo: "peque@ejemplo.es", clave: "contraseña-larga", legal: true, nacido: { d: 1, m: 1, a: AHORA_Y - 12 } });
      esperar(avisoAcceso()).contiene("14 años cumplidos");
      await formulario({ correo: "peque@ejemplo.es", clave: "contraseña-larga", legal: true, nacido: { d: 12, m: 5, a: 2000 } });
      esperar(avisoAcceso()).contiene("14 años cumplidos");
      esperar(srv.llamadas.filter(l => !l.includes("/auth/v1/settings")).length).igualA(0);
      esperar(srv.usuarios.some(u => u.email === "peque@ejemplo.es")).falso();
    });
  });
  prueba("sin fecha, o con una que no existe, lo dice claro", async () => {
    await conNube(async () => {
      abrirAcceso("crear");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga", legal: true, nacido: { d: "", m: "", a: "" } });
      esperar(avisoAcceso()).contiene("fecha de nacimiento");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga", legal: true, nacido: { d: 31, m: 4, a: 2001 } });
      esperar(avisoAcceso()).contiene("no existe");
    });
  });
  prueba("lo que ya escribiste no se borra al elegir la fecha", async () => {
    await conNube(async () => {
      abrirAcceso("crear"); await dormir(30);
      $("#accCorreo").value = "ana@ejemplo.es";
      elegirFecha("accNac", { d: 1, m: 1, a: AHORA_Y - 9 });
      esperar($("#accCorreo").value).igualA("ana@ejemplo.es");
      esperar($("#accNacMsg").textContent).contiene("14 años cumplidos");
    });
  });
  prueba("la cuenta nueva lleva el mes y el año a la bienvenida, y la edad no se vuelve a preguntar", async () => {
    await conNube(async () => {
      abrirAcceso("crear");
      await formulario({ correo: "ana@ejemplo.es", clave: "contraseña-larga", legal: true, nacido: { d: 12, m: 5, a: 2000 } });
      await hasta(() => !accesoVisible());
      esperar(BV.nacido).igualA("2000-05");
      esperar(BV.edadPrevia && BV.edadOk).cierto();
    });
  });
});

grupo("Menores: la bienvenida", () => {
  prueba("quien entra con Google o GitHub pone la fecha; con ella válida, puede empezar", async () => {
    sinBloqueo();
    try {
      await enLaEntrada(6, "ciclo-sup", async () => {
        BV.edadPrevia = false; BV.edadOk = false; BV.nacido = ""; BV.legalOk = true; pintaEntrada();
        await esperaUn(30);
        esperar($("#bvSiguiente").disabled).cierto();
        elegirFecha("bvNac", { d: 3, m: 11, a: 2004 });
        esperar(BV.nacido).igualA("2004-11");
        esperar($("#bvSiguiente").disabled).falso();
      });
    } finally { sinBloqueo(); }
  });
  prueba("con menos de 14, el botón sigue apagado y lo explica", async () => {
    sinBloqueo();
    try {
      await enLaEntrada(6, "ciclo-sup", async () => {
        BV.edadPrevia = false; BV.edadOk = false; BV.legalOk = true; pintaEntrada();
        await esperaUn(30);
        elegirFecha("bvNac", { d: 3, m: 11, a: AHORA_Y - 11 });
        esperar(BV.edadOk).falso();
        esperar($("#bvSiguiente").disabled).cierto();
        esperar($("#bvNacMsg").textContent).contiene("14 años cumplidos");
        esperar($("#bvNacMsg").classList.contains("mal")).cierto();
      });
    } finally { sinBloqueo(); }
  });
  prueba("quien ya comprobó su edad ve que está hecho, sin desplegables", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      BV.edadPrevia = true; BV.edadOk = true; BV.nacido = "2003-02"; pintaEntrada();
      await esperaUn(30);
      esperar(!!$("#bvNacD")).falso();
      esperar($(".nac-ok").textContent).contiene("febrero de 2003");
    });
  });
  prueba("ya no dice «que lo use contigo tu padre»: con menos de 14 no hay cuenta", async () => {
    await enLaEntrada(6, "ciclo-sup", async () => {
      const txt = $("#entrada").textContent;
      esperar(txt).noContiene("que lo use contigo");
      esperar(txt).contiene("Con menos de 14 años no se puede tener cuenta");
    });
  });
  prueba("al terminar se guardan el mes y el año, no el día", async () => {
    sinBloqueo();
    try {
      await enLaEntrada(6, "ciclo-sup", async () => {
        BV.edadPrevia = false; BV.edadOk = false; BV.legalOk = true; BV.pesos = []; pintaEntrada();
        await esperaUn(30);
        elegirFecha("bvNac", { d: 17, m: 8, a: 2001 });
        bvAplicar();
        const p = normalizarPerfil();
        esperar(p.nacido).igualA("2001-08");
        esperar(p.edadOk).cierto();
        esperar(JSON.stringify(p)).noContiene("2001-08-17");
      });
    } finally { sinBloqueo(); }
  });
});

grupo("Menores: la ESO empieza en 3.º", () => {
  prueba("solo se ofrecen 3.º y 4.º, que es donde se llega a los 14", async () => {
    esperar(etapaDe("eso").pie).contiene("3.º y 4.º");
    await enLaEntrada(1, "eso", async () => {
      const cursos = [...document.querySelectorAll("[data-bv-curso]")].map(b => b.dataset.bvCurso);
      esperar(cursos.join(",")).igualA("3.º,4.º");
    });
  });
  prueba("al elegir la ESO el curso pasa a 3.º, y al cambiar a otra cosa vuelve a 1.º", async () => {
    await enLaEntrada(0, "", async () => {
      document.querySelector('[data-bv-etapa="eso"]').click();
      esperar(BV.p.curso).igualA("3.º");
      document.querySelector('[data-bv-etapa="bach"]').click();
      esperar(BV.p.curso).igualA("1.º");
    });
  });
  prueba("quien ya estaba en 1.º o 2.º de ESO sigue teniendo sus asignaturas", () => {
    esperar(catalogoDe({ etapa: "eso", curso: "1.º" }).length > 0).cierto();
    esperar(catalogoDe({ etapa: "eso", curso: "2.º" }).length > 0).cierto();
  });
});

grupo("Menores: el aviso cuando cambian los papeles", () => {
  async function conPerfil(extra, fn) {
    const antes = JSON.parse(JSON.stringify(S)), sec = seccion;
    try {
      Object.assign(normalizarPerfil(), { listo: true, etapa: "ciclo-sup", ciclo: "DAW" }, extra);
      seccion = "escritorio"; pinta(); await dormir(30);
      return await fn();
    } finally { S = JSON.parse(JSON.stringify(antes)); seccion = sec; pinta(); }
  }
  prueba("quien aceptó una versión anterior lo ve una vez, con el enlace para leerla", () => conPerfil(
    { aceptado: { fecha: "2026-09-23T10:00:00.000Z", v: "23 de septiembre de 2026" }, legalVisto: "" }, async () => {
      const b = $(".banda.legal");
      esperar(!!b).cierto();
      esperar(b.textContent).contiene(LEGAL_V);
      esperar(b.textContent).contiene("fecha de nacimiento");
      esperar(b.textContent).contiene("contenido ilegal");
      esperar(!!b.querySelector('[data-lg-dlg="privacidad"]')).cierto();
      $("#lgVisto").click(); await dormir(30);
      esperar(normalizarPerfil().legalVisto).igualA(LEGAL_V);
      esperar(!!$(".banda.legal")).falso();
    }));
  prueba("quien aceptó esta versión, o nunca aceptó nada, no lo ve", async () => {
    await conPerfil({ aceptado: { fecha: new Date().toISOString(), v: LEGAL_V } }, () => esperar(!!$(".banda.legal")).falso());
    await conPerfil({ aceptado: null }, () => esperar(!!$(".banda.legal")).falso());
  });
});

grupo("Menores: lo que dicen los papeles", () => {
  const doc = id => LEGAL.find(d => d.id === id).html;
  prueba("la privacidad ya no admite «menos de 14 con permiso» y explica la fecha de nacimiento", () => {
    const p = doc("privacidad");
    esperar(p).noContiene("autoricen");
    esperar(p).contiene("Con menos de 14 años no se puede tener cuenta");
    esperar(p).contiene("se guardan el mes y el año");
    esperar(p).contiene("art. 7 LOPDGDD");
  });
  prueba("los términos dicen lo mismo y tienen dónde avisar de contenido ilegal", () => {
    const t = doc("terminos");
    esperar(t).noContiene("la usen contigo");
    esperar(t).contiene("Con menos de 14 no se puede tener cuenta");
    esperar(t).contiene("Avisar de contenido ilegal");
    esperar(t).contiene("hola@gritnook.com");
    esperar(t).contiene("lo decide una persona");
  });
  prueba("la página pública de los términos es la misma versión", async () => {
    const r = await fetch("/terminos/", { cache: "no-store" });
    esperar((await r.text())).contiene("Avisar de contenido ilegal");
  });
});
