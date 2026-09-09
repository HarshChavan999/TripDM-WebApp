import { Metadata } from 'next';
import HomeClient from './HomeClient';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const dynamic = 'force-dynamic';

async function getApprovedListings() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: "listings" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "approved" },
            op: "EQUAL",
            value: { booleanValue: true }
          }
        },
        limit: 50
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error("Error fetching listings from REST API:", await res.text());
      return [];
    }

    const data = await res.json();
    
    // runQuery returns an array of { document: { name, fields, ... } }
    const listings = data
      .filter((item: any) => item.document)
      .map((item: any) => parseFirestoreDocument(item.document));
      
    return listings;
  } catch (error) {
    console.error("Exception fetching listings:", error);
    return [];
  }
}

export const metadata: Metadata = {
  title: "TripDM: Direct Message. Better Travel.",
  description:
    "TripDM connects travelers directly with trusted travel agents through instant messaging. Browse top India travel packages, get personalised itineraries and book with confidence.",
  keywords: [
    'travel agents India',
    'travel packages',
    'book travel online',
    'TripDM',
    'direct message travel',
    'India tour packages',
    'verified travel agents',
  ],
  alternates: {
    canonical: 'https://tripdm.com',
  },
  openGraph: {
    title: 'TripDM: Direct Message. Better Travel.',
    description:
      'Connect directly with trusted travel agents. Browse curated India travel packages and book your dream trip with TripDM.',
    type: 'website',
    url: 'https://tripdm.com',
    siteName: 'TripDM',
    images: [
      {
        url: 'https://tripdm.com/homepage-image.png',
        width: 1200,
        height: 630,
        alt: 'TripDM – Direct Message. Better Travel.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripDM: Direct Message. Better Travel.',
    description:
      'Connect directly with trusted travel agents. Browse curated India travel packages.',
    images: ['https://tripdm.com/homepage-image.png'],
  },
};

import { Suspense } from 'react';

export default async function HomePage() {
  // Fetch initial data on the server for pure HTML SSR
  const initialListings = await getApprovedListings();

  // Render the client component monolith, passing the server-fetched data as initial state
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClient initialListings={initialListings} routeMode="user" />
    </Suspense>
  );
}
