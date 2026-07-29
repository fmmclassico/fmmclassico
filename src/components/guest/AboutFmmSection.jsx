import React from 'react';
import { ShieldCheck, Heart, PackageSearch, UserCog, BadgePercent, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  { icon: Heart, title: 'Save wishlist' },
  { icon: PackageSearch, title: 'Track orders' },
  { icon: CheckCircle2, title: 'View order history' },
  { icon: UserCog, title: 'Manage account information' },
  { icon: ShieldCheck, title: 'Faster and more secure checkout' },
  { icon: BadgePercent, title: 'Access exclusive promotions' },
];

export default function AboutFmmSection() {
  return (
    <section className="mx-2 mt-3 md:mx-4">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#03143f] via-[#0b2a63] to-[#2E86C1] shadow-[0_18px_60px_rgba(8,27,68,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-5 py-6 text-white sm:px-7 sm:py-8 lg:px-8 lg:py-9">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/88">
              About FMM CLASSICO
            </div>
            <h2 className="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-[2.2rem]">
              Premium shopping for phones, accessories, electronics, home appliances, and lifestyle essentials.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/90 sm:text-base">
              FMM CLASSICO is an online shopping platform built for customers who want quality products, elegant service, and a smooth buying experience. Visitors can explore the store freely, while account access helps unlock a more personalised and secure shopping journey.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
              Create an account or sign in to save your wishlist, track orders, review past purchases, manage your details, and enjoy faster checkout with access to exclusive promotions.
            </p>
          </div>

          <div className="grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title }) => (
              <div key={title} className="bg-white/8 px-4 py-5 text-white backdrop-blur-[1px] sm:px-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-extrabold leading-6 text-white">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
