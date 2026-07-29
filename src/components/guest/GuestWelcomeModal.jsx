import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { X, Heart, PackageCheck, History, UserCog, ShieldCheck, BadgePercent } from 'lucide-react';
import GoogleIcon from '@/components/GoogleIcon';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'fmm_guest_welcome_modal_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const BENEFITS = [
  { icon: Heart, title: 'Save wishlist', description: 'Keep favourite items ready for later.' },
  { icon: PackageCheck, title: 'Track orders', description: 'Follow your delivery progress with ease.' },
  { icon: History, title: 'View order history', description: 'See past purchases in one place.' },
  { icon: UserCog, title: 'Manage account information', description: 'Update your details whenever you need.' },
  { icon: ShieldCheck, title: 'Faster and more secure checkout', description: 'Complete purchases more smoothly.' },
  { icon: BadgePercent, title: 'Access exclusive promotions', description: 'Stay close to special offers and deals.' },
];

function shouldShowAgain() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt) return true;
    return Date.now() > Number(parsed.expiresAt);
  } catch (_) {
    return true;
  }
}

function persistDismissal(useThirtyDays) {
  try {
    if (!useThirtyDays) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ expiresAt: Date.now() + THIRTY_DAYS_MS })
    );
  } catch (_) {
    // ignore storage issues
  }
}

export default function GuestWelcomeModal() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const modalRef = useRef(null);
  const firstActionRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const isBlockedRoute = useMemo(() => {
    const path = location.pathname.toLowerCase();
    return ['/checkout', '/login', '/register', '/forgot-password', '/reset-password'].includes(path);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated || isBlockedRoute) {
      setOpen(false);
      return;
    }
    if (location.pathname !== '/') {
      setOpen(false);
      return;
    }
    if (!shouldShowAgain()) return;

    const timer = window.setTimeout(() => {
      lastFocusedRef.current = document.activeElement;
      setOpen(true);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isBlockedRoute, location.pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      firstActionRef.current?.focus();
    }, 30);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus();
      }
    };
  }, [open]);

  const handleClose = () => {
    persistDismissal(dontShowAgain);
    setOpen(false);
  };

  const handleGoogle = async () => {
    persistDismissal(dontShowAgain);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/',
        queryParams: { prompt: 'select_account' },
      },
    });
  };

  if (!open || isAuthenticated || isBlockedRoute || location.pathname !== '/') return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 px-3 py-4 backdrop-blur-[2px] sm:px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden={false}
      >
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fmm-welcome-modal-title"
          aria-describedby="fmm-welcome-modal-description"
          className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 bg-[#081b44] shadow-[0_20px_80px_rgba(2,12,27,0.45)]"
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label="Close welcome dialog"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#03143f] via-[#0b2a63] to-[#2E86C1] px-5 py-6 text-white sm:px-7 sm:py-8 lg:px-8 lg:py-9">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
              <div className="relative z-10">
                <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
                  FMM CLASSICO
                </div>
                <h2 id="fmm-welcome-modal-title" className="max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                  Welcome to FMM CLASSICO
                </h2>
                <p id="fmm-welcome-modal-description" className="mt-4 max-w-2xl text-sm leading-7 text-white/92 sm:text-base">
                  FMM CLASSICO is an online shopping platform for smartphones, phone accessories, electronics, home appliances, and lifestyle products.
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/84 sm:text-base">
                  Create an account or sign in to save your wishlist, track orders, view order history, manage account information, enjoy faster and more secure checkout, and access exclusive promotions.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {BENEFITS.map(({ icon: Icon, title, description }) => (
                    <div key={title} className="rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-3 text-sm font-extrabold text-white">{title}</p>
                      <p className="mt-1 text-xs leading-6 text-white/78 sm:text-sm">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2E86C1]">Get started</p>
                <h3 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Shop your way</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Continue with Google, sign in, create an account, or simply continue as a guest. Closing this message never blocks shopping.
                </p>

                <div className="mt-5 space-y-3">
                  <button
                    ref={firstActionRef}
                    type="button"
                    onClick={handleGoogle}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-[#2E86C1] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2578ae] focus:outline-none focus:ring-2 focus:ring-[#2E86C1]/50"
                  >
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Continue with Google
                  </button>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      to="/login"
                      onClick={() => persistDismissal(dontShowAgain)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => persistDismissal(dontShowAgain)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      Create Account
                    </Link>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-transparent bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    Continue as Guest
                  </button>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(event) => setDontShowAgain(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2E86C1] focus:ring-[#2E86C1]"
                  />
                  <span>Don't show again for 30 days</span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
