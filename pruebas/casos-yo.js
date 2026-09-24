/* Tu foto y tu menú: el círculo donde estaba el engranaje, el menú que abre,
   colocar una foto de verdad (una imagen hecha aquí mismo, mitad roja y mitad
   azul, para saber qué parte ha quedado dentro), y que no se cuele nada que no
   sea una imagen nuestra ni salga de donde tiene que estar. */

/* una prueba de la foto, sin dejar rastro en el estado, lo guardado ni la pantalla */
async function conYo(fn) {
  const antes = { S: JSON.stringify(S), seccion, BV, SESION, db, ajTab };
  const ls = {}; Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => { ls[k] = localStorage.getItem(k); });
  BV = null; $("#entrada").hidden = true; document.body.classList.remove("en-entrada");
  seccion = "escritorio"; cerrarYo(); pinta();
  try { return await fn(); }
  finally {
    cerrarYo(); const d = $("#dlg"); if (d.open) d.close(); soltarFoto();
    S = JSON.parse(antes.S); seccion = antes.seccion; ajTab = antes.ajTab; SESION = antes.SESION; db = antes.db;
    BV = antes.BV; $("#entrada").hidden = !BV;
    Object.keys(localStorage).filter(k => k.startsWith("desk-daw:")).forEach(k => localStorage.removeItem(k));
    Object.entries(ls).forEach(([k, v]) => localStorage.setItem(k, v));
    pinta();
  }
}
/* una foto de 800 × 400: la mitad izquierda roja y la derecha azul */
async function fotoDePrueba(w = 800, h = 400, tipo = "image/png") {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = "#ff0000"; x.fillRect(0, 0, w / 2, h);
  x.fillStyle = "#0000ff"; x.fillRect(w / 2, 0, w / 2, h);
  const b = await new Promise(r => c.toBlob(r, tipo));
  return new File([b], "yo.png", { type: tipo });
}
/* el color de un punto de una imagen guardada */
async function colorEn(url, px, py) {
  const im = new Image(); im.src = url; await im.decode();
  const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const g = c.getContext("2d"); g.drawImage(im, 0, 0);
  return { lado: [im.naturalWidth, im.naturalHeight], rgb: Array.from(g.getImageData(px, py, 1, 1).data).slice(0, 3) };
}
const esRojo = ([r, g, b]) => r > 200 && g < 60 && b < 60;
const esAzul = ([r, g, b]) => b > 200 && r < 60 && g < 60;
const botonDlg = txt => [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === txt);
const tecla = (el, key, extra = {}) => el.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
/* una foto válida y pequeña, sin pasar por el recorte */
const FOTO_MINI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

grupo("Tu foto: el círculo donde estaba el engranaje", () => {
  prueba("en el riel ya no está el engranaje de Ajustes: en su sitio va tu círculo", () => conYo(() => {
    esperar($('#riel [data-sec="ajustes"]')).nulo();
    esperar(!!$("#rielYo .yo-av")).cierto();
    esperar($("#rielYo").getAttribute("aria-haspopup")).igualA("menu");
  }));
  prueba("sin foto sale tu inicial, aunque lleve tilde; sin nombre, un muñeco y «Tú»", () => conYo(() => {
    normalizarPerfil().nombre = "álvaro garcía"; pinta();
    esperar($("#rielYo .yo-av").textContent).igualA("Á");
    esperar($("#rielYo .rt").textContent).igualA("álvaro");
    normalizarPerfil().nombre = ""; pinta();
    esperar(!!$("#rielYo .yo-av svg")).cierto();
    esperar($("#rielYo .rt").textContent).igualA("Tú");
  }));
  prueba("estando en Ajustes, el círculo se marca como la sección en la que estás", () => conYo(() => {
    irASeccion("ajustes");
    esperar($("#rielYo").getAttribute("aria-current")).igualA("page");
    irASeccion("escritorio");
    esperar($("#rielYo").getAttribute("aria-current")).igualA("false");
  }));
  prueba("recorriendo el riel con las flechas, al llegar a Ajustes el foco cae en tu círculo", () => conYo(() => {
    irASeccion("ajustes", "nav");
    esperar(document.activeElement && document.activeElement.id).igualA("rielYo");
  }));
  prueba("en el móvil va arriba a la derecha (en el ordenador no se ve)", () => conYo(() => {
    esperar(!!$("#cabYo .yo-av")).cierto();
    esperar(getComputedStyle($("#cabYo")).display).igualA(innerWidth > 880 ? "none" : "grid");
  }));
});

