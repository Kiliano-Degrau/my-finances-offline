import { useState, useEffect, useCallback } from 'react';

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        setRegistration(reg);

        // Check for updates on registration
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setUpdateAvailable(true);
            }
          });
        });

        // Check for updates periodically (every 5 minutes)
        setInterval(() => {
          reg.update();
        }, 5 * 60 * 1000);

      } catch (error) {
        console.error('SW registration failed:', error);
      }
    };

    // Handle controller change (after skipWaiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    registerSW();
  }, []);

  const applyUpdate = useCallback(() => {
    if (!registration?.waiting) return;
    
    // Tell the waiting SW to skip waiting and become active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  return { updateAvailable, applyUpdate };
}
