// Ifacelis · service worker
// Hace que la web funcione como app instalada: abre rápido y, sin conexión,
// muestra la última versión guardada o una pantalla de aviso.
// Nunca guarda llamadas a /api/ (escaneos, pagos, chat) ni nada de otros dominios.

const VERSION = "ifacelis-v2";
const PRECACHE = [
  "/app/",
  "/app/app.css",
  "/app/app.js",
  "/app/install.js",
  "/offline.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Stripe, fuentes: siempre directo
  if (url.pathname.startsWith("/api/")) return;    // datos y pagos: nunca de caché

  // Fotos: primero la guardada (rápido) y se actualiza por detrás
  if (/\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        const fresh = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || fresh;
      })
    );
    return;
  }

  // Páginas, código y datos: primero internet (siempre la versión nueva),
  // y si no hay conexión, lo último guardado
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return r;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("/offline.html");
        return Response.error();
      })
  );
});
