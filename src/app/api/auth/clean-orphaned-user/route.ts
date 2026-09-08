import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    // Check if user exists in Firebase Auth
    let userRecord: admin.auth.UserRecord | null = null;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        return NextResponse.json({ cleaned: false, reason: 'User not found in Auth' });
      }
      throw e;
    }

    if (userRecord) {
      // Check if user document exists in Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (!userDoc.exists) {
        // The user exists in Auth but NOT in Firestore (orphaned / removed account)
        console.log(`Deleting orphaned Auth user ${userRecord.uid} (${email})`);
        await admin.auth().deleteUser(userRecord.uid);
        return NextResponse.json({ cleaned: true, message: 'Orphaned user deleted from Auth' });
      } else {
        // The user genuinely exists in Firestore
        return NextResponse.json({ cleaned: false, reason: 'Active user document exists in Firestore' });
      }
    }

    return NextResponse.json({ cleaned: false });
  } catch (error: any) {
    console.error('Error in clean-orphaned-user API:', error);
    return NextResponse.json({ error: error.message || 'Failed to check orphaned user' }, { status: 500 });
  }
}
