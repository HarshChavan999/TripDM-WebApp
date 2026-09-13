import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { agencyId, email, companyName, name } = await req.json();

    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY?.trim() || '';
    const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'TripDM <support@tripdm.com>';
    const baseAppUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://tripdm.com').replace(/\/$/, '');
    const portalUrl = `${baseAppUrl}/agencytripdm`;

    initializeFirebase();
    const db = getFirestore();

    // 1. Fetch current agency data from Firestore if email or name is missing
    let targetEmail = email;
    let targetCompanyName = companyName;
    let targetName = name;

    const userDocRef = db.collection('users').doc(agencyId);
    const userDocSnap = await userDocRef.get();

    if (userDocSnap.exists) {
      const data = userDocSnap.data() as any;
      targetEmail = targetEmail || data.authEmail || data.email || data.contactEmail;
      targetCompanyName = targetCompanyName || data.companyName || 'Valued Partner';
      targetName = targetName || data.name || targetCompanyName;

      // Update approved status in Firestore
      await userDocRef.update({ approved: true });
    }

    // 2. Send email via Resend if email is available
    let emailSent = false;
    let isDirectDelivery = false;
    let isFallback = false;
    let emailError = null;

    if (targetEmail) {
      if (!resendApiKey) {
        console.error('RESEND_API_KEY is not configured in environment variables.');
        emailError = 'RESEND_API_KEY is missing in production environment (apphosting.yaml / Cloud Run).';
      } else {
        try {
          const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Agency is Approved - TripDM</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header with Gradient Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">TripDM</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 6px 0 0 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Partner Network</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Welcome Badge -->
              <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; rounded: 9999px; border-radius: 20px; margin-bottom: 20px;">
                ✓ Official Partner Approved
              </div>

              <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 16px 0; line-height: 1.3;">
                Welcome to TripDM, ${targetCompanyName}! 🎉
              </h2>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Hello <strong>${targetName}</strong>,
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Great news! Your travel agency application for <strong>${targetCompanyName}</strong> has been thoroughly reviewed and <strong>officially approved</strong> by the TripDM administration team.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">What you can do now:</h3>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="24" valign="top" style="color: #f97316; font-size: 16px;">🌴</td>
                        <td style="font-size: 14px; color: #334155; line-height: 1.4;">
                          <strong>Publish Packages:</strong> Showcase your domestic & international travel itineraries to thousands of travelers.
                        </td>
                      </tr>
                      <tr>
                        <td width="24" valign="top" style="color: #f97316; font-size: 16px;">💬</td>
                        <td style="font-size: 14px; color: #334155; line-height: 1.4;">
                          <strong>Direct Customer Chat:</strong> Connect with travelers directly with real-time live messaging.
                        </td>
                      </tr>
                      <tr>
                        <td width="24" valign="top" style="color: #f97316; font-size: 16px;">📊</td>
                        <td style="font-size: 14px; color: #334155; line-height: 1.4;">
                          <strong>Manage Inquiries & Bookings:</strong> Track customer interest, manage bookings, and grow your agency revenue.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35); text-align: center;">
                      Launch Agency Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 8px 0; text-align: center;">
                You can now log in anytime using your registered email: <strong>${targetEmail}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0;">
                Have questions or need assistance? Reply to this email or reach us at <a href="mailto:support@tripdm.com" style="color: #f97316; text-decoration: none; font-weight: 600;">support@tripdm.com</a>
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

        let resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [targetEmail],
            subject: `🎉 Congratulations! Your Agency "${targetCompanyName}" is Approved on TripDM`,
            html: emailHtml,
          }),
        });

        if (resendRes.ok) {
          const resendData = await resendRes.json();
          console.log(`Resend email sent directly to ${targetEmail}:`, resendData);
          emailSent = true;
          isDirectDelivery = true;
        } else {
          const errData = await resendRes.json().catch(() => ({}));
          console.warn(`Resend API returned warning (${resendRes.status}):`, errData);
          emailError = errData.message || JSON.stringify(errData);

          // If Resend blocked because domain not verified (only allows sending to registered Resend account email):
          if (resendRes.status === 403 && (errData.message?.includes('You can only send testing emails to your own email address') || errData.message?.includes('domain is not verified'))) {
            const fallbackEmail = 'phitanshu962@gmail.com';
            console.log(`Sending approval preview copy to registered account email (${fallbackEmail})...`);
            
            const fallbackRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'TripDM <onboarding@resend.dev>',
                to: [fallbackEmail],
                subject: `[Sandbox Preview for ${targetEmail}] 🎉 Agency "${targetCompanyName}" Approved on TripDM`,
                html: emailHtml,
              }),
            });

            if (fallbackRes.ok) {
              emailSent = true;
              isFallback = true;
              console.log(`Approval preview sent successfully to ${fallbackEmail}`);
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to send Resend approval email:', err);
        emailError = err.message;
      }
    }
  }

    return NextResponse.json({
      success: true,
      message: 'Agency approved successfully',
      emailSent,
      isDirectDelivery,
      isFallback,
      targetEmail,
      emailError,
    });
  } catch (error: any) {
    console.error('Error in approve-agency API:', error);
    return NextResponse.json({ error: error.message || 'Failed to approve agency' }, { status: 500 });
  }
}
