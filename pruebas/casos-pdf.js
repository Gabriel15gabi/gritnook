/* Las vistas previas: la primera página de un PDF y las primeras líneas de
   un texto o de un archivo de código. */

/* Un PDF mínimo pero válido: catálogo, páginas y un rectángulo azul dentro.
   Dibuja una forma y no texto a propósito: pintar texto obliga a PDF.js a
   bajarse las tipografías estándar, y sin ellas se queda esperando para
   siempre. Una forma no necesita nada de fuera. */
function pdfDePrueba(paginas = 1) {
  const contenido = "0.15 0.35 0.9 rg 20 20 160 160 re f";
  const objetos = ["<</Type/Catalog/Pages 2 0 R>>", null];
  const kids = [];
  for (let i = 0; i < paginas; i++) {
    const idPagina = 3 + i * 2, idFlujo = idPagina + 1;
    kids.push(idPagina + " 0 R");
    objetos[idPagina - 1] = "<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents " + idFlujo + " 0 R/Resources<<>>>>";
    objetos[idFlujo - 1] = "<</Length " + contenido.length + ">>stream\n" + contenido + "\nendstream";
  }
  objetos[1] = "<</Type/Pages/Kids[" + kids.join(" ") + "]/Count " + paginas + ">>";

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objetos.forEach((o, i) => { offsets.push(pdf.length); pdf += (i + 1) + " 0 obj" + o + "endobj\n"; });
  const xref = pdf.length;
  pdf += "xref\n0 " + (objetos.length + 1) + "\n0000000000 65535 f \n" +
    offsets.map(o => String(o).padStart(10, "0") + " 00000 n \n").join("");
  pdf += "trailer<</Size " + (objetos.length + 1) + "/Root 1 0 R>>\nstartxref\n" + xref + "\n%%EOF";
  return new Blob([pdf], { type: "application/pdf" });
}

/* PDF.js se baja de internet y, además, la PRIMERA página que dibuja tarda
   una barbaridad: monta su motor y prepara sus tablas, y puede pasar de diez
   segundos. Las siguientes van finas.

   Por eso se hace una sola vez: se carga la librería y se dibuja un PDF de
   calentamiento con mucha manga ancha. Si sale, los casos van sobre seguro;
   si no sale —sin red, por ejemplo—, se quedan en pendiente con su motivo en
   lugar de dejar el banco colgado.

   No hay topes en cada caso a propósito: en el navegador sin ventana el reloj
   va virtual y adelanta en cuanto no queda nada pendiente, así que un
   setTimeout de doce segundos salta al instante aunque el PDF se esté
   dibujando. En la carga de aquí abajo sí vale, porque mientras la petición
   de red está en el aire el reloj virtual se para. */
let __pdfjs = null;
async function conPdfjs() {
  if (__pdfjs === null) {
    __pdfjs = await Promise.race([
      (async () => {
        const lib = await cargarPdfjs();
        if (!lib) return "no ha cargado";
        /* Aquí se dibuja, y solo aquí. Un navegador sin ventana y sin tarjeta
           gráfica tarda segundos en pintar una página, así que las dos únicas
           veces que hace falta se hacen ahora y los casos miran el resultado.
           Lo que no necesita dibujo —contar páginas, leer un PDF roto— sí se
           hace en cada caso, porque eso es solo leer. */
        const mini = await miniPdf(await pdfDePrueba().arrayBuffer());
        const previa = await previaDe(pdfDePrueba(), "application/pdf", "sin-extension");
        return { lib, mini, previa };
      })().catch(e => "ha fallado (" + ((e && e.message) || e) + ")"),
      new Promise(ok => setTimeout(() => ok("tarda demasiado: sin conexión o el navegador va muy justo"), 40000))
    ]);
  }
  if (typeof __pdfjs === "string") saltar("PDF.js " + __pdfjs);
  return __pdfjs;
}

