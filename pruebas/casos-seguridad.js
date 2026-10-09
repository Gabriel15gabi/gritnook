/* Seguridad: lo que escribe el usuario (o llega en una copia trucada) nunca
   se ejecuta; los enlaces solo abren direcciones web; el calendario no deja
   colar eventos; y la web pública no se deja usar dentro de una página ajena. */

const VENENO = '"><img src=x onerror="window.__xss=(window.__xss||0)+1"><svg onload="window.__xss=1"><script>window.__xss=1<\/script>';
/* elementos con atributos on… (onclick, onerror…): la app no usa ninguno */
const conOn = () => [...document.querySelectorAll("body *")].filter(e => [...e.attributes].some(a => /^on/i.test(a.name)))
  .map(e => e.tagName.toLowerCase() + "[" + [...e.attributes].filter(a => /^on/i.test(a.name)).map(a => a.name).join(",") + "]");
const enlacesPeligrosos = () => [...document.querySelectorAll("a[href], area[href]")].map(a => a.getAttribute("href"))
  .filter(h => /^\s*(javascript|vbscript|data):/i.test(String(h).replace(/[\u0000-\u001f\s]+/g, "")));
async function conVeneno(fn) {
  const antes = JSON.parse(JSON.stringify(S)), sec = seccion, tab = ajTab, ap = apunteActivo;
  try { window.__xss = 0; return await fn(); }
  finally {
    await dormir(40);
    const d = $("#dlg"); if (d.open) d.close();
    S = JSON.parse(JSON.stringify(antes)); seccion = sec; ajTab = tab; apunteActivo = ap; pinta();
  }
}
/* un curso con el veneno metido en todo lo que se escribe a mano */
function cursoEnvenenado() {
  S = estadoInicial();
  const m = S.modulos[0];
  m.nombre = "Mod" + VENENO; m.cod = "X" + VENENO.slice(0, 40);
  S.perfil = Object.assign(perfilDef(), { nombre: "Ana" + VENENO, etapa: "ciclo-sup", ciclo: "DAW" + VENENO, centro: VENENO, motivo: VENENO, cuestaMas: VENENO, listo: true });
  S.config.postit = VENENO;
  S.tareas = [{ id: "t1", titulo: "Entrega" + VENENO, modId: m.id, fecha: hoyISO(), peso: 10, hecha: false, sub: [] }];
  S.examenes = [{ id: "e1", titulo: "Examen" + VENENO, modId: m.id, fecha: sumaDias(hoyISO(), 2), hora: "09:00", plan: [{ t: VENENO, hecho: false }] }];
  S.apuntes = { a1: { id: "a1", titulo: "Apunte" + VENENO, modId: m.id, etiquetas: [VENENO], html: "<div>" + VENENO + '<iframe src="javascript:window.__xss=1"></iframe><a href="javascript:window.__xss=1">x</a></div>', cuerpo: VENENO, creado: hoyISO(), editado: new Date().toISOString() } };
  S.tarjetas = [{ id: "c1", p: VENENO, r: VENENO, modId: m.id, caja: 1, toca: hoyISO() }];
  S.vocab = [{ id: "v1", en: VENENO, es: VENENO, caja: 1, toca: hoyISO(), lang: "en" }];
  S.horario = [{ id: "h1", dia: "lun", ini: "09:00", fin: "10:00", modId: m.id, aula: VENENO }];
  S.casillero = { d1: { id: "d1", titulo: "Enlace" + VENENO, url: "javascript:window.__xss=1", modId: m.id, carpeta: "", tipo: "enlace", creado: new Date().toISOString() },
                  d2: { id: "d2", titulo: "Doc" + VENENO, mime: "text/plain", datos: "data:text/html;base64,PHNjcmlwdD53aW5kb3cuX194c3M9MTwvc2NyaXB0Pg==", modId: m.id, carpeta: "", tipo: "archivo", creado: new Date().toISOString() } };
}

