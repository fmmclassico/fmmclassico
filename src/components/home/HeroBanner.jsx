import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Inline SVG illustrations for each banner
const PhoneSVG = () => (
  <svg viewBox="0 0 200 320" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Phone body */}
    <rect x="30" y="10" width="140" height="300" rx="20" fill="#1a1a2e" stroke="#3a3a5e" strokeWidth="2"/>
    {/* Screen */}
    <rect x="38" y="35" width="124" height="250" rx="4" fill="#0f3460"/>
    {/* Screen content - gradient */}
    <defs>
      <linearGradient id="screenGrad" x1="38" y1="35" x2="162" y2="285" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1a73e8"/>
        <stop offset="100%" stopColor="#0d47a1"/>
      </linearGradient>
    </defs>
    <rect x="38" y="35" width="124" height="250" rx="4" fill="url(#screenGrad)"/>
    {/* App icons on screen */}
    <rect x="50" y="55" width="24" height="24" rx="6" fill="#4fc3f7" opacity="0.9"/>
    <rect x="82" y="55" width="24" height="24" rx="6" fill="#81c784" opacity="0.9"/>
    <rect x="114" y="55" width="24" height="24" rx="6" fill="#ffb74d" opacity="0.9"/>
    <rect x="146" y="55" width="0" height="24" rx="6" fill="#e57373" opacity="0.9"/>
    {/* Camera notch */}
    <rect x="80" y="15" width="40" height="14" rx="7" fill="#0d0d1a"/>
    <circle cx="100" cy="22" r="4" fill="#2a2a4a"/>
    {/* Home indicator */}
    <rect x="75" y="295" width="50" height="4" rx="2" fill="#3a3a5e"/>
    {/* Decorative screen elements */}
    <rect x="50" y="100" width="100" height="60" rx="8" fill="white" opacity="0.1"/>
    <rect x="50" y="175" width="100" height="40" rx="8" fill="white" opacity="0.08"/>
    <rect x="50" y="230" width="60" height="30" rx="6" fill="#4fc3f7" opacity="0.3"/>
    {/* Shine effect */}
    <rect x="30" y="10" width="40" height="300" rx="20" fill="white" opacity="0.03"/>
  </svg>
);

const AccessoriesSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Earphone case */}
    <ellipse cx="100" cy="110" rx="55" ry="60" fill="#e8f4fd"/>
    {/* Left earphone */}
    <path d="M70 85 C60 75, 50 80, 50 95 C50 110, 60 115, 70 110 Z" fill="white" stroke="#90caf9" strokeWidth="2"/>
    <circle cx="65" cy="95" r="8" fill="#2196f3"/>
    <path d="M65 103 C65 103, 60 130, 65 145" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    {/* Right earphone */}
    <path d="M130 85 C140 75, 150 80, 150 95 C150 110, 140 115, 130 110 Z" fill="white" stroke="#90caf9" strokeWidth="2"/>
    <circle cx="135" cy="95" r="8" fill="#2196f3"/>
    <path d="M135 103 C135 103, 140 130, 135 145" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    {/* Charger cable */}
    <rect x="90" y="150" width="20" height="8" rx="4" fill="#64b5f6"/>
    <path d="M100 158 L100 180" stroke="#64b5f6" strokeWidth="3" strokeLinecap="round"/>
    {/* Lightning bolt icon */}
    <path d="M98 165 L95 172 L99 172 L97 180" stroke="#ffd54f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ElectronicsSVG = () => (
  <svg viewBox="0 0 240 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* TV/Monitor */}
    <rect x="30" y="20" width="180" height="120" rx="8" fill="#1a1a2e"/>
    <rect x="38" y="28" width="164" height="104" rx="4" fill="#0d47a1"/>
    {/* Screen gradient */}
    <defs>
      <linearGradient id="tvScreen" x1="38" y1="28" x2="202" y2="132" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1565c0"/>
        <stop offset="50%" stopColor="#0d47a1"/>
        <stop offset="100%" stopColor="#002171"/>
      </linearGradient>
    </defs>
    <rect x="38" y="28" width="164" height="104" rx="4" fill="url(#tvScreen)"/>
    {/* Screen content */}
    <circle cx="120" cy="75" r="25" fill="white" opacity="0.1"/>
    <polygon points="112,65 112,85 135,75" fill="white" opacity="0.3"/>
    {/* TV Stand */}
    <rect x="95" y="140" width="50" height="8" rx="2" fill="#2a2a4a"/>
    <rect x="80" y="148" width="80" height="6" rx="3" fill="#1a1a2e"/>
    {/* Brand dot */}
    <circle cx="120" cy="136" r="3" fill="#4fc3f7"/>
  </svg>
);

