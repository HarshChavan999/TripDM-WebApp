import { MetadataRoute } from 'next';

// Revalidate sitemap every 6 hours so new packages and blogs automatically appear
export const revalidate = 21600;

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  'travel-agent-management-29c27';

const BASE_URL = 'https://tripdm.com';

// ─── Listings ────────────────────────────────────────────────────────────────

async function fetchAllListings(): Promise<MetadataRoute.Sitemap> {
  const packageUrls: MetadataRoute.Sitemap = [];

  try {
    // Use the same public Firestore REST API pattern as every other page in
    // this app (no Firebase Admin SDK needed – avoids 403 auth errors).
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
        select: {
          fields: [
            { fieldPath: 'updatedAt' },
            { fieldPath: 'createdAt' },
          ],
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 21600 },
    });

    if (!res.ok) {
      console.error('Sitemap: failed to fetch listings', res.status);
      return packageUrls;
    }

    const data = await res.json();

    for (const item of data) {
      if (!item.document) continue;
      const doc = item.document;
      const nameParts: string[] = doc.name.split('/');
      const id = nameParts[nameParts.length - 1];
      const fields = doc.fields || {};

      const rawDate =
        fields.updatedAt?.timestampValue ||
        fields.updatedAt?.stringValue ||
        fields.createdAt?.timestampValue ||
        fields.createdAt?.stringValue ||
        null;

      packageUrls.push({
        url: `${BASE_URL}/package/${id}`,
        lastModified: rawDate ? new Date(rawDate) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error('Sitemap: error fetching listings:', error);
  }

  return packageUrls;
}

// ─── Blogs ───────────────────────────────────────────────────────────────────

async function fetchAllBlogs(): Promise<MetadataRoute.Sitemap> {
  const blogUrls: MetadataRoute.Sitemap = [];

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'published' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        select: {
          fields: [
            { fieldPath: 'slug' },
            { fieldPath: 'updatedAt' },
            { fieldPath: 'publishedAt' },
          ],
        },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      next: { revalidate: 21600 },
    });

    if (!res.ok) {
      console.error('Sitemap: failed to fetch blogs', res.status);
      return blogUrls;
    }

    const data = await res.json();

    for (const item of data) {
      if (!item.document) continue;
      const doc = item.document;
      const fields = doc.fields || {};

      const slug =
        fields.slug?.stringValue ||
        doc.name.split('/').pop();

      if (!slug || slug === 'undefined') continue;

      const rawDate =
        fields.updatedAt?.stringValue ||
        fields.updatedAt?.timestampValue ||
        fields.publishedAt?.stringValue ||
        fields.publishedAt?.timestampValue ||
        null;

      blogUrls.push({
        url: `${BASE_URL}/blog/${slug}`,
        lastModified: rawDate ? new Date(rawDate) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error('Sitemap: error fetching blogs:', error);
  }

  return blogUrls;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [packageUrls, blogUrls] = await Promise.all([
    fetchAllListings(),
    fetchAllBlogs(),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/policies/conditions-of-use`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/policies/internet-based-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/policies/privacy-notice`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const total = packageUrls.length + blogUrls.length;
  console.log(
    `Sitemap generated: ${staticUrls.length} static, ${packageUrls.length} packages, ${blogUrls.length} blogs → ${total + staticUrls.length} total URLs`
  );

  return [...staticUrls, ...packageUrls, ...blogUrls];
}
