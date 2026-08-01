import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";

export default function AuthLayout({ title, subtitle, footer, children, backHref }) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);

  const handleBack = (event) => {
    if (event) event.preventDefault();
    if (backHref) {
      navigate(backHref);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1a4a6e 0%, #2E86C1 60%, #1a4a6e 100%)' }}>
      <div className="w-full max-w-md relative">
        {backHref && (
          <div className="absolute left-4 top-4 z-20">
            <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}

        <div className="absolute right-4 top-4 z-20" ref={helpRef}>
          <button
            type="button"
            onClick={() => setHelpOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-white/15"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-12 w-72 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-2xl">
              <p className="px-4 pt-1 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Help Center</p>
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                <p className="mb-1 font-semibold text-gray-700">Quick help</p>
                <p>Returns on eligible items, time-sensitive cancellations, and clear support channels are all covered below.</p>
              </div>

              <Link to="/Policies" onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                📄 Store Policies
              </Link>
              <Link to="/privacy-policy" onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                🔒 Privacy Policy
              </Link>
              <Link to="/terms-of-service" onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                📘 Terms of Service
              </Link>

              <div className="my-1 border-t" />

              <a
                href="mailto:fmmclassico@gmail.com?subject=FMM%20CLASSICO%20Support"
                className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50"
              >
                ✉️ Contact Us
              </a>
              <a
                href="https://wa.me/233208207543"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
              >
                💬 Live Support
              </a>
            </div>
          )}
        </div>

        <div className="mb-8 pt-10 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2 ring-1 ring-white/20">
                <img
                  src="/logo.png"
                  alt="FMM CLASSICO logo"
                  className="h-full w-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </span>
              <h1 className="text-4xl font-black tracking-tight text-white">
                FMM <span className="text-white">CLASSICO</span>
              </h1>
            </div>
            <p className="max-w-sm text-sm text-blue-100">
              Trusted shopping for phones, accessories, electronics, and home appliances.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-blue-100">{footer}</p>
        )}
      </div>
    </div>
  );
}
