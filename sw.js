/* Lo que deja usar GritNook sin conexión y la hace instalable.
   Las letras y los iconos viajan dentro de la app. La página va primero a la red, para que las versiones nuevas lleguen en
   cuanto las hay, y tira de la copia guardada si no hay conexión. Los iconos
   y la tipografía, al revés: primero la copia, que no cambian. */
const CACHE = "gritnook-v15";
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
  /* la app es solo la raíz: la presentación, la calculadora y los papeles van directos a la red
     y no se guardan como si fueran la app (sin conexión, la copia de la app tiene que ser la app) */
  const raiz = new URL("./", location).pathname;
  const esApp = url.pathname === raiz || url.pathname === raiz + "index.html";
  if (r.mode === "navigate" && !esApp) return;
  if (r.mode !== "navigate" && !/\/(fuentes|iconos)\/|manifest\.webmanifest$/.test(url.pathname)) return;
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

/* ── los avisos ──
   Con la app cerrada, el servidor manda cada aviso (exámenes, entregas, el
   final del cronómetro…) cifrado por el servicio de avisos del navegador, y
   aquí se enseña. Los del cronómetro comparten etiqueta: el «¡Bien hecho!»
   sustituye al de «quedan 12 min» en vez de amontonarse. */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: e.data ? e.data.text() : "" }; }
  const clave = String(d.clave || ""), reloj = clave.startsWith("reloj-"), bien = reloj && clave.endsWith("-trabajo");
  e.waitUntil(self.registration.showNotification(String(d.titulo || "GritNook").slice(0, 120), {
    body: String(d.cuerpo || "").slice(0, 300),
    tag: reloj ? "reloj" : (clave || "gritnook"), renotify: true, lang: "es",
    icon: bien ? "iconos/bien-hecho-192.png" : "iconos/icono-192.png", badge: "iconos/insignia-96.png",
    data: { url: typeof d.url === "string" ? d.url : "./" }
  }));
});
/* tocar un aviso abre la app (o la trae delante) en la sección que toca */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope);
  if (destino.origin !== location.origin) return;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lista => {
    const abierta = lista.find(c => c.url.startsWith(self.registration.scope));
    if (abierta) return abierta.focus().then(c => c && c.navigate ? c.navigate(destino.href).catch(() => {}) : null);
    return self.clients.openWindow(destino.href);
  }));
});
