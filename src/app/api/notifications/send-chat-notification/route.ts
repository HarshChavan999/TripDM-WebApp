import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/lib/auth';
import { getUserFcmTokens } from '@/lib/fcmServer';

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

    // 1. Fetch all registered tokens for recipient customer from both collections
    const validTokens = await getUserFcmTokens(firestore, recipientId);

    console.log(`[FCM Route] Recipient: ${recipientId}, Registered Tokens Found: ${validTokens.length}`);

    if (validTokens.length === 0) {
      return NextResponse.json({
        success: true,
        deliveredCount: 0,
        note: 'Customer has not enabled notifications yet or has no registered tokens.'
      });
    }

    // 2. Format Notification & Deep Link
    const agencyDisplayName = senderName || 'Travel Agent';
    const previewText = messageContent.length > 120 
      ? `${messageContent.substring(0, 117)}...` 
      : messageContent;

    const deepLinkUrl = `/?action=chat&agencyId=${senderId}&agencyName=${encodeURIComponent(agencyDisplayName)}`;
    const now = Date.now();

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

    // 3. Send Multicast via Firebase Admin Messaging
    const response = await admin.messaging().sendEachForMulticast(fcmPayload);
    console.log(`[FCM Route] Dispatched notification to customer ${recipientId}. Success: ${response.successCount}, Failed: ${response.failureCount}`);

    // 4. Clean up expired / unregistered tokens if any failed
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

      await firestore
        .collection('user_fcm_tokens')
        .doc(recipientId)
        .update({
          tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        })
        .catch((e) => console.warn('[FCM] Token cleanup note:', e));
    }

    // 5. Record log for audit
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
