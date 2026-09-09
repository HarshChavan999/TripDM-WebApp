import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block: admin panels, blog editor, agency admin, API routes, auth pages
        // These are thin/auth-only pages that waste crawl budget
        disallow: [
          '/admin/',
          '/blogtripdm/',
          '/agencytripdm/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
