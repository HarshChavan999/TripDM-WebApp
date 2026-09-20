import { Metadata } from 'next';
import BlogAdminClient from './BlogAdminClient';

export const metadata: Metadata = {
  title: 'Blog Admin | TripDM',
  description: 'Blog management dashboard for TripDM administrators',
  robots: {
    index: false,
    follow: false,
  },
};

import { Suspense } from 'react';
import PageLoader from '@/components/PageLoader';

export default function BlogAdminPage() {
  return (
    <Suspense fallback={<PageLoader text="Fetching details..." />}>
      <BlogAdminClient />
    </Suspense>
  );
}
