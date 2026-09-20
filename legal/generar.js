/* Los papeles dentro de la app: lee legal/*.md del repo, los pasa a HTML y los
   mete en Ajustes → Legal. Los .md mandan: cada vez que cambien, se vuelve a
   pasar este script y la app se actualiza sola. */
const fs = require("fs");
const path = require("path");

const CARPETA = __dirname;
const DOCS = [
  ["privacidad", "PRIVACIDAD.md", "Privacidad", "Qué datos se guardan, dónde viven y cómo borrarlos"],
  ["ia", "IA.md", "Cómo funciona el profe", "Que es una máquina, qué se le manda y en qué se equivoca"],
  ["terminos", "TERMINOS.md", "Términos de uso", "Las reglas entre tú y GritNook"],
  ["aviso-legal", "AVISO-LEGAL.md", "Aviso legal", "Quién está detrás de la aplicación"]
];
const ES_DOC = { "PRIVACIDAD.md": "privacidad", "IA.md": "ia", "TERMINOS.md": "terminos", "AVISO-LEGAL.md": "aviso-legal" };

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* negritas, enlaces entre documentos y los huecos por rellenar */
function linea(s) {
  let t = esc(s);
  t = t.replace(/\[((?:RELLENAR|PENDIENTE)[^\]]*)\]/g, (m, x) => '<mark class="lg-falta">' + x + "</mark>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, texto, destino) => {
    const d = ES_DOC[destino.replace(/^\.\//, "")];
    if (d) return '<button type="button" class="lg-enlace" data-lg="' + d + '">' + texto + "</button>";
    return '<span class="lg-ref">' + texto + "</span>";
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return t;
}

function aHtml(md) {
  const lineas = md.split(/\r?\n/);
  const out = [];
  let i = 0, titulo = "", parrafo = [], lista = [];
  const cierraParrafo = () => { if (parrafo.length) { out.push("<p>" + linea(parrafo.join(" ")) + "</p>"); parrafo = []; } };
  const cierraLista = () => { if (lista.length) { out.push("<ul>" + lista.map(x => "<li>" + linea(x) + "</li>").join("") + "</ul>"); lista = []; } };
  const cierra = () => { cierraParrafo(); cierraLista(); };

  while (i < lineas.length) {
    const l = lineas[i];
    if (/^#\s+/.test(l)) { cierra(); titulo = l.replace(/^#\s+/, "").trim(); i++; continue; }
    if (/^##\s+/.test(l)) { cierra(); out.push("<h3>" + linea(l.replace(/^##\s+/, "").trim()) + "</h3>"); i++; continue; }
    if (/^\s*$/.test(l)) { cierra(); i++; continue; }
    /* tablas: cabecera, separador y filas */
    if (/^\|/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lineas[i + 1] || "")) {
      cierra();
      const celdas = f => f.trim().replace(/^\||\|$/g, "").split("|").map(x => linea(x.trim()));
      const cab = celdas(l); i += 2;
      const filas = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) { filas.push(celdas(lineas[i])); i++; }
      out.push('<div class="lg-tabla"><table><thead><tr>' + cab.map(c => "<th>" + c + "</th>").join("") + "</tr></thead><tbody>"
        + filas.map(f => "<tr>" + f.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>");
      continue;
    }
    if (/^-\s+/.test(l)) {
      cierraParrafo();
      let x = l.replace(/^-\s+/, "");
      while (/^\s{2,}\S/.test(lineas[i + 1] || "")) { x += " " + lineas[i + 1].trim(); i++; }
      lista.push(x); i++; continue;
    }
    cierraLista(); parrafo.push(l.trim()); i++;
  }
  cierra();
  return { titulo, html: out.join("") };
}

const legal = DOCS.map(([id, archivo, nombre, resumen]) => {
  const md = fs.readFileSync(path.join(CARPETA, archivo), "utf8");
  const { titulo, html } = aHtml(md);
  return { id, nombre, resumen, titulo, html };
});

/* ── meterlo en la app ── */
const APP = process.argv[2] || "escritorio-daw.html";
let s = fs.readFileSync(APP, "utf8");
const marcaIni = "const LEGAL = ", marcaFin = ";\nlet lgAbierto = null;";
const constante = marcaIni + JSON.stringify(legal) + marcaFin;

function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error("ESPERABA 1, HAY " + n + ": " + JSON.stringify(a.slice(0, 90))); process.exit(1); }
  s = s.replace(a, () => b);
}

if (s.includes(marcaIni)) {
  /* ya está montado: solo se refrescan los textos */
  const a = s.indexOf(marcaIni), b = s.indexOf(marcaFin, a) + marcaFin.length;
  s = s.slice(0, a) + constante + s.slice(b);
  fs.writeFileSync(APP, s);
  console.log("textos actualizados");
  process.exit(0);
}

/* la pestaña */
rep(`["profe", "El profe"], ["aspecto", "Aspecto"], ["datos", "Datos"]];`,
    `["profe", "El profe"], ["aspecto", "Aspecto"], ["datos", "Datos"], ["legal", "Legal"]];`);
rep(`: ajTab === "crono" ? ajCrono() : ajTab === "profe" ? ajProfe(p) : ajTab === "aspecto" ? ajAspecto() : ajDatos()}\`;`,
    `: ajTab === "crono" ? ajCrono() : ajTab === "profe" ? ajProfe(p) : ajTab === "aspecto" ? ajAspecto()
    : ajTab === "legal" ? ajLegal() : ajDatos()}\`;`);

/* los documentos y su pantalla */
rep(`function ajDatos() {`,
`/* los papeles salen de legal/*.md del repositorio: se generan con aplicar-legal.js */
${constante}
function ajLegal() {
  const d = LEGAL.find(x => x.id === lgAbierto);
  if (d) return \`
  <section class="panel lg-doc">
    <button type="button" class="btn fantasma lg-volver" data-lg-volver>${"<svg viewBox=\"0 0 16 16\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.5 3.5 5 8l4.5 4.5\"/></svg>"}Todos los papeles</button>
    <h2 class="lg-titulo">\${esc(d.titulo)}</h2>
    <article class="lg-texto">\${d.html}</article>
  </section>\`;
  return \`
  <section class="panel">
    <div class="etq">Los papeles</div>
    <p class="meta" style="margin:6px 0 16px">Lo que la ley obliga a contarte, escrito para que se entienda. Aquí está qué se guarda, qué sale fuera y con qué reglas se juega.</p>
    <div class="lg-lista">
      \${LEGAL.map(x => \`<button type="button" class="lg-item" data-lg="\${x.id}">
        <span class="lg-item-txt"><span class="lg-nombre">\${esc(x.nombre)}</span><span class="lg-res">\${esc(x.resumen)}</span></span>
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5 11 8l-4.5 4.5"/></svg>
      </button>\`).join("")}
    </div>
    <p class="meta" style="margin:16px 0 0">Tus datos no se venden, no hay publicidad y no hay cookies. Lo puedes descargar o borrar todo en la pestaña de Datos.</p>
  </section>\`;
}

function ajDatos() {`);

/* pinchar en un papel, y volver */
rep(`  const tab = t.closest("[data-aj]"); if (tab) { ajTab = tab.dataset.aj; pinta(); return; }`,
`  const tab = t.closest("[data-aj]"); if (tab) { ajTab = tab.dataset.aj; lgAbierto = null; pinta(); return; }
  const lg = t.closest("[data-lg]"); if (lg) { lgAbierto = lg.dataset.lg; ajTab = "legal"; pinta(); window.scrollTo({ top: 0 }); return; }
  if (t.closest("[data-lg-volver]")) { lgAbierto = null; pinta(); return; }`);
rep(`  const aj = t.closest("[data-pn-aj]"); if (aj) { ajTab = aj.dataset.pnAj; pinta(); return; }`,
    `  const aj = t.closest("[data-pn-aj]"); if (aj) { ajTab = aj.dataset.pnAj; lgAbierto = null; pinta(); return; }`);

/* desde Datos se llega a la política */
rep(`    <p class="meta" style="margin:6px 0 0">Ocupan \${tam} KB, con \${Object.keys(S.apuntes || {}).length} apuntes y \${Object.keys(S.casillero || {}).length} documentos.</p>`,
`    <p class="meta" style="margin:6px 0 0">Ocupan \${tam} KB, con \${Object.keys(S.apuntes || {}).length} apuntes y \${Object.keys(S.casillero || {}).length} documentos.</p>
    <p class="meta" style="margin:10px 0 0">El detalle de qué se guarda y qué sale fuera está en <button type="button" class="lg-enlace" data-lg="privacidad">la política de privacidad</button>.</p>`);

/* estilos */
rep("\n</style>", `
/* ── los papeles: privacidad, términos y compañía ── */
.lg-lista{display:grid; gap:8px}
.lg-item{display:flex; align-items:center; justify-content:space-between; gap:14px; width:100%; text-align:left; cursor:pointer;
  padding:14px 16px; border:0; border-radius:var(--r-l); background:var(--surface-2); color:var(--ink); transition:background .12s, transform .12s}
.lg-item:hover{background:var(--surface-3); transform:translateX(2px)}
.lg-item svg{flex:0 0 auto; color:var(--ink-4)}
.lg-item-txt{display:grid; gap:3px; min-width:0}
.lg-nombre{font:600 14px/1.25 var(--sans)}
.lg-res{font:400 12.5px/1.4 var(--sans); color:var(--ink-3)}
.lg-volver{margin-bottom:16px}
.lg-titulo{font:600 23px/1.2 var(--sans); letter-spacing:-.015em; color:var(--ink); margin:0 0 4px}
.lg-texto{max-width:66ch; color:var(--ink-2); font:400 14px/1.65 var(--sans)}
.lg-texto h3{font:600 15.5px/1.3 var(--sans); color:var(--ink); letter-spacing:-.01em; margin:26px 0 8px}
.lg-texto h3:first-child{margin-top:14px}
.lg-texto p{margin:0 0 12px}
.lg-texto strong{color:var(--ink); font-weight:600}
.lg-texto ul{margin:0 0 12px; padding-left:18px; display:grid; gap:6px}
.lg-texto li{padding-left:2px}
.lg-texto li::marker{color:var(--ink-4)}
.lg-tabla{overflow-x:auto; margin:0 0 16px; border:1px solid var(--line); border-radius:var(--r-m)}
.lg-texto table{border-collapse:collapse; width:100%; font-size:13px}
.lg-texto th{text-align:left; font-weight:600; color:var(--ink); background:var(--surface-2); padding:9px 12px; white-space:nowrap}
.lg-texto td{padding:9px 12px; border-top:1px solid var(--line); vertical-align:top}
.lg-enlace{padding:0; border:0; background:none; cursor:pointer; font:inherit; color:var(--ink);
  text-decoration:underline; text-underline-offset:2px; text-decoration-color:var(--ink-4)}
.lg-enlace:hover{text-decoration-color:var(--ink)}
.lg-ref{color:var(--ink); font-weight:500}
.lg-falta{background:#FEF3C7; color:#92400E; padding:1px 6px; border-radius:4px; font-weight:500; font-size:.92em}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .lg-falta{background:rgba(245,158,11,.18); color:#FBBF24}}
:root[data-theme="dark"] .lg-falta{background:rgba(245,158,11,.18); color:#FBBF24}
@media (max-width:700px){.lg-texto{font-size:14.5px}}
</style>`);

fs.writeFileSync(APP, s);
const a = s.lastIndexOf("<script>"), b = s.lastIndexOf("</script>");
fs.writeFileSync("chk.js", s.slice(a + 8, b));
console.log("montado, " + legal.length + " papeles, " + Math.round(JSON.stringify(legal).length / 1024) + " KB");
