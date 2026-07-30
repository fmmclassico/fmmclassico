import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgePercent, Heart, ReceiptText, ShieldCheck, Truck, UserCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/lib/utils";

const DISMISS_KEY = "fmm_guest_welcome_modal_dismissed_at";
const SIXTY_DAYS_IN_MS = 60 * 24 * 60 * 60 * 1000;

const BENEFITS = [
  { label: "Save wishlist", icon: Heart },
  { label: "Track orders", icon: Truck },
  { label: "View order history", icon: ReceiptText },
  { label: "Manage account information", icon: UserCircle2 },
  { label: "Faster and more secure checkout", icon: ShieldCheck },
  { label: "Access exclusive promotions", icon: BadgePercent },
];

function shouldDisplayWelcomeModal() {
  if (typeof window === "undefined") return false;
  const storedValue = window.localStorage.getItem(DISMISS_KEY);
  if (!storedValue) return true;
  const dismissedAt = Number(storedValue);
  if (!Number.isFinite(dismissedAt)) return true;
  return Date.now() - dismissedAt >= SIXTY_DAYS_IN_MS;
}

export default function GuestWelcomeModal() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthenticated) {
      setOpen(false);
      return;
    }

    const isHomepage = window.location.pathname === "/";
    if (isHomepage && shouldDisplayWelcomeModal()) {
      setOpen(true);
    }
  }, [isAuthenticated]);

  const dismissModal = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setOpen(false);
  }, []);

  const actionBaseClass = useMemo(
    () => "h-12 w-full rounded-xl text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5",
    []
  );

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: "select_account" },
      },
    });
  };

  const goTo = (path) => {
    setOpen(false);
    navigate(path);
  };

  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismissModal(); }}>
      <DialogContent
        aria-describedby="fmm-welcome-modal-description"
        className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[880px] overflow-y-auto rounded-[28px] border-0 bg-white p-0 shadow-[0_24px_80px_rgba(3,20,63,0.28)]"
      >
        <div className="relative overflow-hidden rounded-[28px]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#03143f] via-[#0b2a63] to-[#2E86C1]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,195,255,0.18),transparent_25%)]" />

          <div className="relative z-10 grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="px-5 pb-6 pt-8 text-white sm:px-8 sm:pb-8 sm:pt-10">
              <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <img src="/logo.png" alt="FMM CLASSICO logo" className="h-10 w-10 rounded-full border border-white/20 object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">Guest welcome</span>
              </div>

              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Welcome to FMM CLASSICO
                </DialogTitle>
                <DialogDescription id="fmm-welcome-modal-description" className="max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                  FMM CLASSICO is an online shopping platform for smartphones, phone accessories, electronics, home appliances, and lifestyle products. You can keep shopping as a guest, or create an account for a smoother experience.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {BENEFITS.map(({ label, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-white/14 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <Icon className="mb-2 h-4 w-4 text-[#8dc3ff]" />
                    <p className="text-sm font-semibold leading-6 text-white/95">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative border-t border-white/10 bg-white/96 px-5 py-6 sm:px-8 sm:py-8 lg:border-l lg:border-t-0">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <h3 className="text-base font-bold text-[#0A2E60]">Choose how you want to continue</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Signing in keeps your wishlist, orders, profile details, and exclusive promotions connected across devices. Guests can still browse and shop without interruption.
                </p>

                <div className="mt-5 space-y-3">
                  <Button type="button" className={`${actionBaseClass} bg-[#0A2E60] text-white hover:bg-[#082752]`} onClick={handleGoogle}>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Continue with Google
                  </Button>

                  <Button type="button" variant="outline" className={`${actionBaseClass} border-[#2E86C1] text-[#2E86C1] hover:bg-[#2E86C1]/5`} onClick={() => goTo(createPageUrl('Login'))}>
                    Sign In
                  </Button>

                  <Button type="button" variant="outline" className={`${actionBaseClass} border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => goTo(createPageUrl('Register'))}>
                    Create Account
                  </Button>

                  <Button type="button" variant="ghost" className="h-12 w-full rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100" onClick={dismissModal}>
                    Continue as Guest
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Closing this message never blocks shopping. It will stay hidden in this browser for 60 days after dismissal.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