grupo("Tu foto: el menú", () => {
  prueba("se abre con tu nombre, dónde se guarda lo tuyo, tu perfil y Ajustes", () => conYo(() => {
    normalizarPerfil().nombre = "Lucía"; pinta();
    $("#rielYo").click();
    const m = $("#yoMenu");
    esperar(m.hidden).falso();
    esperar(m.textContent).contiene("Lucía");
    esperar(m.textContent).contiene(db ? "Con tu cuenta de Claude" : "En este dispositivo");
    esperar([...m.querySelectorAll("[role=menuitem]")].map(b => b.textContent.trim())).igualA(["Tu perfil y tu foto", "Ajustes"]);
    esperar($("#rielYo").getAttribute("aria-expanded")).igualA("true");
    esperar(document.activeElement.dataset.yo).igualA("perfil");
  }));
  prueba("las flechas lo recorren en círculo y Escape lo cierra devolviendo el foco al botón", () => conYo(() => {
    $("#rielYo").click();
    tecla(document.activeElement, "ArrowDown");
    esperar(document.activeElement.dataset.yo).igualA("ajustes");
    tecla(document.activeElement, "ArrowDown");
    esperar(document.activeElement.dataset.yo).igualA("perfil");
    tecla(document.activeElement, "End");
    esperar(document.activeElement.dataset.yo).igualA("ajustes");
    tecla(document.activeElement, "Escape");
    esperar($("#yoMenu").hidden).cierto();
    esperar(document.activeElement.id).igualA("rielYo");
    esperar($("#rielYo").getAttribute("aria-expanded")).igualA("false");
  }));
  prueba("un clic fuera lo cierra; volver a pulsar el círculo, también", () => conYo(() => {
    $("#rielYo").click(); $("#principal").click();
    esperar($("#yoMenu").hidden).cierto();
    $("#rielYo").click(); $("#rielYo").click();
    esperar($("#yoMenu").hidden).cierto();
  }));
  prueba("«Ajustes» te lleva a Ajustes y «Tu perfil y tu foto» abre tu perfil", () => conYo(() => {
    $("#rielYo").click(); $('#yoMenu [data-yo="ajustes"]').click();
    esperar(seccion).igualA("ajustes");
    esperar($("#yoMenu").hidden).cierto();
    $("#rielYo").click(); $('#yoMenu [data-yo="perfil"]').click();
    esperar($("#dlg").open).cierto();
    esperar($("#dlgTit").textContent).igualA("Tu perfil");
  }));
  prueba("un nombre con código se enseña como texto, no se ejecuta", () => conYo(() => {
    normalizarPerfil().nombre = '<img src=x onerror="window.__hackeado=1">'; pinta();
    $("#rielYo").click();
    esperar($("#yoMenu img")).nulo();
    esperar($("#yoMenu").textContent).contiene("<img src=x");
    esperar(window.__hackeado).igualA(undefined);
  }));
  prueba("con cuenta sale tu correo y «Cerrar sesión», que te saca de verdad", () => conNube(async srv => {
    BV = null; $("#entrada").hidden = true;
    await entrarComo(srv, "ana@ejemplo.es");
    seccion = "escritorio"; pinta();
    $("#rielYo").click();
    esperar($("#yoMenu").textContent).contiene("ana@ejemplo.es");
    const salir = $('#yoMenu [data-yo="salir"]');
    esperar(!!salir).cierto();
    salir.click();
    await hasta(() => accesoVisible());
    esperar(SESION).nulo();
  }));
});

