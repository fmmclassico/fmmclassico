import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ title, subtitle, footer, children, backHref }) {
  const navigate = useNavigate();

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

        <div className="mb-8 pt-10 text-center">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20 sm:h-9 sm:w-9 md:h-10 md:w-10">
                <img
                  src="/logo.png"
                  alt="FMM CLASSICO logo"
                  className="h-full w-auto object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                FMM <span className="text-white">CLASSICO</span>
              </h1>
            </div>
            <p className="max-w-sm text-sm text-blue-100">
              Your Trusted Destination For Quality Products
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
