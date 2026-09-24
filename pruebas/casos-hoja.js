/* La hoja se deja mover: sangrías por cuadros, líneas que suben y bajan, el
   asa del margen, tocar en blanco para escribir ahí, copiar y pegar con su
   forma y un deshacer que lo deshace todo. Y en el móvil: la hoja a lo ancho
   para escribir, la barra abajo y los dedos para dibujar. Lo del móvil se
   prueba de verdad: el marco de la app se estrecha a 390 px. */

const lineasHoja = () => [...LB.ta.children].map(l => (l.getAttribute("data-b") ? "(" + l.getAttribute("data-b") + ")" : "")
  + (l.getAttribute("data-s") ? "[" + l.getAttribute("data-s") + "]" : "") + (l.getAttribute("data-a") ? "<" + l.getAttribute("data-a") + ">" : "") + l.textContent);
const teclaHoja = (key, extra = {}) => LB.ta.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
const pegarHoja = datos => { const dt = new DataTransfer(); for (const k in datos) dt.setData(k, datos[k]); LB.ta.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); };
const copiarHoja = () => { const dt = new DataTransfer(); LB.ta.dispatchEvent(new ClipboardEvent("copy", { clipboardData: dt, bubbles: true, cancelable: true })); return dt; };
const dedo = (tipo, id, x, y, clase = "touch") => new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: id, pointerType: clase,
  clientX: x, clientY: y, button: 0, buttons: tipo === "pointerup" ? 0 : 1 });
const marcarLineas = (a, b) => { const r = document.createRange(), ls = LB.ta.children; r.setStart(ls[a], 0); r.setEnd(ls[b], ls[b].childNodes.length); getSelection().removeAllRanges(); getSelection().addRange(r); };
const esperaHoja = ms => new Promise(r => setTimeout(r, ms));

/* abre un apunte con ese HTML, con el cursor en la hoja, y lo deja todo como estaba */
async function conHoja(html, fn) {
  const antes = JSON.parse(JSON.stringify(S)), antesAp = apunteActivo, antesSec = seccion, antesModo = LB.modo, antesZoom = LB.zoom;
  const id = uid();
  try {
    S.apuntes[id] = { id, titulo: "Para mover", modId: "", html, cuerpo: htmlATexto(limpiarHtml(html)), papel: "cuadricula", letra: "normal", creado: hoyISO(), editado: new Date().toISOString() };
    apunteActivo = id; seccion = "apuntes"; LB.modo = "escribir"; LB.pop = null; pinta();
    await esperaHoja(150);
    if (!LB.ta || !LB.ta.isConnected) throw new Error("la hoja no se ha montado");
    LB.ta.focus();
    return await fn(id);
  } finally {
    lbMenuBloque(false); LB.pop = null; LB.lapiz = false; LB.mano = false; LB.zoom = antesZoom;
    LB.modo = antesModo; apunteActivo = antesAp; seccion = antesSec;
    S = JSON.parse(JSON.stringify(antes)); pinta();
  }
}
/* el marco de la app, con el ancho de un móvil */
async function enElMovil(fn) {
  const marco = window.frameElement; if (!marco) saltar("sin marco no se puede estrechar la app");
  const w = marco.style.width, h = marco.style.height;
  marco.style.width = "390px"; marco.style.height = "844px";
  try {
    await esperaHoja(150);
    if (!lbMovil()) saltar("el marco no se ha estrechado");
    return await fn();
  } finally { marco.style.width = w; marco.style.height = h; await esperaHoja(150); }
}