grupo("Seguridad: lo que escribes se enseña como texto, nunca se ejecuta", () => {
  prueba("con código metido en todos los campos, ninguna sección ni pestaña de Ajustes lo ejecuta", () => conVeneno(async () => {
    const base = conOn().length;
    cursoEnvenenado(); guardarLocal();
    const vistas = secVisibles().map(s => s.id).filter(id => id !== "ajustes");
    for (const id of vistas) { seccion = id; pinta(); await dormir(25); }
    seccion = "ajustes";
    for (const [t] of ajTabs()) { ajTab = t; pinta(); await dormir(15); }
    seccion = "apuntes"; apunteActivo = "a1"; pinta(); await dormir(40);
    await dormir(80);
    esperar(window.__xss || 0).igualA(0);
    esperar(conOn().length).igualA(base);
    esperar(document.querySelectorAll(".app script, .app iframe[src^='javascript' i]").length).igualA(0);
  }));
  prueba("el texto se ve tal cual (con sus < y >), no desaparece", () => conVeneno(async () => {
    cursoEnvenenado(); seccion = "entregas"; pinta(); await dormir(30);
    esperar(document.body.textContent).contiene("Entrega\"><img src=x");
  }));
});

grupo("Seguridad: los enlaces solo abren direcciones web", () => {
  prueba("urlSegura deja pasar http y https y nada más", () => {
    esperar(urlSegura("https://www.boe.es/buscar")).igualA("https://www.boe.es/buscar");
    esperar(urlSegura("  http://ejemplo.org  ")).igualA("http://ejemplo.org/");
    esperar(urlSegura("www.boe.es")).igualA("https://www.boe.es/");
    esperar(urlSegura("drive.google.com/file/d/1")).igualA("https://drive.google.com/file/d/1");
    for (const malo of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "java\tscript:alert(1)", "java\nscript:alert(1)", "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>", "file:///C:/Windows", "//evil.example/x", "alert(1)", "", null, undefined, 42, {}])
      esperar(urlSegura(malo)).igualA("");
  });
  prueba("srcSegura: archivos de la app sí; páginas HTML metidas en un data: o «javascript:», no", () => {
    esperar(srcSegura("data:application/pdf;base64,JVBERi0=")).igualA("data:application/pdf;base64,JVBERi0=");
    esperar(srcSegura("data:image/png;base64,iVBOR")).igualA("data:image/png;base64,iVBOR");
    esperar(srcSegura("/_blob/abc")).igualA("/_blob/abc");
    for (const malo of ["javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "DATA:TEXT/HTML,<b>", "data:application/xhtml+xml,<x/>", "vbscript:x", " /etc/passwd"])
      esperar(srcSegura(malo)).igualA("");
  });
  prueba("un enlace «javascript:» guardado (o de una copia) no se pinta como enlace peligroso", () => conVeneno(async () => {
    cursoEnvenenado();
    for (const id of ["casillero", "mochila"].filter(x => secVisibles().some(s => s.id === x))) { seccion = id; pinta(); await dormir(40); }
    esperar(enlacesPeligrosos()).igualA([]);
  }));
  prueba("al guardar un enlace nuevo, «javascript:» se rechaza y «www…» se guarda con https", () => conVeneno(async () => {
    S.casillero = {};
    const caja = document.createElement("div");
    caja.innerHTML = '<input id="dTitulo"><input id="dUrl"><select id="dModulo"><option value=""></option></select><button type="button" id="btnAddEnlace"></button>';
    const sobran = ["#dTitulo", "#dUrl", "#dModulo", "#btnAddEnlace"].map(s => $(s)).filter(Boolean);
    sobran.forEach(e => e.id += "-fuera");
    document.body.append(caja);
    try {
      $("#dTitulo").value = "Trampa"; $("#dUrl").value = "javascript:window.__xss=1"; $("#btnAddEnlace").click(); await dormir(30);
      esperar(Object.keys(S.casillero).length).igualA(0);
      caja.innerHTML = '<input id="dTitulo"><input id="dUrl"><select id="dModulo"><option value=""></option></select><button type="button" id="btnAddEnlace"></button>';
      $("#dTitulo").value = "El BOE"; $("#dUrl").value = "www.boe.es"; $("#btnAddEnlace").click(); await dormir(30);
      const docs = Object.values(S.casillero);
      esperar(docs.length).igualA(1);
      esperar(docs[0].url).igualA("https://www.boe.es/");
    } finally { caja.remove(); sobran.forEach(e => e.id = e.id.replace(/-fuera$/, "")); }
  }));
});

grupo("Seguridad: una copia trucada", () => {
  prueba("al cargarla, los enlaces y archivos peligrosos se quitan y nada se ejecuta", () => conVeneno(async () => {
    const real = confirmar; confirmar = async () => true;
    try {
      cursoEnvenenado(); const trucada = JSON.parse(JSON.stringify(S));
      trucada.perfil.foto = "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+";
      S = estadoInicial(); seccion = "ajustes"; ajTab = "datos"; pinta(); await dormir(20);
      const inp = $("#apInputImportar"), dt = new DataTransfer();
      dt.items.add(new File([JSON.stringify(trucada)], "copia.json", { type: "application/json" }));
      inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true }));
      await hasta(() => !!S.casillero.d1);
      esperar(S.casillero.d1.url).igualA("");
      esperar("datos" in S.casillero.d2).falso();
      esperar(miFoto()).igualA("");                       /* una «foto» SVG no se acepta */
      seccion = "casillero"; pinta(); await dormir(40);
      esperar(enlacesPeligrosos()).igualA([]);
      esperar(window.__xss || 0).igualA(0);
    } finally { confirmar = real; }
  }));
});

