import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import HomeClient from '../../HomeClient';
import PageLoader from '@/components/PageLoader';
import { parseFirestoreDocument } from '@/lib/firestoreParser';
import {
  resolveDestinationWithAutocorrect,
  isAgencyMatchingKeywords,
  isPackageMatchingKeywords,
  DESTINATION_DICTIONARY,
} from '@/lib/destinationResolver';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const dynamicParams = true;
export const revalidate = 60;

// Pre-render core popular destinations at build time; others generate dynamically on demand
export async function generateStaticParams() {
  const coreDestinations = [
    'kashmir',
    'himachal',
    'manali',
    'kerala',
    'goa',
    'rajasthan',
    'uttarakhand',
    'andaman',
    'ladakh',
    'gujarat',
    'dubai',
    'bali',
  ];
  return coreDestinations.map((destination) => ({ destination }));
}

async function getInitialData() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'listings' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'approved' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        limit: 1000,
      },
    };

    const usersQuery = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        limit: 1000,
      },
    };

    const [listingsRes, usersRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        next: { revalidate: 30 },
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(usersQuery),
        next: { revalidate: 60 },
      }).catch(() => null),
    ]);

    if (!listingsRes.ok) {
      return { listings: [], agencies: [] };
    }

    const data = await listingsRes.json();
    
    const agencyMap: Record<string, any> = {};
    if (usersRes && usersRes.ok) {
      try {
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          usersData.forEach((item: any) => {
            if (item.document) {
              const u = parseFirestoreDocument(item.document);
              if (u && u.id) {
                agencyMap[u.id] = u;
              }
            }
          });
        }
      } catch (err) {
        console.warn('Error parsing users for SSR listings:', err);
      }
    }

    const agencies = Object.values(agencyMap)
      .filter((u: any) => u.role === 'agency')
      .map((u: any) => {
        const company = (u.companyName || u.agencyName || '').trim();
        const personal = (u.name || u.displayName || '').trim();
        const isGeneric = (str: string) =>
          ['admin', 'travel agency', 'verified agency', 'verified travel agency', 'unknown agency', 'unknown'].includes(str.toLowerCase());
        const resolvedName = (company && !isGeneric(company))
          ? company
          : (personal && !isGeneric(personal))
          ? personal
          : company || personal || 'Travel Agency';
        return {
          ...u,
          name: resolvedName,
          companyName: u.companyName || resolvedName,
          agencyName: u.agencyName || resolvedName,
          ownerName: personal || u.ownerName,
        };
      });

    const listings = data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const parsed = parseFirestoreDocument(item.document);
        const agencyId = parsed.agencyId || parsed.userId;
        const ag = agencyId ? agencyMap[agencyId] : null;
        return {
          ...parsed,
          agencyName: parsed.agencyName || ag?.companyName || ag?.name || ag?.displayName || 'Travel Agency',
          agencyLogo: parsed.agencyLogo || parsed.logoUrl || ag?.logoUrl || ag?.agencyLogo || ag?.avatarUrl || null,
          agencyData: parsed.agencyData || ag || null,
        };
      });
      
    return { listings, agencies };
  } catch (error) {
    console.error('Exception fetching listings:', error);
    return { listings: [], agencies: [] };
  }
}

function normalizeDestination(raw: string): string {
  return decodeURIComponent(raw || '').toLowerCase().replace(/[-_]+/g, ' ').trim();
}

