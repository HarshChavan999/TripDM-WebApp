import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/lib/auth';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { agencyId, email: directEmail } = await req.json();

    if (!agencyId && !directEmail) {
      return NextResponse.json({ error: 'Agency ID or Email is required' }, { status: 400 });
    }

    initializeFirebase();
    const db = getFirestore();

    const agencyEmails = new Set<string>();
    const uidsToDelete = new Set<string>();

    if (agencyId) {
      uidsToDelete.add(agencyId);
    }
    if (directEmail) {
      agencyEmails.add(directEmail.toLowerCase().trim());
    }

    // 1. Fetch user doc to extract all email addresses and UID associated with this agency
    if (agencyId) {
      try {
        const userDocSnap = await db.collection('users').doc(agencyId).get();
        if (userDocSnap.exists) {
          const d = userDocSnap.data() as any;
          if (d.email) agencyEmails.add(d.email.toLowerCase().trim());
          if (d.authEmail) agencyEmails.add(d.authEmail.toLowerCase().trim());
          if (d.contactEmail) agencyEmails.add(d.contactEmail.toLowerCase().trim());
        }
      } catch (e: any) {
        console.warn('Could not read user doc before deletion:', e.message);
      }
    }

    // 2. Query Firestore by all known emails to find any other user docs/UIDs
    for (const em of Array.from(agencyEmails)) {
      try {
        const snap1 = await db.collection('users').where('email', '==', em).get();
        snap1.forEach(d => {
          uidsToDelete.add(d.id);
          const data = d.data();
          if (data.email) agencyEmails.add(data.email.toLowerCase().trim());
          if (data.authEmail) agencyEmails.add(data.authEmail.toLowerCase().trim());
        });

        const snap2 = await db.collection('users').where('authEmail', '==', em).get();
        snap2.forEach(d => {
          uidsToDelete.add(d.id);
          const data = d.data();
          if (data.email) agencyEmails.add(data.email.toLowerCase().trim());
          if (data.authEmail) agencyEmails.add(data.authEmail.toLowerCase().trim());
        });
      } catch {}
    }

    // 3. Delete users from Firebase Auth by UID
    for (const uid of Array.from(uidsToDelete)) {
      try {
        await admin.auth().deleteUser(uid);
        console.log(`Successfully deleted user ${uid} from Firebase Auth by UID`);
      } catch (authError: any) {
        if (authError.code !== 'auth/user-not-found') {
          console.warn(`Could not delete user ${uid} from Firebase Auth by UID:`, authError.message);
        }
      }
    }

    // 4. Delete user from Firebase Auth by all associated emails (in case Auth UID differed from Firestore doc ID)
    for (const em of Array.from(agencyEmails)) {
      try {
        const u = await admin.auth().getUserByEmail(em);
        if (u && u.uid) {
          await admin.auth().deleteUser(u.uid);
          console.log(`Successfully deleted user from Firebase Auth by email: ${em} (${u.uid})`);
        }
      } catch (emailErr: any) {
        // Ignored if user not found by email
      }
    }

    // 5. Delete all user documents from Firestore
    for (const uid of Array.from(uidsToDelete)) {
      try {
        await db.collection('users').doc(uid).delete();
        console.log(`Successfully deleted user document ${uid} from Firestore`);
      } catch (dbError: any) {
        console.warn(`Could not delete user document ${uid} from Firestore:`, dbError.message);
      }
    }

    // 6. Delete all packages/listings belonging to this agency
    for (const uid of Array.from(uidsToDelete)) {
      try {
        const batch = db.batch();
        let deleteCount = 0;

        const listingsSnap1 = await db.collection('listings').where('userId', '==', uid).get();
        listingsSnap1.forEach((doc) => {
          batch.delete(doc.ref);
          deleteCount++;
        });

        const listingsSnap2 = await db.collection('listings').where('agencyId', '==', uid).get();
        listingsSnap2.forEach((doc) => {
          batch.delete(doc.ref);
          deleteCount++;
        });

        if (deleteCount > 0) {
          await batch.commit();
          console.log(`Successfully deleted ${deleteCount} listings for agency ${uid}`);
        }
      } catch (listingsError: any) {
        console.warn(`Error cleaning up listings for agency ${uid}:`, listingsError.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agency, Auth records, and associated listings deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error in delete-agency API:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete agency' }, { status: 500 });
  }
}
