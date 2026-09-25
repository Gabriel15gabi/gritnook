/* Instalar GritNook en el móvil: cuándo se ofrece, con qué pasos (iPhone,
   Android, desde Instagram), el instalador del navegador cuando lo hay, el
   aviso del Inicio y el manifiesto con sus capturas. */

/* hacerse pasar por otro navegador mientras dura la prueba */
async function conNavegador(ua, fn) {
  Object.defineProperty(navigator, "userAgent", { get: () => ua, configurable: true });
  try { return await fn(); } finally { delete navigator.userAgent; }
}
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";
const UA_INSTAGRAM = UA_IPHONE + " Instagram 350.0.0.0.0";

grupo("Instalar la app", () => {
  prueba("en el ordenador, sin instalador del navegador, no se ofrece nada", () => {
    const antes = INST.evento; INST.evento = null;
    try { esperar(puedeInstalar()).falso(); esperar(instalarItemYo()).igualA(""); esperar(bandaInstalar()).igualA(""); }
    finally { INST.evento = antes; }
  });

  prueba("cuando el navegador puede instalarla, sale en el menú de tu perfil y abre su instalador", async () => {
    const antes = INST.evento; let pedido = false;
    const ev = new Event("beforeinstallprompt", { cancelable: true });
    ev.prompt = async () => { pedido = true; }; ev.userChoice = Promise.resolve({ outcome: "accepted" });
    try {
      window.dispatchEvent(ev);
      esperar(INST.evento).igualA(ev);
      esperar(ev.defaultPrevented).cierto();
      abrirYo($("#rielYo") || $("#cabYo"));
      const it = $('#yoMenu [data-yo="instalar"]');
      esperar(!!it).cierto();
      it.click(); await new Promise(r => setTimeout(r, 30));
      esperar(pedido).cierto();
    } finally { cerrarYo(); INST.evento = antes; }
  });

  prueba("en el iPhone, los tres pasos de Safari con el icono de Compartir", () => conNavegador(UA_IPHONE, () => {
    esperar(puedeInstalar()).cierto();
    const p = pasosInstalar();
    esperar(p.titulo).contiene("iPhone");
    esperar(p.html).contiene("Compartir");
    esperar(p.html).contiene("Añadir a pantalla de inicio");
    esperar((p.html.match(/class="ins-paso"/g) || []).length).igualA(3);
  }));

  prueba("en Android, el menú ⋮ y «Instalar aplicación»", () => conNavegador(UA_ANDROID, () => {
    const p = pasosInstalar();
    esperar(p.html).contiene("Instalar aplicación");
  }));

  prueba("desde Instagram, primero abrirla en el navegador", () => conNavegador(UA_INSTAGRAM, () => {
    esperar(pasosInstalar().titulo).contiene("ábrela en el navegador");
  }));

  prueba("sin instalador, el botón enseña los pasos en una ventana de la app", () => conNavegador(UA_ANDROID, async () => {
    const antes = INST.evento; INST.evento = null;
    try {
      instalarApp(); await new Promise(r => setTimeout(r, 30));
      const d = document.querySelector("dialog[open]");
      esperar(!!d).cierto();
      esperar(d.textContent).contiene("Instálala en tu móvil");
      d.close();
    } finally { INST.evento = antes; }
  }));

  prueba("en el Inicio del móvil sale el aviso, y «Ahora no» lo esconde dos semanas", () => conNavegador(UA_ANDROID, async () => {
    const antesSec = seccion, luego = leeLS("instalar-luego");
    try {
      try { localStorage.removeItem("desk-daw:instalar-luego"); } catch (e) {}
      seccion = "escritorio"; pinta();
      esperar(!!$(".banda.instalar")).cierto();
      $("#insLuego").click();
      esperar(!!$(".banda.instalar")).falso();
      esperar(leeLS("instalar-luego")).igualA(hoyISO());
    } finally { if (luego) guardaLS("instalar-luego", luego); else try { localStorage.removeItem("desk-daw:instalar-luego"); } catch (e) {} seccion = antesSec; pinta(); }
  }));

  prueba("el manifiesto trae el icono adaptable y tres capturas para la ventana de instalar", async () => {
    const m = await (await fetch("manifest.webmanifest")).json();
    esperar(m.display).igualA("standalone");
    esperar(m.icons.some(i => i.purpose === "maskable")).cierto();
    esperar(m.screenshots.length).igualA(3);
    esperar(m.screenshots.every(s => s.form_factor === "narrow" && s.label)).cierto();
    for (const s of m.screenshots) esperar((await fetch(s.src)).ok).cierto();
  });
});