grupo("Hoja: la sangría y el sitio de cada línea", () => {
  prueba("Tab al principio de la línea la mete un cuadro; Mayús+Tab la saca", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[1], 0);
    teclaHoja("Tab"); esperar(lineasHoja()[1]).igualA("[1]dos");
    teclaHoja("Tab"); esperar(lineasHoja()[1]).igualA("[2]dos");
    teclaHoja("Tab", { shiftKey: true }); esperar(lineasHoja()[1]).igualA("[1]dos");
    esperar(lineasHoja()[0]).igualA("uno");
  }));

  prueba("Tab en mitad de la línea deja un tabulador, para hacer columnas", () => conHoja("<div>nombre nota</div>", async () => {
    lbCursorEn(LB.ta.children[0], 6);
    teclaHoja("Tab");
    if (!LB.ta.textContent.includes("\t")) saltar("este navegador sin ventana no escribe con execCommand");
    esperar(LB.ta.children[0].textContent).igualA("nombre\t nota");
    esperar(LB.ta.children[0].getAttribute("data-s")).nulo();
  }));

  prueba("con varias líneas marcadas, Tab las mete todas", () => conHoja("<div>uno</div><div>dos</div><div>tres</div>", async () => {
    marcarLineas(0, 1);
    teclaHoja("Tab");
    esperar(lineasHoja()).igualA(["[1]uno", "[1]dos", "tres"]);
  }));

  prueba("borrar al principio de una línea con sangría la saca un cuadro; en una lista, quita la viñeta", () => conHoja('<div data-s="2">dos</div><div data-b="ul">lista</div>', async () => {
    lbCursorEn(LB.ta.children[0], 0); teclaHoja("Backspace");
    esperar(lineasHoja()[0]).igualA("[1]dos");
    lbCursorEn(LB.ta.children[1], 0); teclaHoja("Backspace");
    esperar(lineasHoja()[1]).igualA("lista");
  }));

  prueba("Alt+↓ y Alt+↑ mueven la línea sin perder el cursor", () => conHoja("<div>uno</div><div>dos</div><div>tres</div>", async () => {
    lbCursorEn(LB.ta.children[0], 2);
    teclaHoja("ArrowDown", { altKey: true });
    esperar(lineasHoja()).igualA(["dos", "uno", "tres"]);
    esperar(LB.ta.children[1].contains(getSelection().anchorNode)).cierto();
    teclaHoja("ArrowUp", { altKey: true });
    esperar(lineasHoja()).igualA(["uno", "dos", "tres"]);
  }));

  prueba("bajar la última línea deja una en blanco encima: el texto baja", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[1], 1);
    lbTexto("bajar"); lbTexto("bajar");
    esperar(lineasHoja()).igualA(["uno", "", "", "dos"]);
  }));

  prueba("alinear da la vuelta: centro, derecha e izquierda", () => conHoja("<div>uno</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    lbTexto("alinear"); esperar(lineasHoja()[0]).igualA("<c>uno");
    lbTexto("alinear"); esperar(lineasHoja()[0]).igualA("<r>uno");
    lbTexto("alinear"); esperar(lineasHoja()[0]).igualA("uno");
  }));

  prueba("Alt+Mayús+↓ duplica la línea y deja el cursor en la copia", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    teclaHoja("ArrowDown", { altKey: true, shiftKey: true });
    esperar(lineasHoja()).igualA(["uno", "uno", "dos"]);
    esperar(LB.ta.children[1].contains(getSelection().anchorNode)).cierto();
  }));

  prueba("la sangría y la alineación se guardan en el apunte, y en el texto plano van como tabuladores", () => conHoja("<div>uno</div><div>dos</div>", async id => {
    lbCursorEn(LB.ta.children[1], 0); teclaHoja("Tab"); lbTexto("alinear");
    await esperaHoja(800);
    esperar(S.apuntes[id].html).contiene('data-s="1"');
    esperar(S.apuntes[id].html).contiene('data-a="c"');
    esperar(S.apuntes[id].cuerpo).igualA("uno\n\tdos");
  }));
});

grupo("Hoja: lo que se guarda y lo que se limpia", () => {
  prueba("la sangría y la alineación sobreviven a la limpieza, con sus límites", () => {
    esperar(limpiarHtml('<div data-s="3" data-a="r">x</div>')).contiene('data-s="3"');
    esperar(limpiarHtml('<div data-s="3" data-a="r">x</div>')).contiene('data-a="r"');
    esperar(limpiarHtml('<div data-s="999">x</div>')).contiene('data-s="' + LB_SANGRIA_MAX + '"');
    esperar(limpiarHtml('<div data-s="x" data-a="z">x</div>')).igualA("<div>x</div>");
  });

  prueba("lo de Docs o Word: el margen es sangría y el centrado, centrado", () => {
    esperar(limpiarHtml('<p style="margin-left:36pt">x</p>')).contiene('data-s="2"');
    esperar(limpiarHtml('<p style="text-align:center">x</p>')).contiene('data-a="c"');
    esperar(limpiarHtml('<p align="right">x</p>')).contiene('data-a="r"');
  });

  prueba("los tabuladores del principio van y vuelven como sangría", () => {
    esperar(textoAHtml("\t\thola")).contiene('data-s="2"');
    esperar(htmlATexto(textoAHtml("\tuno\ndos\n\t\ttres"))).igualA("\tuno\ndos\n\t\ttres");
  });
});

