/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Checks if notifications are supported on the device.
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Gets the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests native system notification permissions.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

/**
 * Fires a high-visibility system notification using the Service Worker registration.
 */
export async function triggerLocalNotification(title: string, body: string, url: string = '/') {
  if (!isNotificationSupported()) return;

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission is not granted. Cannot show alert.');
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [300, 100, 300],
        tag: title.toLowerCase().replace(/[^a-z0-9]/g, '-'), // Prevent duplicate alerts for same event types
        renotify: true,
        data: { url }
      } as any);
      console.log(`Notification shown successfully: "${title}"`);
    } catch (err) {
      console.warn('Service worker registration failed to render notification, using window fallback:', err);
      try {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png'
        });
      } catch (fallbackErr) {
        console.error('Complete notification failure:', fallbackErr);
      }
    }
  } else {
    try {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png'
      });
    } catch (err) {
      console.error('Standard Notification API failure:', err);
    }
  }
}
