/* Las pruebas, desde la consola y sin abrir nada:
       node pruebas/correr.js

   Levanta el servidor de siempre en un puerto libre, abre pruebas.html
   en un navegador sin ventana y escribe el resultado. Devuelve 1 si
   algo falla, que es lo que mira un servidor de integración continua. */
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const RAIZ = path.join(__dirname, "..");
const PUERTO = 4176;

const NAVEGADORES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
];

function buscarNavegador() {
  const suyo = process.env.NAVEGADOR;
  if (suyo && fs.existsSync(suyo)) return suyo;
  const encontrado = NAVEGADORES.find(p => fs.existsSync(p));
  if (!encontrado) {
    console.error("No encuentro Chrome ni Edge. Si lo tienes en otro sitio:");
    console.error('  NAVEGADOR="ruta/al/navegador" node pruebas/correr.js');
    process.exit(2);
  }
  return encontrado;
}

/* el mismo servidor estático de servidor.js, en pequeño */
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

const servidor = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const archivo = path.join(RAIZ, url === "/" ? "index.html" : url.replace(/^\/+/, ""));
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end(); return; }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404).end("no está"); return; }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream" });
    res.end(datos);
  });
});

servidor.listen(PUERTO, () => {
  const navegador = buscarNavegador();
  const perfil = path.join(require("os").tmpdir(), "gritnook-pruebas");
  const hijo = spawn(navegador, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--user-data-dir=" + perfil, "--virtual-time-budget=180000", "--dump-dom",
    "http://localhost:" + PUERTO + "/pruebas/pruebas.html"
  ], { windowsHide: true });

  let salida = "";
  hijo.stdout.on("data", d => { salida += d; });
  hijo.on("close", () => {
    servidor.close();
    const m = salida.match(/<pre id="resumen"[^>]*>([\s\S]*?)<\/pre>/);
    if (!m) {
      console.error("No he podido leer el resultado. ¿Ha cargado la página?");
      console.error(salida.slice(0, 600));
      process.exit(2);
    }
    const texto = m[1]
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    console.log(texto.trim());
    const fallan = (texto.match(/fallan:(\d+)/) || [, "0"])[1];
    if (texto.startsWith("ERROR DEL BANCO") || Number(fallan) > 0) {
      console.log("\nEl detalle, con colores: abre pruebas/pruebas.html en el navegador.");
      process.exit(1);
    }
    console.log("\nTodo en verde.");
  });
});
