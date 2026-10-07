import * as admin from 'firebase-admin';
import { initializeFirebase } from './auth';

export interface SendPushNotificationOptions {
  userId?: string;
  tokens?: string[];
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

export async function sendWebPushNotification(options: SendPushNotificationOptions) {
  const { userId, title, body, icon = '/tripdm-logo.png', url = '/', data = {} } = options;

  initializeFirebase();

  let targetTokens: string[] = options.tokens || [];

  // If userId is provided, look up tokens from Firestore
  if (userId && targetTokens.length === 0) {
    try {
      const db = admin.firestore();
      const userTokenDoc = await db.collection('user_fcm_tokens').doc(userId).get();
      if (userTokenDoc.exists) {
        const userData = userTokenDoc.data();
        if (userData && Array.isArray(userData.tokens)) {
          targetTokens = userData.tokens;
        }
      }
    } catch (err) {
      console.error(`[FCM Server] Error fetching tokens for user ${userId}:`, err);
    }
  }

  if (targetTokens.length === 0) {
    console.log(`[FCM Server] No tokens found to send notification for user ${userId || 'unknown'}`);
    return { success: false, error: 'No tokens found' };
  }

  // Construct high-urgency FCM payload for Chrome Web Push
  const multicastMessage: admin.messaging.MulticastMessage = {
    tokens: targetTokens,
    notification: {
      title,
      body,
      imageUrl: icon
    },
    webpush: {
      headers: {
        Urgency: 'high',
        TTL: '86400' // 24 hours retention
      },
      notification: {
        title,
        body,
        icon,
        badge: icon,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          {
            action: 'open',
            title: 'Open Message'
          }
        ]
      },
      fcmOptions: {
        link: url
      }
    },
    data: {
      ...data,
      url,
      title,
      body,
      icon,
      timestamp: Date.now().toString()
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    console.log(`[FCM Server] Notification sent successfully! Success count: ${response.successCount}, Failure count: ${response.failureCount}`);

    // Clean up stale tokens if any failed
    if (response.failureCount > 0 && userId) {
      const db = admin.firestore();
      const validTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          validTokens.push(targetTokens[idx]);
        } else {
          console.warn(`[FCM Server] Token ${targetTokens[idx]} failed:`, resp.error?.message);
        }
      });

      if (validTokens.length !== targetTokens.length) {
        await db.collection('user_fcm_tokens').doc(userId).set({
          tokens: validTokens,
          lastUpdated: Date.now()
        }, { merge: true });
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error: any) {
    console.error('[FCM Server] Error sending FCM push notification:', error);
    return { success: false, error: error.message };
  }
}