grupo("Hoja: copiar y pegar", () => {
  prueba("el texto con guiones, números y # se pega como listas y títulos", () => conHoja("<div><br></div>", async () => {
    lbCursorEn(LB.ta.children[0], 0);
    pegarHoja({ "text/plain": "Capas:\n- Física\n  - Cable\n1. Enlace\n# Red\nTiene **siete**" });
    esperar(lineasHoja()).igualA(["Capas:", "(ul)Física", "(ul)[1]Cable", "(ol)Enlace", "(t1)Red", "Tiene siete"]);
    esperar(LB.ta.lastElementChild.innerHTML).contiene("<b>siete</b>");
  }));

  prueba("pegar en mitad de una línea deja lo de detrás al final de lo pegado", () => conHoja("<div>ab</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    pegarHoja({ "text/plain": "X\nY" });
    esperar(lineasHoja()).igualA(["aX", "Yb"]);
    const s = getSelection();
    esperar(LB.ta.children[1].contains(s.anchorNode)).cierto();
  }));

  prueba("de otra web entra la forma, no los colores ni los saltos del código", () => conHoja("<div><br></div>", async () => {
    lbCursorEn(LB.ta.children[0], 0);
    pegarHoja({ "text/html": '<div>\n  <h2 style="color:red">Tema <span style="background:yellow">IP</span></h2>\n  <ul>\n    <li><b>IPv4</b>\n      <ul><li>32 bits</li></ul>\n    </li>\n  </ul>\n  <p style="margin-left:48px">sangrado</p>\n</div>', "text/plain": "x" });
    esperar(lineasHoja()).igualA(["(t2)Tema IP", "(ul)IPv4", "(ul)[1]32 bits", "[2]sangrado"]);
    esperar(LB.ta.innerHTML).noContiene("data-m");
    esperar(LB.ta.innerHTML).noContiene("data-t");
    esperar(LB.ta.innerHTML).contiene("<b>IPv4</b>");
  }));

  prueba("lo copiado de la propia hoja vuelve con sus subrayados", () => conHoja('<div>ver <mark data-m="amarillo">esto</mark></div><div><br></div>', async () => {
    marcarLineas(0, 0);
    const dt = copiarHoja();
    esperar(dt.getData("text/html")).contiene("gritnook");
    esperar(dt.getData("text/plain")).igualA("ver esto");
    lbCursorEn(LB.ta.children[1], 0);
    pegarHoja({ "text/html": dt.getData("text/html"), "text/plain": dt.getData("text/plain") });
    esperar(LB.ta.children[1].innerHTML).contiene('data-m="amarillo"');
  }));

  prueba("en el texto plano copiado van las viñetas y los números", () => conHoja('<div data-b="ul">a</div><div data-b="ol">b</div>', async () => {
    marcarLineas(0, 1);
    esperar(copiarHoja().getData("text/plain")).igualA("- a\n1. b");
  }));

  prueba("Ctrl+Mayús+V pega el texto tal cual", () => conHoja("<div><br></div>", async () => {
    lbCursorEn(LB.ta.children[0], 0);
    teclaHoja("V", { ctrlKey: true, shiftKey: true });
    pegarHoja({ "text/plain": "- uno", "text/html": "<b>- uno</b>" });
    esperar(lineasHoja()).igualA(["- uno"]);
    esperar(LB.ta.innerHTML).noContiene("<b>");
  }));

  prueba("lo pegado se deshace de una vez", () => conHoja("<div>ab</div>", async () => {
    lbCursorEn(LB.ta.children[0], 2);
    pegarHoja({ "text/plain": "1\n2\n3" });
    esperar(lineasHoja().length).igualA(3);
    lbTextoDeshacer();
    esperar(lineasHoja()).igualA(["ab"]);
  }));
});

