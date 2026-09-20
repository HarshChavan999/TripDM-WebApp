import React from 'react';

interface PageLoaderProps {
  text?: string;
  subtext?: string;
}

export default function PageLoader({
  text = 'Fetching details...'
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs px-4 select-none"
    >
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        {/* Simple Smooth Spinner */}
        <div className="w-8 h-8 border-3 border-slate-200 border-t-orange-500 rounded-full animate-spin" />

        {/* Simple Centered Text */}
        <p className="text-slate-600 text-sm font-medium tracking-tight">
          {text}
        </p>
      </div>
    </div>
  );
}
