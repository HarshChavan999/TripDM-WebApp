import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/blogtripdm/',
          '/agencytripdm/',
          '/api/',
          '/*?*section=chat',
          '/*?*section=profile',
          '/*?*section=wishlist',
          '/*?*action=chat',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/blogtripdm/',
          '/agencytripdm/',
          '/api/',
          '/*?*section=chat',
          '/*?*section=profile',
          '/*?*section=wishlist',
          '/*?*action=chat',
        ],
      },
    ],
    sitemap: 'https://tripdm.com/sitemap.xml',
  };
}