grupo("Hoja: el asa del margen", () => {
  const cogerAsa = () => { lbAsaSitio(); const a = $("#lbAsa"); if (!a || a.hidden) throw new Error("el asa no se ve"); const r = a.getBoundingClientRect(); return [a, r.left + r.width / 2, r.top + 12]; };
  const arrastrar = (dx, dy) => {
    const [a, x, y] = cogerAsa();
    a.dispatchEvent(dedo("pointerdown", 21, x, y, "mouse"));
    for (let i = 1; i <= 8; i++) a.dispatchEvent(dedo("pointermove", 21, x + dx * i / 8, y + dy * i / 8, "mouse"));
    a.dispatchEvent(dedo("pointerup", 21, x + dx, y + dy, "mouse"));
  };

  prueba("sale junto a la línea del cursor", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[1], 1);
    const [a] = cogerAsa();
    esperar(a.style.top).igualA(LB.ta.children[1].offsetTop + "px");
  }));

  prueba("arrastrarla hacia abajo cambia la línea de sitio", () => conHoja("<div>uno</div><div>dos</div><div>tres</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    arrastrar(0, 2 * LB_CUADRO * LB.k + 4);
    esperar(lineasHoja()).igualA(["dos", "tres", "uno"]);
  }));

  prueba("arrastrarla a un lado le pone sangría, cuadro a cuadro", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[1], 1);
    arrastrar(2 * LB_CUADRO * LB.k + 3, 0);
    esperar(lineasHoja()).igualA(["uno", "[2]dos"]);
  }));

  prueba("por debajo del texto deja huecos en blanco", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    arrastrar(0, 4 * LB_CUADRO * LB.k);
    const l = lineasHoja();
    esperar(l[0]).igualA("dos");
    esperar(l[l.length - 1]).igualA("uno");
    esperar(l.length > 3).cierto();
  }));

  prueba("tocarla marca las líneas y abre el menú: duplicar y borrar", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[0], 1);
    const [a, x, y] = cogerAsa();
    a.dispatchEvent(dedo("pointerdown", 22, x, y)); a.dispatchEvent(dedo("pointerup", 22, x, y));
    esperar(!!$("#lxMenu")).cierto();
    esperar(getSelection().toString()).igualA("uno");
    $('[data-lx-menu="duplicar"]').click();
    esperar(lineasHoja()).igualA(["uno", "uno", "dos"]);
    $('[data-lx-menu="borrar"]').click();
    esperar(lineasHoja()).igualA(["uno", "dos"]);
    esperar(!!$("#lxMenu")).falso();
  }));
});

grupo("Hoja: tocar en blanco para escribir ahí", () => {
  const tocar = (x, y) => LB.ta.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: x, clientY: y, detail: 1 }));

  prueba("debajo del texto crea las líneas que faltan y empieza en el cuadro que tocas", () => conHoja("<div>uno</div>", async () => {
    lbCursorEn(LB.ta.children[0], 3);
    const u = LB.ta.lastElementChild.getBoundingClientRect(), izq = LB.ta.getBoundingClientRect().left + parseFloat(getComputedStyle(LB.ta).paddingLeft) * LB.k;
    tocar(izq + 3 * LB_CUADRO * LB.k + 4, u.bottom + 2 * LB_CUADRO * LB.k + 8);
    esperar(lineasHoja()).igualA(["uno", "", "", "[3]"]);
    esperar(LB.ta.lastElementChild.contains(getSelection().anchorNode) || getSelection().anchorNode === LB.ta.lastElementChild).cierto();
  }));

  prueba("si te vas sin escribir, esas líneas se quitan", () => conHoja("<div>uno</div>", async () => {
    lbCursorEn(LB.ta.children[0], 3);
    const u = LB.ta.lastElementChild.getBoundingClientRect();
    tocar(u.left + 10, u.bottom + 3 * LB_CUADRO * LB.k);
    esperar(lineasHoja().length > 1).cierto();
    lbCursorEn(LB.ta.children[0], 1);
    await esperaHoja(40);
    esperar(lineasHoja()).igualA(["uno"]);
  }));

  prueba("en una línea vacía, el texto empieza donde tocas", () => conHoja("<div>uno</div><div><br></div><div>tres</div>", async () => {
    const l = LB.ta.children[1], r = l.getBoundingClientRect(), izq = LB.ta.getBoundingClientRect().left + parseFloat(getComputedStyle(LB.ta).paddingLeft) * LB.k;
    lbCursorEn(l, 0);
    l.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: izq + 5 * LB_CUADRO * LB.k + 4, clientY: r.top + 6, detail: 1 }));
    esperar(lineasHoja()[1]).igualA("[5]");
  }));
});

