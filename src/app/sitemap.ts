import { MetadataRoute } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeFirebase } from '@/lib/auth';

// Revalidate sitemap every hour so new packages and blogs automatically appear
export const revalidate = 3600;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

async function fetchAllListings(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const packageUrls: MetadataRoute.Sitemap = [];

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'listings' }],
        where: {
          fieldFilter: { field: { fieldPath: 'approved' }, op: 'EQUAL', value: { booleanValue: true } }
        },
        limit: 1000
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      for (const item of data) {
        if (!item.document) continue;
        const nameParts = item.document.name.split('/');
        const id = nameParts[nameParts.length - 1];
        const updateTime = item.document.updateTime;
        packageUrls.push({
          url: `${baseUrl}/package/${id}`,
          lastModified: updateTime ? new Date(updateTime) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching listings for sitemap via REST:", error);
  }

  // Fallback to Firebase Admin if REST returned empty
  if (packageUrls.length === 0) {
    try {
      initializeFirebase();
      const db = getFirestore();
      const snapshot = await db.collection('listings').get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.approved === false) continue;
        const updateTime = data.updatedAt || data.createdAt || doc.updateTime;
        packageUrls.push({
          url: `${baseUrl}/package/${doc.id}`,
          lastModified: updateTime ? new Date(updateTime.seconds ? updateTime.seconds * 1000 : updateTime) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    } catch (error) {
      console.error("Error fetching listings for sitemap via Admin SDK:", error);
    }
  }

  return packageUrls;
}

async function fetchAllBlogs(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  const blogUrls: MetadataRoute.Sitemap = [];

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } }
        },
        limit: 10000
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      for (const item of data) {
        if (!item.document) continue;
        const fields = item.document.fields || {};
        const slug = fields.slug?.stringValue;
        const nameParts = item.document.name.split('/');
        const id = nameParts[nameParts.length - 1];
        const finalSlug = slug || id;
        if (!finalSlug || finalSlug === 'undefined') continue;
        const updatedAt = fields.updatedAt?.stringValue || fields.publishedAt?.stringValue || item.document.updateTime;
        blogUrls.push({
          url: `${baseUrl}/blog/${finalSlug}`,
          lastModified: updatedAt ? new Date(updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching blogs for sitemap via REST:", error);
  }

  // Fallback to Firebase Admin if REST returned empty
  if (blogUrls.length === 0) {
    try {
      initializeFirebase();
      const db = getFirestore();
      const snapshot = await db.collection('blogs').get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.published === false) continue;
        const slug = data.slug || doc.id;
        if (!slug || slug === 'undefined') continue;
        const updatedAt = data.updatedAt || data.publishedAt || doc.updateTime;
        blogUrls.push({
          url: `${baseUrl}/blog/${slug}`,
          lastModified: updatedAt ? new Date(updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    } catch (error) {
      console.error("Error fetching blogs for sitemap via Admin SDK:", error);
    }
  }

  return blogUrls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tripdm.com';

  const [packageUrls, blogUrls] = await Promise.all([
    fetchAllListings(baseUrl),
    fetchAllBlogs(baseUrl),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/policies/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/policies/conditions-of-use`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/internet-based-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/policies/privacy-notice`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  return [...staticUrls, ...packageUrls, ...blogUrls];
}
