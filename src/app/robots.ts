import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/blogtripdm/', '/agencytripdm/', '/api/', '/_next/'], // Disallowing admin, internal portals, api and static build assets
    },
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
