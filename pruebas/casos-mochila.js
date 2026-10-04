/* La Mochila (antes Casillero): tarjetas con su vista previa ordenadas por
   asignatura, buscar y filtrar, y carpetas dentro de cada asignatura para
   guardar las cosas de cada tema. Se pinta la sección de verdad con una
   mochila de mentira y se deja todo como estaba. */

const mcDoc = (id, modId, extra = {}) => Object.assign({ id, titulo: "Cosa " + id, modId, tipo: "enlace", url: "https://ejemplo.es/" + id, creado: "2026-10-0" + (1 + (id.length % 8)) + "T10:00:00Z" }, extra);
async function enMochila(fn, prepara) {
  const antes = JSON.parse(JSON.stringify(S)), est = { seccion, libroAbierto, casTipo, mcCarpeta, mcBusca, casEnlace, LBP };
  try {
    S.modulos = [moduloDe([[100, null]], { id: "bd", cod: "BD", nombre: "Bases de Datos", color: 1 }), moduloDe([[100, null]], { id: "pro", cod: "PRO", nombre: "Programación", color: 0 }),
      moduloDe([[100, null]], { id: "fol", cod: "FOL", nombre: "Formación y Orientación Laboral", color: 5 })];
    S.modulos[0].carpetas = [{ id: "t3", nombre: "Tema 3 · SQL" }, { id: "t2", nombre: "Tema 2 · Modelo E-R" }];
    S.casillero = {
      a: mcDoc("a", "bd", { titulo: "Apuntes de JOIN", carpeta: "t3", creado: "2026-10-03T10:00:00Z" }),
      b: mcDoc("b", "bd", { titulo: "SQLZoo", carpeta: "t3", creado: "2026-09-20T10:00:00Z" }),
      c: mcDoc("c", "bd", { titulo: "Normalizar tablas", creado: "2026-09-25T10:00:00Z" }),
      d: mcDoc("d", "pro", { titulo: "Tutorial de Java", creado: "2026-09-28T10:00:00Z" }),
      e: mcDoc("e", "", { titulo: "Horario del curso", creado: "2026-09-10T10:00:00Z" })
    };
    seccion = "casillero"; libroAbierto = null; casTipo = null; mcCarpeta = null; mcBusca = ""; casEnlace = false; LBP = null;
    if (prepara) prepara();
    pinta(); await dormir(20);
    return await fn();
  } finally {
    S = JSON.parse(JSON.stringify(antes)); ({ seccion, libroAbierto, casTipo, mcCarpeta, mcBusca, casEnlace, LBP } = est);
    ["#dlg", "#dlgConfirmar"].forEach(s => { const d = $(s); if (d && d.open) d.close(); });
    pinta();
  }
}
const mcTit = () => [...document.querySelectorAll(".mc-sec[data-soltar-mod] .mc-sec-cab h2")].map(h => h.textContent);

grupo("Mochila: el nombre, el icono y cómo se ordena", () => {
  prueba("la sección se llama Mochila y su icono es una mochila", () => {
    esperar(SECCIONES.find(s => s.id === "casillero").txt).igualA("Mochila");
    esperar(ICON_RIEL.casillero).contiene("M96,64V52");
    esperar(ICON_PH.casillero).contiene("M96,64V52");
  });
  prueba("vacía, lo dice y explica qué meter", () => enMochila(() => {
    esperar($("#contenido").textContent).contiene("Tu mochila está vacía");
  }, () => { S.casillero = {}; S.modulos.forEach(m => { delete m.carpetas; }); }));
  prueba("cada asignatura en su bloque, primero la que tocaste hace menos; las vacías, juntas aparte", () => enMochila(() => {
    esperar(mcTit().slice(0, 2)).igualA(["Bases de Datos", "Programación"]);
    esperar(mcTit().length).igualA(3);
    esperar($(".mc-vacios").textContent).contiene("FOL");
  }));
  prueba("en el bloque, las carpetas van delante y lo de dentro no se repite fuera", () => enMochila(() => {
    const bd = document.querySelector('.mc-sec[data-soltar-mod="bd"]');
    esperar([...bd.querySelectorAll(".mc-carpeta .mc-t")].map(x => x.textContent)).igualA(["Tema 3 · SQL", "Tema 2 · Modelo E-R"]);
    esperar(bd.querySelectorAll(".mc-tarjeta").length).igualA(1);
    esperar(bd.querySelector(".mc-carpeta").textContent).contiene("2 cosas");
  }));
  prueba("buscar encuentra también lo que está dentro de una carpeta, y dice en cuál", () => enMochila(() => {
    mcBusca = "join"; pinta();
    const t = document.querySelectorAll(".mc-tarjeta");
    esperar(t.length).igualA(1);
    esperar(t[0].textContent).contiene("Tema 3 · SQL");
    mcBusca = "no existe"; pinta();
    esperar($("#contenido").textContent).contiene("Nada con «no existe»");
  }));
  prueba("filtrar por tipo enseña solo ese tipo", () => enMochila(() => {
    S.casillero.f = mcDoc("f", "pro", { tipo: "archivo", titulo: "notas.txt", mime: "text/plain", datos: "data:text/plain;base64,aG9sYQ==" });
    pinta();
    document.querySelector('[data-mc-tipo="Texto"]').click();
    esperar([...document.querySelectorAll(".mc-tarjeta .mc-t")].map(x => x.textContent)).igualA(["notas.txt"]);
  }));
});

