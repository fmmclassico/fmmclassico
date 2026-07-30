import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Heart, Package, Clock, User, Zap, Gift, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

const STORAGE_KEY = 'fmm_welcome_modal_dismissed';
const EXPIRY_DAYS = 60;

// Pages where modal should NEVER appear
const BLOCKED_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/checkout'];

export default function GuestWelcomeModal() {
  const [visible, setVisible] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const firstFocusRef = useRef(null);
  const lastFocusRef = useRef(null);

  // Check if modal should show
  useEffect(() => {
    // Don't show while auth is loading
    if (isLoadingAuth) return;
    // Never show for authenticated users
    if (isAuthenticated) return;
    // Never show on blocked paths
    if (BLOCKED_PATHS.some(p => location.pathname.toLowerCase().startsWith(p))) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const dismissedAt = parseInt(stored, 10);
        const now = Date.now();
        const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        // If less than 60 days have passed, don't show
        if (now - dismissedAt < expiryMs) return;
      }
      // Show after a brief delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } catch (e) {
      // localStorage unavailable, don't show
    }
  }, [isAuthenticated, isLoadingAuth, location.pathname]);

  // Focus management
  useEffect(() => {
    if (visible) {
      previousFocusRef.current = document.activeElement;
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      // Focus the modal
      setTimeout(() => {
        if (firstFocusRef.current) firstFocusRef.current.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  // Escape key handler
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDismiss();
        return;
      }
      // Focus trapping
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch (e) {}
  }, []);

  const handleGoogleSignIn = async () => {
    handleDismiss();
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (e) {
      console.error('Google sign-in failed:', e);
    }
  };

  const handleSignIn = () => {
    handleDismiss();
    navigate('/login');
  };

  const handleCreateAccount = () => {
    handleDismiss();
    navigate('/register');
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6"
      role="presentation"
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.3s ease-out' }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        aria-describedby="welcome-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-[420px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        style={{
          animation: 'modalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button */}
        <button
          ref={firstFocusRef}
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Close welcome modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-[#031725] via-[#0A2E60] to-[#2E86C1] px-5 sm:px-6 pt-8 pb-6 text-center rounded-t-2xl">
          {/* Logo */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
            <ShoppingBag className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2
            id="welcome-modal-title"
            className="text-lg sm:text-xl font-bold text-white leading-tight"
          >
            Welcome to FMM CLASSICO
          </h2>
          <p
            id="welcome-modal-desc"
            className="text-xs sm:text-sm text-blue-100/90 mt-2 leading-relaxed max-w-[320px] mx-auto"
          >
            Your trusted online store for smartphones, phone accessories, electronics, home appliances & lifestyle products in Ghana.
          </p>
        </div>

        {/* Benefits section */}
        <div className="px-5 sm:px-6 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Create an account to:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BenefitChip icon={<Heart className="w-3.5 h-3.5 text-pink-500" />} text="Save wishlist" />
            <BenefitChip icon={<Package className="w-3.5 h-3.5 text-blue-500" />} text="Track orders" />
            <BenefitChip icon={<Clock className="w-3.5 h-3.5 text-green-500" />} text="Order history" />
            <BenefitChip icon={<User className="w-3.5 h-3.5 text-purple-500" />} text="Manage account" />
            <BenefitChip icon={<Zap className="w-3.5 h-3.5 text-orange-500" />} text="Faster checkout" />
            <BenefitChip icon={<Gift className="w-3.5 h-3.5 text-red-500" />} text="Exclusive promos" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-5 sm:px-6 pb-5 space-y-2.5">
          {/* Continue with Google */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 sm:py-3 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Sign In */}
          <button
            onClick={handleSignIn}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-[#0A2E60] to-[#2E86C1] text-white text-sm font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            Sign In
          </button>

          {/* Create Account */}
          <button
            onClick={handleCreateAccount}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl border-2 border-[#0A2E60] text-[#0A2E60] text-sm font-semibold hover:bg-[#0A2E60]/5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            Create Account
          </button>

          {/* Continue as Guest */}
          <button
            ref={lastFocusRef}
            onClick={handleDismiss}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl text-gray-500 text-sm font-medium hover:text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Continue as Guest
          </button>
        </div>
      </div>

      {/* CSS Animations (injected once) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

function BenefitChip({ icon, text }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
      {icon}
      <span className="text-[11px] sm:text-xs font-medium text-gray-700">{text}</span>
    </div>
  );
}
