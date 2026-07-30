import React from 'react';
import { Smartphone, Headphones, Tv, Home as HomeIcon, ShoppingBag, Sparkles } from 'lucide-react';

const categories = [
  { icon: Smartphone, label: 'Smartphones' },
  { icon: Headphones, label: 'Phone Accessories' },
  { icon: Tv, label: 'Electronics' },
  { icon: HomeIcon, label: 'Home Appliances' },
  { icon: Sparkles, label: 'Lifestyle Products' },
];

export default function AboutSection() {
  return (
    <section
      aria-labelledby="about-fmm-heading"
      className="relative w-full overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#031725] via-[#0A2E60] to-[#102C54]" />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <h2
            id="about-fmm-heading"
            className="text-xl sm:text-2xl lg:text-[1.7rem] font-bold text-white tracking-tight"
          >
            About FMM CLASSICO
          </h2>
        </div>

        {/* Description */}
        <p className="text-center text-white/85 text-sm sm:text-base lg:text-[1.05rem] leading-relaxed max-w-2xl mx-auto mb-7">
          FMM CLASSICO is your trusted online shopping destination for premium smartphones, phone accessories, electronics, home appliances, and lifestyle products. We deliver quality products at great prices across Ghana.
        </p>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {categories.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white/90 text-xs sm:text-sm font-medium"
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2E86C1]" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
