import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Heart, Package, Clock, Shield, Gift, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const STORAGE_KEY = 'fmm_welcome_dismissed';
const COOLDOWN_DAYS = 60;

// Pages where the modal should NEVER appear
const BLOCKED_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/checkout'];

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Determine if modal should show
  useEffect(() => {
    if (isLoadingAuth) return;
    if (isAuthenticated) return;
    if (BLOCKED_PATHS.some(path => location.pathname.toLowerCase().startsWith(path))) return;
    if (location.pathname !== '/' && location.pathname !== '') return;

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const dismissedDate = new Date(parseInt(dismissed, 10));
        const now = new Date();
        const daysSince = (now - dismissedDate) / (1000 * 60 * 60 * 24);
        if (daysSince < COOLDOWN_DAYS) return;
      }
    } catch (e) {
      return;
    }

    const timer = setTimeout(() => {
      previousFocusRef.current = document.activeElement;
      setIsOpen(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoadingAuth, location.pathname]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch (e) {}
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, []);

  // Escape key + focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismiss();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
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
  }, [isOpen, dismiss]);

  // Auto-focus close button when opened
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleGoogleSignIn = () => {
    dismiss();
    navigate('/login?provider=google');
  };

  const handleSignIn = () => {
    dismiss();
    navigate('/login');
  };

  const handleCreateAccount = () => {
    dismiss();
    navigate('/register');
  };

  const benefits = [
    { icon: Heart, text: 'Save wishlist' },
    { icon: Package, text: 'Track orders' },
    { icon: Clock, text: 'View order history' },
    { icon: User, text: 'Manage account information' },
    { icon: Shield, text: 'Faster and more secure checkout' },
    { icon: Gift, text: 'Access exclusive promotions' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
          onClick={dismiss}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-modal-title"
            aria-describedby="welcome-modal-desc"
            className="relative w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
          >
            {/* Header gradient bar */}
            <div className="h-2 w-full rounded-t-2xl bg-gradient-to-r from-[#031725] via-[#0A2E60] to-[#2E86C1]" />

            {/* Close button */}
            <button
              ref={closeButtonRef}
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:ring-offset-2"
              aria-label="Close welcome dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="px-6 pt-6 pb-8 sm:px-8">
              {/* Logo area */}
              <div className="flex items-center justify-center mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#031725] to-[#0A2E60] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-[#031725] tracking-tight">FMM CLASSICO</span>
                </div>
              </div>

              {/* Heading */}
              <h2
                id="welcome-modal-title"
                className="text-center text-2xl sm:text-[1.65rem] font-bold text-[#031725] mb-3 leading-tight"
              >
                Welcome to FMM CLASSICO
              </h2>

              {/* Description */}
              <p
                id="welcome-modal-desc"
                className="text-center text-sm sm:text-[0.94rem] text-gray-600 mb-6 leading-relaxed"
              >
                Your trusted online shopping platform for smartphones, phone accessories, electronics, home appliances, and lifestyle products.
              </p>

              {/* Benefits */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                  Why create an account?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benefits.map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <Icon className="w-4 h-4 text-[#2E86C1] flex-shrink-0" />
                      <span className="text-sm text-gray-700">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Continue with Google */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                  className="w-full px-4 py-3 rounded-xl bg-[#031725] hover:bg-[#0A2E60] text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E86C1] focus:ring-offset-2"
                >
                  Sign In
                </button>

                {/* Create Account */}
                <button
                  onClick={handleCreateAccount}
                  className="w-full px-4 py-3 rounded-xl bg-[#2E86C1] hover:bg-[#2578ae] text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#031725] focus:ring-offset-2"
                >
                  Create Account
                </button>

                {/* Continue as Guest */}
                <button
                  onClick={dismiss}
                  className="w-full px-4 py-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
