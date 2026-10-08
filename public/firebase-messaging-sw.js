// Firebase Cloud Messaging Service Worker for TripDM
// Handles background web push notifications when customer is away or browser is in background

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parse query params if supplied during dynamic registration
const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey') || 'AIzaSyBBRmuO-xfWP-1bxiP5Ex1aSOo3dWu4Mhs';
const projectId = urlParams.get('projectId') || 'travel-agent-management-29c27';
const messagingSenderId = urlParams.get('messagingSenderId') || '387994411670';
const appId = urlParams.get('appId') || '1:387994411670:web:5591a4bc9e4befb09f18b7';

// Default Firebase Configuration for Service Worker
const firebaseConfig = {
  apiKey,
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.appspot.com`,
  messagingSenderId,
  appId,
};

if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (err) {
    console.error('[TripDM FCM SW] Init error:', err);
  }
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (err) {
  console.warn('[TripDM FCM SW] Messaging setup note:', err);
}

function buildNotificationOptions(payload) {
  const data = payload.data || {};
  const notification = payload.notification || {};

  const agencyName = data.agencyName || '';
  const fallbackTitle = agencyName ? `${agencyName} (TripDM)` : 'TripDM';
  const title = notification.title || data.title || fallbackTitle;
  const body = notification.body || data.body || 'You have received a new message.';
  const icon = notification.icon || data.icon || '/tripdm-logo.png';
  const agencyId = data.agencyId || '';
  const targetUrl = data.url || (agencyId ? `/?action=chat&agencyId=${agencyId}&agencyName=${encodeURIComponent(agencyName || 'Travel Agency')}` : '/?section=chat');

  return {
    title,
    options: {
      body: body,
      icon: icon,
      badge: '/tripdm-logo.png',
      renotify: false,
      requireInteraction: false,
      data: {
        url: targetUrl,
        agencyId: agencyId,
        agencyName: agencyName,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'open_chat',
          title: 'View Conversation'
        }
      ]
    }
  };
}

// Handle background messages via Firebase Compat or fallback
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[TripDM FCM SW] Received background push message:', payload);
    const { title, options } = buildNotificationOptions(payload);
    return self.registration.showNotification(title, options);
  });
} else {
  // Fallback listener for raw push events only if messaging compat is not active
  self.addEventListener('push', (event) => {
    if (!event.data) return;
    try {
      const rawData = event.data.json();
      console.log('[TripDM FCM SW] Raw push event received:', rawData);
      const { title, options } = buildNotificationOptions(rawData);
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.warn('[TripDM FCM SW] Push event parsing note:', err);
    }
  });
}

// Handle notification click -> open or focus the exact chat conversation window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus and navigate it to the exact chat
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
