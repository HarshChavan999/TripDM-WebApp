import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    initializeFirebase();

    const body = await request.json();
    const { senderId, senderName, recipientId, messageContent, packageTitle } = body;

    if (!senderId || !recipientId || !messageContent) {
      return NextResponse.json(
        { error: 'Missing required fields: senderId, recipientId, messageContent' },
        { status: 400 }
      );
    }

    const firestore = admin.firestore();

    // 1. Fetch recipient customer document
    const customerDoc = await firestore.collection('users').doc(recipientId).get();
    if (!customerDoc.exists) {
      return NextResponse.json(
        { message: 'Recipient user does not exist.' },
        { status: 404 }
      );
    }

    const customerData = customerDoc.data() || {};
    const rawTokens: string[] = Array.isArray(customerData.fcmTokens) ? customerData.fcmTokens : [];
    const validTokens = rawTokens.filter((t) => typeof t === 'string' && t.trim().length > 10);

    console.log(`[FCM Route] Recipient: ${recipientId}, Registered Tokens: ${validTokens.length}`);

    if (validTokens.length === 0) {
      return NextResponse.json({
        success: true,
        deliveredCount: 0,
        note: 'Customer has not enabled notifications yet or has no registered tokens.'
      });
    }

    // 2. Production Smart Throttling: 90-second buffer window per (customer, agency) pair
    // Avoids spamming the customer if the vendor types multiple rapid sentences in a single thought.
    const THROTTLE_BUFFER_MS = 90 * 1000; // 90 seconds (1.5 minutes)
    const now = Date.now();
    const recentLogs = await firestore
      .collection('notification_logs')
      .where('recipientId', '==', recipientId)
      .where('senderId', '==', senderId)
      .where('timestamp', '>', now - THROTTLE_BUFFER_MS)
      .limit(1)
      .get()
      .catch(() => null);

    if (recentLogs && !recentLogs.empty) {
      console.log(`[FCM Route] Throttled (within 90s buffer) for recipient: ${recipientId} from agency: ${senderId}`);
      return NextResponse.json({
        success: true,
        debounced: true,
        note: 'Notification throttled. Customer was notified of vendor activity recently.'
      });
    }

    // 3. Format Notification
    const agencyDisplayName = senderName || 'Travel Agent';
    const previewText = messageContent.length > 120 
      ? `${messageContent.substring(0, 117)}...` 
      : messageContent;

    const deepLinkUrl = `/?action=chat&agencyId=${senderId}&agencyName=${encodeURIComponent(agencyDisplayName)}`;

    const fcmPayload: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      notification: {
        title: `🔔 ${agencyDisplayName} replied to your enquiry`,
        body: previewText,
      },
      data: {
        agencyId: String(senderId),
        agencyName: String(agencyDisplayName),
        packageTitle: String(packageTitle || ''),
        url: deepLinkUrl,
        type: 'vendor_reply',
        timestamp: String(now),
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
        fcmOptions: {
          link: deepLinkUrl,
        },
        notification: {
          icon: '/tripdm-logo.png',
          badge: '/tripdm-logo.png',
          tag: `chat_${senderId}`,
          renotify: true,
          requireInteraction: true,
        }
      },
      android: {
        priority: 'high',
        ttl: 86400 * 1000,
      }
    };

    // 4. Send Multicast via Firebase Admin Messaging
    const response = await admin.messaging().sendEachForMulticast(fcmPayload);

    // 5. Clean up expired / unregistered tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success && res.error) {
        const errCode = res.error.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(validTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await firestore
        .collection('users')
        .doc(recipientId)
        .update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        })
        .catch((e) => console.warn('[FCM] Token cleanup note:', e));
    }

    // 6. Record log for debounce & audit
    await firestore.collection('notification_logs').add({
      senderId,
      senderName: agencyDisplayName,
      recipientId,
      preview: previewText,
      timestamp: now,
      successCount: response.successCount,
      failureCount: response.failureCount,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      deliveredCount: response.successCount,
      failedCount: response.failureCount,
    });
  } catch (error: any) {
    console.error('[API] Send Chat Notification Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch chat notification.' },
      { status: 500 }
    );
  }
}
