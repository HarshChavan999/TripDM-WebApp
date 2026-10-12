import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebase } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 24 hours buffer between email notifications for the same sender -> recipient conversation pair
const BUFFER_HOURS = 24;
const BUFFER_MS = BUFFER_HOURS * 60 * 60 * 1000;

interface SendChatEmailPayload {
  senderId: string;
  recipientId: string;
  messageContent: string;
  senderName?: string;
  packageTitle?: string;
  senderRole?: 'user' | 'agency';
  recipientRole?: 'user' | 'agency';
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
  try {
    const body: SendChatEmailPayload = await req.json();
    const { senderId, recipientId, messageContent, senderName, packageTitle, senderRole } = body;

    if (!senderId || !recipientId || !messageContent?.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: senderId, recipientId, and messageContent are required.' },
        { status: 400 }
      );
    }

    if (senderId === recipientId) {
      return NextResponse.json({
        success: true,
        delivered: false,
        skipped: true,
        reason: 'sender_and_recipient_are_same'
      });
    }

    // Initialize Firebase Admin SDK
    initializeFirebase();
    const db = admin.firestore();

    // 1. Fetch Recipient and Sender Profile Data from Firestore
    const [recipientDocSnap, senderDocSnap] = await Promise.all([
      db.collection('users').doc(recipientId).get(),
      db.collection('users').doc(senderId).get(),
    ]);

    const recipientData = recipientDocSnap.exists ? (recipientDocSnap.data() as any) : null;
    const senderData = senderDocSnap.exists ? (senderDocSnap.data() as any) : null;

    // 2. Discover Recipient Email Address
    let recipientEmail = recipientData?.authEmail || recipientData?.email || recipientData?.contactEmail;
    if (!recipientEmail) {
      try {
        const authRecord = await admin.auth().getUser(recipientId);
        recipientEmail = authRecord.email;
      } catch (authErr) {
        console.warn(`[Chat Email] Recipient ${recipientId} not found in Firebase Auth:`, authErr);
      }
    }

    if (!recipientEmail) {
      console.warn(`[Chat Email] Recipient ${recipientId} has no registered email. Skipping email notification.`);
      return NextResponse.json({
        success: true,
        delivered: false,
        skipped: true,
        reason: 'recipient_has_no_email'
      });
    }

    // 3. Determine Roles (Agency vs User / Traveler)
    const isSenderAgency = senderRole === 'agency' || senderData?.role === 'agency';
    const isSenderUser = !isSenderAgency;

    // Display names
    const senderDisplayName =
      senderName ||
      (isSenderAgency
        ? senderData?.companyName || senderData?.name || 'Travel Agent'
        : senderData?.name || senderData?.displayName || 'Traveler');

    const recipientDisplayName = isSenderAgency
      ? recipientData?.name || recipientData?.displayName || 'Traveler'
      : recipientData?.companyName || recipientData?.name || 'Valued Partner';

    // 4. Anti-Duplicate & Cooldown Buffer Protection
    // We maintain directional records: 'chat_email_notifications/{senderId}_{recipientId}'
    const notifDocRef = db.collection('chat_email_notifications').doc(`${senderId}_${recipientId}`);
    const notifDocSnap = await notifDocRef.get();
    const now = Date.now();

    if (notifDocSnap.exists) {
      const notifData = notifDocSnap.data() as any;
      const lastEmailSentAt = notifData?.lastEmailSentAt || notifData?.timestamp || 0;
      const timeSinceLast = now - lastEmailSentAt;

      // If already notified within the buffer window, skip sending repeated emails
      if (timeSinceLast < BUFFER_MS) {
        const minutesAgo = Math.round(timeSinceLast / 60000);
        const remainingMinutes = Math.round((BUFFER_MS - timeSinceLast) / 60000);
        console.log(
          `[Chat Email] Muted: Repeat email blocked by buffer for ${senderId} -> ${recipientId}. Last email sent ${minutesAgo}m ago (${remainingMinutes}m remaining).`
        );
        return NextResponse.json({
          success: true,
          delivered: false,
          skipped: true,
          reason: 'within_buffer_window',
          minutesSinceLastEmail: minutesAgo,
          bufferMinutesRemaining: remainingMinutes
        });
      }
    }

    // 5. Construct Links for the Chat on Both Sides
    const baseAppUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://tripdm.com').replace(/\/$/, '');

    // For Agency recipient (when Traveler sends message to Agency)
    const agencyChatUrl = `${baseAppUrl}/agencytripdm?tab=chat&userId=${senderId}&userName=${encodeURIComponent(senderDisplayName)}`;

    // For Traveler recipient (when Agency sends message to Traveler)
    const userChatUrl = `${baseAppUrl}/?action=chat&agencyId=${senderId}&agencyName=${encodeURIComponent(senderDisplayName)}`;

    // Select the appropriate deep link for the email recipient
    const recipientChatUrl = isSenderUser ? agencyChatUrl : userChatUrl;

    // 6. Resend Configuration (Matching approve-agency route setup)
    const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'TripDM <support@tripdm.com>';

    if (!resendApiKey) {
      console.warn('[Chat Email] RESEND_API_KEY is not configured. Logging notification without dispatch.');
      return NextResponse.json({
        success: true,
        delivered: false,
        skipped: true,
        reason: 'missing_resend_api_key'
      });
    }

    // 7. Compose Email Content & HTML
    const emailSubject = isSenderUser
      ? `💬 New Traveler Inquiry from ${senderDisplayName} on TripDM`
      : `💬 New Message from ${senderDisplayName} on TripDM`;