grupo("Seguridad: el calendario y el enlace de origen", () => {
  prueba("un título con saltos de línea no puede colar otro evento en el .ics", () => {
    for (const salto of ["\r\n", "\n", "\r"]) {
      const ics = textoICS([{ uid: "x", titulo: "Examen" + salto + "END:VEVENT" + salto + "BEGIN:VEVENT" + salto + "SUMMARY:falso", fecha: sumaDias(hoyISO(), 3), hora: "", minutos: 0, desc: "a" + salto + "b" }]);
      const lineas = ics.split(/\r\n|\r|\n/);
      esperar(lineas.filter(l => l === "BEGIN:VEVENT").length).igualA(1);
      esperar(lineas.some(l => l.startsWith("SUMMARY:falso"))).falso();
    }
  });
  prueba("?ref= con basura se cuenta como «otro», nunca se pinta ni se guarda tal cual", () => {
    esperar(origenVisita({ url: "https://gritnook.com/?ref=<script>alert(1)</script>", ref: "", ua: "", instal: false })).igualA("otro");
    esperar(origenVisita({ url: "https://gritnook.com/?ref=instagram", ref: "", ua: "", instal: false })).igualA("instagram");
  });
});

grupo("Seguridad: dentro de una página ajena", () => {
  const ventana = ({ host, arriba, ajeno }) => {
    const yo = { location: { hostname: host, origin: "https://" + host } };
    yo.self = yo;
    yo.top = arriba ? (ajeno ? { get location() { throw new DOMException("Blocked", "SecurityError"); } } : { location: { origin: "https://" + host } }) : yo;
    return yo;
  };
  prueba("gritnook.com dentro del marco de otra web: no se deja usar", () => {
    esperar(marcoAjeno(ventana({ host: "gritnook.com", arriba: true, ajeno: true }))).cierto();
    esperar(marcoAjeno(ventana({ host: "gabriel15gabi.github.io", arriba: true, ajeno: true }))).cierto();
  });
  prueba("sola, en su propio marco (las pruebas), en Claude o en local: funciona normal", () => {
    esperar(marcoAjeno(ventana({ host: "gritnook.com", arriba: false }))).falso();
    esperar(marcoAjeno(ventana({ host: "gritnook.com", arriba: true, ajeno: false }))).falso();
    esperar(marcoAjeno(ventana({ host: "localhost", arriba: true, ajeno: true }))).falso();
    esperar(marcoAjeno(ventana({ host: "abc.claudeusercontent.com", arriba: true, ajeno: true }))).falso();
    esperar(marcoAjeno()).falso();
    esperar(document.documentElement.classList.contains("en-marco-ajeno")).falso();
  });
});

grupo("Seguridad: las páginas de pruebas solo en local", () => {
  const traer = async r => (await fetch(r, { cache: "no-store" })).text();
  prueba("pruebas.html y demo.html se paran fuera del ordenador de desarrollo", async () => {
    for (const p of ["/pruebas/pruebas.html", "/pruebas/demo.html"]) {
      const h = await traer(p);
      esperar(h).contiene("throw new Error(\"solo en local\")");
      esperar(h.indexOf("solo en local") < h.indexOf("localStorage")).cierto();   /* antes de tocar nada guardado */
    }
  });
});
