/* Lo que ven Google y quien llega de fuera: la cabecera de la app, las
   páginas públicas (web/generar.js), el mapa de la web, la calculadora de
   aciertos netos y que el service worker no confunda esas páginas con la app. */

const traer = async ruta => { const r = await fetch(ruta, { cache: "no-store" }); return { ok: r.ok, estado: r.status, txt: await r.text() }; };
const PUBLICAS = ["/oposiciones/", "/estudiar-y-trabajar/", "/calculadora-aciertos-netos/", "/privacidad/", "/terminos/", "/aviso-legal/", "/ia/"];
/* una página pública en un marco escondido, para tocarla como una persona */
async function enMarco(ruta, fn) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed; left:-2000px; top:0; width:1024px; height:800px; border:0";
  f.src = ruta; document.body.appendChild(f);
  try {
    await new Promise((ok, ko) => { f.onload = ok; setTimeout(() => ko(new Error("no carga " + ruta)), 8000); });
    await new Promise(r => setTimeout(r, 150));
    return await fn(f.contentDocument, f.contentWindow);
  } finally { f.remove(); }
}

grupo("Web: lo que lee Google de la app", () => {
  prueba("el título dice qué es y para quién, y hay descripción", () => {
    esperar(document.title.length > 0).cierto();
    const t = document.querySelector("head title").textContent;
    esperar(t).contiene("GritNook");
    esperar(t).contiene("oposiciones");
    const d = document.querySelector('meta[name="description"]');
    if (!d) saltar("la cabecera la pone construir-repo.js al montar index.html");
    esperar(d.content.length >= 70 && d.content.length <= 160).cierto();
  });
  prueba("la dirección canónica y la foto para compartir apuntan a gritnook.com", () => {
    const c = document.querySelector('link[rel="canonical"]'); if (!c) saltar("sin cabecera de la web");
    esperar(c.href).igualA("https://gritnook.com/");
    esperar(document.querySelector('meta[property="og:image"]').content).igualA("https://gritnook.com/web/og.png");
    esperar(document.querySelector('meta[name="twitter:card"]').content).igualA("summary_large_image");
  });
  prueba("los datos estructurados se leen y dicen que es una app gratis", () => {
    const s = document.querySelector('script[type="application/ld+json"]'); if (!s) saltar("sin cabecera de la web");
    const ld = JSON.parse(s.textContent), app = ld["@graph"].find(x => x["@type"] === "WebApplication");
    esperar(app.name).igualA("GritNook");
    esperar(app.offers.price).igualA("0");
    esperar(ld["@graph"].some(x => x["@type"] === "WebSite")).cierto();
  });
  prueba("sin JavaScript también se sabe qué es y adónde ir", () => {
    const n = [...document.querySelectorAll("noscript")].map(x => x.textContent).join(" ");
    if (!n) saltar("sin cabecera de la web");
    esperar(n).contiene("oposiciones/");
    esperar(n).contiene("calculadora-aciertos-netos/");
  });
  prueba("con la sesión abierta, la pestaña dice «GritNook» a secas", () => {
    const antes = db;
    try {
      db = { nube: true }; pintaMini();
      esperar(document.title).igualA("GritNook");
      db = null; pintaMini();
      esperar(document.title).igualA(TITULO_PAGINA);
    } finally { db = antes; pintaMini(); }
  });
  prueba("la pantalla de entrar enlaza las páginas públicas", async () => {
    await conNube(async () => {
      abrirAcceso("entrar"); await dormir(40);
      const enlaces = [...document.querySelectorAll(".acc-web a")].map(a => a.getAttribute("href"));
      esperar(enlaces).contiene("oposiciones/");
      esperar(enlaces).contiene("calculadora-aciertos-netos/");
      esperar(enlaces).contiene("privacidad/");
    });
  });
});