const HomeAppliancesSVG = () => (
  <svg viewBox="0 0 200 220" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Refrigerator */}
    <rect x="55" y="20" width="90" height="180" rx="8" fill="#e3f2fd"/>
    <rect x="55" y="20" width="90" height="180" rx="8" stroke="#90caf9" strokeWidth="2"/>
    {/* Top door (freezer) */}
    <rect x="60" y="25" width="80" height="55" rx="4" fill="white"/>
    <line x1="60" y1="80" x2="140" y2="80" stroke="#bbdefb" strokeWidth="1.5"/>
    {/* Bottom door (fridge) */}
    <rect x="60" y="85" width="80" height="110" rx="4" fill="white"/>
    {/* Handles */}
    <rect x="130" y="45" width="4" height="20" rx="2" fill="#90caf9"/>
    <rect x="130" y="120" width="4" height="30" rx="2" fill="#90caf9"/>
    {/* Temperature display */}
    <rect x="75" y="35" width="30" height="12" rx="3" fill="#e3f2fd"/>
    <text x="82" y="45" fontSize="8" fill="#1565c0" fontFamily="monospace">-18°</text>
    {/* Water dispenser */}
    <rect x="75" y="130" width="25" height="20" rx="4" fill="#e3f2fd"/>
    <circle cx="87" cy="140" r="5" fill="#bbdefb"/>
  </svg>
);

const BrandsSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Samsung Galaxy shape */}
    <rect x="60" y="30" width="80" height="140" rx="16" fill="#1a1a2e" stroke="#3a3a5e" strokeWidth="2"/>
    <rect x="67" y="50" width="66" height="100" rx="3" fill="#0d47a1"/>
    {/* Apple logo shape */}
    <path d="M100 55 C95 48, 85 50, 85 60 C85 72, 100 80, 100 80 C100 80, 115 72, 115 60 C115 50, 105 48, 100 55" fill="white" opacity="0.3"/>
    {/* Stars around */}
    <circle cx="40" cy="60" r="4" fill="#ffd54f" opacity="0.6"/>
    <circle cx="160" cy="80" r="3" fill="#4fc3f7" opacity="0.6"/>
    <circle cx="45" cy="150" r="3" fill="#81c784" opacity="0.6"/>
    <circle cx="155" cy="140" r="4" fill="#e57373" opacity="0.6"/>
    {/* Sparkle */}
    <path d="M150 40 L152 45 L157 47 L152 49 L150 54 L148 49 L143 47 L148 45 Z" fill="#ffd54f" opacity="0.7"/>
  </svg>
);

const EarphonesSVG = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Headphone band */}
    <path d="M50 120 C50 60, 150 60, 150 120" stroke="#1a1a2e" strokeWidth="8" strokeLinecap="round" fill="none"/>
    {/* Left ear cup */}
    <ellipse cx="50" cy="125" rx="22" ry="28" fill="#1a1a2e"/>
    <ellipse cx="50" cy="125" rx="15" ry="20" fill="#0d47a1"/>
    <ellipse cx="50" cy="125" rx="8" ry="10" fill="#1565c0"/>
    {/* Right ear cup */}
    <ellipse cx="150" cy="125" rx="22" ry="28" fill="#1a1a2e"/>
    <ellipse cx="150" cy="125" rx="15" ry="20" fill="#0d47a1"/>
    <ellipse cx="150" cy="125" rx="8" ry="10" fill="#1565c0"/>
    {/* Sound waves */}
    <path d="M170 105 C178 115, 178 135, 170 145" stroke="#4fc3f7" strokeWidth="2" opacity="0.5" fill="none"/>
    <path d="M178 100 C188 113, 188 137, 178 150" stroke="#4fc3f7" strokeWidth="2" opacity="0.3" fill="none"/>
    {/* Music note */}
    <circle cx="100" cy="170" r="6" fill="#ffd54f" opacity="0.6"/>
    <line x1="106" y1="170" x2="106" y2="155" stroke="#ffd54f" strokeWidth="2" opacity="0.6"/>
    <path d="M106 155 C106 155, 114 152, 114 158" stroke="#ffd54f" strokeWidth="2" opacity="0.6" fill="none"/>
  </svg>
);

