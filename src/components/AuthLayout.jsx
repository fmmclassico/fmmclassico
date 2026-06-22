import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ title, subtitle, footer, children, backHref }) {
  const navigate = useNavigate();
  const handleBack = (e) => {
    if (e) e.preventDefault();
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
          <div className="absolute left-4 top-4">
            <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
        {/* Brand Header */}
        <div className="text-center mb-8 pt-10">
          <div className="inline-flex flex-col items-center">
            <h1 className="text-4xl font-black text-white tracking-tight mb-1">
              FMM <span className="text-white">CLASSICO</span>
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-blue-100 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}