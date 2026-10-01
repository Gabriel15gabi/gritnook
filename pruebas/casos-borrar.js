/* Borrar tu cuenta: fácil de encontrar, imposible de pulsar sin querer,
   completo, y con su página para quien no puede entrar. */

grupo("Borrar la cuenta: dónde está y cómo se confirma", () => {
  async function enAjustes(tab, fn) {
    const sec = seccion, t = ajTab;
    try { seccion = "ajustes"; ajTab = tab; pinta(); await dormir(20); return await fn(); }
    finally { seccion = sec; ajTab = t; pinta(); }
  }
  prueba("en Ajustes → Perfil está «Tu cuenta», con tu correo y el botón", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      await enAjustes("perfil", () => {
        esperar($(".bc-panel").textContent).contiene("ana@ejemplo.es");
        esperar(!!$(".bc-panel [data-borrar-cuenta]")).cierto();
        esperar(!!$("#accSalir2")).cierto();
        esperar($(".bc-panel a").getAttribute("href")).igualA("borrar-cuenta/");
      });
    });
  });
  prueba("sin cuenta no sale (lo tuyo se borra con «Borrar todo», en Datos)", () => {
    esperar(panelCuenta()).igualA("");
  });
  prueba("el botón abre la ventana; no se puede borrar hasta escribir tu correo", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      await enAjustes("datos", async () => {
        $("#accBorrar").click(); await dormir(40);
        esperar($("#dlgTit").textContent).igualA("Borrar tu cuenta");
        esperar($("#dlgCuerpo").textContent).contiene("ana@ejemplo.es");
        esperar($("#dlgCuerpo").textContent).contiene("No se puede deshacer");
        esperar(!!$("#bcCopia")).cierto();
        const b = $("#dlgPie .peligro"), c = $("#bcCorreo");
        esperar(b.disabled).cierto();
        c.value = "bea@ejemplo.es"; c.dispatchEvent(new Event("input", { bubbles: true }));
        esperar(b.disabled).cierto();
        c.value = " Ana@Ejemplo.ES "; c.dispatchEvent(new Event("input", { bubbles: true }));
        esperar(b.disabled).falso();
        esperar(srv.usuarios.length).igualA(1);      /* abrirla no borra nada */
        $("#dlg").close();
      });
    });
  });
});

grupo("Borrar la cuenta: lo que hace", () => {
  prueba("confirmada, se lleva la cuenta, sus datos, el aviso de este dispositivo y lo de este navegador", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      await hasta(() => srv.doc("ana@ejemplo.es", "escritorio/perfil") !== undefined);
      guardaLS("push-endpoint", "https://fcm.googleapis.com/fcm/send/ana");
      dlgBorrarCuenta(); await dormir(30);
      $("#bcCorreo").value = "ana@ejemplo.es"; $("#bcCorreo").dispatchEvent(new Event("input", { bubbles: true }));
      $("#dlgPie .peligro").click();
      await hasta(() => !$("#dlg").open, 4000);
      esperar(srv.usuarios.length).igualA(0);
      esperar(srv.docs.size).igualA(0);
      esperar(SESION).nulo();
      esperar(leeLS("push-endpoint")).nulo();
      esperar(accesoVisible()).cierto();
      esperar(avisoAcceso()).contiene("se han borrado");
    });
  });
  prueba("sin conexión no se borra nada, ni aquí ni allí, y lo dice", async () => {
    await conNube(async srv => {
      await entrarComo(srv, "ana@ejemplo.es");
      dlgBorrarCuenta(); await dormir(30);
      $("#bcCorreo").value = "ana@ejemplo.es"; $("#bcCorreo").dispatchEvent(new Event("input", { bubbles: true }));
      srv.sinRed = true;
      $("#dlgPie .peligro").click();
      await hasta(() => !$("#bcError").hidden, 4000);
      esperar($("#bcError").textContent).contiene("No se ha borrado nada");
      esperar(srv.usuarios.length).igualA(1);
      esperar(SESION !== null).cierto();
      esperar($("#dlgPie .peligro").disabled).falso();   /* se puede volver a intentar */
      srv.sinRed = false;
      $("#dlg").close();
    });
  });
});

grupo("Borrar la cuenta: la página para quien no puede entrar", () => {
  const traer = async r => (await fetch(r, { cache: "no-store" })).text();
  prueba("gritnook.com/borrar-cuenta/ explica los pasos, qué se borra y el correo", async () => {
    const h = await traer("/borrar-cuenta/");
    esperar(h).contiene('<link rel="canonical" href="https://gritnook.com/borrar-cuenta/">');
    esperar(h).contiene("Ajustes → Perfil");
    esperar(h).contiene("hola@gritnook.com");
    esperar(h).contiene("desde el correo de tu cuenta");
    esperar(h).contiene("72 horas");
    esperar(h).contiene("Qué se borra");
  });
  prueba("está enlazada en el pie de todas las páginas y en el mapa", async () => {
    esperar(await traer("/privacidad/")).contiene('href="/borrar-cuenta/"');
    esperar(await traer("/oposiciones/")).contiene('href="/borrar-cuenta/"');
    esperar(await traer("/sitemap.xml")).contiene("https://gritnook.com/borrar-cuenta/");
  });
  prueba("la privacidad y los términos dicen cómo borrarla y cómo pedirlo", () => {
    const p = LEGAL.find(d => d.id === "privacidad").html, t = LEGAL.find(d => d.id === "terminos").html;
    esperar(p).contiene("Ajustes → Perfil");
    esperar(p).contiene("gritnook.com/borrar-cuenta");
    esperar(t).contiene("gritnook.com/borrar-cuenta");
  });
});
