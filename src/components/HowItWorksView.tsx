'use client';

import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Users,
  MessageSquare,
  ShieldCheck,
  IndianRupee,
  Lightbulb,
  Check,
  X as CloseIcon,
  ChevronDown,
  ArrowRight,
  Send,
  Phone,
  MoreVertical,
  Paperclip,
  CheckCheck,
  Star,
} from 'lucide-react';

interface HowItWorksViewProps {
  onNavigateToDestinations: (targetSearch?: string) => void;
  onNavigateToAgents: (targetDestination?: string) => void;
  onInitiateChat?: (data: { agencyId?: string; agencyName: string; packageTitle?: string }) => void;
}

const FAQS_DATA = [
  {
    id: 'faq-1',
    question: 'Is TripDM a travel agency?',
    answer:
      'No. TripDM is a platform that connects you with multiple verified travel agencies. You chat, compare and book directly with them.',
  },
  {
    id: 'faq-2',
    question: 'Do you charge any commission?',
    answer:
      'No. We do not charge any commission on your package price. You pay the travel agency directly.',
  },
  {
    id: 'faq-3',
    question: 'Can I chat with multiple travel agents?',
    answer:
      'Yes. You can send messages to multiple travel agencies and compare options before booking.',
  },
  {
    id: 'faq-4',
    question: 'How do I know the agents are verified?',
    answer:
      'All travel agents on TripDM are verified and reviewed. You can check their ratings, experience and customer reviews before chatting.',
  },
  {
    id: 'faq-5',
    question: 'Can I get customized itineraries?',
    answer:
      'Absolutely. Every trip can be customized 100%. You can discuss your travel dates, preferred hotels, sightseeing preferences, and budget with agencies in real-time.',
  },
  {
    id: 'faq-6',
    question: 'How does payment and booking work?',
    answer:
      'Once you finalize your customized itinerary with the agency via chat, you pay the agency directly through their accepted payment methods without any platform middleman fees.',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Multiple travel agencies', tripdm: true, traditional: false },
  { feature: 'Chat directly with agents', tripdm: true, traditional: false },
  { feature: 'Customize your package', tripdm: true, traditional: false },
  { feature: 'No commission on package price', tripdm: true, traditional: false },
  { feature: 'Compare multiple options', tripdm: true, traditional: false },
  { feature: 'Pay directly to agency', tripdm: true, traditional: false },
];

export default function HowItWorksView({
  onNavigateToDestinations,
  onNavigateToAgents,
  onInitiateChat,
}: HowItWorksViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const displayedFaqs = showAllFaqs ? FAQS_DATA : FAQS_DATA.slice(0, 4);

  return (
    <div className="w-full bg-white text-slate-900 min-h-screen">
      {/* ─── 1. TOP HERO SECTION (Full-Width with Pure White Background) ─── */}
      <div className="relative w-full bg-white pt-8 sm:pt-10 pb-8 overflow-hidden">
        {/* Scenic Background Photo on Right Side with smooth alpha mask fade to pure white */}
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-[85%] md:w-[70%] lg:w-[58%] bg-cover bg-no-repeat bg-right pointer-events-none"
          style={{
            backgroundImage: "url('/how-it-works-hero.jpg')",
            maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.7) 45%, black 100%)',
          }}
        >
          {/* Subtle bottom gradient to blend cleanly into the page */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none opacity-80" />
        </div>

        <div className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start justify-between min-h-[140px]">
            {/* Left Hero Text Block with custom left spacing */}
            <div className="max-w-xl pl-4 sm:pl-8 md:pl-12 lg:pl-16 xl:pl-20 z-10">
              {/* Orange Eyebrow Tag */}
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500]">
                HOW IT WORKS
              </span>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-[44px] font-black text-slate-900 tracking-tight leading-[1.14] mt-2">
                Your Next Trip <br className="hidden sm:inline" />
                in <span className="text-[#FF5500]">3 Simple Steps</span>
              </h1>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed mt-3 max-w-lg">
                TripDM connects you with multiple verified travel agencies so you can compare, chat, customize and book directly — with no commission on package price.
              </p>
            </div>

            {/* Cursive Sticker Badge in Clear Sky (to the left of Signpost in open blue sky) */}
            <div className="hidden lg:flex flex-col items-start select-none pointer-events-none transform -rotate-3 mt-1 mr-[22rem] xl:mr-[27rem] 2xl:mr-[32rem]">
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                Find
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 font-serif italic tracking-tight drop-shadow-2xs">
                Chat
              </span>
              <span className="text-xs sm:text-[13px] font-extrabold text-[#FF5500] font-serif italic tracking-tight drop-shadow-2xs flex items-center gap-1">
                Travel Your Way
                <svg className="w-3.5 h-3.5 text-[#FF5500] transform rotate-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. 3 SIMPLE STEPS WORKFLOW SECTION (Full Width & Pure White Cards) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          {/* STEP 1: Search Destinations */}
          <div
            className="bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.05)] flex flex-col justify-between relative group hover:border-slate-300 transition-all"
            style={{ borderRadius: '8px' }}
          >
            {/* Step Header */}
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span
                  className="w-7 h-7 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs"
                  style={{ borderRadius: '6px' }}
                >
                  1
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Search Destinations
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed mb-4">
                Enter your destination, travel dates and preferences to find multiple travel agents.
              </p>
            </div>

            {/* Step 1 UI Mockup Card (Pure White Static Graphic Container) */}
            <div
              className="bg-white border border-slate-200 p-3.5 shadow-2xs select-none pointer-events-none"
              style={{ borderRadius: '6px' }}
            >
              {/* Mini Header */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <div className="w-4 h-4 rounded-full bg-[#FF5500] flex items-center justify-center text-white text-[9px] font-black">
                  T
                </div>
                <span className="text-xs font-black text-slate-900 tracking-tight">TripDM</span>
              </div>

              {/* Mockup Search Field */}
              <div
                className="bg-white border border-slate-200 px-2.5 py-1.5 flex items-center justify-between gap-2 mb-2 shadow-2xs"
                style={{ borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    Kashmir
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium shrink-0">Destination</span>
              </div>

              {/* Date & Traveler Row */}
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                <div
                  className="bg-white border border-slate-200 px-2 py-1.2 flex items-center justify-between text-[10px] text-slate-700 font-medium"
                  style={{ borderRadius: '4px' }}
                >
                  <div className="flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>10 - 15 Dec</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>

                <div
                  className="bg-white border border-slate-200 px-2 py-1.2 flex items-center justify-between text-[10px] text-slate-700 font-medium"
                  style={{ borderRadius: '4px' }}
                >
                  <div className="flex items-center gap-1 truncate">
                    <Users className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>2 Travelers</span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </div>

              {/* Mockup Search CTA (Static Graphic) */}
              <div
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-1.5 text-xs text-center shadow-xs border border-amber-400/50 mb-2"
                style={{ borderRadius: '4px' }}
              >
                Search
              </div>

              {/* Popular Mini Tags */}
              <div className="flex flex-wrap items-center gap-1 text-[9px] text-slate-500">
                <span className="font-semibold">Popular:</span>
                {['Kashmir', 'Manali', 'Kerala', 'Dubai', 'Bali'].map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 font-medium"
                    style={{ borderRadius: '3px' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400">
              <ArrowRight className="w-3.5 h-3.5 text-[#FF5500]" />
            </div>
          </div>

          {/* STEP 2: Compare & Chat with Agents */}
          <div
            className="bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.05)] flex flex-col justify-between relative group hover:border-slate-300 transition-all"
            style={{ borderRadius: '8px' }}
          >
            {/* Step Header */}
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span
                  className="w-7 h-7 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs"
                  style={{ borderRadius: '6px' }}
                >
                  2
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Compare & Chat with Agents
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed mb-4">
                View multiple verified travel agents offering packages for your destination. Chat directly, ask questions and customize your trip.
              </p>
            </div>

            {/* Step 2 UI Mockup Card (Pure White Static Graphic Container) */}
            <div
              className="bg-white border border-slate-200 p-3.5 shadow-2xs space-y-2 select-none pointer-events-none"
              style={{ borderRadius: '6px' }}
            >
              <div className="text-[11px] font-bold text-slate-800 mb-1">
                Kashmir Travel Agents
              </div>

              {/* Agent 1 */}
              <div
                className="bg-white border border-slate-200/90 p-2 flex items-center justify-between shadow-2xs"
                style={{ borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xs font-bold text-[#FF5500] shrink-0">
                    🏔️
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      Himalaya Travels
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-bold text-slate-800">4.8</span>
                      <span>(220 reviews)</span>
                    </div>
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 text-[11px] font-bold text-[#FF5500] border border-[#FF5500] shrink-0"
                  style={{ borderRadius: '4px' }}
                >
                  Chat
                </div>
              </div>

              {/* Agent 2 */}
              <div
                className="bg-white border border-slate-200/90 p-2 flex items-center justify-between shadow-2xs"
                style={{ borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0">
                    🌲
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      Valley Explorers
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-bold text-slate-800">4.7</span>
                      <span>(190 reviews)</span>
                    </div>
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 text-[11px] font-bold text-[#FF5500] border border-[#FF5500] shrink-0"
                  style={{ borderRadius: '4px' }}
                >
                  Chat
                </div>
              </div>

              {/* Agent 3 */}
              <div
                className="bg-white border border-slate-200/90 p-2 flex items-center justify-between shadow-2xs"
                style={{ borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
                    ❄️
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      Kashmir Den Tours
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                      <span className="font-bold text-slate-800">4.6</span>
                      <span>(200 reviews)</span>
                    </div>
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 text-[11px] font-bold text-[#FF5500] border border-[#FF5500] shrink-0"
                  style={{ borderRadius: '4px' }}
                >
                  Chat
                </div>
              </div>
            </div>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm items-center justify-center text-slate-400">
              <ArrowRight className="w-3.5 h-3.5 text-[#FF5500]" />
            </div>
          </div>

          {/* STEP 3: Customize & Book Directly */}
          <div
            className="bg-white border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_25px_rgba(0,0,0,0.05)] flex flex-col justify-between relative group hover:border-slate-300 transition-all"
            style={{ borderRadius: '8px' }}
          >
            {/* Step Header */}
            <div>
              <div className="flex items-center gap-3 mb-2.5">
                <span
                  className="w-7 h-7 bg-orange-100 text-[#FF5500] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs"
                  style={{ borderRadius: '6px' }}
                >
                  3
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Customize & Book Directly
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-normal leading-relaxed mb-4">
                Discuss your requirements, negotiate, finalize the itinerary and book directly with the travel agency.
              </p>
            </div>

            {/* Step 3 UI Mockup Card (Pure White Static Graphic Container) */}
            <div
              className="bg-white border border-slate-200 p-3.5 shadow-2xs flex flex-col justify-between min-h-[195px] select-none pointer-events-none"
              style={{ borderRadius: '6px' }}
            >
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    🏔️
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                      Himalaya Travels
                    </h4>
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Message Bubbles */}
              <div className="space-y-1.5 text-[11px] mb-2">
                {/* User Bubble */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[90%] bg-orange-500 text-white px-2.5 py-1.5 shadow-2xs text-[10px] leading-snug"
                    style={{ borderRadius: '6px' }}
                  >
                    <p>Hi! We are planning a 5N/6D trip to Kashmir for 2 people. Can you share package options?</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[8px] text-orange-200">
                      <span>09:41 AM</span>
                      <CheckCheck className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>

                {/* Agent Bubble */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[90%] bg-white border border-slate-200 text-slate-800 px-2.5 py-1.5 shadow-2xs text-[10px] leading-snug"
                    style={{ borderRadius: '6px' }}
                  >
                    <p>Sure! Here are 3 customized options with hotels, transport and sightseeing.</p>
                    <div className="text-right text-[8px] text-slate-400 mt-0.5">
                      <span>09:42 AM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar */}
              <div
                className="bg-white border border-slate-200 px-2 py-1 flex items-center justify-between gap-1.5 text-[10px] text-slate-400"
                style={{ borderRadius: '4px' }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">Type a message...</span>
                </div>
                <div
                  className="w-5 h-5 bg-[#FF5500] text-white flex items-center justify-center shrink-0 shadow-2xs"
                  style={{ borderRadius: '3px' }}
                >
                  <Send className="w-2.5 h-2.5 ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. WHY CHOOSE TRIPDM SECTION (Full Width & Pure White Cards) ─── */}
      <div className="w-full bg-white py-12 sm:py-16">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500]">
              WHY CHOOSE TRIPDM
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
              A Smarter Way to Plan Your Travels
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {/* Feature 1: Multiple Options */}
            <div
              className="bg-white border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all group"
              style={{ borderRadius: '8px' }}
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6 text-[#FF5500]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Multiple Options
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Get packages from many verified travel agencies in one place.
              </p>
            </div>

            {/* Feature 2: Direct Communication */}
            <div
              className="bg-white border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all group"
              style={{ borderRadius: '8px' }}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Direct Communication
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Chat, negotiate and customize directly with travel agents.
              </p>
            </div>

            {/* Feature 3: No Commission */}
            <div
              className="bg-white border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all group"
              style={{ borderRadius: '8px' }}
            >
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <IndianRupee className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                No Commission
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                You pay the travel agency directly. No extra charges from TripDM.
              </p>
            </div>

            {/* Feature 4: Verified Agents */}
            <div
              className="bg-white border border-slate-200/90 p-6 flex flex-col items-center text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-300 transition-all group"
              style={{ borderRadius: '8px' }}
            >
              <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">
                Verified Agents
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
                Connect with trusted and verified travel operators.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. COMPARISON TABLE & YOU ARE IN CONTROL SECTION (Full Width & Pure White) ─── */}
      <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Comparison Table Card */}
          <div
            className="lg:col-span-7 bg-white border border-slate-200/90 p-6 sm:p-8 shadow-[0_4px_25px_rgba(0,0,0,0.05)] flex flex-col justify-between"
            style={{ borderRadius: '8px' }}
          >
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-6">
                TripDM vs Traditional Travel Booking Sites
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="pb-3.5 pr-4">Feature</th>
                      <th className="pb-3.5 px-4 text-center font-black text-[#FF5500]">TripDM</th>
                      <th className="pb-3.5 pl-4 text-center text-slate-600">Traditional Travel Sites</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {COMPARISON_ROWS.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 pr-4 text-slate-800 font-semibold text-xs sm:text-[13px]">
                          {row.feature}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-500">
                            <CloseIcon className="w-3 h-3 stroke-[2.5]" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                100% Direct agency communication & zero markup.
              </span>
              <button
                type="button"
                onClick={() => onNavigateToDestinations()}
                className="text-xs font-bold text-[#FF5500] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Browse Packages</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Column: "You are in Control" Card with Photo */}
          <div
            className="lg:col-span-5 bg-white border border-slate-200/90 shadow-[0_4px_25px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col justify-between"
            style={{ borderRadius: '8px' }}
          >
            {/* Top Text Content */}
            <div className="p-6 sm:p-7">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-3.5 shadow-2xs">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-2">
                You are in Control
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Get multiple options, talk to real travel agents, customize your trip and book directly — all on one platform.
              </p>
            </div>

            {/* Bottom Scenic Image */}
            <div className="relative w-full h-56 sm:h-64 overflow-hidden border-t border-slate-100">
              <img
                src="/how-it-works-friends.jpg"
                alt="Friends traveling and hiking with backpacks"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-4 right-4 text-white text-xs font-semibold drop-shadow-md">
                Verified travel agencies ready to craft your journey.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. FREQUENTLY ASKED QUESTIONS SECTION (Full Width & Pure White Cards) ─── */}
      <div className="w-full bg-white py-12 sm:py-16">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-4">
            <div>
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#FF5500]">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mt-1.5">
                Got Questions? We've Got Answers.
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setShowAllFaqs(!showAllFaqs)}
              className="px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 w-fit cursor-pointer"
              style={{ borderRadius: '6px' }}
            >
              <span>{showAllFaqs ? 'Show Less FAQs' : 'View All FAQs'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FF5500]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {displayedFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border transition-all duration-200 bg-white ${
                    isOpen ? 'border-orange-400 shadow-sm bg-orange-50/10' : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                  style={{ borderRadius: '8px' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      {faq.question}
                    </h3>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'transform rotate-180 text-[#FF5500]' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-xs sm:text-[13px] text-slate-600 leading-relaxed border-t border-slate-100 mt-1 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 6. BOTTOM CALL-TO-ACTION (CTA) BANNER (Full-Width) ─── */}
      <div className="w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div
          className="max-w-[1720px] mx-auto relative overflow-hidden p-8 sm:p-12 lg:p-16 shadow-xl bg-slate-900"
          style={{ borderRadius: '8px' }}
        >
          {/* Panoramic Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity pointer-events-none"
            style={{ backgroundImage: "url('/how-it-works-cta.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/60 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Ready to Plan Your Next Trip?
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-200 mt-2 leading-relaxed max-w-xl">
                Explore destinations, connect with multiple travel agents and get personalized options — only on TripDM.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateToDestinations()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold px-7 py-3 text-xs sm:text-sm shadow-lg shadow-orange-500/30 border border-amber-400/50 transition-all cursor-pointer flex items-center gap-2"
                  style={{ borderRadius: '6px' }}
                >
                  <span>Explore Destinations</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToAgents()}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold px-6 py-3 text-xs sm:text-sm border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
                  style={{ borderRadius: '6px' }}
                >
                  Find Travel Agents
                </button>
              </div>
            </div>

            {/* Right Cursive Script Sticker */}
            <div className="hidden lg:flex flex-col items-start select-none pointer-events-none transform -rotate-3 text-white/95">
              <span className="text-sm sm:text-base font-bold font-serif italic tracking-tight drop-shadow-md">
                Find a Trip.
              </span>
              <span className="text-sm sm:text-base font-bold font-serif italic tracking-tight drop-shadow-md">
                Send a DM.
              </span>
              <span className="text-sm sm:text-base font-black text-amber-400 font-serif italic tracking-tight drop-shadow-md flex items-center gap-1.5">
                Start Your Journey.
                <svg className="w-5 h-5 text-amber-400 transform rotate-12 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
