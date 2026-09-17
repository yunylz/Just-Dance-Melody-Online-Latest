const CACHE = 'jdmo-hub-v1';

self.addEventListener('install', (event) => {
	self.skipWaiting();
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll([
			'/site.webmanifest',
			'/android-chrome-192x192.png',
			'/android-chrome-512x512.png',
			'/apple-touch-icon.png',
			'/apple-touch-icon-precomposed.png',
			'/favicon.ico',
			'/favicon-16x16.png',
			'/favicon-32x32.png',
			'/splash-iphone.png',
			'/splash-iphone-plus.png',
			'/splash-iphone-x.png',
			'/splash-ipad.png',
			'/splash-ipad-pro.png'
		]))
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only handle GET, same-origin requests through the cache. Cross-origin
	// requests (e.g. the CDN's latest.json) are passed straight to the network
	// to avoid the service worker breaking them.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.match(request).then((cached) => cached || fetch(request))
	);
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'JDMO Hub', {
      body: data.body || '',
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
			if (windowClients.length > 0) {
				return windowClients[0].focus();
			}
			return clients.openWindow('/hub');
		})
	);
});
