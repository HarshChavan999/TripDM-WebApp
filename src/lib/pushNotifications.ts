import { getMessagingInstance, getDbInstance, getFirebaseConfig } from './firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';

export async function registerPushNotifications(userId?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    console.log('[Push] Push notifications not supported in this environment.');
    return null;
  }

  try {
    // Request notification permission if needed
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied or dismissed by user.');
      return null;
    }

    // Register Service Worker with config params
    const config = getFirebaseConfig();
    const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(config.apiKey || '')}&projectId=${encodeURIComponent(config.projectId || '')}&messagingSenderId=${encodeURIComponent(config.messagingSenderId || '')}&appId=${encodeURIComponent(config.appId || '')}`;
    
    const swRegistration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    console.log('[Push] Service worker registered successfully:', swRegistration.scope);

    // Get FCM messaging instance
    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.log('[Push] Messaging not supported or initialized.');
      return null;
    }

    const { getToken } = await import('firebase/messaging');

    // Get FCM Token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      console.log('[Push] FCM Token obtained:', token.substring(0, 15) + '...');
      if (userId) {
        await saveFcmToken(userId, token);
      }
      return token;
    } else {
      console.warn('[Push] No registration token available.');
      return null;
    }
  } catch (error) {
    console.error('[Push] Error registering push notifications:', error);
    return null;
  }
}

export async function saveFcmToken(userId: string, token: string): Promise<void> {
  const db = getDbInstance();
  if (!db || !userId || !token) return;

  try {
    // Save to user tokens doc
    const userTokenRef = doc(db, 'user_fcm_tokens', userId);
    await setDoc(userTokenRef, {
      userId,
      tokens: arrayUnion(token),
      lastUpdated: Date.now()
    }, { merge: true });

    // Also store token map for direct lookup
    const tokenRef = doc(db, 'fcm_tokens', token);
    await setDoc(tokenRef, {
      userId,
      token,
      updatedAt: Date.now()
    }, { merge: true });

    console.log(`[Push] Token successfully linked to user ${userId}`);
  } catch (err) {
    console.error('[Push] Failed to save FCM token to Firestore:', err);
  }
}

export async function initForegroundNotificationListener(onNotificationReceived?: (payload: any) => void) {
  if (typeof window === 'undefined') return;

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return;

    const { onMessage } = await import('firebase/messaging');

    onMessage(messaging, (payload) => {
      console.log('[Push] Foreground notification received:', payload);

      if (onNotificationReceived) {
        onNotificationReceived(payload);
      } else {
        // Fallback default browser notification when tab is in foreground
        const title = payload.notification?.title || payload.data?.title || 'TripDM Notification';
        const body = payload.notification?.body || payload.data?.body || '';
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: payload.notification?.icon || '/tripdm-logo.png'
          });
        }
      }
    });
  } catch (err) {
    console.error('[Push] Error initializing foreground message listener:', err);
  }
}
