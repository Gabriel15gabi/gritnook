/* Servidor estático mínimo para ver la app en local, sin dependencias.
   No hace falta para usarla: index.html se abre con doble clic. Esto es
   por comodidad, y para probar que se instala como app (eso necesita http).

   node servidor.js          → http://localhost:4173
   node servidor.js 4174     → en otro puerto */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = Number(process.argv[2]) || Number(process.env.PORT) || 4173;
const RAIZ = __dirname;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  /* como GitHub Pages: una carpeta sirve su index.html (las páginas públicas: /oposiciones/, /privacidad/…) */
  const rel = (url.endsWith("/") ? url + "index.html" : url).replace(/^\/+/, "");
  const archivo = path.join(RAIZ, rel);
  /* que nadie se salga de la carpeta con ../ */
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end("Prohibido"); return; }
  fs.readFile(archivo, (err, datos) => {
    if (err) { fs.readFile(path.join(RAIZ, "404.html"), (e2, d2) => res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(d2 || "No encontrado")); return; }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log("GritNook en http://localhost:" + PUERTO));
