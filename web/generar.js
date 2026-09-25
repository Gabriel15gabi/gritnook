/* Las páginas públicas de gritnook.com, las que lee Google: la presentación
   para opositores, la de estudiar y trabajar, los papeles (sacados de legal/*.md), la página 404, el mapa de la
   web y robots.txt. La app sigue en la raíz (index.html) y no se toca.

       node web/generar.js

   Todo sale de aquí: si cambia un texto, se cambia aquí (o en legal/*.md) y
   se vuelve a pasar. No hace falta instalar nada. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RAIZ = path.join(__dirname, "..");
const WEB = "https://gritnook.com";
const REPO = "https://github.com/Gabriel15gabi/gritnook/blob/main/";
const HOY = new Date().toISOString().slice(0, 10);
const AÑO = new Date().getFullYear();
const version = f => crypto.createHash("sha1").update(fs.readFileSync(path.join(RAIZ, f))).digest("hex").slice(0, 8);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ── iconos: trazo fino, como los de la app ── */
const ICO = {
  libro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M8 7.5h8M8 11h6"/>',
  frio: '<path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5"/><path d="m9.5 3.8 2.5 2.4 2.5-2.4M9.5 20.2l2.5-2.4 2.5 2.4"/>',
  ritmo: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m8 15 2.5 2.5L16 12.5"/>',
  diana: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
  balanza: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/>',
  bolas: '<circle cx="7.5" cy="15.5" r="4"/><circle cx="16.5" cy="15.5" r="4"/><circle cx="12" cy="7.5" r="4"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.3 2.2"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
  crono: '<circle cx="12" cy="13.5" r="8"/><path d="M12 9.5v4l2.5 1.5M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
  meta: '<path d="M4 20V4M4 20h16"/><path d="m7.5 15 3.5-4 3 2.5 5-6.5"/>',
  libreta: '<rect x="5" y="3" width="15" height="18" rx="2.5"/><path d="M9 3v18M3 7.5h4M3 12h4M3 16.5h4M12.5 8h4.5M12.5 12h4.5"/>'
};
const icono = n => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICO[n]}</svg></span>`;
const tarjeta = (ico, t, p) => `<div class="tarjeta">${icono(ico)}<h3>${t}</h3><p>${p}</p></div>`;
const movil = (src, alt, cargaYa) => `<figure class="movil"><img src="${src}" width="390" height="844" alt="${esc(alt)}"${cargaYa ? ' fetchpriority="high"' : ' loading="lazy"'}></figure>`;
const faq = lista => `<div class="faq">${lista.map(([p, r]) => `<details><summary>${p}</summary><div><p>${r}</p></div></details>`).join("")}</div>`;
const faqLD = lista => ({ "@type": "FAQPage", mainEntity: lista.map(([p, r]) => ({ "@type": "Question", name: p, acceptedAnswer: { "@type": "Answer", text: r.replace(/<[^>]+>/g, "") } })) });
const EMPEZAR = `<a class="btn primario" href="/">Empieza gratis</a>`;

/* ── el marco de todas las páginas ── */
const NAV = [["/oposiciones/", "Oposiciones"], ["/estudiar-y-trabajar/", "Estudiar y trabajar"]];
const LEGALES = [["/privacidad/", "Privacidad"], ["/terminos/", "Términos"], ["/aviso-legal/", "Aviso legal"], ["/ia/", "La inteligencia artificial"]];
const LOGO = `<picture><source srcset="/marca/gritnook-claro.svg" media="(prefers-color-scheme: light)"><img src="/marca/gritnook-oscuro.svg" width="112" height="35" alt="GritNook"></picture>`;
const CSS = "/web/web.css?v=" + version("web/web.css");

function pagina({ ruta, titulo, tituloOg, descripcion, cuerpo, ld = [], noindex = false, scripts = "" }) {
  const url = WEB + ruta;
  const datos = ld.length ? `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": ld }).replace(/</g, "\\u003c")}</script>\n` : "";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