grupo("Hoja: deshacer el texto", () => {
  prueba("Ctrl+Z deshace lo que hace la app (mover, sangría) y Ctrl+Y lo rehace", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    lbCursorEn(LB.ta.children[0], 0);
    teclaHoja("ArrowDown", { altKey: true }); teclaHoja("Tab");
    esperar(lineasHoja()).igualA(["dos", "[1]uno"]);
    teclaHoja("z", { ctrlKey: true }); esperar(lineasHoja()).igualA(["dos", "uno"]);
    teclaHoja("z", { ctrlKey: true }); esperar(lineasHoja()).igualA(["uno", "dos"]);
    teclaHoja("y", { ctrlKey: true }); esperar(lineasHoja()).igualA(["dos", "uno"]);
  }));

  prueba("el botón de deshacer de la barra deshace el texto al escribir", () => conHoja("<div>uno</div><div>dos</div>", async () => {
    esperar($("#lbDeshacer").disabled).cierto();
    lbCursorEn(LB.ta.children[1], 0); lbTexto("mas");
    esperar($("#lbDeshacer").disabled).falso();
    $("#lbDeshacer").click();
    esperar(lineasHoja()).igualA(["uno", "dos"]);
    esperar($("#lbRehacer").disabled).falso();
  }));

  prueba("cada hoja tiene su propio deshacer", () => conHoja("<div>uno</div>", async () => {
    lbCursorEn(LB.ta.children[0], 0); lbTexto("mas");
    const otra = LB.nota; LB.nota = "otra-hoja";
    try { esperar(lbTx().atras.length).igualA(0); } finally { delete LB.tx["otra-hoja"]; LB.nota = otra; }
    esperar(lbTx().atras.length).igualA(1);
  }));
});

