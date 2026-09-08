import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    initializeFirebase();
    const db = getFirestore();

    const configDoc = await db.collection('admin').doc('config').get();
    
    const data = configDoc.exists ? configDoc.data() : {
      starterPrice: 2000,
      premiumPrice: 5000,
      vipPrice: 10000,
      addonCreditPrice: 1
    };

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin config:', error);
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