${noindex ? '<meta name="robots" content="noindex, follow">\n' : ""}<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="GritNook">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(tituloOg || titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${WEB}/web/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="GritNook: el estudio que se adapta a tu vida">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#161826">
<link rel="icon" href="/iconos/icono.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/iconos/icono-180.png">
<link rel="preload" href="/fuentes/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fuentes/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${CSS}">
${datos}</head>
<body>
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="cab"><div class="ancho">
  <a class="marca" href="/" aria-label="GritNook, ir a la app">${LOGO}</a>
  <nav aria-label="Principal">${NAV.map(([h, t]) => `<a class="opc" href="${h}"${h === ruta ? ' aria-current="page"' : ""}>${t}</a>`).join("")}<a class="btn" href="/">Entrar</a></nav>
</div></header>
<main id="contenido">
${cuerpo}
</main>
<footer class="pie"><div class="ancho">
  <div><p><strong>GritNook</strong> · El estudio que se adapta a tu vida.</p><p>© ${AÑO} GritNook · Gratis y sin publicidad · Tus datos en la Unión Europea</p></div>
  <nav aria-label="Qué es GritNook">${NAV.map(([h, t]) => `<a href="${h}">${t === "Oposiciones" ? "Para opositores" : t}</a>`).join("")}<a href="/">Entrar</a></nav>
  <nav aria-label="Legal">${LEGALES.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}</nav>
</div></footer>
${scripts}</body>
</html>
`;
}
const ORG = { "@type": "Organization", "@id": WEB + "/#org", name: "GritNook", url: WEB + "/", logo: WEB + "/iconos/icono-512.png" };
const APP = { "@type": "WebApplication", "@id": WEB + "/#app", name: "GritNook", url: WEB + "/", applicationCategory: "EducationalApplication",
  operatingSystem: "Web, Android, iOS, Windows, macOS", inLanguage: "es", isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, publisher: { "@id": WEB + "/#org" } };

/* ══════════════════ para opositores ══════════════════ */
const FAQ_OPO = [
  ["¿Es gratis?", "Sí. GritNook es gratis y no tiene publicidad. Te haces una cuenta con tu correo y lo tuyo te sigue del móvil al ordenador."],
  ["¿Sirve para mi oposición?", "Sirve para cualquier oposición con temario: pegas el índice del tuyo y pones las reglas de tu convocatoria (preguntas, opciones, lo que resta un fallo y la nota de corte). Si tu examen tiene tema a desarrollar, también calcula las bolas."],
  ["¿Qué son los aciertos netos?", `Tus aciertos menos lo que te quitan los fallos. Con 4 opciones lo normal es que cada fallo reste 1/3: 70 aciertos y 18 fallos son 70 − 18 × 1/3 = 64 aciertos netos. Es la cifra que se compara con la nota de corte, y GritNook te la calcula en cada simulacro.`],
  ["¿Puedo usarla si trabajo?", "Para eso está pensada. Le dices qué días puedes y cuántas horas a la semana, y el plan se ajusta a eso. Si hoy no te toca, te lo dice; si solo tienes 25 minutos, también cuentan."],
  ["¿Funciona en el móvil?", "Sí. Se abre en el navegador y se puede instalar como una app en Android, iPhone y el ordenador, sin pasar por ninguna tienda."],
  ["¿Dónde se guardan mis datos?", `En tu cuenta, en servidores de la Unión Europea (Irlanda). No se venden ni se usan para publicidad. Los detalles están en la <a href="/privacidad/">política de privacidad</a>.`]
];
const OPOSICIONES = {
  ruta: "/oposiciones/",
  titulo: "App para opositores: temario, vueltas y simulacros | GritNook",
  tituloOg: "GritNook para opositores: tu temario por vueltas y tus simulacros contra el corte",
  descripcion: "Pega el índice del temario y GritNook te dice qué temas tocan cada día, cuáles se enfrían y si llegas a tus vueltas. Simulacros con aciertos netos. Gratis.",
  ld: [ORG, APP, { "@type": "WebPage", "@id": WEB + "/oposiciones/", url: WEB + "/oposiciones/", name: "GritNook para opositores", inLanguage: "es", about: { "@id": WEB + "/#app" } }, faqLD(FAQ_OPO)],
  cuerpo: `<div class="ancho">
<section class="hero">
  <div>
    <p class="eyebrow">Para opositores</p>
    <h1>Prepara la oposición con un plan que cabe <em>en tu vida</em></h1>
    <p class="lead">Pega el índice de tu temario y GritNook te dice cada día qué temas tocan, cuáles se te están enfriando y si llegas a las vueltas que quieres dar antes del examen. Con las horas que de verdad tienes, aunque trabajes.</p>
    <div class="acciones">${EMPEZAR}<a class="btn" href="/estudiar-y-trabajar/">Si además trabajas</a></div>
    <p class="nota-pie">Gratis · Sin publicidad · En el móvil y en el ordenador</p>
  </div>
  ${movil("/capturas/movil/oposicion.jpg", "La pantalla de oposición de GritNook: el temario por vueltas, el último simulacro en aciertos netos y los temas al día que hacen falta", true)}
</section>

<section>
  <h2>Todo lo que llevas de cabeza, <em>en un sitio</em></h2>
  <p class="sub">Lo que cambia de una convocatoria a otra —preguntas, opciones, lo que resta un fallo, la nota de corte— lo pones tú. El resto lo calcula GritNook.</p>
  <div class="rejilla">
    ${tarjeta("libro", "Tu temario, por vueltas", "Pegas el índice y cada tema lleva sus vueltas: 1.ª, 2.ª, 3.ª o dominado. De un vistazo ves qué está sin empezar y qué tienes listo.")}
    ${tarjeta("frio", "Los temas que se enfrían", "Si hace semanas que no tocas un tema, te avisa antes de que se te olvide y te lo propone para repasar.")}
    ${tarjeta("ritmo", "El ritmo que necesitas", "Con la fecha del examen y las vueltas que quieres dar, sabes cuántos temas al día hacen falta y si a tu ritmo llegas a tiempo.")}
    ${tarjeta("diana", "Simulacros con aciertos netos", "Apuntas aciertos y fallos y sale tu nota con la penalización de tu convocatoria, comparada con la nota de corte.")}
    ${tarjeta("balanza", "¿Contesto o la dejo en blanco?", "Cuánto ganas de media arriesgando según las opciones que hayas descartado, y cuántas tienes que acertar para llegar al corte.")}
    ${tarjeta("bolas", "Tema a desarrollar", "Si en tu oposición sacan bolas, calcula cuántos temas necesitas llevar para tener un 90, 95 o 99 % de que salga uno tuyo.")}
  </div>
</section>

<section class="doble">
  ${movil("/capturas/movil/opo-simulacros.jpg", "Los simulacros en GritNook: la media de los últimos cinco, tu mejor nota en aciertos netos y cuánto arriesgas")}
  <div>
    <h2>Simulacros como <em>el de verdad</em></h2>
    <p class="sub">Con el tiempo del examen: 100 preguntas en 90 minutos son 54 segundos por pregunta. Al acabar apuntas cómo te ha ido y ves tu evolución.</p>
    <ul class="lista-ok">
      <li><strong>Tu media y tu mejor nota</strong>, sobre 10 y en aciertos netos.</li>
      <li><strong>La nota de corte en la gráfica</strong>, para ver cuándo la pasas.</li>
      <li><strong>Los temas donde fallas:</strong> apuntas de qué eran los fallos y salen tus temas flojos.</li>
      <li><strong>Cuánto arriesgas:</strong> qué parte contestas y cuánto aciertas de lo que contestas.</li>
    </ul>
  </div>
</section>

<section>
  <h2>Opositar <em>trabajando</em></h2>
  <p class="sub">Le dices qué días puedes y cuántas horas a la semana, y GritNook reparte el estudio en esos huecos. Si hoy no toca, te lo dice sin culpa; si solo tienes 25 minutos, también cuentan. <a href="/estudiar-y-trabajar/">Cómo funciona si estudias y trabajas</a>.</p>
</section>

<section>
  <h2>Empieza en <em>cinco minutos</em></h2>
  <ol class="pasos">
    <li><h3>Pega el índice del temario</h3><p>Tal cual viene en las bases: GritNook separa los temas y las partes.</p></li>
    <li><h3>Pon el examen</h3><p>Fecha, preguntas, opciones y lo que resta un fallo. Si algo no lo sabes aún, déjalo en blanco.</p></li>
    <li><h3>Estudia lo que toca</h3><p>Cada día ves los temas de hoy. Marca las vueltas y apunta tus simulacros.</p></li>
  </ol>
</section>

<section>
  <h2>Preguntas frecuentes</h2>
  ${faq(FAQ_OPO)}
</section>

<section class="final">
  <h2>Tu próxima vuelta <em>empieza hoy</em></h2>
  <p class="sub">Pega tu temario y mira qué te toca.</p>
  <div class="acciones">${EMPEZAR}</div>
</section>
</div>`
};

/* ══════════════════ estudiar y trabajar ══════════════════ */
const FAQ_TRABAJO = [
  ["¿Es gratis?", "Sí. GritNook es gratis y no tiene publicidad. Te haces una cuenta con tu correo y lo tuyo te sigue del móvil al ordenador."],
  ["¿Y si una semana no puedo?", "No pasa nada. El plan se hace para cada semana con lo que tienes: lo que no hiciste no se amontona, se vuelve a repartir según lo que peor llevas y lo que tiene examen."],
  ["¿Sirve para FP?", "Sí, empezó ahí: módulos con sus horas, las faltas de cada uno y el porcentaje que te permiten, y la nota que necesitas en lo que queda para aprobar o llegar a tu objetivo."],
  ["¿Funciona en el móvil?", "Sí. Se abre en el navegador y se puede instalar como una app en Android, iPhone y el ordenador, sin pasar por ninguna tienda."],
  ["¿Dónde se guardan mis datos?", `En tu cuenta, en servidores de la Unión Europea (Irlanda). No se venden ni se usan para publicidad. Los detalles están en la <a href="/privacidad/">política de privacidad</a>.`]
];
const TRABAJO = {
  ruta: "/estudiar-y-trabajar/",
  titulo: "Estudiar y trabajar: un plan de estudio con tus horas | GritNook",
  tituloOg: "GritNook: el estudio que se adapta a tu vida, aunque trabajes",
  descripcion: "Dile a GritNook qué días puedes y cuántas horas tienes, y te reparte el estudio en esos huecos: notas, exámenes, entregas y apuntes en un sitio. Gratis.",
  ld: [ORG, APP, { "@type": "WebPage", "@id": WEB + "/estudiar-y-trabajar/", url: WEB + "/estudiar-y-trabajar/", name: "Estudiar y trabajar con GritNook", inLanguage: "es", about: { "@id": WEB + "/#app" } }, faqLD(FAQ_TRABAJO)],
  cuerpo: `<div class="ancho">
<section class="hero">
  <div>
    <p class="eyebrow">Si estudias y trabajas</p>
    <h1>El estudio que se adapta <em>a tu vida</em>, no al revés</h1>
    <p class="lead">Si trabajas, un plan de estudiante a tiempo completo no te sirve. Le dices a GritNook qué días puedes y cuántas horas a la semana, y reparte lo que tienes que estudiar en esos huecos: más a lo que peor llevas y a lo que tiene examen pronto.</p>
    <div class="acciones">${EMPEZAR}<a class="btn" href="/oposiciones/">Si opositas</a></div>
    <p class="nota-pie">Gratis · Sin publicidad · En el móvil y en el ordenador</p>
  </div>
  ${movil("/capturas/movil/inicio.jpg", "El Inicio de GritNook un día de trabajo: «Hoy no toca estudiar: tu día es para el trabajo»", true)}
</section>

<section>
  <h2>Pensado para días <em>con poco hueco</em></h2>
  <p class="sub">Para FP, bachillerato, universidad, oposiciones, idiomas o un curso por tu cuenta. GritNook usa tus palabras: módulos, asignaturas, bloques o destrezas.</p>
  <div class="rejilla">
    ${tarjeta("reloj", "Tu tiempo, no el ideal", "Eliges si solo estudias o trabajas a media jornada o a jornada completa, las horas a la semana y los días que puedes ponerte.")}
    ${tarjeta("ritmo", "Un plan para cada semana", "Reparte bloques de 25 minutos en tus días: más a lo que peor llevas, a lo que tiene examen pronto y un repaso de lo que has dado en clase.")}
    ${tarjeta("sol", "Días de trabajo, días libres", "Si hoy no te toca, te lo dice: «tu día es para el trabajo». Y si te sobran 25 minutos, también cuentan.")}
    ${tarjeta("crono", "Un cronómetro que tacha solo", "Estudias con el cronómetro y el bloque del plan se marca como hecho, sin apuntar nada a mano.")}
    ${tarjeta("meta", "Lo que te falta para aprobar", "Con tus notas sabes qué necesitas en lo que queda para llegar a tu objetivo y, si tu centro cuenta faltas, cuántas te quedan.")}
    ${tarjeta("libreta", "Apuntes, agenda y repaso", "Una libreta para escribir y dibujar, tus exámenes y entregas con fecha, y tarjetas de repaso que vuelven cuando se te están olvidando.")}
  </div>
</section>

<section class="doble">
  ${movil("/capturas/movil/plan.jpg", "El plan de la semana de GritNook: bloques de estudio en los días que puedes, con el motivo de cada uno")}
  <div>
    <h2>Tu semana, <em>en tus días</em></h2>
    <p class="sub">El plan sale de tus horas a la semana, de los días que puedes, de tus exámenes y de lo que peor llevas. Cada día ves qué toca y empiezas con un toque.</p>
    <ul class="lista-ok">
      <li><strong>Bloques de 25 minutos</strong>, juntos por asignatura.</li>
      <li><strong>El motivo de cada uno:</strong> examen en 6 días, vas justo, repasa lo de hoy…</li>
      <li><strong>Se rehace solo</strong> cuando cambian tus notas o tus fechas.</li>
    </ul>
  </div>
</section>

<section>
  <h2>Preguntas frecuentes</h2>
  ${faq(FAQ_TRABAJO)}
</section>

<section class="final">
  <h2>Estudia en el tiempo <em>que tienes</em></h2>
  <p class="sub">Crea tu cuenta y dile cómo es tu semana.</p>
  <div class="acciones">${EMPEZAR}</div>
</section>
</div>`
};

/* ══════════════════ los papeles, desde legal/*.md ══════════════════ */
const DOCS = [
  ["privacidad", "PRIVACIDAD.md", "Política de privacidad", "Qué datos guarda GritNook, dónde viven, quién más los ve y cómo borrarlos."],
  ["terminos", "TERMINOS.md", "Términos de uso", "Las reglas entre tú y GritNook: qué puedes esperar de la app y qué se espera de ti."],
  ["aviso-legal", "AVISO-LEGAL.md", "Aviso legal", "Quién está detrás de GritNook, cómo contactar y las condiciones generales de uso de la aplicación."],
  ["ia", "IA.md", "La inteligencia artificial en GritNook", "Cómo funciona el profe con inteligencia artificial: que es una máquina, qué se le manda y en qué se equivoca."]
];
const RUTA_DOC = { "PRIVACIDAD.md": "/privacidad/", "TERMINOS.md": "/terminos/", "AVISO-LEGAL.md": "/aviso-legal/", "IA.md": "/ia/" };
function lineaMd(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, texto, destino) => {
    const d = RUTA_DOC[destino.replace(/^\.\//, "")];
    const href = d || (/^https?:/.test(destino) ? destino : REPO + destino.replace(/^\.\.\//, "").replace(/^\.\//, "legal/"));
    return `<a href="${href}">${texto}</a>`;
  });
  return t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}
/* lo que aún está por decidir ([RELLENAR: …]) es una nota interna: en la web pública no sale */
function mdAHtml(md) {
  const lineas = md.replace(/\r\n/g, "\n").replace(/\n?\[(?:RELLENAR|PENDIENTE)[^\]]*\]\n?/g, "\n").split("\n");
  const out = []; let i = 0, titulo = "", par = [], lista = [];
  const cierraPar = () => { if (par.length) { const p = par.join(" "); out.push(/^En vigor desde/.test(p) ? `<p class="vigor">${lineaMd(p)}</p>` : `<p>${lineaMd(p)}</p>`); par = []; } };
  const cierraLista = () => { if (lista.length) { out.push("<ul>" + lista.map(x => "<li>" + lineaMd(x) + "</li>").join("") + "</ul>"); lista = []; } };
  const cierra = () => { cierraPar(); cierraLista(); };
  while (i < lineas.length) {
    const l = lineas[i];
    if (/^#\s+/.test(l)) { cierra(); titulo = l.replace(/^#\s+/, "").trim(); i++; continue; }
    if (/^###\s+/.test(l)) { cierra(); out.push("<h3>" + lineaMd(l.replace(/^###\s+/, "").trim()) + "</h3>"); i++; continue; }
    if (/^##\s+/.test(l)) { cierra(); out.push("<h2>" + lineaMd(l.replace(/^##\s+/, "").trim()) + "</h2>"); i++; continue; }
    if (/^\s*$/.test(l)) { cierra(); i++; continue; }
    if (/^\|/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lineas[i + 1] || "")) {
      cierra();
      const celdas = f => f.trim().replace(/^\||\|$/g, "").split("|").map(x => lineaMd(x.trim()));
      const cab = celdas(l); i += 2; const filas = [];
      while (i < lineas.length && /^\|/.test(lineas[i])) { filas.push(celdas(lineas[i])); i++; }
      out.push('<div class="tabla"><table><thead><tr>' + cab.map(c => "<th>" + c + "</th>").join("") + "</tr></thead><tbody>"
        + filas.map(f => "<tr>" + f.map(c => "<td>" + c + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>");
      continue;
    }
    if (/^-\s+/.test(l)) {
      cierraPar();
      let x = l.replace(/^-\s+/, "");
      while (/^\s{2,}\S/.test(lineas[i + 1] || "")) { x += " " + lineas[i + 1].trim(); i++; }
      lista.push(x); i++; continue;
    }
    cierraLista(); par.push(l.trim()); i++;
  }
  cierra();
  return { titulo, html: out.join("\n") };
}
const PAPELES = DOCS.map(([id, archivo, nombre, descripcion]) => {
  const { titulo, html } = mdAHtml(fs.readFileSync(path.join(RAIZ, "legal", archivo), "utf8"));
  return {
    ruta: "/" + id + "/", titulo: (titulo || nombre) + " · GritNook", descripcion,
    /* el aviso legal lleva el NIF del titular: se publica porque la ley lo pide, pero no hace falta que salga en Google */
    noindex: id === "aviso-legal",
    cuerpo: `<div class="ancho"><article class="papel"><h1>${esc(titulo || nombre)}</h1>\n${html}</article></div>`
  };
});

const NO_EXISTE = {
  ruta: "/404.html", titulo: "Esta página no existe · GritNook", descripcion: "La página que buscas no está en GritNook.", noindex: true,
  cuerpo: `<div class="ancho"><section class="hero" style="grid-template-columns:minmax(0,1fr)"><div>
  <p class="eyebrow">Error 404</p>
  <h1>Esta página <em>no existe</em></h1>
  <p class="lead">Puede que el enlace esté mal escrito o que la página se haya movido. Lo tuyo sigue en la app.</p>
  <div class="acciones"><a class="btn primario" href="/">Ir a GritNook</a><a class="btn" href="/oposiciones/">Para opositores</a></div>
</div></section></div>`
};

/* ══════════════════ escribirlo todo ══════════════════ */
const escribir = (rel, txt) => { const f = path.join(RAIZ, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, txt); console.log("escrito " + rel); };
const PAGINAS = [OPOSICIONES, TRABAJO, ...PAPELES];
for (const p of PAGINAS) escribir(p.ruta.replace(/^\//, "") + "index.html", pagina(p));
escribir("404.html", pagina(NO_EXISTE));

const enMapa = [{ ruta: "/", prioridad: "1.0" }, ...PAGINAS.filter(p => !p.noindex).map(p => ({ ruta: p.ruta, prioridad: p.cuerpo.includes('class="papel"') ? "0.3" : "0.8" }))];
escribir("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${enMapa.map(u => `  <url><loc>${WEB}${u.ruta}</loc><lastmod>${HOY}</lastmod><priority>${u.prioridad}</priority></url>`).join("\n")}
</urlset>
`);
escribir("robots.txt", `# gritnook.com
User-agent: *
Allow: /
Disallow: /pruebas/
Disallow: /backend/

Sitemap: ${WEB}/sitemap.xml
`);
