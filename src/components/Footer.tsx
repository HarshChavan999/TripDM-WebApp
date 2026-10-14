'use client';

import React from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Youtube } from 'lucide-react';

interface FooterProps {
  onNavigate?: (section: string) => void;
}

export default function Footer({ onNavigate }: FooterProps = {}) {
  return (
    <footer className="w-full bg-[#181818] text-white relative z-10 border-t border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-28 md:pb-6">
        {/* Main Single Row / Flex Container: Logo + Social Links beside it + Nav Links in one line */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 pb-4 border-b border-[#262626]">
          {/* Left: Logo & Social Media Links beside it */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-start">
            <Link href="/" className="inline-block shrink-0">
              <img
                src="/tripdm-logo.png"
                alt="TripDM Logo"
                className="h-9 sm:h-11 w-auto object-contain brightness-125"
              />
            </Link>

            {/* Social Media Links beside the logo */}
            <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-white/20">
              <a
                href="https://www.facebook.com/profile.php?id=61594024299870"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TripDM on Facebook"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all hover:scale-105"
              >
                <Facebook className="w-4 h-4 text-[#1877F2]" />
              </a>
              <a
                href="https://www.instagram.com/tripdm_official/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TripDM on Instagram"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all hover:scale-105"
              >
                <Instagram className="w-4 h-4 text-[#E4405F]" />
              </a>
              <a
                href="https://www.youtube.com/@TripDm"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TripDM on YouTube"
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all hover:scale-105"
              >
                <Youtube className="w-4 h-4 text-[#FF0000]" />
              </a>
            </div>
          </div>

          {/* Right: Primary Navigation Links in one single compact line */}
          <nav className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-slate-300">
            <Link href="/policies/about" className="hover:text-orange-400 transition-colors">
              About us
            </Link>
            <Link href="/how-it-works" className="hover:text-orange-400 transition-colors">
              How It Works
            </Link>
            <Link href="/blog" className="hover:text-orange-400 transition-colors">
              Blog
            </Link>
            <Link href="/agencytripdm" className="hover:text-orange-400 font-semibold text-orange-400 transition-colors">
              Join as an Agency
            </Link>
            <a
              href="#"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('profile');
                }
              }}
              className="hover:text-orange-400 transition-colors cursor-pointer"
            >
              My Account
            </a>
            <a
              href="#"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('chat');
                }
              }}
              className="hover:text-orange-400 transition-colors cursor-pointer"
            >
              My Chat
            </a>
            <Link href="/policies/about" className="hover:text-orange-400 transition-colors">
              Contact us
            </Link>
          </nav>
        </div>

        {/* Bottom Bar: Policies (clearly visible, not pushed off-screen or hidden by mobile nav) */}
        <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] sm:text-xs text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 sm:gap-x-5 gap-y-1.5">
            <Link href="/policies/conditions-of-use" className="hover:text-orange-400 transition-colors">
              Condition of Use and Sale
            </Link>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <Link href="/policies/privacy-notice" className="hover:text-orange-400 transition-colors">
              Privacy Notice
            </Link>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <Link href="/policies/internet-based-policy" className="hover:text-orange-400 font-medium text-slate-300 transition-colors">
              Internet-Based Policy
            </Link>
          </div>
          <p className="text-slate-500 text-[10px] sm:text-[11px] text-center sm:text-right">
            © {new Date().getFullYear()} TripDM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
