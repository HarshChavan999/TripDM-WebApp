import { NextResponse } from 'next/server';
import { sendWebPushNotification } from '@/lib/fcmServer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, tokens, title, body: content, icon, url, data } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content body are required.' },
        { status: 400 }
      );
    }

    if (!userId && (!tokens || !tokens.length)) {
      return NextResponse.json(
        { error: 'Either userId or tokens list must be provided.' },
        { status: 400 }
      );
    }

    const result = await sendWebPushNotification({
      userId,
      tokens,
      title,
      body: content,
      icon,
      url,
      data
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/notifications/push error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process push notification.' },
      { status: 500 }
    );
  }
}
