import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found (404) | TripDM',
  description: 'The requested page could not be found on TripDM.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50/30 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-amber-100 to-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner font-extrabold text-3xl sm:text-4xl">
          404
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Page Not Found
        </h1>
        
        <p className="text-sm sm:text-base text-slate-600 mb-8 leading-relaxed">
          The page or package you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md shadow-orange-500/20 transition-all duration-200 text-sm"
          >
            Return Home
          </Link>
          <Link
            href="/destinations"
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-all duration-200 text-sm"
          >
            Explore Destinations
          </Link>
        </div>
      </div>

      <div className="mt-8 text-xs text-slate-400">
        TripDM &mdash; Direct Message. Better Travel.
      </div>
    </div>
  );
}
