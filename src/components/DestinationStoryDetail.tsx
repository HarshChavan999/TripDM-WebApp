'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  MapPin,
  Share2,
  Check,
  Compass,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ListingCard from '@/components/ListingCard';
import { PackageListing } from '@/lib/discoveryEngine';

interface DestinationStoryDetailProps {
  story: {
    id?: string;
    stateName: string;
    title?: string;
    narrative?: string;
    description?: string;
    coverImage?: string;
    places?: Array<{ name?: string; image?: string; description?: string }>;
    seoKeywords?: string[];
    featuredPackageIds?: string[];
    packageIds?: string[];
    [key: string]: any;
  };
  listings: PackageListing[];
  onBack: () => void;
  onView: (listing: PackageListing) => void;
  onBook: (listing: PackageListing) => void;
  onChat: (listing: PackageListing) => void;
  onWishlist: (listingId: string) => void;
  wishlist: string[];
}

export default function DestinationStoryDetail({
  story,
  listings,
  onBack,
  onView,
  onBook,
  onChat,
  onWishlist,
  wishlist,
}: DestinationStoryDetailProps) {
  const [copied, setCopied] = useState(false);

  const scrollPackagesRail = (direction: 'left' | 'right') => {
    const el = document.getElementById('story-packages-rail');
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter packages specifically related to this state/story with multi-state and alias support
  const relatedPackages = useMemo(() => {
    const rawState = (story.stateName || '').toLowerCase().trim();

    // 1. Direct ID matches if story specifies package IDs
    const directPackageIds = new Set<string>();
    if (Array.isArray(story.featuredPackageIds)) {
      story.featuredPackageIds.forEach((id: any) => id && directPackageIds.add(String(id).trim()));
    }
    if (Array.isArray(story.packageIds)) {
      story.packageIds.forEach((id: any) => id && directPackageIds.add(String(id).trim()));
    }

    // 2. Build normalized matching keywords for this story
    const keywords = new Set<string>();

    if (rawState) {
      keywords.add(rawState);

      // Split compound states: "Meghalaya & Assam" -> ["meghalaya", "assam"]
      rawState
        .split(/[&,+/]|\band\b/i)
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
        .forEach((token) => {
          keywords.add(token);
          // Split sub-words (e.g. "nicobar" from "nicobar islands")
          token.split(/\s+/).forEach((w) => {
            if (w.length > 3 && !['island', 'islands', 'pradesh', 'tour', 'trip'].includes(w)) {
              keywords.add(w);
            }
          });
        });
    }

    // Common regional aliases & top hub mappings
    if (rawState.includes('andaman')) {
      keywords.add('andaman');
      keywords.add('nicobar');
      keywords.add('port blair');
      keywords.add('havelock');
      keywords.add('neil island');
    }
    if (rawState.includes('meghalaya')) {
      keywords.add('meghalaya');
      keywords.add('shillong');
      keywords.add('cherrapunji');
      keywords.add('cherrapunjee');
      keywords.add('dawki');
      keywords.add('nohkalikai');
    }
    if (rawState.includes('assam')) {
      keywords.add('assam');
      keywords.add('guwahati');
      keywords.add('kaziranga');
      keywords.add('majuli');
      keywords.add('manas');
    }
    if (rawState.includes('kashmir') || rawState.includes('jammu')) {
      keywords.add('kashmir');
      keywords.add('jammu');
      keywords.add('srinagar');
      keywords.add('gulmarg');
      keywords.add('pahalgam');
      keywords.add('sonmarg');
    }
    if (rawState.includes('kerala')) {
      keywords.add('kerala');
      keywords.add('munnar');
      keywords.add('alleppey');
      keywords.add('wayanad');
      keywords.add('kochi');
      keywords.add('cochin');
    }
    if (rawState.includes('himachal')) {
      keywords.add('himachal');
      keywords.add('manali');
      keywords.add('shimla');
      keywords.add('dharamshala');
      keywords.add('spiti');
    }
    if (rawState.includes('rajasthan')) {
      keywords.add('rajasthan');
      keywords.add('jaipur');
      keywords.add('udaipur');
      keywords.add('jodhpur');
      keywords.add('jaisalmer');
    }
    if (rawState.includes('goa')) {
      keywords.add('goa');
      keywords.add('panaji');
      keywords.add('calangute');
    }
    if (rawState.includes('ladakh')) {
      keywords.add('ladakh');
      keywords.add('leh');
      keywords.add('nubra');
      keywords.add('pangong');
    }
    if (rawState.includes('sikkim')) {
      keywords.add('sikkim');
      keywords.add('gangtok');
      keywords.add('pelling');
      keywords.add('lachung');
    }
    if (rawState.includes('uttarakhand')) {
      keywords.add('uttarakhand');
      keywords.add('rishikesh');
      keywords.add('haridwar');
      keywords.add('dehradun');
      keywords.add('nainital');
      keywords.add('mussoorie');
      keywords.add('kedarnath');
      keywords.add('badrinath');
    }

    // Add discovered places from story if available
    const placesArray = Array.isArray(story.places)
      ? story.places.map((p: any) => (p?.name || p).toLowerCase().trim())
      : (Array.isArray(story.discoveredPlaces) ? story.discoveredPlaces.map((p: any) => String(p).toLowerCase().trim()) : []);

    placesArray.forEach((p) => {
      if (p && p.length > 2) {
        keywords.add(p);
      }
    });

    const activeKeywords = Array.from(keywords).filter((k) => k.length > 2);

    return listings.filter((pkg) => {
      if (pkg.approved === false) return false;

      // 1. Direct ID match
      if (pkg.id && directPackageIds.has(String(pkg.id).trim())) {
        return true;
      }

      // 2. Package text fields
      const pkgState = (pkg.stateName || '').toLowerCase().trim();
      const pkgStateNames = Array.isArray(pkg.stateNames)
        ? pkg.stateNames.map((s: string) => String(s).toLowerCase().trim())
        : [];
      const pkgDest = (pkg.destination || '').toLowerCase().trim();
      const pkgDestinations = Array.isArray(pkg.destinations)
        ? pkg.destinations.map((d: string) => String(d).toLowerCase().trim())
        : [];
      const pkgTitle = (pkg.title || '').toLowerCase().trim();
      const pkgPlaces = Array.isArray(pkg.placesCovered)
        ? pkg.placesCovered
            .map((p: any) => (typeof p === 'string' ? p : p?.name || p?.city || p?.state || ''))
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        : '';
      const pkgItinerary = Array.isArray(pkg.itinerary)
        ? pkg.itinerary
            .map((day: any) => (typeof day === 'string' ? day : `${day?.title || ''} ${day?.location || ''} ${day?.description || ''}`))
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        : '';

      // 3. Match against story keywords
      for (const keyword of activeKeywords) {
        // A. Bidirectional state match (e.g. "andaman" matches "andaman & nicobar islands" and vice versa)
        if (pkgState && (pkgState.includes(keyword) || keyword.includes(pkgState))) {
          return true;
        }

        for (const s of pkgStateNames) {
          if (s && (s.includes(keyword) || keyword.includes(s))) {
            return true;
          }
        }

        // B. Destination match
        if (pkgDest && (pkgDest.includes(keyword) || keyword.includes(pkgDest))) {
          return true;
        }

        for (const d of pkgDestinations) {
          if (d && (d.includes(keyword) || keyword.includes(d))) {
            return true;
          }
        }

        // C. Title, places, itinerary matching
        if (
          pkgTitle.includes(keyword) ||
          pkgPlaces.includes(keyword) ||
          pkgItinerary.includes(keyword)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [story, listings]);

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareData = {
      title: story.title || `${story.stateName} Travel Story`,
      text: `Read this curated travel story on ${story.stateName} on TripDM`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const paragraphs = (
    story.narrative ||
    story.description ||
    `Explore verified itineraries across ${story.stateName} covering major cultural landmarks, scenic routes, and local experiences.`
  )
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* ── TOP FULL-WIDTH HERO IMAGE SECTION ── */}
      <div className="relative w-full h-[380px] sm:h-[460px] md:h-[520px] bg-slate-950">
        {story.coverImage ? (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={story.coverImage}
              alt={story.title || story.stateName}
              className="w-full h-full object-cover opacity-90 scale-100"
              loading="eager"
            />
            {/* Cinematic Gradient overlay for crystal-clear readability of top buttons & bottom title */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0.9) 100%)',
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-slate-600">
            <Compass className="w-20 h-20" />
          </div>
        )}

        {/* Hero content overlay: Top Navigation Row + Bottom Title */}
        <div className="relative z-20 h-full flex flex-col justify-between px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-6 sm:pb-8 max-w-[1600px] mx-auto">
          {/* Top row: Back to Stories + Breadcrumb + Share Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md border border-white/25 shadow-sm transition-all cursor-pointer"
                style={{ borderRadius: '6px' }}
                aria-label="Back to stories"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Stories</span>
              </button>

              {/* Breadcrumb Navigation */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/80 font-medium">
                <span className="hover:text-white transition-colors cursor-pointer" onClick={onBack}>Home</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                <span className="hover:text-white transition-colors cursor-pointer" onClick={onBack}>Stories</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                <span className="font-bold text-white truncate max-w-[240px]">
                  {story.stateName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md border border-white/25 transition-all shadow-sm cursor-pointer"
                style={{ borderRadius: '6px' }}
                title="Share"
                aria-label="Share story"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-white" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Title */}
          <div className="max-w-4xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {story.title || `Discover ${story.stateName}: Complete Travel Guide`}
            </h1>
          </div>
        </div>
      </div>

      {/* ── PAGE CONTENT CONTAINER ── */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-10">
        {/* ── STORY NARRATIVE (CLEAN DIRECT TYPOGRAPHY, NO ARTIFICIAL CARD/CONTAINER BEHIND IT) ── */}
        <div className="w-full mb-14">
          <div className="space-y-6 text-slate-700 text-base sm:text-lg leading-relaxed font-normal">
            {paragraphs.map((para, idx) => (
              <p
                key={idx}
                className={idx === 0 ? 'text-lg sm:text-xl text-slate-900 font-medium leading-relaxed' : ''}
              >
                {para}
              </p>
            ))}
          </div>

          {/* Key Highlights Pill Cloud (Clean, no card container) */}
          {Array.isArray(story.places) && story.places.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mr-1">
                Highlights:
              </span>
              {story.places.map((place: any, pIdx: number) => (
                <span
                  key={pIdx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200/80"
                  style={{ borderRadius: '6px' }}
                >
                  <MapPin className="w-3 h-3 text-orange-500" />
                  <span>{place?.name || place}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── STATE TOUR PACKAGES SECTION (CENTERED IN MIDDLE) ── */}
        <section className="pt-2 border-t border-slate-100" id="state-packages">
          <div className="text-center max-w-2xl mx-auto mb-10 pt-6">
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tour Packages in {story.stateName}
            </h2>
            {relatedPackages.length > 0 && (
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Showing {relatedPackages.length} verified {relatedPackages.length === 1 ? 'itinerary' : 'itineraries'} directly from local tour operators
              </p>
            )}
          </div>

          {relatedPackages.length > 0 ? (
            <div className="relative group/rail w-full">
              {relatedPackages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => scrollPackagesRail('left')}
                    className={`absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 bg-white shadow-lg border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                      relatedPackages.length <= 3 ? 'lg:hidden' : ''
                    }`}
                    style={{ borderRadius: '6px' }}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPackagesRail('right')}
                    className={`absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 bg-white shadow-lg border border-slate-200 text-slate-700 hover:bg-orange-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                      relatedPackages.length <= 3 ? 'lg:hidden' : ''
                    }`}
                    style={{ borderRadius: '6px' }}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              <div
                id="story-packages-rail"
                className={`flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 scrollbar-hide snap-x snap-mandatory scroll-smooth w-full ${
                  relatedPackages.length < 3 ? 'sm:justify-center' : ''
                }`}
              >
                {relatedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="w-[85vw] min-w-[85vw] sm:w-[calc(50%-12px)] sm:min-w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] lg:min-w-[calc(33.333%-16px)] snap-start shrink-0 flex flex-col h-full self-stretch"
                  >
                    <ListingCard
                      listing={pkg}
                      onView={onView}
                      onBook={onBook}
                      onChat={onChat}
                      onWishlist={onWishlist}
                      isWishlisted={wishlist.includes(pkg.id)}
                      variant="user"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center border border-slate-200 shadow-xs" style={{ borderRadius: '6px' }}>
              <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">
                New itineraries for {story.stateName} coming soon
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Verified ground agencies are curating updated itineraries for {story.stateName}. In the meantime, discover other domestic packages.
              </p>
              <button
                onClick={onBack}
                className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-orange-600 text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer"
                style={{ borderRadius: '6px' }}
              >
                Browse All Destinations
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
