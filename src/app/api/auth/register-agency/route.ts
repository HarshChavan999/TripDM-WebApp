import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, password, agencyData, logoUrl } = await req.json();

    if (!email || !password || !agencyData) {
      return NextResponse.json({ error: 'Missing required registration data' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if an approved, active agency already exists in Firestore for this email
    const snap1 = await db.collection('users').where('email', '==', cleanEmail).get();
    const snap2 = await db.collection('users').where('authEmail', '==', cleanEmail).get();
    const existingDocs = [...snap1.docs, ...snap2.docs];
    
    // Check if there's an already approved agency or admin account
    const hasApprovedAgency = existingDocs.some(d => {
      if (!d.exists) return false;
      const data = d.data();
      return (data.role === 'agency' && data.approved === true) || data.role === 'admin';
    });

    if (hasApprovedAgency) {
      return NextResponse.json(
        { error: 'An active approved agency account is already registered with this email. Please log in.' },
        { status: 400 }
      );
    }

    // 2. Manage Firebase Auth account
    let targetUid: string | null = null;
    let existingAuthUser: admin.auth.UserRecord | null = null;

    try {
      existingAuthUser = await admin.auth().getUserByEmail(cleanEmail);
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
    }

    if (existingAuthUser) {
      // If auth user exists (e.g. from previous unapproved/deleted agency or Google sign-in), update credentials
      try {
        await admin.auth().updateUser(existingAuthUser.uid, {
          password: password,
          displayName: agencyData.name || agencyData.companyName || 'Agency Partner',
        });
        targetUid = existingAuthUser.uid;
      } catch (updateErr: any) {
        // If updating fails for any reason, delete and recreate
        console.warn('Could not update existing auth user, recreating:', updateErr.message);
        try {
          await admin.auth().deleteUser(existingAuthUser.uid);
        } catch {}
        const newRecord = await admin.auth().createUser({
          email: cleanEmail,
          password: password,
          displayName: agencyData.name || agencyData.companyName || 'Agency Partner',
        });
        targetUid = newRecord.uid;
      }
    } else {
      // Create fresh user in Firebase Auth
      const newRecord = await admin.auth().createUser({
        email: cleanEmail,
        password: password,
        displayName: agencyData.name || agencyData.companyName || 'Agency Partner',
      });
      targetUid = newRecord.uid;
    }

    if (!targetUid) {
      throw new Error('Failed to create or update authentication credentials');
    }

    // 3. Clean up any stray Firestore documents with different IDs for this email
    for (const d of existingDocs) {
      if (d.id !== targetUid) {
        try {
          await d.ref.delete();
        } catch {}
      }
    }

    // 4. Save/Update Firestore document for the agency
    const userDataToSave = {
      role: 'agency',
      approved: false, // Must be approved by admin
      name: agencyData.name || 'Agency Partner',
      companyName: agencyData.companyName || 'Travel Agency',
      email: cleanEmail,
      authEmail: cleanEmail,
      contactEmail: cleanEmail,
      phone: agencyData.phone || '',
      contactNumber: agencyData.phone || '',
      businessLocation: agencyData.businessLocation || '',
      fullAddress: agencyData.fullAddress || '',
      agencyDescription: agencyData.agencyDescription || '',
      refundPolicy: agencyData.refundPolicy || '',
      operatingFromHome: Boolean(agencyData.operatingFromHome),
      operatingFromOffice: Boolean(agencyData.operatingFromOffice),
      officeAddress: agencyData.operatingFromOffice ? (agencyData.officeAddress || '') : '',
      logoUrl: logoUrl || '',
      agencyLogo: logoUrl || '',
      avatarUrl: logoUrl || '',
      plan: 'free',
      credits: 0,
      freeChats: 2,
      unlockedUsers: [],
      creditHistory: [
        {
          id: 'TX-INIT',
          type: 'reset',
          amount: 2,
          description: 'Welcome Bonus: 2 Free Chats',
          timestamp: Date.now(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('users').doc(targetUid).set(userDataToSave, { merge: true });

    return NextResponse.json({
      success: true,
      userId: targetUid,
      message: 'Agency registration submitted successfully',
    });
  } catch (error: any) {
    console.error('Error in register-agency API:', error);
    let errorMsg = error.message || 'Failed to register agency';
    if (error.code === 'auth/email-already-exists') {
      errorMsg = 'This email is already registered. Please use a different email address or try logging in instead.';
    } else if (error.code === 'auth/invalid-password') {
      errorMsg = 'Password must be at least 6 characters long.';
    }
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
