'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { isPushNotificationSupported, getNotificationPermissionStatus, requestAndSaveFcmToken } from '@/lib/fcmNotifications';

interface NotificationPermissionPromptProps {
  userId?: string | null;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
  onPermissionChange?: (granted: boolean) => void;
}

export default function NotificationPermissionPrompt({
  userId,
  className = '',
  variant = 'banner',
  onPermissionChange,
}: NotificationPermissionPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushNotificationSupported()) {
      setPermission('unsupported');
      return;
    }

    const currentStatus = getNotificationPermissionStatus();
    setPermission(currentStatus);

    // Check if user dismissed previously in this session or past 7 days
    const dismissedAt = localStorage.getItem('tripdm_notif_prompt_dismissed');
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  if (permission === 'unsupported' || permission === 'granted' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    if (!userId) {
      setErrorMessage('Please log in to receive notifications.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestAndSaveFcmToken(userId);
      if (res.success) {
        setPermission('granted');
        setShowSuccess(true);
        if (onPermissionChange) onPermissionChange(true);
        setTimeout(() => {
          setShowSuccess(false);
          setDismissed(true);
        }, 3500);
      } else {
        if (res.error?.includes('denied')) {
          setPermission('denied');
          setErrorMessage('Notifications were blocked. Please enable them from your browser site settings.');
        } else {
          setErrorMessage(res.error || 'Failed to enable notifications.');
        }
        if (onPermissionChange) onPermissionChange(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('tripdm_notif_prompt_dismissed', Date.now().toString());
  };

  if (showSuccess) {
    return (
      <div className={`bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${className}`}>
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-5 w-5 text-emerald-200 shrink-0 animate-bounce" />
          <span className="font-medium">
            Notifications enabled! You'll be notified immediately when travel agents reply to your enquiry.
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-lg border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 ${className}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600/50 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
            <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Get notified when travel agents reply
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-300" /> Instant
              </span>
            </div>
            <p className="text-[11px] text-indigo-200/90 leading-tight mt-0.5">
              Don't miss replies if you leave or close this tab. Receive direct Web Push updates.
            </p>
            {errorMessage && (
              <p className="text-[10px] text-amber-300 mt-1 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3 h-3 text-amber-400" /> {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-indigo-250 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors font-medium"
          >
            Later
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleEnable}
            className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-bold text-xs sm:text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-slate-950" />
                <span>Notify Me</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors sm:inline-block hidden"
            aria-label="Close notification prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">Enable Agent Reply Notifications</h4>
          <p className="text-[11px] text-gray-500">Get push notifications instantly when an agent answers your inquiry.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={handleEnable}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors shadow-xs"
      >
        {loading ? 'Enabling...' : 'Enable'}
      </button>
    </div>
  );
}