grupo("Tu foto: ponerla, colocarla y quitarla", () => {
  prueba("una foto se recorta redonda, a 256 × 256, y sale en el riel y en la cabecera", () => conYo(async () => {
    dlgPerfil();
    await cargarFoto(await fotoDePrueba());
    esperar(!!$("#pfLienzo")).cierto();
    botonDlg("Guardar").click();
    const f = normalizarPerfil().foto;
    esperar(/^data:image\/(webp|jpeg);base64,/.test(f)).cierto();
    esperar(f.length).entre(100, 90000);
    esperar((await colorEn(f, 128, 128)).lado).igualA([256, 256]);
    esperar(!!$("#rielYo img")).cierto();
    esperar(!!$("#cabYo img")).cierto();
    esperar($("#dlg").open).falso();
  }));
  prueba("lo que queda dentro es lo que has movido: a un lado rojo, al otro azul", () => conYo(async () => {
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    PF.dx = 9999;                                      /* se queda en el tope: se ve la parte izquierda */
    botonDlg("Guardar").click();
    esperar(esRojo((await colorEn(normalizarPerfil().foto, 128, 128)).rgb)).cierto();
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    PF.dx = -9999;
    botonDlg("Guardar").click();
    esperar(esAzul((await colorEn(normalizarPerfil().foto, 128, 128)).rgb)).cierto();
  }));
  prueba("nunca queda un hueco: por mucho que la muevas, cubre el círculo entero", () => conYo(async () => {
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    PF.dx = 9999; PF.dy = 9999;
    const m = medidasFoto();
    esperar(m.x).cerca(0); esperar(m.y).cerca(0);
    esperar(m.sw >= PF_LADO && m.sh >= PF_LADO).cierto();
  }));
  prueba("se mueve arrastrando y se agranda con la rueda, y la barra de tamaño lo sigue", () => conYo(async () => {
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    const c = $("#pfLienzo"), r = c.getBoundingClientRect();
    const ev = (tipo, x) => c.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: 7, clientX: r.left + x, clientY: r.top + 100, isPrimary: true }));
    ev("pointerdown", 100); ev("pointermove", 130); ev("pointerup", 130);
    esperar(PF.dx).cerca(30);
    c.dispatchEvent(new WheelEvent("wheel", { deltaY: -200, bubbles: true, cancelable: true }));
    esperar(PF.zoom > 1.2).cierto();
    esperar(+$("#pfZoom").value).cerca(PF.zoom, 0.01);
  }));
  prueba("y con el teclado: flechas para moverla, + y − para el tamaño", () => conYo(async () => {
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    const c = $("#pfLienzo");
    tecla(c, "ArrowRight"); esperar(PF.dx).cerca(8);
    tecla(c, "ArrowLeft", { shiftKey: true }); esperar(PF.dx).cerca(-16);
    tecla(c, "+"); esperar(PF.zoom).cerca(1.1);
    tecla(c, "-"); tecla(c, "-"); esperar(PF.zoom).cerca(1);   /* no baja de 1: siempre cubre el círculo */
  }));
  prueba("Cancelar no cambia nada", () => conYo(async () => {
    normalizarPerfil().foto = FOTO_MINI;
    dlgPerfil(); await cargarFoto(await fotoDePrueba());
    botonDlg("Cancelar").click();
    esperar(normalizarPerfil().foto).igualA(FOTO_MINI);
  }));
  prueba("quitarla te devuelve a tu inicial, y se puede deshacer antes de guardar", () => conYo(() => {
    const p = normalizarPerfil(); p.nombre = "Marta"; p.foto = FOTO_MINI; pinta();
    esperar(!!$("#rielYo img")).cierto();
    dlgPerfil(); $("#pfQuitar").click();
    esperar($("#dlgCuerpo").textContent).contiene("Se quita cuando le das a Guardar");
    $("#pfDeshacer").click();
    esperar(!!$("#pfQuitar")).cierto();
    $("#pfQuitar").click(); botonDlg("Guardar").click();
    esperar(normalizarPerfil().foto).igualA("");
    esperar($("#rielYo img")).nulo();
    esperar($("#rielYo .yo-av").textContent).igualA("M");
  }));
  prueba("el nombre se cambia aquí mismo; vacío, se queda el que había", () => conYo(() => {
    normalizarPerfil().nombre = "Marta";
    dlgPerfil();
    const n = $("#pfNombre"); n.value = "  Marta López  "; n.dispatchEvent(new Event("input", { bubbles: true }));
    botonDlg("Guardar").click();
    esperar(normalizarPerfil().nombre).igualA("Marta López");
    dlgPerfil();
    $("#pfNombre").value = "   "; $("#pfNombre").dispatchEvent(new Event("input", { bubbles: true }));
    botonDlg("Guardar").click();
    esperar(normalizarPerfil().nombre).igualA("Marta López");
  }));
  prueba("lo que no es una imagen, o no se abre, se dice y no cambia nada", () => conYo(async () => {
    dlgPerfil();
    await cargarFoto(new File(["hola"], "notas.txt", { type: "text/plain" }));
    esperar(PF.img).nulo();
    esperar($("#avisos").lastElementChild.textContent).contiene("no es una imagen");
    await cargarFoto(new File(["esto no es una png"], "rota.png", { type: "image/png" }));
    esperar(PF.img).nulo();
    esperar($("#avisos").lastElementChild.textContent).contiene("No se ha podido abrir");
  }));
  prueba("una foto enorme se reduce al abrirla, para no gastar memoria", () => conYo(async () => {
    dlgPerfil(); await cargarFoto(await fotoDePrueba(3000, 2000, "image/jpeg"));
    esperar(Math.max(PF.img.width, PF.img.height) <= 1024).cierto();
    esperar(PF.img.width / PF.img.height).cerca(1.5, 0.01);
  }));
  prueba("en Ajustes → Perfil sale arriba, y su botón abre tu perfil", () => conYo(() => {
    seccion = "ajustes"; ajTab = "perfil"; pinta();
    esperar(!!$(".aj-yo .yo-av")).cierto();
    $("#apFoto").click();
    esperar($("#dlgTit").textContent).igualA("Tu perfil");
  }));
});

