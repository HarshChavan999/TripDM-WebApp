'use client';

import React, { useState, useEffect } from 'react';
import { 
  MapPin, CheckCircle, Pencil, Camera, 
  Shield, Users, Plus, Phone, User, ChevronRight,
  Heart, Scale, MessageSquare, Building2, Trash2, X, Check, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';

interface UserProfileProps {
  user: any;
  userData: any;
  wishlist: any[];
  coTravellers: any[];
  setCoTravellers: (val: any[]) => void;
  profileName: string;
  setProfileName: (val: string) => void;
  profilePhone: string;
  setProfilePhone: (val: string) => void;
  profilePhotoUrl: string | null;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  savingProfile: boolean;
  handleSaveProfile: () => void;
  onNavigateToWishlist: () => void;
  onNavigateToCompare?: () => void;
  onNavigateToChat?: () => void;
}

export default function UserProfile({
  user,
  userData,
  wishlist = [],
  coTravellers = [],
  setCoTravellers,
  profileName,
  setProfileName,
  profilePhone,
  setProfilePhone,
  profilePhotoUrl,
  handleProfilePhotoChange,
  isEditingProfile,
  setIsEditingProfile,
  savingProfile,
  handleSaveProfile,
  onNavigateToWishlist,
  onNavigateToCompare,
  onNavigateToChat
}: UserProfileProps) {
  const [showAddCoTraveller, setShowAddCoTraveller] = useState(false);
  const [newCompanion, setNewCompanion] = useState({ name: '', contact: '', relationship: 'Spouse' });
  const [realLocation, setRealLocation] = useState('');

  // Fetch location if not present
  useEffect(() => {
    if (userData?.city) return;

    const fetchIpLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city) {
          setRealLocation(`${data.city}${data.country_name ? `, ${data.country_name}` : ''}`);
        }
      } catch (e) {
        console.error('Failed to fetch location', e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            if (data && (data.locality || data.city)) {
              const locationName = data.locality || data.city;
              setRealLocation(`${locationName}${data.countryName ? `, ${data.countryName}` : ''}`);
            } else {
              fetchIpLocation();
            }
          } catch (err) {
            console.error('Error reverse geocoding coordinates:', err);
            fetchIpLocation();
          }
        },
        (error) => {
          console.warn('GPS location denied or timeout. Falling back to IP location:', error);
          fetchIpLocation();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      fetchIpLocation();
    }
  }, [userData?.role, userData?.city]);

  // Handle adding a co-traveller with persistent Firestore sync
  const handleAddCompanion = async () => {
    if (!newCompanion.name.trim()) return;
    const updated = [...(coTravellers || []), { ...newCompanion, name: newCompanion.name.trim() }];
    setCoTravellers(updated);
    setNewCompanion({ name: '', contact: '', relationship: 'Spouse' });
    setShowAddCoTraveller(false);

    if (user) {
      const dbInstance = getDbInstance();
      if (dbInstance) {
        try {
          await updateDoc(doc(dbInstance, 'users', user.uid), { coTravellers: updated });
        } catch (e) {
          console.error('Error updating coTravellers:', e);
        }
      }
    }
  };

  // Handle removing a co-traveller
  const handleRemoveCompanion = async (index: number) => {
    const updated = (coTravellers || []).filter((_, i) => i !== index);
    setCoTravellers(updated);

    if (user) {
      const dbInstance = getDbInstance();
      if (dbInstance) {
        try {
          await updateDoc(doc(dbInstance, 'users', user.uid), { coTravellers: updated });
        } catch (e) {
          console.error('Error deleting coTraveller:', e);
        }
      }
    }
  };

  const isAgency = userData?.role === 'agency';
  const displayLocation = userData?.city || realLocation || 'India';
  const displayName = profileName || userData?.name || 'Traveler';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* ========================================================
          1. CLEAN PROFILE HEADER BANNER & IDENTITY
          ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Cover Image Banner (Custom AI-generated travel landscape) */}
        <div className="h-36 sm:h-48 w-full relative overflow-hidden bg-slate-900">
          <img
            src="/profile-cover.jpg"
            alt="Profile Cover"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle natural lighting vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 pointer-events-none" />
        </div>

        {/* Profile Info Row */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          
          {/* Avatar & User Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 sm:-mt-16 text-center sm:text-left">
            {/* Avatar with Upload Trigger */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-slate-900 shadow-md overflow-hidden flex items-center justify-center text-white select-none">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-black">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label
                title="Change profile photo"
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity z-20 border-4 border-transparent"
              >
                <Camera className="w-6 h-6" />
                <input type="file" accept="image/*" onChange={handleProfilePhotoChange} className="hidden" />
              </label>
            </div>

            {/* Name & Metadata */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {displayName}
                </h1>
                {isAgency ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-amber-600" />
                    Verified Agency Partner
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    TripDM Traveler
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {displayLocation}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {user?.email || 'No email attached'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Right) */}
          <div className="flex items-center justify-center sm:justify-end gap-2.5 pt-2 sm:pt-0 shrink-0">
            {isAgency && (
              <a
                href="/agencytripdm"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 rounded-lg transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Agency Portal →</span>
              </a>
            )}

            {!isEditingProfile ? (
              <Button
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors cursor-pointer border-none"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs transition-colors cursor-pointer border-none"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          2. QUICK ACTIVITY & SHORTCUT STATS
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Wishlist Card */}
        <button
          type="button"
          onClick={onNavigateToWishlist}
          className="flex items-center justify-between p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-rose-100 text-rose-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">Wishlist</h4>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {wishlist?.length || 0} saved packages
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Compare Card */}
        <button
          type="button"
          onClick={onNavigateToCompare}
          className="flex items-center justify-between p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">Compare</h4>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Side-by-side package analysis
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        {/* Chat / Messages Card */}
        <button
          type="button"
          onClick={onNavigateToChat}
          className="flex items-center justify-between p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">Messages</h4>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                Direct chats with agencies
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>

      {/* ========================================================
          3. MAIN CONTENT: 2-COLUMN BALANCED DETAILS & COMPANIONS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / PRIMARY: Personal & Contact Information */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <User className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Your contact credentials and verified profile details
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Full Name
              </Label>
              <Input
                disabled={!isEditingProfile}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Enter your full name"
                className={`rounded-lg border-slate-200 text-sm font-medium h-10 ${
                  !isEditingProfile ? 'bg-slate-50 text-slate-800' : 'bg-white focus-visible:ring-orange-500'
                }`}
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Phone Number
              </Label>
              <Input
                disabled={!isEditingProfile}
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={`rounded-lg border-slate-200 text-sm font-medium h-10 ${
                  !isEditingProfile ? 'bg-slate-50 text-slate-800' : 'bg-white focus-visible:ring-orange-500'
                }`}
              />
            </div>

            {/* Email (Always Read-Only) */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Address
                </Label>
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified Account
                </span>
              </div>
              <Input
                disabled
                value={user?.email || ''}
                className="rounded-lg border-slate-200 text-sm font-medium h-10 bg-slate-50 text-slate-600"
              />
            </div>

            {/* City / Region */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Location / Region
              </Label>
              <Input
                disabled
                value={displayLocation}
                className="rounded-lg border-slate-200 text-sm font-medium h-10 bg-slate-50 text-slate-600"
              />
            </div>
          </div>

          {/* Inline Edit Buttons if Editing */}
          {isEditingProfile && (
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsEditingProfile(false)}
                className="text-xs font-semibold px-4 py-2 border-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="text-xs font-bold px-5 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg shadow-xs cursor-pointer border-none"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT / SECONDARY: Co-Travellers (Family & Friends) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Co-Travellers</h3>
                <p className="text-xs text-slate-500 font-normal">
                  Family & friends for quick group booking
                </p>
              </div>
            </div>

            {!showAddCoTraveller && (
              <button
                type="button"
                onClick={() => setShowAddCoTraveller(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {/* Add Co-Traveller Inline Form */}
          {showAddCoTraveller && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">Add New Companion</h4>
                <button
                  type="button"
                  onClick={() => setShowAddCoTraveller(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Companion full name"
                  value={newCompanion.name}
                  onChange={(e) => setNewCompanion({ ...newCompanion, name: e.target.value })}
                  className="bg-white text-xs h-9 rounded-lg border-slate-200"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newCompanion.relationship}
                    onChange={(e) => setNewCompanion({ ...newCompanion, relationship: e.target.value })}
                    className="bg-white text-xs h-9 rounded-lg border border-slate-200 px-2.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                  </select>

                  <Input
                    placeholder="Contact (optional)"
                    value={newCompanion.contact}
                    onChange={(e) => setNewCompanion({ ...newCompanion, contact: e.target.value })}
                    className="bg-white text-xs h-9 rounded-lg border-slate-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCoTraveller(false)}
                  className="text-xs h-8 px-3 rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddCompanion}
                  disabled={!newCompanion.name.trim()}
                  className="text-xs h-8 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg shadow-xs cursor-pointer border-none"
                >
                  Save Companion
                </Button>
              </div>
            </div>
          )}

          {/* Co-Travellers List */}
          <div className="space-y-2.5">
            {coTravellers && coTravellers.length > 0 ? (
              coTravellers.map((companion, idx) => (
                <div
                  key={`companion-${idx}`}
                  className="flex items-center justify-between p-3 bg-slate-50/90 border border-slate-200/70 rounded-xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      {companion.name?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {companion.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {companion.relationship || 'Companion'}
                        {companion.contact ? ` • ${companion.contact}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveCompanion(idx)}
                    title="Remove companion"
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-6 px-4 text-center bg-slate-50/60 border border-dashed border-slate-200 rounded-xl">
                <Users className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">No co-travellers saved</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Add companions to quickly auto-fill family and group package inquiries.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
