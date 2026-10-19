/* Service Worker: офлайн-кэш оболочки приложения (PWA).
   Пока есть сеть, всегда берём свежие файлы с сервера (no-store) — кэш используется только офлайн.
   Так обновления демо видны сразу и не смешиваются со старыми версиями файлов. */
const CACHE = 'way-v12';
const ASSETS = ['./', 'index.html', 'b2b.html', 'css/styles.css', 'css/b2b.css', 'js/icons.js', 'js/data.js', 'js/ui.js', 'js/site.js', 'js/client.js', 'js/ocr.js', 'js/warehouse.js', 'js/buyout.js', 'js/admin.js', 'js/app.js',
  'js/b2b/data.js', 'js/b2b/site.js', 'js/b2b/cabinet.js', 'js/b2b/admin.js', 'js/b2b/cms.js', 'js/b2b/app.js', 'icons/icon.svg', 'manifest.webmanifest',
  'vendor/flags/us.svg', 'vendor/flags/gb.svg', 'vendor/flags/de.svg', 'vendor/flags/es.svg', 'vendor/flags/cn.svg', 'vendor/flags/tr.svg', 'vendor/flags/kz.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(ASSETS.map(a => fetch(a, { cache: 'no-store' }).then(r => r.ok && c.put(a, r)).catch(() => {})))));
  self.skipWaiting();
});
// удаляем кэши всех прошлых версий
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Навигационный запрос нельзя пересоздать с опциями — поэтому запрашиваем страницу заново по URL
  const fresh = e.request.mode === 'navigate' ? new Request(url.href, { cache: 'no-store', credentials: 'same-origin' }) : new Request(e.request, { cache: 'no-store' });
  e.respondWith(fetch(fresh).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Way', body: 'Новый статус посылки' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: 'icons/icon.svg' }));
});