grupo("Vistas previas: PDF", () => {
  prueba("el PDF de prueba es un PDF de verdad", async () => {
    const b = pdfDePrueba();
    esperar(b.type).igualA("application/pdf");
    const texto = await b.text();
    esperar(texto.slice(0, 8)).igualA("%PDF-1.4");
    esperar(texto).contiene("%%EOF");
    esperar(texto).contiene("/Type/Catalog");
  });

  prueba("PDF.js abre el documento y cuenta sus páginas", async () => {
    await conPdfjs();
    const doc = await abrirPdf(await pdfDePrueba().arrayBuffer());
    esperar(doc.numPages).igualA(1);
    doc.destroy();
  });

  prueba("de un PDF sale una miniatura de su primera página", async () => {
    const { mini: r } = await conPdfjs();
    esperar(r.paginas).igualA(1);
    esperar(r.mini).contiene("data:image/jpeg");
    /* que no sea una imagen vacía de cuatro bytes */
    esperar(r.mini.length > 1000).cierto();
  });

  prueba("un PDF de tres páginas dice que tiene tres", async () => {
    await conPdfjs();
    /* contar páginas es solo leer el documento: no hace falta dibujarlo */
    const doc = await abrirPdf(await pdfDePrueba(3).arrayBuffer());
    esperar(doc.numPages).igualA(3);
    doc.destroy();
  });

  prueba("se reconoce como PDF aunque el nombre no lleve extensión", async () => {
    const { previa } = await conPdfjs();
    esperar(previa.paginas).igualA(1);
    esperar(previa.mini).contiene("data:image/jpeg");
  });

  prueba("un PDF roto no revienta: se queda sin vista previa", async () => {
    await conPdfjs();
    const roto = new Blob(["%PDF-1.4 esto no es un PDF de verdad"], { type: "application/pdf" });
    const r = await previaDe(roto, "application/pdf", "roto.pdf");
    esperar(typeof r).igualA("object");
    esperar(r.mini).igualA(undefined);
  });

  prueba("la miniatura se pinta en la hoja del casillero", async () => {
    const { mini: r } = await conPdfjs();
    const html = papelHTML({ id: "d1", titulo: "apuntes.pdf", mini: r.mini, paginas: r.paginas }, "PDF");
    esperar(html).contiene("hj-pag");
    esperar(html).contiene("1 pág.");
  });

  prueba("en la hoja, el plural de las páginas está bien escrito", () => {
    esperar(papelHTML({ id: "d2", titulo: "tema.pdf", mini: "data:image/jpeg;base64,x", paginas: 12 }, "PDF")).contiene("12 págs.");
    esperar(papelHTML({ id: "d3", titulo: "una.pdf", mini: "data:image/jpeg;base64,x", paginas: 1 }, "PDF")).contiene("1 pág.");
  });
});

grupo("Vistas previas: textos y código", () => {
  prueba("de un texto salen sus primeras líneas", async () => {
    const b = new Blob(["primera\nsegunda\ntercera"], { type: "text/plain" });
    const r = await previaDe(b, "text/plain", "notas.txt");
    esperar(r.extracto).contiene("primera");
    esperar(r.extracto).contiene("tercera");
  });

  prueba("de un texto larguísimo solo se guarda un trozo", async () => {
    const b = new Blob([("línea de texto\n").repeat(5000)], { type: "text/plain" });
    const r = await previaDe(b, "text/plain", "gordo.txt");
    esperar(r.extracto.length <= 900).cierto();
    esperar(r.extracto.split("\n").length <= 16).cierto();
  });

  prueba("las líneas muy largas se cortan para que no descuadren", async () => {
    const b = new Blob(["x".repeat(500)], { type: "text/plain" });
    const r = await previaDe(b, "text/plain", "ancho.txt");
    esperar(r.extracto.length <= 80).cierto();
  });

  prueba("un archivo de código enseña su código", async () => {
    const b = new Blob(["SELECT a.nombre\nFROM alumnos a\nJOIN matriculas m ON m.alumno = a.id;"], { type: "text/plain" });
    const r = await previaDe(b, "text/plain", "consulta.sql");
    esperar(r.extracto).contiene("JOIN");
  });

  prueba("una foto no lleva extracto: se ve la foto", async () => {
    const b = new Blob(["no importa"], { type: "image/png" });
    const r = await previaDe(b, "image/png", "foto.png");
    esperar(r.extracto).igualA(undefined);
  });

  prueba("un archivo vacío da un extracto vacío, no un error", async () => {
    const r = await previaDe(new Blob([], { type: "text/plain" }), "text/plain", "vacio.txt");
    esperar(typeof r).igualA("object");
  });

  prueba("el extracto se escapa al pintarlo", () => {
    const html = papelHTML({ id: "d4", titulo: "x.txt", extracto: '<script>alert(1)<\/script>' }, "Texto");
    esperar(html).noContiene("<script>");
    esperar(html).contiene("&lt;script&gt;");
  });

  prueba("de un enlace se enseña su dominio, sin el www", () => {
    const html = papelHTML({ id: "d5", titulo: "Apuntes", url: "https://www.ejemplo.com/ruta/larga?x=1" }, "Enlace");
    esperar(html).contiene("ejemplo.com");
    esperar(html).noContiene("ruta/larga");
  });

  prueba("un enlace que no es un enlace no rompe la hoja", () => {
    esperar(papelHTML({ id: "d6", titulo: "x", url: "esto no es una dirección" }, "Enlace")).contiene("hj-papel");
  });

  prueba("sin vista previa se enseña la etiqueta del tipo", () => {
    const html = papelHTML({ id: "d7", titulo: "algo.zip" }, "Archivo");
    esperar(html).contiene("hj-tipo");
    esperar(html).contiene("Archivo");
  });
});