function findMatchingData(destinationQuery: string, listings: any[], agencies: any[]) {
  const resolved = resolveDestinationWithAutocorrect(destinationQuery);
  const keywords = resolved.keywords || [resolved.canonicalKey, destinationQuery.toLowerCase()];

  const matchingAgencies = agencies.filter((agency: any) => {
    // 1. Direct location / state / city
    const loc = `${agency.city || ''} ${agency.state || ''} ${agency.country || ''} ${agency.location || ''} ${agency.businessLocation || ''}`.toLowerCase();
    if (keywords.some((kw) => kw !== 'india' && loc.includes(kw))) return true;

    // 2. Destinations array
    if (Array.isArray(agency.destinations) && agency.destinations.length > 0) {
      if (agency.destinations.some((d: string) => keywords.some((kw) => (d || '').toLowerCase().includes(kw)))) return true;
    }

    // 3. Specialties array
    if (Array.isArray(agency.specialties) && agency.specialties.length > 0) {
      if (agency.specialties.some((s: string) => keywords.some((kw) => (s || '').toLowerCase().includes(kw)))) return true;
    }

    // 4. Agency packages
    if (isAgencyMatchingKeywords(agency, keywords)) return true;

    return false;
  });

  const matchingListings = listings.filter((pkg: any) => {
    const pkgLoc = `${pkg.countryName || ''} ${pkg.stateName || ''} ${pkg.city || ''} ${pkg.title || ''} ${pkg.description || ''}`.toLowerCase();
    if (keywords.some((kw) => kw !== 'india' && pkgLoc.includes(kw))) return true;
    return isPackageMatchingKeywords(pkg, keywords);
  });

  return {
    resolved,
    matchingAgencies,
    matchingListings,
    totalMatches: matchingAgencies.length + matchingListings.length,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>;
}): Promise<Metadata> {
  const { destination: rawDestination } = await params;
  const destinationQuery = normalizeDestination(rawDestination);
  const { listings, agencies } = await getInitialData();
  const { resolved, totalMatches } = findMatchingData(destinationQuery, listings, agencies);

  // Zero Thin-Content Protection: If no agencies or packages exist for this place, do not index
  if (totalMatches === 0) {
    return {
      title: 'Travel Agents Not Found | TripDM',
      description: 'No verified travel agents found for this destination.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const displayName = resolved.displayName;
  const cleanSlug = rawDestination.toLowerCase().trim();
  const canonicalUrl = `https://tripdm.com/travel-agents/${cleanSlug}`;

  const title = `Best Travel Agents in ${displayName} (Verified Local Experts) | TripDM`;
  const description = `Connect directly with verified local travel agents in ${displayName}. Compare custom itineraries, chat directly on DM with no middleman, and book with zero commission.`;

  const dictEntry = DESTINATION_DICTIONARY[resolved.canonicalKey];
  const ogImage = dictEntry?.image || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80';

  return {
    title,
    description,
    keywords: [
      `travel agent of ${displayName}`,
      `travel agents in ${displayName}`,
      `best travel agent for ${displayName}`,
      `best travel agent for ${displayName} trip`,
      `local travel agents in ${displayName}`,
      `${displayName} travel agency`,
      `verified travel agents in ${displayName}`,
      `chat with ${displayName} travel agent`,
      `${displayName} tour operators`,
      `${displayName} tour planners`,
      `customized ${displayName} tour package travel agents`,
      `${displayName} travel agency zero commission`,
      `${displayName} tour packages`,
      'TripDM',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TripDM',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Travel Agents in ${displayName} - TripDM`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DestinationTravelAgentsPage({
  params,
}: {
  params: Promise<{ destination: string }>;
}) {
  const { destination: rawDestination } = await params;
  const destinationQuery = normalizeDestination(rawDestination);
  const { listings, agencies } = await getInitialData();
  const { resolved, matchingAgencies, totalMatches } = findMatchingData(destinationQuery, listings, agencies);

  // If no matching agencies or packages exist, return clean 404 (prevents Google indexing empty states)
  if (totalMatches === 0) {
    notFound();
  }

  const displayName = resolved.displayName;
  const cleanSlug = rawDestination.toLowerCase().trim();
  const canonicalUrl = `https://tripdm.com/travel-agents/${cleanSlug}`;

  // 1. Schema.org ItemList of Local Agencies
  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Verified Travel Agents in ${displayName}`,
    description: `Directory of verified travel agencies and tour planners specializing in ${displayName}.`,
    itemListElement: matchingAgencies.slice(0, 10).map((ag: any, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'TravelAgency',
        name: ag.companyName || ag.name || 'Verified Travel Agency',
        description: `Verified travel agency specializing in ${displayName} tour packages and customized itineraries.`,
        url: canonicalUrl,
        areaServed: `${displayName}, India`,
        priceRange: '₹₹₹',
        aggregateRating: ag.rating ? {
          '@type': 'AggregateRating',
          ratingValue: ag.rating,
          reviewCount: ag.reviewCount || 5,
        } : undefined,
      },
    })),
  };

  // 2. Schema.org BreadcrumbList
  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://tripdm.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Travel Agents',
        item: 'https://tripdm.com/travel-agents',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${displayName} Travel Agents`,
        item: canonicalUrl,
      },
    ],
  };

  // 3. Schema.org FAQPage for Rich Search Dropdowns
  const jsonLdFaq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How do I choose the best travel agent in ${displayName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `On TripDM, you can browse verified travel agents who specialize in ${displayName}, review their ratings, explore their itineraries, and chat with them directly on DM before making any payment.`,
        },
      },
      {
        '@type': 'Question',
        name: `Can I customize my ${displayName} travel itinerary directly with local agents?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes! TripDM allows direct real-time messaging with local ${displayName} travel agencies so you can adjust hotel preferences, sightseeing places, travel dates, and vehicle options according to your budget.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is there any extra booking fee or commission on TripDM?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `No. TripDM charges zero commission on travel package prices. You communicate and settle payments directly with the verified travel agency.`,
        },
      },
      {
        '@type': 'Question',
        name: `How can I chat directly with verified ${displayName} travel agents?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `On TripDM, click 'Chat with Agency' on any verified ${displayName} agency profile to open an instant DM conversation. You can ask questions, discuss custom dates, compare prices, and finalize your trip directly.`,
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <Suspense fallback={<PageLoader text={`Loading ${displayName} travel agents...`} />}>
        <HomeClient
          initialListings={listings}
          initialAgencies={agencies}
          defaultSection="agents"
          defaultDestination={displayName}
          routeMode="user"
        />
      </Suspense>
    </>
  );
}