grupo("Tu foto: que no se cuele nada ni salga de donde debe", () => {
  prueba("solo entra una imagen nuestra: ni SVG, ni enlaces, ni código, ni algo enorme", () => conYo(() => {
    const malas = [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+",
      'data:image/png;base64,AAAA" onerror="alert(1)',
      "https://ejemplo.com/yo.jpg",
      "data:text/html;base64,PHNjcmlwdD4=",
      "data:image/png;base64," + "A".repeat(160000),
      42, { src: "x" }, ["x"]
    ];
    malas.forEach(m => {
      S.perfil.foto = m;
      esperar(normalizarPerfil().foto).igualA("");
    });
    S.perfil.foto = FOTO_MINI;
    esperar(normalizarPerfil().foto).igualA(FOTO_MINI);
  }));
  prueba("una copia de seguridad con una foto rara la pierde, y lo demás entra", () => conYo(() => {
    const copia = JSON.parse(JSON.stringify(S));
    copia.perfil = Object.assign({}, copia.perfil, { nombre: "Copia", foto: "data:image/svg+xml;base64,PHN2Zz4=" });
    S = copia; normalizarPerfil(); pinta();
    esperar(S.perfil.foto).igualA("");
    esperar(S.perfil.nombre).igualA("Copia");
    esperar($("#rielYo img")).nulo();
  }));
  prueba("la foto no se le manda al profe", () => conYo(() => conProfe(() => {
    normalizarPerfil().foto = FOTO_MINI;
    const ctx = tutorContexto();
    esperar(JSON.stringify(ctx)).noContiene("base64");
    esperar(JSON.stringify(ctx)).noContiene(FOTO_MINI.slice(30, 60));
  })));
  prueba("ni va en el informe de «Contar un fallo»", () => conYo(() => {
    normalizarPerfil().foto = FOTO_MINI;
    esperar(informeTecnico()).noContiene("base64");
  }));
  prueba("va con tu perfil a tu cuenta, y en otro dispositivo sale la misma", () => conNube(async srv => {
    BV = null; $("#entrada").hidden = true;
    await entrarComo(srv, "ana@ejemplo.es");
    normalizarPerfil().foto = FOTO_MINI; guardar("perfil");
    await hasta(() => (srv.doc("ana@ejemplo.es", "escritorio/perfil") || {}).perfil && srv.doc("ana@ejemplo.es", "escritorio/perfil").perfil.foto === FOTO_MINI, 4000);
    /* otro dispositivo la cambia: aquí llega al volver a la app */
    const otra = FOTO_MINI.replace("mP8z8", "mP8z9");
    const p = JSON.parse(JSON.stringify(srv.doc("ana@ejemplo.es", "escritorio/perfil")));
    p.perfil.foto = otra; srv.escribir("ana@ejemplo.es", "escritorio/perfil", p);
    await db.traer();
    esperar(normalizarPerfil().foto).igualA(otra);
  }));
});
