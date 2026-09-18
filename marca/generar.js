/* Logo de GritNook: «GritNook» en Inter SemiBold con las dos o cambiadas por anillas
   de libreta y un marcapáginas atado a la segunda. Las letras salen como trazos, así
   que el logo no depende de que la fuente esté cargada.
   Para regenerarlo: npm i opentype.js@1.3.4, deja al lado inter-600.woff
   (Inter SemiBold, de @fontsource/inter) y ejecuta node generar.js. */
const fs = require("fs");
const opentype = require("opentype.js");
const buf = fs.readFileSync(__dirname + "/inter-600.woff");
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const S = 64;                     // tamaño de trabajo en px
const k = S / font.unitsPerEm;
const TRACK = -0.02 * S;          // el mismo apretado que la marca en la app
const B = 0;                      // línea base; luego se recoloca con el viewBox
const r2 = n => Math.round(n * 100) / 100;

/* grosor del trazo de la o: distancia entre el contorno exterior y el interior */
function contornos(glyph) {
  const cajas = []; let c = null;
  for (const cmd of glyph.path.commands) {
    if (cmd.type === "M") c = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const [px, py] of [[cmd.x, cmd.y], [cmd.x1, cmd.y1], [cmd.x2, cmd.y2]]) {
      if (px === undefined) continue;
      c.x0 = Math.min(c.x0, px); c.x1 = Math.max(c.x1, px); c.y0 = Math.min(c.y0, py); c.y1 = Math.max(c.y1, py);
    }
    if (cmd.type === "Z") cajas.push(c);
  }
  return cajas.sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0));
}

let x = 0, prev = null, letras = "", minX = Infinity, maxX = -Infinity, minY = Infinity;
const anillas = [];
for (const ch of "GritNook") {
  const g = font.charToGlyph(ch);
  if (prev) x += font.getKerningValue(prev, g) * k;
  if (ch === "o") {
    const [fuera, dentro] = contornos(g);
    const lado = (dentro.x0 - fuera.x0) * k, arriba = (fuera.y1 - dentro.y1) * k;
    const sw = (lado + arriba) / 2 * 1.02;
    const x0 = x + fuera.x0 * k, x1 = x + fuera.x1 * k, yTop = B - fuera.y1 * k, yBot = B - fuera.y0 * k;
    anillas.push({ cx: (x0 + x1) / 2, cy: (yTop + yBot) / 2, rx: (x1 - x0 - sw) / 2, ry: (yBot - yTop - sw) / 2, sw });
  } else {
    const p = g.getPath(x, B, S), c = p.getBoundingBox();
    letras += p.toPathData(2);
    minX = Math.min(minX, c.x1); maxX = Math.max(maxX, c.x2); minY = Math.min(minY, c.y1);
  }
  x += g.advanceWidth * k + TRACK;
  prev = g;
}

/* el marcapáginas: atado a la segunda anilla y colgando por debajo de la línea base */
const a2 = anillas[1];
const cw = 0.19 * S, muesca = 0.075 * S;
const cTop = a2.cy + a2.ry - a2.sw * 0.2, cBot = B + 0.52 * S;
const cinta = `M${r2(a2.cx - cw / 2)} ${r2(cTop)}H${r2(a2.cx + cw / 2)}V${r2(cBot)}L${r2(a2.cx)} ${r2(cBot - muesca)}L${r2(a2.cx - cw / 2)} ${r2(cBot)}Z`;

/* caja: de la G a la k, y de lo más alto de las letras al pie de la cinta */
const viewBox = [minX, minY, maxX - minX, cBot - minY].map(r2).join(" ");

const geo = { viewBox, letras, cinta, anillas: anillas.map(a => ({ cx: r2(a.cx), cy: r2(a.cy), rx: r2(a.rx), ry: r2(a.ry), sw: r2(a.sw) })) };
fs.writeFileSync(__dirname + "/marca.json", JSON.stringify(geo));

/* SVG sueltos, con colores fijos, para el README, redes y lo que haga falta */
function svg(tinta, acento, roja, fondo) {
  const an = geo.anillas.map(a => `<ellipse cx="${a.cx}" cy="${a.cy}" rx="${a.rx}" ry="${a.ry}" fill="none" stroke="${acento}" stroke-width="${a.sw}"/>`).join("");
  const pad = 14, [x0, y0, w, h] = viewBox.split(" ").map(Number);
  const vb = fondo ? `${r2(x0 - pad)} ${r2(y0 - pad)} ${r2(w + 2 * pad)} ${r2(h + 2 * pad)}` : viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="GritNook">`
    + (fondo ? `<rect x="${r2(x0 - pad)}" y="${r2(y0 - pad)}" width="${r2(w + 2 * pad)}" height="${r2(h + 2 * pad)}" fill="${fondo}"/>` : "")
    + `<path d="${letras}" fill="${tinta}"/><path d="${cinta}" fill="${roja}"/>${an}</svg>\n`;
}
fs.writeFileSync(__dirname + "/gritnook-oscuro.svg", svg("#E9E9ED", "#B5ABFC", "#F0616A", null));
fs.writeFileSync(__dirname + "/gritnook-tarjeta.svg", svg("#E9E9ED", "#B5ABFC", "#F0616A", "#161826"));
fs.writeFileSync(__dirname + "/gritnook-claro.svg", svg("#292B31", "#5D5294", "#D23B47", null));

/* el icono: la anilla con su cinta, en las mismas proporciones que en el nombre
   (la cinta, algo más corta para que en 16 px la anilla no se quede diminuta) */
function icono(tam, { fondo, anilla, roja, redondo, alto }) {
  const a = geo.anillas[1], ancho = (a.rx + a.sw / 2) * 2, aspecto = (a.ry + a.sw / 2) * 2 / ancho;
  const D = tam * alto / (aspecto + 0.55), f = D / ancho;
  const H = D * aspecto + 0.55 * D, top = (tam - H) / 2;
  const cx = tam / 2, cy = top + D * aspecto / 2, rx = a.rx * f, ry = a.ry * f, sw = a.sw * f;
  const w = cw * f, m = muesca * f, t = cy + ry - sw * 0.2, b = top + H;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}">`
    + `<rect width="${tam}" height="${tam}" rx="${redondo ? r2(tam * 0.225) : 0}" fill="${fondo}"/>`
    + `<path d="M${r2(cx - w / 2)} ${r2(t)}H${r2(cx + w / 2)}V${r2(b)}L${r2(cx)} ${r2(b - m)}L${r2(cx - w / 2)} ${r2(b)}Z" fill="${roja}"/>`
    + `<ellipse cx="${r2(cx)}" cy="${r2(cy)}" rx="${r2(rx)}" ry="${r2(ry)}" fill="none" stroke="${anilla}" stroke-width="${r2(sw)}"/></svg>
`;
}
const oscuro = { fondo: "#161826", anilla: "#B5ABFC", roja: "#F0616A" };
fs.writeFileSync(__dirname + "/icono.svg", icono(48, { ...oscuro, redondo: true, alto: 0.74 }));
fs.writeFileSync(__dirname + "/icono-cuadrado.svg", icono(512, { ...oscuro, redondo: false, alto: 0.7 }));
fs.writeFileSync(__dirname + "/icono-maskable.svg", icono(512, { ...oscuro, redondo: false, alto: 0.6 }));
console.log(JSON.stringify({ viewBox, anillas: geo.anillas, cinta, largoLetras: letras.length }));
