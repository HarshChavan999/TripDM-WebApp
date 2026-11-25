import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBBRmuO-xfWP-1bxiP5Ex1aSOo3dWu4Mhs',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'travel-agent-management-29c27.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'travel-agent-management-29c27',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '387994411670',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:387994411670:web:5591a4bc9e4befb09f18b7',
    NEXT_PUBLIC_ADMIN_EMAILS: 'phitanshu962@gmail.com,travelagent465@gmail.com,harshnpc21@gmail.com'
  },
  // Ensure consistent non-trailing-slash URL formatting
  trailingSlash: false,
  // Exclude Firebase Admin SDK from bundling
  serverExternalPackages: ['firebase-admin'],
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      {
        source: '/d',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/d/:path*',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/packages',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/package',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/package/uttarakhand',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/uttarakhand-tour-package',
        destination: '/destinations',
        permanent: true,
      },
      {
        source: '/agents',
        destination: '/travel-agents',
        permanent: true,
      },
      {
        source: '/about',
        destination: '/policies/about',
        permanent: true,
      },
      {
        source: '/terms',
        destination: '/policies/conditions-of-use',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/policies/privacy-notice',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