    const badgeText = isSenderUser ? '💬 New Traveler Inquiry' : '💬 New Message from Agency';
    const mainHeading = isSenderUser
      ? `New message from ${escapeHtml(senderDisplayName)}!`
      : `${escapeHtml(senderDisplayName)} just replied to you!`;

    const introParagraph = isSenderUser
      ? `A traveler named <strong>${escapeHtml(senderDisplayName)}</strong> has sent you a message inquiring about travel services on TripDM.`
      : `Great news! Travel agency <strong>${escapeHtml(senderDisplayName)}</strong> has sent you a response regarding your inquiry on TripDM.`;

    const ctaButtonText = isSenderUser ? 'Open Agency Chat & Reply →' : 'View & Reply in Chat →';

    const safeMessageContent = messageContent.length > 500
      ? `${messageContent.substring(0, 497)}...`
      : messageContent;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header with Gradient Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">TripDM</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 6px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Direct Travel Marketplace</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Status Badge -->
              <div style="display: inline-block; background-color: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; margin-bottom: 20px;">
                ${badgeText}
              </div>

              <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">
                ${mainHeading}
              </h2>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
                Hello <strong>${escapeHtml(recipientDisplayName)}</strong>,
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                ${introParagraph}
              </p>

              ${packageTitle ? `
              <!-- Package Context Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fffaf5; border-radius: 10px; padding: 12px 16px; border: 1px solid #fed7aa; margin-bottom: 20px;">
                <tr>
                  <td style="font-size: 13px; color: #9a3412;">
                    ✈️ <strong>Inquiry for Package:</strong> ${escapeHtml(packageTitle)}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Message Preview Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #f97316; margin-bottom: 28px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.8px;">Message Preview</p>
                    <p style="margin: 0; font-size: 15px; color: #1e293b; line-height: 1.6; font-style: italic; white-space: pre-wrap;">"${escapeHtml(safeMessageContent)}"</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${recipientChatUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 38px; border-radius: 10px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35); text-align: center;">
                      ${ctaButtonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Secondary Direct Link -->
              <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center; margin: 0 0 12px 0;">
                Or open this link directly in your browser:<br>
                <a href="${recipientChatUrl}" style="color: #ea580c; text-decoration: underline; word-break: break-all;">${recipientChatUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 8px 0; line-height: 1.5;">
                ⚡ <strong>TripDM Smart Buffer:</strong> To protect your inbox, repeated notification emails for this active conversation are muted for ${BUFFER_HOURS} hours while you chat.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
                Have questions or need help? Reach us anytime at <a href="mailto:support@tripdm.com" style="color: #f97316; text-decoration: none; font-weight: 600;">support@tripdm.com</a>
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                © ${new Date().getFullYear()} TripDM Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 8. Send Email via Resend
    let emailSent = false;
    let isFallback = false;
    let emailError: string | null = null;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (resendRes.ok) {
        const resendData = await resendRes.json();
        console.log(`[Chat Email] Direct email sent to ${recipientEmail}:`, resendData);
        emailSent = true;
      } else {
        const errData = await resendRes.json().catch(() => ({}));
        console.warn(`[Chat Email] Resend API warning (${resendRes.status}):`, errData);
        emailError = errData.message || JSON.stringify(errData);

        // Fallback for Resend 403 test mode (same as approve-agency route)
        if (
          resendRes.status === 403 &&
          (errData.message?.includes('You can only send testing emails to your own email address') ||
            errData.message?.includes('domain is not verified'))
        ) {
          const fallbackEmail = 'phitanshu962@gmail.com';
          console.log(`[Chat Email] Sending sandbox preview to registered test email (${fallbackEmail})...`);

          const fallbackRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'TripDM <onboarding@resend.dev>',
              to: [fallbackEmail],
              subject: `[Sandbox Preview for ${recipientEmail}] ${emailSubject}`,
              html: emailHtml,
            }),
          });

          if (fallbackRes.ok) {
            emailSent = true;
            isFallback = true;
            console.log(`[Chat Email] Sandbox preview successfully sent to ${fallbackEmail}`);
          }
        }
      }
    } catch (sendErr: any) {
      console.error('[Chat Email] Exception dispatching Resend email:', sendErr);
      emailError = sendErr?.message || String(sendErr);
    }

    // 9. Update Cooldown State & Notification History
    if (emailSent) {
      await notifDocRef.set(
        {
          senderId,
          recipientId,
          senderRole: isSenderUser ? 'user' : 'agency',
          recipientRole: isSenderUser ? 'agency' : 'user',
          recipientEmail,
          senderDisplayName,
          recipientDisplayName,
          firstEmailSentAt: notifDocSnap.exists ? (notifDocSnap.data() as any)?.firstEmailSentAt || now : now,
          lastEmailSentAt: now,
          lastMessageSnippet: safeMessageContent.substring(0, 160),
          emailCount: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      );

      // Record in notification logs for audit
      await db
        .collection('notification_logs')
        .add({
          type: 'chat_email',
          senderId,
          senderName: senderDisplayName,
          recipientId,
          recipientEmail,
          subject: emailSubject,
          chatUrl: recipientChatUrl,
          isFallback,
          timestamp: now,
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: emailSent,
      delivered: emailSent,
      isFallback,
      recipientEmail,
      chatUrl: recipientChatUrl,
      error: emailError,
    });
  } catch (error: any) {
    console.error('[API] /api/notifications/send-chat-email error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while sending chat email notification.' },
      { status: 500 }
    );
  }
}