grupo("Mochila: carpetas por tema", () => {
  prueba("dentro de una asignatura: sus carpetas, «Nueva carpeta» y lo de fuera por tipos", () => enMochila(() => {
    document.querySelector('[data-mc-mod="bd"]').click();
    esperar(document.querySelectorAll(".mc-carpetas .mc-carpeta:not(.mc-nueva)").length).igualA(2);
    esperar(!!$('.mc-carpetas [data-mc-nueva="bd"]')).cierto();
    esperar($("#contenido").textContent).contiene("Fuera de carpetas");
    esperar([...document.querySelectorAll(".mc-filtrada .mc-tarjeta .mc-t")].map(x => x.textContent)).igualA(["Normalizar tablas"]);
  }));
  prueba("crear una carpeta la guarda con la asignatura y te deja dentro", () => enMochila(() => {
    mcDlgCarpeta("bd");
    esperar($("#dlgTit").textContent).contiene("Nueva carpeta en Bases de Datos");
    $("#mcNomCarpeta").value = "  Tema 4   ·  Normalización ";
    [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Crear").click();
    const c = modPorId("bd").carpetas.find(x => x.nombre === "Tema 4 · Normalización");
    esperar(!!c).cierto();
    esperar(mcCarpeta).igualA(c.id);
    esperar($(".mc-migas b").textContent).igualA("Tema 4 · Normalización");
    esperar(JSON.stringify(empaqueta("ajustes"))).contiene("Tema 4 · Normalización");
  }));
  prueba("sin nombre o con un nombre repetido, no se crea y la ventana sigue abierta", () => enMochila(() => {
    mcDlgCarpeta("bd");
    $("#mcNomCarpeta").value = "   ";
    [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Crear").click();
    esperar($("#dlg").open).cierto();
    $("#mcNomCarpeta").value = "tema 3 · sql";
    [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Crear").click();
    esperar($("#dlg").open).cierto();
    esperar(modPorId("bd").carpetas.length).igualA(2);
  }));
  prueba("dentro de una carpeta: lo suyo, el camino de vuelta, renombrar y borrar", () => enMochila(() => {
    document.querySelector('.mc-carpeta[data-mc-abrir="bd|t3"]').click();
    esperar([...document.querySelectorAll(".mc-tarjeta .mc-t")].map(x => x.textContent)).igualA(["Apuntes de JOIN", "SQLZoo"]);
    esperar(!!$('[data-mc-renombrar="bd|t3"]')).cierto();
    esperar(!!$('[data-mc-borrar-carpeta="bd|t3"]')).cierto();
    $('.mc-migas [data-mc-abrir="bd|"]').click();
    esperar(mcCarpeta).nulo();
    esperar(libroAbierto).igualA("bd");
  }));
  prueba("renombrar cambia el nombre y no lo de dentro", () => enMochila(() => {
    mcDlgCarpeta("bd", "t3");
    $("#mcNomCarpeta").value = "Tema 3 · Consultas";
    [...document.querySelectorAll("#dlgPie button")].find(b => b.textContent === "Guardar").click();
    esperar(modPorId("bd").carpetas[0].nombre).igualA("Tema 3 · Consultas");
    esperar(S.casillero.a.carpeta).igualA("t3");
  }));
  prueba("borrar una carpeta no borra lo de dentro: se queda en la asignatura, fuera", () => enMochila(async () => {
    const p = mcBorraCarpeta("bd", "t3"); await dormir(20);
    esperar($("#cfTxt").textContent).contiene("no se borra");
    $('#dlgConfirmar [data-cf="si"]').click(); await p;
    esperar(modPorId("bd").carpetas.map(c => c.id)).igualA(["t2"]);
    esperar(!!S.casillero.a && !!S.casillero.b).cierto();
    esperar(S.casillero.a.carpeta).igualA("");
    esperar(S.casillero.a.modId).igualA("bd");
  }));
  prueba("«Mover» lleva una cosa a otra carpeta o a otra asignatura", () => enMochila(() => {
    document.querySelector('[data-mc-mover="c"]').click();
    esperar(document.querySelectorAll("#dlgCuerpo [data-mc-mover-a]").length).igualA(6);
    $('#dlgCuerpo [data-mc-mover-a="bd|t2"]').click();
    esperar(S.casillero.c.carpeta).igualA("t2");
    esperar($("#dlg").open).falso();
    mcMover(S.casillero.c, "pro", "");
    esperar([S.casillero.c.modId, S.casillero.c.carpeta]).igualA(["pro", ""]);
  }));
  prueba("arrastrar una tarjeta encima de una carpeta la mete dentro", () => enMochila(() => {
    document.querySelector('[data-mc-mod="bd"]').click();
    const dt = new DataTransfer();
    document.querySelector('.mc-tarjeta[data-mc-doc="c"]').dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
    const z = document.querySelector('.mc-carpeta[data-soltar-carpeta="t2"]');
    z.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    z.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    esperar(S.casillero.c.carpeta).igualA("t2");
  }));
  prueba("subir desde dentro de una carpeta lo guarda en ella", () => enMochila(async () => {
    const tenia = almacen; almacen = null;
    try {
      document.querySelector('.mc-carpeta[data-mc-abrir="bd|t2"]').click();
      const i = $("#inputArchivo"), b = document.querySelector("[data-mc-meter-carpeta]");
      i.click = () => {};                                 /* sin abrir el selector de archivos de verdad */
      b.click();
      esperar([mcDestino, mcCarpetaDestino]).igualA(["bd", "t2"]);
      const dt = new DataTransfer(); dt.items.add(new File(["SELECT 1;"], "consulta.sql", { type: "text/plain" }));
      i.files = dt.files; i.dispatchEvent(new Event("change", { bubbles: true }));
      await hasta(() => Object.values(S.casillero).some(d => d.titulo === "consulta.sql"));
      const d = Object.values(S.casillero).find(x => x.titulo === "consulta.sql");
      esperar([d.modId, d.carpeta]).igualA(["bd", "t2"]);
      esperar(mcCarpetaSubida).igualA("");
    } finally { almacen = tenia; }
  }));
  prueba("soltar un archivo encima de una carpeta lo guarda en ella", () => enMochila(async () => {
    const tenia = almacen; almacen = null;
    try {
      document.querySelector('[data-mc-mod="bd"]').click();
      const dt = new DataTransfer(); dt.items.add(new File(["hola"], "nota.txt", { type: "text/plain" }));
      document.querySelector('.mc-carpeta[data-soltar-carpeta="t3"]').dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      await hasta(() => Object.values(S.casillero).some(d => d.titulo === "nota.txt"));
      esperar(Object.values(S.casillero).find(d => d.titulo === "nota.txt").carpeta).igualA("t3");
    } finally { almacen = tenia; }
  }));
  prueba("un enlace guardado dentro de una carpeta se queda en ella", () => enMochila(() => {
    document.querySelector('.mc-carpeta[data-mc-abrir="bd|t2"]').click();
    document.querySelector("[data-cas-enlace]").click();
    $("#dTitulo").value = "Diagramas E-R"; $("#dUrl").value = "https://ejemplo.es/er";
    $("#btnAddEnlace").click();
    const d = Object.values(S.casillero).find(x => x.titulo === "Diagramas E-R");
    esperar([d.modId, d.carpeta]).igualA(["bd", "t2"]);
  }));
  prueba("lo que apunta a una carpeta que ya no existe se ve fuera, no se pierde", () => enMochila(() => {
    S.casillero.c.carpeta = "fantasma"; libroAbierto = "bd"; pinta();
    esperar([...document.querySelectorAll(".mc-filtrada .mc-tarjeta .mc-t")].map(x => x.textContent)).contiene("Normalizar tablas");
  }));
  prueba("abrir una hoja desde otra sección abre su carpeta", () => enMochila(() => {
    abrirLibro("bd", "a");
    esperar(mcCarpeta).igualA("t3");
    esperar(!!$('.mc-tarjeta.resaltada[data-mc-doc="a"]')).cierto();
  }));
  prueba("el nombre de una carpeta no cuela HTML", () => enMochila(() => {
    modPorId("bd").carpetas[0].nombre = "<img src=x onerror=alert(1)>"; pinta();
    esperar(!!document.querySelector(".mc-carpeta img")).falso();
    esperar($(".mc-carpeta .mc-t").textContent).contiene("<img");
  }));
});
