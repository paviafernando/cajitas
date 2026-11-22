// Cajitas sin internet: guarda la página la primera vez y la usa cuando no hay conexión.
const C = 'cajitas-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icon.svg']).catch(() => {}))); });
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  const key = req.mode === 'navigate' ? '/' : req;
  e.respondWith(fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(C).then((c) => c.put(key, cp)); } return r; })
    .catch(async () => (await caches.match(key, { ignoreSearch: true })) || Response.error()));
});