grupo("Web: las páginas públicas", () => {
  prueba("todas existen, con su título, su descripción y su dirección canónica", async () => {
    for (const ruta of PUBLICAS) {
      const r = await traer(ruta);
      esperar(r.ok).cierto();
      esperar(r.txt).contiene(`<link rel="canonical" href="https://gritnook.com${ruta}">`);
      esperar(/<meta name="description" content="[^"]{60,170}">/.test(r.txt)).cierto();
      esperar((r.txt.match(/<h1[ >]/g) || []).length).igualA(1);
    }
  });
  prueba("el aviso legal no sale en Google (lleva el NIF), el resto sí", async () => {
    esperar((await traer("/aviso-legal/")).txt).contiene('name="robots" content="noindex');
    esperar((await traer("/privacidad/")).txt).noContiene("noindex");
    esperar((await traer("/oposiciones/")).txt).noContiene("noindex");
  });
  prueba("los papeles públicos no enseñan las notas internas «RELLENAR»", async () => {
    for (const r of ["/privacidad/", "/terminos/", "/ia/", "/aviso-legal/"]) esperar((await traer(r)).txt).noContiene("RELLENAR");
  });
  prueba("la política pública es la misma versión que la de la app", async () => {
    esperar((await traer("/privacidad/")).txt).contiene("En vigor desde el " + LEGAL_V);
  });
  prueba("el mapa de la web tiene las páginas buenas y no el aviso legal", async () => {
    const m = (await traer("/sitemap.xml")).txt;
    ["/", "/oposiciones/", "/estudiar-y-trabajar/", "/calculadora-aciertos-netos/", "/privacidad/"].forEach(r => esperar(m).contiene(`<loc>https://gritnook.com${r}</loc>`));
    esperar(m).noContiene("aviso-legal");
  });
  prueba("robots.txt deja pasar a Google y le dice dónde está el mapa", async () => {
    const r = (await traer("/robots.txt")).txt;
    esperar(r).contiene("Allow: /");
    esperar(r).contiene("Sitemap: https://gritnook.com/sitemap.xml");
    esperar(r).noContiene("Disallow: /\n");
  });
  prueba("las imágenes de las páginas existen", async () => {
    for (const img of ["/web/og.png", "/capturas/movil/oposicion.jpg", "/capturas/movil/opo-simulacros.jpg", "/capturas/movil/inicio.jpg", "/capturas/movil/plan.jpg"])
      esperar((await fetch(img, { method: "HEAD", cache: "no-store" })).ok).cierto();
  });
});

grupo("Web: la calculadora de aciertos netos", () => {
  prueba("con 70 aciertos y 18 fallos de 100 (4 opciones) salen 64 netos, un 6,4 y 12 en blanco", () => enMarco("/calculadora-aciertos-netos/", async d => {
    esperar(d.getElementById("rNeta").textContent).igualA("64");
    esperar(d.getElementById("rNota").textContent).igualA("6,4");
    esperar(d.getElementById("rBlanco").textContent).igualA("12");
  }));
  prueba("cuenta lo mismo que la oposición de la app para el corte y para arriesgar", () => enMarco("/calculadora-aciertos-netos/", async d => {
    const r = aciertosParaCorte(100, 10, 58.25, 1 / 3);
    esperar(d.getElementById("rCorte").textContent).contiene(r.aciertos + " aciertos de " + r.respondidas);
    const riesgo = d.getElementById("rRiesgo").textContent;
    esperar(riesgo).contiene("+" + nota(valorDeArriesgar(4, 1, 1 / 3)));
    esperar(riesgo).contiene("+" + nota(valorDeArriesgar(4, 2, 1 / 3)));
  }));
  prueba("al cambiar las opciones cambia la penalización, y se puede escribir a mano", () => enMarco("/calculadora-aciertos-netos/", async (d, w) => {
    const pon = (id, v, ev = "input") => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new w.Event(ev, { bubbles: true })); };
    pon("cOpc", "5", "change");
    esperar(d.getElementById("cPen").value).igualA("1/4");
    esperar(d.getElementById("rNeta").textContent).igualA(nota(70 - 18 / 4));
    pon("cPen", "0,5");
    esperar(d.getElementById("rNeta").textContent).igualA("61");
    pon("cPen", "0");
    esperar(d.getElementById("rCuenta").textContent).contiene("no restan");
    pon("cAc", "90"); pon("cFa", "20");
    esperar(d.getElementById("rCuenta").textContent).contiene("suman más que las preguntas");
  }));
});

grupo("Web: el service worker no confunde las páginas con la app", () => {
  prueba("solo guarda como app la raíz; las páginas públicas van a la red", async () => {
    const sw = (await traer("/sw.js")).txt;
    esperar(sw).contiene('if (r.mode === "navigate" && !esApp) return;');
    const re = /\/(fuentes|iconos)\/|manifest\.webmanifest$/;
    esperar(sw).contiene(String(re).slice(1, -1));
    esperar(re.test("/fuentes/inter-latin-400-normal.woff2")).cierto();
    esperar(re.test("/web/web.css")).falso();
    esperar(re.test("/capturas/movil/inicio.jpg")).falso();
  });
});
