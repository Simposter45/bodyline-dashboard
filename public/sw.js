// Minimal Service Worker for PWA Installation Prompt
// This is required by browsers to trigger the "Add to Home Screen" prompt.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// A fetch listener is mandatory for the PWA install criteria
self.addEventListener('fetch', (event) => {
  // We simply let the browser handle the fetch normally
  // In a robust offline PWA, we'd intercept and serve from cache here.
  return;
});
