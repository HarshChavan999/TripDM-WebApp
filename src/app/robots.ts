import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/blogtripdm/', '/agencytripdm/', '/api/'], // Disallowing admin, blog admin, agency portal, and api routes from being indexed
    },
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
