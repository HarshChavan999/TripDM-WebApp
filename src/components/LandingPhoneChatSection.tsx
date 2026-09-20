'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  CheckCheck,
  Smile,
  Building2,
  ChevronLeft,
  Search,
  Paperclip,
  Handshake,
  SlidersHorizontal,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react';

export default function LandingPhoneChatSection({
  onChat,
  onView,
  listings = [],
}: {
  onChat?: (listing?: any) => void;
  onView?: (listing?: any) => void;
  listings?: any[];
} = {}) {
  const [visibleStep, setVisibleStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const phoneRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const wasInViewRef = useRef(false);
  const hasCompletedAnimation = useRef(false);

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timeoutsRef.current.push(timer);
    return timer;
  };

  // Run the 4-step conversation animation with snappy, fast timing
  const runChatSequence = () => {
    clearAllTimeouts();
    setVisibleStep(0);
    setIsTyping(false);
    hasCompletedAnimation.current = false;

    // Step 1: User inquires about package (immediate after 120ms)
    addTimeout(() => {
      setVisibleStep(1);
      scrollToBottom();

      // Step 2: Agency typing indicator starts after 350ms
      addTimeout(() => {
        setIsTyping(true);
        scrollToBottom();

        // Step 3: Agency replies with package details & standard price after 600ms typing
        addTimeout(() => {
          setIsTyping(false);
          setVisibleStep(2);
          scrollToBottom();

          // Step 4: User bargains with price for their group after 450ms
          addTimeout(() => {
            setVisibleStep(3);
            scrollToBottom();

            // Step 5: Agency typing indicator starts after 350ms
            addTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              // Step 6: Agency helps with special discounted rate after 650ms typing
              addTimeout(() => {
                setIsTyping(false);
                setVisibleStep(4);
                scrollToBottom();
                hasCompletedAnimation.current = true;
              }, 650);
            }, 350);
          }, 450);
        }, 600);
      }, 350);
    }, 120);
  };

  // Detect whether the phone or section is currently inside the user's viewport
  const isElementVisible = () => {
    const el = phoneRef.current || sectionRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    // Considered in view when at least 80px is within viewport bounds
    return rect.top < windowHeight - 80 && rect.bottom > 80;
  };

  useEffect(() => {
    let ticking = false;

    const checkVisibility = () => {
      const currentlyInView = isElementVisible();

      if (currentlyInView && !wasInViewRef.current) {
        // Just entered viewport (whether scrolling down from top OR scrolling up from bottom)
        wasInViewRef.current = true;
        runChatSequence();
      } else if (!currentlyInView && wasInViewRef.current) {
        // Just exited viewport (scrolled away above or below)
        wasInViewRef.current = false;
        clearAllTimeouts();
        setIsTyping(false);
        setVisibleStep(0); // Reset so it replays from step 1 upon return!
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkVisibility();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Also monitor inner dashboard scroll container if present
    const scrollContainer = document.getElementById('user-dashboard-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Native IntersectionObserver for instant response
    let observer: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window && phoneRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            if (entry.isIntersecting && !wasInViewRef.current) {
              wasInViewRef.current = true;
              runChatSequence();
            } else if (!entry.isIntersecting && wasInViewRef.current) {
              wasInViewRef.current = false;
              clearAllTimeouts();
              setIsTyping(false);
              setVisibleStep(0);
            }
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(phoneRef.current);
    }

    // Initial check on mount
    const timer = setTimeout(() => {
      checkVisibility();
    }, 150);

    return () => {
      clearAllTimeouts();
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [visibleStep, isTyping]);

  return (
    <section ref={sectionRef} className="py-8 sm:py-12 lg:py-14 px-4 sm:px-8 lg:px-12 w-full max-w-[1240px] mx-auto bg-white overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* ========================================================
            LEFT COLUMN: Copy & Title + Symbolic Highlights (Top-Aligned)
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col justify-start text-left space-y-6 lg:pt-3">
          <div>
            {/* Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-[1.2] mb-3.5">
              Connect, Negotiate, and Customize Directly with Verified Operators
            </h2>

            {/* Subtitle */}
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal max-w-xl">
              Experience seamless one-on-one communication with local travel agencies for instant pricing, flexible adjustments, and guaranteed local rates.
            </p>
          </div>

          {/* Symbolic Highlights (No containers, neutral tones, no AI words) */}
          <div className="space-y-4 pt-1">
            {/* 1. Real-Time Price Negotiation */}
            <div className="flex items-start gap-3.5">
              <Handshake className="w-5 h-5 text-slate-900 mt-0.5 shrink-0" strokeWidth={2} />
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Real-Time Price Negotiation
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-0.5 max-w-lg">
                  Bargain directly with operators to secure tailored group discounts and custom pricing.
                </p>
              </div>
            </div>

            {/* 2. Dynamic Itinerary Customization */}
            <div className="flex items-start gap-3.5">
              <SlidersHorizontal className="w-5 h-5 text-slate-900 mt-0.5 shrink-0" strokeWidth={2} />
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Dynamic Itinerary Customization
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-0.5 max-w-lg">
                  Adjust hotel categories, add sightseeing spots, and fine-tune trip pacing on demand.
                </p>
              </div>
            </div>

            {/* 3. Verified Local Expertise */}
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-5 h-5 text-slate-900 mt-0.5 shrink-0" strokeWidth={2} />
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Verified Local Expertise
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-0.5 max-w-lg">
                  Get authentic destination insights and reliable on-ground coordination from licensed agencies.
                </p>
              </div>
            </div>

            {/* 4. Direct Booking Benefits */}
            <div className="flex items-start gap-3.5">
              <BadgeCheck className="w-5 h-5 text-slate-900 mt-0.5 shrink-0" strokeWidth={2} />
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Direct Booking Benefits
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-0.5 max-w-lg">
                  Enjoy zero middleman markups, transparent billing, and dedicated direct agent support.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Sleek Modern Phone Mockup with Realistic Proportions
            ======================================================== */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end items-center relative py-2">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[310px] sm:w-[340px] h-[590px] sm:h-[640px] bg-gradient-to-b from-orange-500/5 via-emerald-500/8 to-transparent blur-2xl rounded-full pointer-events-none" />

          {/* Phone Chassis */}
          <div
            ref={phoneRef}
            className="relative w-full max-w-[300px] sm:max-w-[325px] h-[590px] sm:h-[640px] bg-[#0c121b] rounded-[48px] p-[8px] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.28),0_8px_20px_-6px_rgba(15,23,42,0.15),0_0_0_1.5px_#233044,inset_0_1px_1.5px_rgba(255,255,255,0.2)] border-[2.5px] border-[#182333] select-none"
          >
            {/* 3D Floor Shadow */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[82%] h-6 bg-slate-950/18 blur-lg rounded-full pointer-events-none -z-10" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[55%] h-3 bg-slate-950/28 blur-sm rounded-full pointer-events-none -z-10" />

            {/* Top Speaker Micro-Slit */}
            <div className="absolute top-[4.5px] left-1/2 -translate-x-1/2 w-11 h-[2px] bg-[#1e2a3c] rounded-full z-40 border-b border-[#2a3a52]/50" />

            {/* Left Button (Power/Lock) */}
            <div className="absolute -left-[4px] top-[165px] w-[3px] h-[44px] bg-gradient-to-r from-[#2a384e] to-[#141d2c] rounded-l-xs shadow-xs border-l border-t border-b border-[#364964]" />

            {/* Right Buttons (Volume Up & Down) */}
            <div className="absolute -right-[4px] top-[140px] w-[3px] h-[32px] bg-gradient-to-l from-[#2a384e] to-[#141d2c] rounded-r-xs shadow-xs border-r border-t border-b border-[#364964]" />
            <div className="absolute -right-[4px] top-[190px] w-[3px] h-[32px] bg-gradient-to-l from-[#2a384e] to-[#141d2c] rounded-r-xs shadow-xs border-r border-t border-b border-[#364964]" />

            {/* Symmetrical OLED Display Container */}
            <div className="relative w-full h-full bg-[#efeae2] rounded-[40px] overflow-hidden flex flex-col font-sans border border-[#16202e]/60 shadow-inner">
              {/* Screen Glare Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none z-30 rounded-[40px]" />

              {/* Status Bar */}
              <div className="bg-[#075e54] text-white pt-2.5 pb-1.5 px-4 flex items-center justify-between relative z-40 shrink-0 select-none border-b border-[#054c44]/40">
                <div className="w-12 flex items-center">
                  <span className="text-[11px] font-medium tracking-tight text-white/95 font-sans">
                    4:00
                  </span>
                </div>

                {/* Punch-Hole Camera */}
                <div className="w-3 h-3 bg-[#070b10] rounded-full flex items-center justify-center border border-[#1b2536] shadow-inner">
                  <div className="w-1 h-1 rounded-full bg-[#121c2b] flex items-center justify-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-[#2a3d5e]/90" />
                  </div>
                </div>

                {/* Status Icons */}
                <div className="w-12 flex items-center justify-end gap-1.5 text-white/95">
                  <svg className="w-3 h-3 text-white/95 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8.5c4.6-4 11.4-4 16 0" />
                    <path d="M7.5 12.5c2.6-2.2 6.4-2.2 9 0" />
                    <circle cx="12" cy="17.5" r="1.3" fill="currentColor" stroke="none" />
                  </svg>
                  <svg className="w-3 h-2.5 text-white/95 shrink-0" viewBox="0 0 16 12" fill="currentColor">
                    <rect x="0.5" y="8.5" width="2.4" height="3.5" rx="0.6" />
                    <rect x="4.4" y="5.8" width="2.4" height="6.2" rx="0.6" />
                    <rect x="8.3" y="3.2" width="2.4" height="8.8" rx="0.6" />
                    <rect x="12.2" y="0.5" width="2.4" height="11.5" rx="0.6" />
                  </svg>
                  <div className="flex items-center shrink-0">
                    <div className="w-[16px] h-[9px] border-[1.2px] border-white/95 rounded-[2.5px] p-[1px] flex items-center">
                      <div className="w-full h-full bg-white rounded-[1px]" />
                    </div>
                    <div className="w-[1px] h-[3px] bg-white/95 rounded-r-[1px] ml-[0.5px]" />
                  </div>
                </div>
              </div>

              {/* Chat Top Nav */}
              <div className="bg-[#075e54] text-white px-2.5 py-1.5 flex items-center justify-between shadow-md z-30 shrink-0 select-none">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronLeft className="w-4 h-4 text-white -ml-0.5 pointer-events-none" />
                  <div className="relative w-7 h-7 rounded-full bg-emerald-800 border-[1.5px] border-white/40 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-white" />
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-[#075e54] rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-[11.5px] text-white truncate leading-tight">
                      Travel Agency
                    </h4>
                    <span className="text-[9px] text-emerald-200 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      online
                    </span>
                  </div>
                </div>

                <div className="flex items-center text-white/80 pointer-events-none pr-1">
                  <Search className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat Conversation Scroll Area */}
              <div
                ref={chatScrollRef}
                className="chat-travel-bg flex-1 p-2.5 space-y-2 overflow-y-auto overflow-x-hidden scroll-smooth text-slate-800 text-xs relative"
              >
                {/* Step 1: User says "I am interested in this package" */}
                <AnimatePresence>
                  {visibleStep >= 1 && (
                    <motion.div
                      key="step-msg-1"
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] bg-[#d9fdd3] text-slate-900 px-3 py-1.5 rounded-2xl rounded-tr-xs shadow-[0_1px_1px_rgba(11,20,26,0.12)] border border-[#c4ebb8]/70">
                        <p className="text-[11.5px] leading-snug select-text font-normal">
                          Hi! I am interested in this 5D/4N Kashmir Highlights package.
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-0.5 text-[8.5px] text-slate-500 font-medium">
                          <span>09:41 AM</span>
                          <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 2: Travel Agency replies */}
                <AnimatePresence>
                  {visibleStep >= 2 && (
                    <motion.div
                      key="step-msg-2"
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[88%] bg-white text-slate-900 px-3 py-1.5 rounded-2xl rounded-tl-xs shadow-[0_1px_1px_rgba(11,20,26,0.12)] border border-slate-200/90">
                        <p className="text-[11.5px] leading-snug text-slate-800">
                          Hello! Great choice. This package is ₹14,999 per person, including 4-star hotel stay, Dal Lake luxury houseboat, private cab transfers, and daily meals.
                        </p>
                        <div className="flex items-center justify-end text-[8.5px] text-slate-400 mt-0.5">
                          <span>09:41 AM</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 3: User bargains on price */}
                <AnimatePresence>
                  {visibleStep >= 3 && (
                    <motion.div
                      key="step-msg-3"
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] bg-[#d9fdd3] text-slate-900 px-3 py-1.5 rounded-2xl rounded-tr-xs shadow-[0_1px_1px_rgba(11,20,26,0.12)] border border-[#c4ebb8]/70">
                        <p className="text-[11.5px] leading-snug select-text font-normal">
                          We are 4 people travelling. Can you give us some discount or best price?
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-0.5 text-[8.5px] text-slate-500 font-medium">
                          <span>09:42 AM</span>
                          <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 4: Travel Agency helps with discount */}
                <AnimatePresence>
                  {visibleStep >= 4 && (
                    <motion.div
                      key="step-msg-4"
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="flex justify-start"
                    >
                      <div className="max-w-[88%] bg-white text-slate-900 px-3 py-1.5 rounded-2xl rounded-tl-xs shadow-[0_1px_1px_rgba(11,20,26,0.12)] border border-slate-200/90">
                        <p className="text-[11.5px] leading-snug text-slate-800">
                          Sure! For a group of 4, we can offer our special direct rate of ₹13,500 per person.
                        </p>
                        <div className="flex items-center justify-end text-[8.5px] text-slate-400 mt-0.5">
                          <span>09:42 AM</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 bg-white text-slate-600 px-2.5 py-1 rounded-2xl rounded-tl-xs border border-slate-200 shadow-2xs w-fit"
                  >
                    <span className="text-[9.5px] text-slate-500 font-medium">
                      Travel Agency is typing
                    </span>
                    <span className="flex gap-0.5 ml-0.5">
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" />
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Bottom WhatsApp Bar (Static mockup - new chat cannot be entered) */}
              <div className="px-2.5 py-2 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-1.5 shrink-0 z-30 select-none">
                <span className="text-slate-400 p-0.5 rounded-full shrink-0 cursor-default">
                  <Smile className="w-4 h-4" />
                </span>

                <span className="text-slate-400 p-0.5 rounded-full shrink-0 cursor-default">
                  <Paperclip className="w-4 h-4" />
                </span>

                <div className="flex-1 rounded-full border border-slate-300 px-3 py-1 bg-white text-slate-400 text-[11px] shadow-2xs min-w-0 select-none cursor-default truncate">
                  Type a message...
                </div>

                <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#00a884] text-white shadow-xs shrink-0 select-none cursor-default">
                  <Send className="w-3 h-3 ml-0.5" />
                </div>
              </div>

              {/* Bottom Android Navigation Pill */}
              <div className="py-1.5 bg-[#f0f2f5] flex justify-center shrink-0 z-30">
                <div className="w-20 h-[3px] bg-slate-400/80 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
