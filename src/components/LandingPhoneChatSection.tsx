'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Send,
  CheckCheck,
  Smile,
  Building2,
  ChevronLeft,
  Search,
  Paperclip,
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
  const [interactiveInput, setInteractiveInput] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [customMessages, setCustomMessages] = useState<
    { id: string; text: string; sender: 'user' | 'agency'; time: string }[]
  >([]);

  const phoneRef = useRef<HTMLDivElement>(null);
  const isPhoneInView = useInView(phoneRef, { once: false, amount: 0.3 });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
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

  // Run the 4-step conversation animation cleanly without leaks
  const runChatSequence = () => {
    clearAllTimeouts();
    setVisibleStep(0);
    setIsTyping(false);
    setCustomMessages([]);

    // Step 1: User inquires about package
    addTimeout(() => {
      setVisibleStep(1);
      scrollToBottom();

      // Step 2: Agency typing indicator
      addTimeout(() => {
        setIsTyping(true);
        scrollToBottom();

        // Step 3: Agency replies with package details & standard price
        addTimeout(() => {
          setIsTyping(false);
          setVisibleStep(2);
          scrollToBottom();

          // Step 4: User bargains with price for their group
          addTimeout(() => {
            setVisibleStep(3);
            scrollToBottom();

            // Step 5: Agency typing indicator
            addTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              // Step 6: Agency helps with a special discounted rate
              addTimeout(() => {
                setIsTyping(false);
                setVisibleStep(4);
                scrollToBottom();
                hasCompletedAnimation.current = true;
              }, 800);
            }, 400);
          }, 850);
        }, 750);
      }, 350);
    }, 250);
  };

  useEffect(() => {
    if (isPhoneInView) {
      if (!hasCompletedAnimation.current) {
        runChatSequence();
      }
    } else {
      // Scrolled away from phone: reset so it starts from first message when scrolled back
      clearAllTimeouts();
      setIsTyping(false);
      hasCompletedAnimation.current = false;
      setVisibleStep(0);
    }

    return () => {
      clearAllTimeouts();
    };
  }, [isPhoneInView]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleStep, isTyping, customMessages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!interactiveInput.trim()) return;

    const text = interactiveInput.trim();
    setInteractiveInput('');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setCustomMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        text: text,
        sender: 'user',
        time: nowTime,
      },
    ]);

    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setCustomMessages((prev) => [
          ...prev,
          {
            id: `agency-${Date.now()}`,
            text: 'Yes! We can arrange this according to your budget and preferences. Feel free to ask any other questions.',
            sender: 'agency',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        scrollToBottom();
      }, 650);
    }, 250);
  };

  return (
    <section
      className="py-14 sm:py-20 px-4 sm:px-8 lg:px-12 w-full max-w-[1400px] mx-auto bg-white overflow-hidden"
    >
      {/* ========================================================
          CENTERED HEADER (Headline & Subtitle above the phone)
          ======================================================== */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15] mb-4">
          Chat Directly with{' '}
          <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
            Travel Agencies
          </span>
        </h2>

        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto font-normal">
          Ask questions, get instant package pricing, and customize your itinerary directly with verified local travel agencies.
        </p>
      </div>

      {/* ========================================================
          CENTERED AUTHENTIC NOTHING PHONE (3A) HARDWARE MOCKUP
          ======================================================== */}
      <div className="relative flex justify-center items-center w-full py-3">
        {/* Soft Studio Ambient Glow behind phone */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[410px] h-[580px] bg-gradient-to-b from-orange-500/5 via-emerald-500/6 to-transparent blur-3xl rounded-full pointer-events-none" />

        {/* Nothing Phone (3a) Midnight Slate Matte Chassis */}
        <div ref={phoneRef} className="relative w-full max-w-[340px] sm:max-w-[370px] h-[630px] sm:h-[675px] bg-[#0c121b] rounded-[52px] p-[10px] shadow-[0_20px_42px_-12px_rgba(15,23,42,0.2),0_8px_18px_-6px_rgba(15,23,42,0.12),0_0_0_1.5px_#233044,inset_0_1px_1px_rgba(255,255,255,0.18)] border-[2.5px] border-[#182333] select-none">
          
          {/* Calibrated 3D Floor Shadow at base of phone (Smooth dual-layer depth) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[82%] h-7 bg-slate-950/16 blur-xl rounded-full pointer-events-none -z-10" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[56%] h-3.5 bg-slate-950/25 blur-md rounded-full pointer-events-none -z-10" />

          {/* Top Speaker Micro-Slit */}
          <div className="absolute top-[4.5px] left-1/2 -translate-x-1/2 w-12 h-[2px] bg-[#1e2a3c] rounded-full z-40 border-b border-[#2a3a52]/40" />

          {/* Nothing Phone (3a) Hardware Buttons (Exact replica of reference) */}
          {/* Left Side: Single Power / Sleep Button */}
          <div className="absolute -left-[4.5px] top-[180px] w-[3.5px] h-[48px] bg-gradient-to-r from-[#2a384e] to-[#141d2c] rounded-l-xs shadow-xs border-l border-t border-b border-[#364964]" />

          {/* Right Side: Two Discrete Volume Buttons */}
          {/* Volume Up */}
          <div className="absolute -right-[4.5px] top-[148px] w-[3.5px] h-[36px] bg-gradient-to-l from-[#2a384e] to-[#141d2c] rounded-r-xs shadow-xs border-r border-t border-b border-[#364964]" />
          {/* Volume Down */}
          <div className="absolute -right-[4.5px] top-[230px] w-[3.5px] h-[36px] bg-gradient-to-l from-[#2a384e] to-[#141d2c] rounded-r-xs shadow-xs border-r border-t border-b border-[#364964]" />

          {/* Symmetrical OLED Display Container */}
          <div className="relative w-full h-full bg-[#efeae2] rounded-[42px] overflow-hidden flex flex-col font-sans border border-[#16202e]/60 shadow-inner">
            
            {/* Subtle Screen Glare Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06] pointer-events-none z-30 rounded-[42px]" />

            {/* Nothing OS Status Bar (1:1 Replica with user reference) */}
            <div className="bg-[#075e54] text-white pt-2.5 pb-2 px-5 flex items-center justify-between relative z-40 shrink-0 select-none border-b border-[#054c44]/40">
              
              {/* Left: Time in Clean Nothing OS Sans */}
              <div className="w-16 flex items-center">
                <span className="text-[13px] font-medium tracking-tight text-white/95 font-sans">
                  09:41
                </span>
              </div>

              {/* Center: Nothing Phone (3a) Centered Single Punch-Hole Camera */}
              <div className="w-3.5 h-3.5 bg-[#070b10] rounded-full flex items-center justify-center border border-[#1b2536] shadow-inner">
                {/* Camera Lens Reflection */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#121c2b] flex items-center justify-center">
                  <div className="w-0.5 h-0.5 rounded-full bg-[#2a3d5e]/90" />
                </div>
              </div>

              {/* Right: Exact Status Icons in Reference Order: [WiFi] [Cellular] [Battery] */}
              <div className="w-16 flex items-center justify-end gap-2 text-white/95">
                
                {/* Nothing OS Wi-Fi Icon (Clean 3-tier wave, all lines sharp & visible) */}
                <svg className="w-3.5 h-3.5 text-white/95 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8.5c4.6-4 11.4-4 16 0" />
                  <path d="M7.5 12.5c2.6-2.2 6.4-2.2 9 0" />
                  <circle cx="12" cy="17.5" r="1.3" fill="currentColor" stroke="none" />
                </svg>

                {/* 4-Bar Ascending Cellular Signal */}
                <svg className="w-3.5 h-3 text-white/95 shrink-0" viewBox="0 0 16 12" fill="currentColor">
                  <rect x="0.5" y="8.5" width="2.4" height="3.5" rx="0.6" />
                  <rect x="4.4" y="5.8" width="2.4" height="6.2" rx="0.6" />
                  <rect x="8.3" y="3.2" width="2.4" height="8.8" rx="0.6" />
                  <rect x="12.2" y="0.5" width="2.4" height="11.5" rx="0.6" />
                </svg>

                {/* Nothing OS Solid Battery Glyph with Terminal Nub */}
                <div className="flex items-center shrink-0">
                  <div className="w-[19px] h-[10px] border-[1.2px] border-white/95 rounded-[3px] p-[1.5px] flex items-center">
                    <div className="w-full h-full bg-white rounded-[1.2px]" />
                  </div>
                  <div className="w-[1.2px] h-[3.5px] bg-white/95 rounded-r-[1px] ml-[0.5px]" />
                </div>

              </div>
            </div>

            {/* WhatsApp / TripDM Top Navigation Bar */}
            <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between shadow-md z-30 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ChevronLeft className="w-5 h-5 text-white -ml-1 cursor-pointer hover:opacity-80 transition-opacity" />
                
                {/* Travel Agency Avatar */}
                <div className="relative w-9 h-9 rounded-full bg-emerald-800 border-2 border-white/40 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Building2 className="w-4.5 h-4.5 text-white" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#075e54] rounded-full" />
                </div>

                {/* Title & Online Status */}
                <div className="min-w-0">
                  <h4 className="font-bold text-[13px] text-white truncate leading-tight">
                    Travel Agency
                  </h4>
                  <span className="text-[10px] text-emerald-200 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    online
                  </span>
                </div>
              </div>

              {/* Right Header Action: Search Button from Original Chat System */}
              <div className="flex items-center pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowInChatSearch((prev) => !prev);
                    if (showInChatSearch) setInChatSearchQuery('');
                  }}
                  className={`p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                    showInChatSearch
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                  title="Search in chat"
                  aria-label="Search messages"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Chat Search Input Bar (Slides down under header) */}
            {showInChatSearch && (
              <div className="px-3 py-1.5 bg-[#054c44] border-b border-[#043d36] flex items-center gap-2 z-30 shrink-0">
                <Search className="w-3.5 h-3.5 text-emerald-200 shrink-0 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={inChatSearchQuery}
                  onChange={(e) => setInChatSearchQuery(e.target.value)}
                  placeholder="Search in conversation..."
                  className="flex-1 bg-transparent text-white placeholder-emerald-200/60 text-xs focus:outline-none"
                />
                {inChatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setInChatSearchQuery('')}
                    className="text-[10px] text-emerald-200 hover:text-white cursor-pointer px-1 py-0.5 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Chat Conversation Scroll Area with Travel Doodle Background */}
            <div
              ref={chatScrollRef}
              className="chat-travel-bg flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden scroll-smooth text-slate-800 text-xs relative"
            >
              {/* Step 1: User says "I am interested in this package" */}
              <AnimatePresence>
                {visibleStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] bg-[#d9fdd3] text-slate-900 px-3.5 py-2 rounded-2xl rounded-tr-xs shadow-[0_1px_1px_rgba(11,20,26,0.15)] border border-[#c4ebb8]/70">
                      <p className="text-[12.5px] leading-relaxed select-text font-normal">
                        Hi! I am interested in this 5D/4N Kashmir Highlights package.
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-slate-500 font-medium">
                        <span>09:41 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 2: Travel Agency replies with package details & price in simple text */}
              <AnimatePresence>
                {visibleStep >= 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[88%] bg-white text-slate-900 px-3.5 py-2.5 rounded-2xl rounded-tl-xs shadow-[0_1px_1px_rgba(11,20,26,0.15)] border border-slate-200/90">
                      <p className="text-[12.5px] leading-relaxed text-slate-800">
                        Hello! Great choice. This package is ₹14,999 per person, including 4-star hotel stay, Dal Lake luxury houseboat, private cab transfers, and daily meals.
                      </p>
                      <div className="flex items-center justify-end text-[9px] text-slate-400 mt-1">
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
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] bg-[#d9fdd3] text-slate-900 px-3.5 py-2 rounded-2xl rounded-tr-xs shadow-[0_1px_1px_rgba(11,20,26,0.15)] border border-[#c4ebb8]/70">
                      <p className="text-[12.5px] leading-relaxed select-text font-normal">
                        We are 4 people travelling. Can you give us some discount or best price?
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-slate-500 font-medium">
                        <span>09:42 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Step 4: Travel Agency helps with discount in simple text */}
              <AnimatePresence>
                {visibleStep >= 4 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[88%] bg-white text-slate-900 px-3.5 py-2.5 rounded-2xl rounded-tl-xs shadow-[0_1px_1px_rgba(11,20,26,0.15)] border border-slate-200/90">
                      <p className="text-[12.5px] leading-relaxed text-slate-800">
                        Sure! For a group of 4, we can offer our special direct rate of ₹13,500 per person.
                      </p>
                      <div className="flex items-center justify-end text-[9px] text-slate-400 mt-1">
                        <span>09:42 AM</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom User Messages */}
              {customMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl shadow-2xs border ${
                      msg.sender === 'user'
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs border-[#c4ebb8]'
                        : 'bg-white text-slate-900 rounded-tl-xs border-slate-200'
                    }`}
                  >
                    <p className="text-[12.5px] leading-relaxed">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[9px] text-slate-400">
                      <span>{msg.time}</span>
                      {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 bg-white text-slate-600 px-3 py-1.5 rounded-2xl rounded-tl-xs border border-slate-200 shadow-2xs w-fit"
                >
                  <span className="text-[10px] text-slate-500 font-medium">
                    Travel Agency is typing
                  </span>
                  <span className="flex gap-1 ml-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  </span>
                </motion.div>
              )}

            </div>

            {/* Bottom WhatsApp Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="px-2.5 py-2 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-2 shrink-0 z-30"
            >
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700 p-1 rounded-full transition-colors shrink-0"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                className="text-slate-500 hover:text-slate-700 p-1 rounded-full transition-colors shrink-0"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </button>

              <input
                type="text"
                value={interactiveInput}
                onChange={(e) => setInteractiveInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-slate-300 px-3.5 py-1.5 bg-white text-slate-800 text-xs focus:outline-none focus:border-emerald-600 shadow-2xs min-w-0"
              />

              <button
                type="submit"
                disabled={!interactiveInput.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  interactiveInput.trim()
                    ? 'bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs active:scale-95 cursor-pointer'
                    : 'bg-slate-300 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </form>

            {/* Nothing OS / Android Navigation Pill */}
            <div className="py-1.5 bg-[#f0f2f5] flex justify-center shrink-0 z-30">
              <div className="w-20 h-[3px] bg-slate-400/70 rounded-full" />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