grupo("Hoja en el móvil", () => {
  prueba("se escribe a lo ancho de la pantalla, sin ir de lado, con letra de 16 px", () => enElMovil(() => conHoja("<div>una línea bastante larga para ver si se sale por el lado de la pantalla del móvil</div>", async () => {
    esperar($("#libreta").classList.contains("fluida")).cierto();
    const m = $("#lbMarco");
    esperar(m.scrollWidth <= m.clientWidth + 1).cierto();
    esperar(LB.papel.getBoundingClientRect().width <= innerWidth).cierto();
    esperar(getComputedStyle(LB.ta).fontSize).igualA("16px");
  })));

  prueba("la barra va abajo, fija, con botones de dedo", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    const b = $("#lbBarra");
    esperar(b.classList.contains("lx-dock")).cierto();
    esperar(getComputedStyle(b).position).igualA("fixed");
    esperar(Math.abs(b.getBoundingClientRect().bottom - innerHeight) < 2).cierto();
    esperar(b.querySelector("[data-lb-cmd]").getBoundingClientRect().width >= 40).cierto();
  })));

  prueba("con un apunte abierto no se ven la lista ni la cabecera, y la flecha vuelve", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    esperar(document.body.classList.contains("lx-apunte")).cierto();
    esperar(getComputedStyle($(".notas > div")).display).igualA("none");
    esperar(getComputedStyle($("#contenido > .cab")).display).igualA("none");
    $("#apVolver").click();
    esperar(apunteActivo).nulo();
    esperar(document.body.classList.contains("lx-apunte")).falso();
    esperar(getComputedStyle($(".notas > div")).display).distintoDe("none");
  })));

  prueba("módulo y etiquetas van plegados hasta que los pides", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    esperar(getComputedStyle($("#apMeta")).display).igualA("none");
    $("#apDetalles").click();
    esperar(getComputedStyle($("#apMeta")).display).igualA("grid");
    $("#apDetalles").click();
  })));

  prueba("dibujando se ve la hoja entera y la barra cabe sin deslizar", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    lbModo("dibujar"); await esperaHoja(60);
    esperar($("#libreta").classList.contains("fluida")).falso();
    esperar(LB.k < 1).cierto();
    esperar(Math.abs(parseFloat($("#lbEscala").style.width) - (LB.marco.clientWidth - 4)) < 2).cierto();
    const f = $("#lbBarra .lx-fila-dock");
    esperar(f.scrollWidth <= f.clientWidth + 1).cierto();
  })));

  prueba("con un dedo se dibuja", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    lbModo("dibujar"); LB.herr = "boli"; LB.trazos = [];
    const r = LB.viva.getBoundingClientRect();
    LB.viva.dispatchEvent(dedo("pointerdown", 31, r.left + 40, r.top + 100));
    for (let i = 1; i <= 5; i++) LB.viva.dispatchEvent(dedo("pointermove", 31, r.left + 40 + i * 10, r.top + 100));
    LB.viva.dispatchEvent(dedo("pointerup", 31, r.left + 90, r.top + 100));
    esperar(LB.trazos.length).igualA(1);
  })));

  prueba("con dos dedos se acerca la hoja y no se pinta nada", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    lbModo("dibujar"); LB.herr = "boli"; LB.trazos = []; LB.zoom = 1; lbEscalar();
    const r = LB.viva.getBoundingClientRect(), k0 = LB.k;
    LB.viva.dispatchEvent(dedo("pointerdown", 41, r.left + 100, r.top + 150));
    LB.viva.dispatchEvent(dedo("pointermove", 41, r.left + 104, r.top + 151));
    LB.viva.dispatchEvent(dedo("pointerdown", 42, r.left + 160, r.top + 150));
    for (let i = 1; i <= 5; i++) { LB.viva.dispatchEvent(dedo("pointermove", 41, r.left + 100 - i * 10, r.top + 150)); LB.viva.dispatchEvent(dedo("pointermove", 42, r.left + 160 + i * 10, r.top + 150)); }
    LB.viva.dispatchEvent(dedo("pointerup", 41, 0, 0)); LB.viva.dispatchEvent(dedo("pointerup", 42, 0, 0));
    esperar(LB.trazos.length).igualA(0);
    esperar(LB.zoom > 1.5).cierto();
    esperar(LB.k > k0).cierto();
    lbZoomEn(1, null);
    esperar(LB.zoom).igualA(1);
  })));

  prueba("con lápiz, el lápiz dibuja y el dedo solo mueve la hoja", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    lbModo("dibujar"); LB.herr = "boli"; LB.trazos = [];
    const r = LB.viva.getBoundingClientRect();
    LB.viva.dispatchEvent(dedo("pointerdown", 51, r.left + 40, r.top + 100, "pen"));
    LB.viva.dispatchEvent(dedo("pointermove", 51, r.left + 90, r.top + 100, "pen"));
    LB.viva.dispatchEvent(dedo("pointerup", 51, r.left + 90, r.top + 100, "pen"));
    esperar(LB.trazos.length).igualA(1);
    LB.viva.dispatchEvent(dedo("pointerdown", 52, r.left + 40, r.top + 200));
    LB.viva.dispatchEvent(dedo("pointermove", 52, r.left + 90, r.top + 160));
    LB.viva.dispatchEvent(dedo("pointerup", 52, r.left + 90, r.top + 160));
    esperar(LB.trazos.length).igualA(1);
  })));

  prueba("tocar otra vez el útil abre su color y su grosor; elegir color lo cierra", () => enElMovil(() => conHoja("<div>uno</div>", async () => {
    lbModo("dibujar"); LB.herr = "rotu"; lbPintarBarra();
    $('#lbBarra [data-lb-herr="rotu"]').click();
    esperar(LB.pop).igualA("trazo");
    esperar(!!$("#lbBarra .lx-pop [data-lb-grosor]")).cierto();
    $("#lbBarra .lx-pop [data-lb-color]").click();
    esperar(LB.pop).nulo();
    esperar(LB.tinta).igualA(LB_TINTAS[0][0]);
  })));

  prueba("en una ventana estrecha del ordenador, al escribir la hoja también va a lo ancho", async () => {
    const marco = window.frameElement; if (!marco) saltar("sin marco no se puede estrechar la app");
    const w = marco.style.width; marco.style.width = "660px";
    try {
      await esperaHoja(150);
      await conHoja("<div>uno</div>", async () => {
        esperar(lbMovil()).falso();
        esperar($("#libreta").classList.contains("fluida")).cierto();
        esperar($("#lbBarra").classList.contains("lx-dock")).falso();
        esperar(getComputedStyle(LB.ta).fontSize).igualA("16px");
      });
    } finally { marco.style.width = w; await esperaHoja(150); }
  });

  prueba("al cambiar de ancho con la hoja abierta cambia la barra, sin perder lo escrito", () => conHoja("<div>uno</div>", async () => {
    await enElMovil(async () => {
      window.dispatchEvent(new Event("resize"));
      esperar($("#lbBarra").classList.contains("lx-dock")).cierto();
      esperar($("#libreta").classList.contains("fluida")).cierto();
      esperar(LB.ta.textContent).igualA("uno");
    });
    window.dispatchEvent(new Event("resize"));
    esperar($("#lbBarra").classList.contains("lx-dock")).falso();
    esperar($("#libreta").classList.contains("fluida")).falso();
  }));
});