const SmartWatchSVG = () => (
  <svg viewBox="0 0 200 240" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Watch band top */}
    <rect x="75" y="10" width="50" height="50" rx="6" fill="#263238"/>
    <rect x="80" y="15" width="40" height="40" rx="4" fill="#37474f"/>
    {/* Watch body */}
    <rect x="60" y="60" width="80" height="100" rx="18" fill="#1a1a2e" stroke="#3a3a5e" strokeWidth="2"/>
    {/* Watch screen */}
    <rect x="68" y="72" width="64" height="76" rx="12" fill="#0d47a1"/>
    {/* Watch face content */}
    <text x="80" y="105" fontSize="18" fill="white" fontFamily="monospace" fontWeight="bold">12:45</text>
    <text x="85" y="120" fontSize="8" fill="#90caf9" fontFamily="sans-serif">Thu, Jul 30</text>
    {/* Heart rate */}
    <circle cx="85" cy="135" r="5" fill="#e57373" opacity="0.7"/>
    <text x="93" y="138" fontSize="8" fill="white" opacity="0.8">72</text>
    {/* Steps icon */}
    <circle cx="115" cy="135" r="5" fill="#81c784" opacity="0.7"/>
    <text x="108" y="148" fontSize="6" fill="#81c784" opacity="0.6">5.2k</text>
    {/* Watch band bottom */}
    <rect x="75" y="160" width="50" height="50" rx="6" fill="#263238"/>
    <rect x="80" y="165" width="40" height="40" rx="4" fill="#37474f"/>
    {/* Side button */}
    <rect x="140" y="95" width="6" height="15" rx="3" fill="#3a3a5e"/>
  </svg>
);

// Map slide id to its SVG illustration
const SLIDE_ILLUSTRATIONS = {
  'default-1': PhoneSVG,
  'default-1b': AccessoriesSVG,
  'default-2': ElectronicsSVG,
  'default-3': HomeAppliancesSVG,
  'default-4': BrandsSVG,
  'default-5': EarphonesSVG,
  'default-6': SmartWatchSVG,
};

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: '🔥 New Arrivals',
    title: 'Phones',
    subtitle: 'Samsung, iPhones & more at unbeatable prices',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    cta_link: createPageUrl('Categories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent(p => (p - 1 + slides.length) % slides.length);
  const next = () => setCurrent(p => (p + 1) % slides.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    setTouchStart(null);
  };

  const slide = slides[current % slides.length];
  const IllustrationComponent = SLIDE_ILLUSTRATIONS[slide.id] || PhoneSVG;

  const ctaHref = (() => {
    const link = slide.cta_link;
    if (!link) return createPageUrl('Shop');
    if (link.startsWith('http')) return link;
    if (link.startsWith('/')) return link;
    return '/' + link;
  })();

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden mx-auto"
      style={{ background: 'linear-gradient(135deg, #031725 0%, #0A2E60 50%, #102C54 100%)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4 }}
          className="flex items-center min-h-[220px] md:min-h-[300px] px-5 md:px-8 py-6"
        >
          {/* Text content - left side */}
          <div className="flex-1 z-10">
            {slide.badge && (
              <span className="inline-block text-xs font-bold bg-white/15 backdrop-blur text-white px-3 py-1 rounded-full mb-3">
                {slide.badge}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-sm md:text-base text-blue-100/90 mb-4 max-w-[280px]">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref}>
              <Button size="sm" className="bg-white text-[#0A2E60] font-bold hover:bg-blue-50 rounded-full px-5 gap-1">
                {slide.cta_text || 'Shop Now'} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Illustration - right side (inline SVG, no loading) */}
          <div className="flex-shrink-0 w-[120px] h-[160px] md:w-[160px] md:h-[200px] flex items-center justify-center opacity-90">
            <IllustrationComponent />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
