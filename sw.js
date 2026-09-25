/* Lo que deja usar GritNook sin conexión y la hace instalable.
   Las letras y los iconos viajan dentro de la app. La página va primero a la red, para que las versiones nuevas lleguen en
   cuanto las hay, y tira de la copia guardada si no hay conexión. Los iconos
   y la tipografía, al revés: primero la copia, que no cambian. */
const CACHE = "gritnook-v11";
const BASE = ["./", "index.html", "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png",
  "fuentes/inter-latin-300-normal.woff2", "fuentes/inter-latin-400-normal.woff2",
  "fuentes/inter-latin-500-normal.woff2", "fuentes/inter-latin-600-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  const guardable = url.origin === location.origin;   /* las letras van dentro de la app: no se pide nada a Google */
  if (!guardable) return;
  if (r.mode === "navigate") {
    /* «no-cache» no quiere decir sin caché: le pregunta al servidor si hay algo
       nuevo antes de usar lo guardado. GitHub Pages da las páginas por buenas
       diez minutos, y sin esto una versión nueva podía tardar eso en llegar */
    e.respondWith(fetch(r.url, { cache: "no-cache", credentials: "same-origin" })
      .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copia)); return res; })
      .catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(r).then(guardada => guardada || fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
    return res;
  })));
});
