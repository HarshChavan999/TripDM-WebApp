'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  MapPin,
  Tag,
  MessageSquare,
  Building2,
  ArrowLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgencyWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  agencyName?: string;
  onStartNewListing?: () => void;
}

export default function AgencyWelcomeModal({
  isOpen,
  onClose,
  agencyName = '',
  onStartNewListing
}: AgencyWelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = (openListingForm = false) => {
    onClose();
    if (openListingForm && onStartNewListing) {
      setTimeout(() => {
        onStartNewListing();
      }, 150);
    }
  };

  const displayName = agencyName?.trim() || 'Partner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Dialog Container */}
      <div
        className="relative w-full max-w-lg bg-white shadow-xl border border-slate-200/90 overflow-hidden flex flex-col"
        style={{ borderRadius: '6px' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
          style={{ borderRadius: '6px' }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* =========================================================
            PAGE 1: CLEAN MINIMAL WELCOME
            ========================================================= */}
        {currentStep === 1 && (
          <div className="p-8 sm:p-10 text-center flex flex-col items-center justify-center animate-in fade-in duration-200">
            {/* Agency / Brand Icon */}
            <div
              className="w-14 h-14 bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center mb-5"
              style={{ borderRadius: '6px' }}
            >
              <Building2 className="w-7 h-7 stroke-[1.75]" />
            </div>

            {/* Greeting & Title */}
            <h2 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight mb-1.5">
              Welcome, {displayName}
            </h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-4">
              TripDM Agency Portal
            </p>

            {/* Simple, natural intro text */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm mb-8">
              Your agency dashboard is ready. Manage travel packages, receive direct inquiries from travelers, and grow your bookings in one place.
            </p>

            {/* Primary Action Button */}
            <div className="w-full max-w-xs flex flex-col items-center gap-3">
              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ borderRadius: '6px' }}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================
            PAGE 2: SYMBOLIC LISTING GUIDELINES
            ========================================================= */}
        {currentStep === 2 && (
          <div className="p-6 sm:p-8 flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Listing Guidelines
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                A few standard recommendations to help you create clear travel packages.
              </p>
            </div>

            {/* Symbolic Points List */}
            <div className="space-y-4 mb-6">
              {/* Point 1: Photos */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderRadius: '6px' }}
                >
                  <Camera className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Photos & Media</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Upload clear landscape photos for the cover and day-wise itinerary stops to showcase the destinations accurately.
                  </p>
                </div>
              </div>

              {/* Point 2: Itinerary */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderRadius: '6px' }}
                >
                  <MapPin className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Itinerary & Locations</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Break down each day's plan with specific sightseeing highlights along with designated pick-up and drop locations.
                  </p>
                </div>
              </div>

              {/* Point 3: Pricing & Inclusions */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderRadius: '6px' }}
                >
                  <Tag className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Pricing & Inclusions</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    State transparent per-person pricing and clearly specify inclusions such as hotels, meals, transport, and guide services.
                  </p>
                </div>
              </div>

              {/* Point 4: Customer Chat */}
              <div className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5"
                  style={{ borderRadius: '6px' }}
                >
                  <MessageSquare className="w-4 h-4 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Customer Communication</h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Respond to traveler queries through the Customer Chat tab to assist clients directly and finalize bookings.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
              <Button
                onClick={() => handleFinish(false)}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                style={{ borderRadius: '6px' }}
              >
                <span>Get Started</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
