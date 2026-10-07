/* Service Worker: офлайн-кэш оболочки приложения (PWA) */
const CACHE = 'qazbox-v3';
const ASSETS = ['./', 'index.html', 'js/icons.js', 'vendor/flags/us.svg', 'vendor/flags/gb.svg', 'vendor/flags/de.svg', 'vendor/flags/es.svg', 'vendor/flags/cn.svg', 'vendor/flags/tr.svg', 'css/styles.css', 'js/data.js', 'js/ui.js', 'js/site.js', 'js/client.js', 'js/ocr.js', 'js/warehouse.js', 'js/buyout.js', 'js/admin.js', 'js/app.js', 'icons/icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
// network-first для своих файлов, чтобы правки прототипа сразу были видны; кэш — при офлайне
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'QazBox', body: 'Новый статус посылки' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: 'icons/icon.svg' }));
});
