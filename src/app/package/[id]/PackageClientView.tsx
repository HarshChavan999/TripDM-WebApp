'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Menu, X, Heart, Scale, MessageSquare, Palmtree, ChevronRight, LogOut, FileText, Briefcase, Shield, Building2 } from 'lucide-react';
import PackageDetailView from '@/components/PackageDetailView';
import AuthModal from '@/components/AuthModal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useComparison } from '@/contexts/ComparisonContext';
import { getDbInstance } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';


export default function PackageClientView({ listing }: { listing: any }) {
  const router = useRouter();
  const { user, userData, signIn, register, signInWithGoogle, signOut } = useAuth();
  const { comparisonList } = useComparison();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [enrichedListing, setEnrichedListing] = useState(listing);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User name helpers matching HomeClient.tsx
  const userFirstName =
    userData?.name?.trim()?.split(' ')[0] ||
    userData?.companyName?.trim()?.split(' ')[0] ||
    user?.displayName?.trim()?.split(' ')[0] ||
    (user?.email
      ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
      : 'User');

  const userFullName =
    userData?.name?.trim() ||
    userData?.companyName?.trim() ||
    user?.displayName?.trim() ||
    (user?.email ? user.email.split('@')[0] : 'User');

  const userInitial = userFirstName.charAt(0).toUpperCase() || 'U';
  const userAvatar = (typeof userData?.avatarUrl === 'string' && userData.avatarUrl.trim() !== '') ? userData.avatarUrl.trim() : null;

  // Lock background scroll when mobile sidebar drawer is open & handle Escape key
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    async function fetchAgency() {
      if (listing.agencyId && !listing.agencyData) {
        const dbInstance = getDbInstance();
        if (dbInstance) {
          try {
            const agencyDoc = await getDoc(doc(dbInstance, 'users', listing.agencyId));
            if (agencyDoc.exists()) {
              const agencyData = agencyDoc.data();
              setEnrichedListing({
                ...listing,
                agencyData,
                agencyName: agencyData.companyName || 'Unknown Agency'
              });
            }
          } catch (e) {
            console.error("Error fetching agency client-side:", e);
          }
        }
      }
    }
    fetchAgency();
  }, [listing]);

  // Hydrate wishlist from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tripdm_wishlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWishlist(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not hydrate wishlist from localStorage in PackageClientView:', e);
    }
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;

    const unsubscribe = onSnapshot(doc(dbInstance, 'users', user.uid), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        let wishlistData = userData.wishlist && Array.isArray(userData.wishlist)
          ? userData.wishlist
          : [];
        
        // Check for pending wishlist item saved before login
        const pendingWishlist = sessionStorage.getItem('pending_wishlist_target');
        if (pendingWishlist) {
          sessionStorage.removeItem('pending_wishlist_target');
          if (!wishlistData.includes(pendingWishlist)) {
            wishlistData = [...wishlistData, pendingWishlist];
            updateDoc(doc(dbInstance, 'users', user.uid), {
              wishlist: wishlistData
            }).catch(console.error);
          }
        }

        setWishlist(wishlistData);
        try {
          localStorage.setItem('tripdm_wishlist', JSON.stringify(wishlistData));
        } catch (e) {
          // ignore
        }
        
        if (!userData.wishlist && !pendingWishlist) {
          updateDoc(doc(dbInstance, 'users', user.uid), {
            wishlist: []
          }).catch(console.error);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const updateWishlistInFirestore = async (newWishlist: string[]) => {
    if (!user) return;
    const dbInstance = getDbInstance();
    if (!dbInstance) return;
    try {
      await updateDoc(doc(dbInstance, 'users', user.uid), {
        wishlist: newWishlist
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleWishlistToggle = (listingId: string) => {
    if (!user) {
      sessionStorage.setItem('pending_wishlist_target', listingId);
      setShowAuthModal(true);
      return;
    }
    setWishlist(prev => {
      const newWishlist = prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId];
      try {
        localStorage.setItem('tripdm_wishlist', JSON.stringify(newWishlist));
      } catch (e) {
        // ignore
      }
      updateWishlistInFirestore(newWishlist);
      return newWishlist;
    });
  };
  
  // Auto-redirect to chat after user logs in if a pending chat target was saved
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
      try {
        const pendingRaw = sessionStorage.getItem('pending_chat_target');
        if (pendingRaw) {
          sessionStorage.removeItem('pending_chat_target');
          const pending = JSON.parse(pendingRaw);
          if (pending && pending.agencyId) {
            const pkgQuery = pending.packageId ? `&packageId=${encodeURIComponent(pending.packageId)}&packageTitle=${encodeURIComponent(pending.packageTitle || '')}&packageDuration=${encodeURIComponent(pending.packageDuration || '')}&packagePrice=${encodeURIComponent(pending.packagePrice || '')}` : '';
            router.push(`/?action=chat&agencyId=${pending.agencyId}&agencyName=${encodeURIComponent(pending.agencyName || 'Travel Agency')}${pkgQuery}`);
          }
        }
      } catch (e) {
        console.error('Error redirecting pending chat in PackageClientView:', e);
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Mobile Slide-in Navigation Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[150] md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-[85vw] max-w-[340px] bg-white shadow-2xl flex flex-col z-[160] transition-transform duration-300 ease-out">
            {/* Drawer Top / Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/');
                }}
              >
                <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 w-auto object-contain" />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Status Card */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-b border-slate-100">
              {user ? (
                <div className="flex items-center gap-3">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center text-slate-600 border border-gray-200 shadow-xs">
                      <User className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                    <h4 className="text-sm font-bold text-slate-900 truncate">{userFullName}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || userData?.email || ''}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Welcome to TripDM</h4>
                    <p className="text-xs text-slate-500">Direct Message with verified travel agents</p>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-xs py-2 h-9 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <User className="h-4 w-4" /> Sign In / Register
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Links Scrollable Area */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 sidebar-scroll">
              <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pt-1 pb-1 tracking-wider">Navigation</p>

              {/* Explore Packages */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Palmtree className="h-4 w-4 text-orange-500" />
                  <span>Explore All Packages</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Compare Packages */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push('/?section=compare');
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Scale className="h-4 w-4 text-blue-500" />
                  <span>Compare Packages</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=wishlist');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span>My Wishlist</span>
                </div>
                <div className="flex items-center gap-2">
                  {wishlist.length > 0 && (
                    <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </button>

              {/* Messages */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=chat');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span>Messages & Enquiries</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              {/* Profile */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    setShowAuthModal(true);
                  } else {
                    router.push('/?section=profile');
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-purple-500" />
                  <span>My Profile & Bookings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>

              <div className="pt-4">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 pb-1 tracking-wider">Explore More</p>
                <a
                  href="/blog"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <span>Travel Guides & Stories</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </a>
                {userData?.role === 'agency' && (
                  <a
                    href="/agencytripdm"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-slate-500" />
                      <span>For Travel Agencies</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </a>
                )}
                <a
                  href="/policies/conditions-of-use"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-slate-400" />
                    <span>Policies & Terms</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </a>
              </div>
            </div>

            {/* Drawer Footer */}
            {user && (
              <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut?.();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="header-transition text-gray-900 z-[100] sticky top-0 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
        {/* Desktop Header Layout */}
        <div className="hidden md:flex max-w-7xl mx-auto items-center justify-between gap-4 lg:gap-6 px-4 h-16 w-full">
          {/* Logo */}
          <div
            className="flex items-center gap-1 sm:gap-2 font-extrabold tracking-tight cursor-pointer shrink-0"
            onClick={() => router.push('/')}
          >
            <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-16 md:h-20 w-auto object-contain py-1" />
          </div>

          {/* Right: Agency Portal / Profile / Login */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            {user && userData ? (
              <div className="flex items-center gap-4">
                {/* ONLY VISIBLE TO LOGGED-IN AGENCIES */}
                {userData.role === 'agency' && (
                  <a
                    href="/agencytripdm"
                    className="cursor-pointer text-[15px] font-medium flex items-center gap-1.5 text-slate-800 shrink-0 hover:text-orange-600 transition-colors"
                    title="Go to Agency Portal"
                  >
                    <Building2 className="h-4 w-4 text-slate-600" />
                    <span>Agency Portal</span>
                  </a>
                )}
                {userData.role === 'admin' && (
                  <a
                    href="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-white shadow-sm shrink-0"
                    title="Go to Admin Dashboard"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Admin Portal</span>
                  </a>
                )}

                <div
                  className="flex items-center gap-2 cursor-pointer text-[15px] font-medium text-slate-800"
                  onClick={() => router.push('/?section=profile')}
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profile"
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-slate-600 border border-gray-200">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span>
                    Hi, {userFirstName}
                  </span>
                </div>
                
                <span
                  className="text-[13px] text-slate-600 hover:text-rose-600 cursor-pointer transition-colors border-l border-gray-200 pl-3"
                  onClick={() => signOut?.()}
                >
                  Sign Out
                </span>
              </div>
            ) : (
              <span
                onClick={() => setShowAuthModal(true)}
                className="cursor-pointer text-[15px] font-medium text-slate-800 flex items-center gap-1.5 hover:text-orange-600 transition-colors"
              >
                <User className="h-4 w-4 text-slate-600" /> Login
              </span>
            )}
          </div>
        </div>

        {/* Mobile Header Layout */}
        <div className="flex md:hidden items-center justify-between px-3 sm:px-4 h-16 w-full">
          {/* Left: Hamburger Button & Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div
              className="cursor-pointer flex items-center"
              onClick={() => router.push('/')}
            >
              <img src="/tripdm-logo.png" alt="TripDM Logo" className="h-10 sm:h-12 w-auto object-contain py-1" />
            </div>
          </div>

          {/* Right: Profile / Login */}
          <div className="flex items-center gap-2">
            {user && userData ? (
              <button
                onClick={() => router.push('/?section=profile')}
                className="p-1 rounded-full hover:ring-2 hover:ring-orange-500/20 transition-all"
                aria-label="User Profile"
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-500/20 shadow-xs"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs border border-orange-200 shadow-xs">
                    {userInitial}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1.5"
                aria-label="Login"
              >
                <User className="h-4 w-4 text-orange-500" /> Login
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gray-50">
        <PackageDetailView 
          listing={enrichedListing} 
          onBack={() => router.push('/')}
          onBook={() => router.push(`/?action=book&packageId=${enrichedListing.id}`)}
          onChat={() => {
            const agencyId = enrichedListing.agencyId || enrichedListing.userId;
            const agencyName = enrichedListing.agencyName || 'Travel Agency';
            const rawPrice = enrichedListing.cost || enrichedListing.price || '';
            let packagePrice = '';
            if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '' && rawPrice !== 'N/A') {
              const numPrice = Number(rawPrice);
              if (!isNaN(numPrice) && numPrice > 0) {
                packagePrice = Math.round(numPrice).toString();
              } else {
                packagePrice = String(rawPrice);
              }
            }
            let packageDuration = '';
            if (enrichedListing.duration && typeof enrichedListing.duration === 'string') {
              packageDuration = enrichedListing.duration;
            } else if (Array.isArray(enrichedListing.itinerary) && enrichedListing.itinerary.length > 0) {
              const d = enrichedListing.itinerary.length;
              const n = d > 1 ? d - 1 : 0;
              packageDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
            } else if (enrichedListing.days) {
              const d = Number(enrichedListing.days);
              const n = enrichedListing.nights || (d > 1 ? d - 1 : 0);
              packageDuration = n > 0 ? `${d}D/${n}N` : `${d} Days`;
            }

            if (!user) {
              sessionStorage.setItem('pending_chat_target', JSON.stringify({
                agencyId,
                agencyName,
                packageId: enrichedListing.id,
                packageTitle: enrichedListing.title || '',
                packageDuration,
                packagePrice
              }));
              setShowAuthModal(true);
              return;
            }
            const durParam = packageDuration ? `&packageDuration=${encodeURIComponent(packageDuration)}` : '';
            const priceParam = packagePrice ? `&packagePrice=${encodeURIComponent(packagePrice)}` : '';
            router.push(`/?action=chat&agencyId=${agencyId}&agencyName=${encodeURIComponent(agencyName)}&packageId=${enrichedListing.id}&packageTitle=${encodeURIComponent(enrichedListing.title || '')}${durParam}${priceParam}`);
          }}
          onWishlist={handleWishlistToggle}
          isWishlisted={wishlist.includes(enrichedListing?.id)}
          onRequireLogin={() => setShowAuthModal(true)}
        />
      </div>

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={signIn}
          onRegister={register}
          onGoogleSignIn={signInWithGoogle}
          googleUser={user}
        />
      )}
    </div>
  );
}
