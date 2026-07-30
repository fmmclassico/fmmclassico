import React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const VARIANT_STYLES = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-900",
    body: "text-emerald-800",
    icon: CheckCircle2,
  },
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-900",
    body: "text-red-800",
    icon: AlertCircle,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-900",
    body: "text-amber-800",
    icon: TriangleAlert,
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-900",
    body: "text-blue-800",
    icon: Info,
  },
};

export default function InlineNotice({ variant = "info", title, message, onDismiss, className = "" }) {
  if (!message) return null;

  const config = VARIANT_STYLES[variant] || VARIANT_STYLES.info;
  const Icon = config.icon;

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-2xl border px-4 py-3 shadow-sm ${config.wrapper} ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          <p className={`text-sm leading-6 ${config.body}`}>{message}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 transition hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current/20"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
