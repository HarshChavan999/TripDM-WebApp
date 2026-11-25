import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PackageClientView from './PackageClientView';
import { parseFirestoreDocument } from '@/lib/firestoreParser';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings?pageSize=1000`;
    const res = await fetch(url);
    if (!res.ok) return [{ id: 'default' }];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents) || data.documents.length === 0) {
      return [{ id: 'default' }];
    }
    const paths = data.documents.map((doc: any) => {
      const parts = doc.name.split('/');
      return { id: parts[parts.length - 1] };
    });
    return paths.length > 0 ? paths : [{ id: 'default' }];
  } catch {
    return [{ id: 'default' }];
  }
}

async function getListing(id: string) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings/${id}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    const listing = parseFirestoreDocument(data);
    listing.id = id;

    return listing;
  } catch (error) {
    console.error("Error fetching listing:", error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing || listing.approved === false) {
    return {
      title: 'Package Not Found | TripDM',
      description: 'The requested travel package could not be found.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = listing.title || 'Travel Package';
  const description = listing.description || `Discover this amazing travel package to ${listing.countryName || listing.stateName || 'your next destination'}.`;
  
  let imageUrl = '';
  if (listing.itinerary && Array.isArray(listing.itinerary)) {
    for (const day of listing.itinerary) {
      if (day?.imageUrls && day.imageUrls.length > 0 && day.imageUrls[0]) {
        imageUrl = day.imageUrls[0];
        break;
      } else if (day?.imageUrl) {
        imageUrl = day.imageUrl;
        break;
      }
    }
  }
  if (!imageUrl && listing.placesCovered && listing.placesCovered.length > 0 && listing.placesCovered[0]?.imageUrls?.length > 0) {
    imageUrl = listing.placesCovered[0].imageUrls[0];
  } else if (!imageUrl && listing.photos && listing.photos.length > 0) {
    imageUrl = listing.photos[0];
  }

  const canonicalUrl = `https://tripdm.com/package/${resolvedParams.id}`;

  return {
    title: `${title} | TripDM`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TripDM',
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, alt: title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const listing = await getListing(resolvedParams.id);

  if (!listing || listing.approved === false) {
    notFound();
  }

  const destination = listing.countryName || listing.stateName || 'Worldwide';
  const title = listing.title || 'Travel Package';
  const price = listing.discountedPrice || listing.price || 0;
  const canonicalUrl = `https://tripdm.com/package/${resolvedParams.id}`;

  // Structured JSON-LD Data for Google Search Indexing & Rich Snippets
  const jsonLdTouristTrip = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    description: listing.description || `Tour package to ${destination}`,
    touristType: ['Sightseeing', 'Adventure', 'Leisure'],
    offers: {
      '@type': 'Offer',
      price: price.toString(),
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: canonicalUrl,
    },
    provider: {
      '@type': 'Organization',
      name: listing.agencyName || 'TripDM Verified Travel Agency',
      url: 'https://tripdm.com',
    },
  };

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
        name: 'Destinations',
        item: 'https://tripdm.com/destinations',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdTouristTrip) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <PackageClientView listing={listing} />
    </>
  );
}
