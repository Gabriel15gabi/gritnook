/* Servidor estático mínimo para ver la app en local, sin dependencias.
   No hace falta para usarla: index.html se abre con doble clic. Esto es
   por comodidad, para tenerla en http://localhost:4173 mientras se toca.

   node servidor.js  */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = process.env.PORT || 4173;
const RAIZ = __dirname;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const rel = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const archivo = path.join(RAIZ, rel);
  /* que nadie se salga de la carpeta con ../ */
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403).end("Prohibido"); return; }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado"); return; }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream" });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log("El Escritorio de DAW en http://localhost:" + PUERTO));
