import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseFirestoreDocument } from '@/lib/firestoreParser';
import StoryClientPage from './StoryClientPage';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/destination_stories?pageSize=100`;
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

async function getStory(id: string) {
  try {
    // 1. Try direct ID lookup
    const directUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/destination_stories/${id}`;
    const directRes = await fetch(directUrl, { next: { revalidate: 60 } });
    if (directRes.ok) {
      const data = await directRes.json();
      const story = parseFirestoreDocument(data);
      if (story) {
        story.id = id;
        return story;
      }
    }

    // 2. Fallback: Query all stories and match by ID or stateName slug
    const allUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/destination_stories?pageSize=100`;
    const allRes = await fetch(allUrl, { next: { revalidate: 60 } });
    if (allRes.ok) {
      const allData = await allRes.json();
      if (Array.isArray(allData.documents)) {
        for (const doc of allData.documents) {
          const parsed = parseFirestoreDocument(doc);
          if (!parsed) continue;
          const docId = doc.name.split('/').pop();
          parsed.id = docId;
          const stateSlug = (parsed.stateName || '').toLowerCase().replace(/\s+/g, '-');
          const cleanId = id.toLowerCase().replace(/\s+/g, '-');

          if (docId === id || stateSlug === cleanId || (parsed.stateName || '').toLowerCase() === id.toLowerCase()) {
            return parsed;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching destination story:', error);
    return null;
  }
}

async function getListings() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/listings?pageSize=1000`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) return [];
    return data.documents.map((doc: any) => parseFirestoreDocument(doc)).filter(Boolean);
  } catch (error) {
    console.error('Error fetching listings for story:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const story = await getStory(resolvedParams.id);

  if (!story) {
    return {
      title: 'Story Not Found | TripDM',
      description: 'The requested destination story could not be found.',
    };
  }

  const title = story.title || `${story.stateName} Travel Guide & Stories | TripDM`;
  const description =
    story.description ||
    story.narrative?.slice(0, 160) ||
    `Explore verified itineraries and immersive travel stories across ${story.stateName} on TripDM.`;

  return {
    title: `${title} | TripDM`,
    description,
    openGraph: {
      title: `${title} | TripDM`,
      description,
      images: story.coverImage ? [{ url: story.coverImage, alt: story.stateName }] : [],
    },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const [story, listings] = await Promise.all([
    getStory(resolvedParams.id),
    getListings(),
  ]);

  if (!story) {
    notFound();
  }

  return (
    <StoryClientPage
      initialStory={story}
      initialListings={listings}
    />
  );
}
