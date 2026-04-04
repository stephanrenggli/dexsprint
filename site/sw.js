importScripts("./js/vendor/pokeapi-js-wrapper-sw.js");

const CACHE_NAME = "dexsprint-shell-v17";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/core/app-config.js",
  "./js/core/bootstrap.js",
  "./js/core/app-state.js",
  "./js/core/initial-state.js",
  "./js/core/state-constants.js",
  "./js/core/persistence.js",
  "./js/core/timer.js",
  "./js/core/selectors.js",
  "./js/features/modals.js",
  "./js/features/changelog.js",
  "./js/features/progress-share.js",
  "./js/features/progress.js",
  "./js/features/weekly-challenge.js",
  "./js/features/info.js",
  "./js/features/settings.js",
  "./js/features/quiz.js",
  "./js/features/study.js",
  "./js/features/views.js",
  "./js/services/audio.js",
  "./js/services/catalog-source.js",
  "./js/services/catalog-hydration.js",
  "./js/services/qr-code.js",
  "./js/vendor/qrcode-generator.mjs",
  "./js/domain/filters.js",
  "./js/domain/text.js",
  "./js/domain/progress-code.js",
  "./js/domain/typo-match.js",
  "./js/ui/dom.js",
  "./js/ui/status.js",
  "./js/features/filters.js",
  "./js/features/debug.js",
  "./js/ui/chips.js",
  "./js/ui/tips.js",
  "./js/ui/toasts.js",
  "./js/vendor/pokeapi-js-wrapper.js",
  "./assets/favicon.svg",
  "./assets/qr.svg",
  "./assets/32.png",
  "./assets/180.png",
  "./assets/192.png",
  "./assets/512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith("dexsprint-shell-"))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
