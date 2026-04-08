import { init } from './ui/index.js';

init();

const updateBanner = document.getElementById('update-banner');
const refreshButton = document.getElementById('btn-refresh-app');

let waitingWorker = null;
let isRefreshing = false;

function showUpdateBanner(worker) {
  if (!updateBanner || !refreshButton) return;
  waitingWorker = worker;
  refreshButton.disabled = false;
  updateBanner.hidden = false;
}

function trackWaitingWorker(registration) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return;
  showUpdateBanner(registration.waiting);
}

if ('serviceWorker' in navigator) {
  refreshButton?.addEventListener('click', () => {
    if (!waitingWorker) return;
    refreshButton.disabled = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('/sw.js').then((registration) => {
    trackWaitingWorker(registration);

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state !== 'installed' || !navigator.serviceWorker.controller) return;
        showUpdateBanner(registration.waiting || installing);
      });
    });
  }).catch(() => {});
}
