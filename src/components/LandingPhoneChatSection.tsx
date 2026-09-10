'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Send,
  CheckCheck,
  Smile,
  Building2,
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
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
  const [customMessages, setCustomMessages] = useState<
    { id: string; text: string; sender: 'user' | 'agency'; time: string }[]
  >([]);

  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, amount: 0.25 });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Run the 4-step conversation animation
  const runChatSequence = () => {
    setVisibleStep(0);
    setIsTyping(false);
    setCustomMessages([]);

    // Step 1: User inquires about package
    const t1 = setTimeout(() => {
      setVisibleStep(1);
      scrollToBottom();

      // Step 2: Agency typing indicator
      const t2 = setTimeout(() => {
        setIsTyping(true);
        scrollToBottom();

        // Step 3: Agency replies with package details & standard price
        const t3 = setTimeout(() => {
          setIsTyping(false);
          setVisibleStep(2);
          scrollToBottom();

          // Step 4: User bargains with price for their group
          const t4 = setTimeout(() => {
            setVisibleStep(3);
            scrollToBottom();

            // Step 5: Agency typing indicator
            const t5 = setTimeout(() => {
              setIsTyping(true);
              scrollToBottom();

              // Step 6: Agency helps with a special discounted rate
              const t6 = setTimeout(() => {
                setIsTyping(false);
                setVisibleStep(4);
                scrollToBottom();
              }, 1400);
              return () => clearTimeout(t6);
            }, 800);
            return () => clearTimeout(t5);
          }, 1800);
          return () => clearTimeout(t4);
        }, 1200);
        return () => clearTimeout(t3);
      }, 700);
      return () => clearTimeout(t2);
    }, 400);

    return () => clearTimeout(t1);
  };

  useEffect(() => {
    if (isInView) {
      const cleanup = runChatSequence();
      return cleanup;
    }
  }, [isInView]);

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
      }, 1100);
    }, 500);
  };

  return (
    <section
      ref={sectionRef}
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
          CENTERED AUTHENTIC IPHONE 17 PRO MAX HARDWARE MOCKUP
          ======================================================== */}
      <div className="flex justify-center items-center w-full">
        {/* iPhone 17 Pro Max Titanium Chassis */}
        <div className="relative w-full max-w-[340px] sm:max-w-[370px] h-[630px] sm:h-[675px] bg-[#1a1c24] rounded-[54px] p-[10px] shadow-[0_35px_95px_-20px_rgba(15,23,42,0.48),0_0_0_1px_rgba(255,255,255,0.18),0_0_0_4px_rgba(30,34,44,0.95)] border-[2.5px] border-[#383d4a] select-none">
          
          {/* Top Speaker Earpiece Slit */}
          <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-12 h-[2.5px] bg-slate-800 rounded-full z-40 border border-slate-700/60" />

          {/* Precision Titanium Hardware Buttons */}
          {/* Action Button (Left Upper) */}
          <div className="absolute -left-[5px] top-[105px] w-[3px] h-[22px] bg-gradient-to-r from-[#424754] to-[#252830] rounded-l-xs shadow-xs" />
          {/* Volume Up (Left Middle) */}
          <div className="absolute -left-[5px] top-[140px] w-[3px] h-[42px] bg-gradient-to-r from-[#424754] to-[#252830] rounded-l-xs shadow-xs" />
          {/* Volume Down (Left Lower) */}
          <div className="absolute -left-[5px] top-[192px] w-[3px] h-[42px] bg-gradient-to-r from-[#424754] to-[#252830] rounded-l-xs shadow-xs" />
          {/* Power / Siri Key (Right Upper) */}
          <div className="absolute -right-[5px] top-[145px] w-[3px] h-[58px] bg-gradient-to-l from-[#424754] to-[#252830] rounded-r-xs shadow-xs" />
          {/* Camera Control Button (Right Lower) */}
          <div className="absolute -right-[4px] top-[225px] w-[2px] h-[36px] bg-[#333742] rounded-r-xs shadow-xs" />

          {/* Antenna Breaks */}
          <div className="absolute -left-[10px] top-[80px] w-[2px] h-[3px] bg-slate-600/70" />
          <div className="absolute -right-[10px] top-[80px] w-[2px] h-[3px] bg-slate-600/70" />
          <div className="absolute -left-[10px] bottom-[80px] w-[2px] h-[3px] bg-slate-600/70" />
          <div className="absolute -right-[10px] bottom-[80px] w-[2px] h-[3px] bg-slate-600/70" />

          {/* Super Retina XDR OLED Display Container */}
          <div className="relative w-full h-full bg-[#efeae2] rounded-[45px] overflow-hidden flex flex-col font-sans border border-slate-400/40 shadow-inner">
            
            {/* Glossy Screen Glare Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] pointer-events-none z-30 rounded-[45px]" />

            {/* iOS Status Bar with Exact iPhone 17 Pro Max Alignment */}
            <div className="bg-[#075e54] text-white pt-2.5 pb-2 px-5 flex items-center justify-between relative z-40 shrink-0 select-none border-b border-[#054c44]/40">
              
              {/* Left: Time in SF Pro Style */}
              <div className="w-16 flex items-center">
                <span className="text-[13px] font-semibold tracking-tight text-white/95 font-sans">
                  9:41
                </span>
              </div>

              {/* Center: Dynamic Island (iPhone 17 Pro Max Dimensions) */}
              <div className="w-26 h-[22px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
                {/* Camera / TrueDepth Sensor */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#080b12] border border-[#1a202c] flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-[#1e2a44]" />
                </div>
                {/* Active Sensor Green Indicator */}
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              {/* Right: Cellular Signal + WiFi + iOS Battery Icon */}
              <div className="w-16 flex items-center justify-end gap-1.5 text-white">
                
                {/* 4-Bar iOS Cellular Signal */}
                <svg className="w-3.5 h-3" viewBox="0 0 17 12" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="4" rx="0.5" />
                  <rect x="4.5" y="5.5" width="2.5" height="6.5" rx="0.5" />
                  <rect x="9" y="3" width="2.5" height="9" rx="0.5" />
                  <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" />
                </svg>

                {/* iOS WiFi Icon */}
                <svg className="w-3.5 h-3" viewBox="0 0 16 12" fill="currentColor">
                  <path d="M8 10.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-4.2-3.8a6 6 0 0 1 8.4 0 .8.8 0 0 0 1.1-1.1 7.6 7.6 0 0 0-10.6 0 .8.8 0 0 0 1.1 1.1zm-2.8-2.8a10 10 0 0 1 14 0 .8.8 0 0 0 1.1-1.1 11.6 11.6 0 0 0-16.2 0 .8.8 0 1 0 1.1 1.1z" />
                </svg>

                {/* Authentic iOS Battery Glyph */}
                <div className="flex items-center">
                  <div className="w-[20px] h-[10.5px] border-[1.2px] border-white/90 rounded-[3.5px] p-[1.5px] flex items-center">
                    <div className="w-[90%] h-full bg-white rounded-[1.5px]" />
                  </div>
                  <div className="w-[1.5px] h-[3.5px] bg-white/90 rounded-r-[1px] ml-[0.5px]" />
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

              {/* Right Header Action Icons */}
              <div className="flex items-center gap-3 text-white/90 pr-1">
                <Video className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
                <Phone className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
                <MoreVertical className="w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity" />
              </div>
            </div>

            {/* Chat Conversation Scroll Area with Travel Doodle Background */}
            <div
              ref={chatScrollRef}
              className="chat-travel-bg flex-1 p-3.5 space-y-3 overflow-y-auto overflow-x-hidden scroll-smooth text-slate-800 text-xs relative"
            >
              {/* Step 1: User says "I am interested in this package" */}
              <AnimatePresence>
                {visibleStep >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
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

            {/* iOS Home Indicator Bar */}
            <div className="py-1 bg-[#f0f2f5] flex justify-center shrink-0 z-30">
              <div className="w-28 h-1 bg-slate-400/60 rounded-full" />
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
