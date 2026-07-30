import React from "react";
import { Link } from "react-router-dom";
import { BadgePercent, Heart, ReceiptText, ShieldCheck, ShoppingBag, Truck, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/lib/utils";

const BENEFITS = [
  { label: "Save wishlist", icon: Heart },
  { label: "Track orders", icon: Truck },
  { label: "View order history", icon: ReceiptText },
  { label: "Manage account information", icon: UserCircle2 },
  { label: "Faster and more secure checkout", icon: ShieldCheck },
  { label: "Access exclusive promotions", icon: BadgePercent },
];

export default function AboutFmmClassicoSection({ showAccountActions = false }) {
  return (
    <section className="mx-2 mt-3 md:mx-4" aria-labelledby="about-fmm-classico-heading">
      <div className="overflow-hidden rounded-[28px] border border-[#0b3ea9]/10 bg-white shadow-[0_20px_50px_rgba(3,20,63,0.08)]">
        <div className="bg-gradient-to-r from-[#03143f] via-[#082a6f] to-[#2E86C1] px-4 py-4 text-white sm:px-6 sm:py-5 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <img src="/logo.png" alt="FMM CLASSICO logo" className="h-8 w-8 rounded-full border border-white/20 object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-white/85">About FMM CLASSICO</span>
              </div>
              <h2 id="about-fmm-classico-heading" className="text-2xl font-black tracking-tight sm:text-3xl">Welcome to FMM CLASSICO</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/88 sm:text-base">
                FMM CLASSICO is an online shopping platform for smartphones, phone accessories, electronics, home appliances, and lifestyle products. The section stays visible on the homepage so visitors can quickly understand the brand and search engines can index the core offer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:max-w-[360px]">
              {BENEFITS.map(({ label, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white/95 backdrop-blur-sm">
                  <Icon className="mb-2 h-4 w-4 text-[#8dc3ff]" />
                  <span className="block text-[12px] font-semibold leading-5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2E86C1]">Why customers keep using FMM CLASSICO</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[#0A2E60]">
                  <ShoppingBag className="h-4 w-4" />
                  <p className="text-sm font-bold">Everything in one place</p>
                </div>
                <p className="text-sm leading-6 text-slate-600">Browse genuine smartphones, accessories, electronics, home appliances, and everyday lifestyle products with a consistent shopping experience across phone, tablet, and desktop.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[#0A2E60]">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="text-sm font-bold">Better account benefits</p>
                </div>
                <p className="text-sm leading-6 text-slate-600">Creating an account lets customers save their wishlist, track orders, review order history, manage account details, enjoy faster checkout, and receive exclusive offers.</p>
              </div>
            </div>
          </div>

          {showAccountActions ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-bold text-[#0A2E60]">Ready to continue?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Guests can keep shopping freely, while account holders get saved progress and a smoother checkout flow.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link to={createPageUrl('Register')}>
                  <Button className="w-full rounded-xl bg-[#0A2E60] text-white hover:bg-[#082752]">Create Account</Button>
                </Link>
                <Link to={createPageUrl('Login')}>
                  <Button variant="outline" className="w-full rounded-xl border-[#2E86C1] text-[#2E86C1] hover:bg-[#2E86C1]/5">Sign In</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-bold text-[#0A2E60]">Designed for confident shopping</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">The homepage now keeps the brand story visible below the hero banner, making the landing experience clearer for both new visitors and returning customers.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
