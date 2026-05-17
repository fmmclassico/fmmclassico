import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

// Default slides — NO external image URLs.
// Images only come from what you upload in the admin panel (PromoBanner).
// If no image is uploaded, the slide shows the gradient background + text only.
const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: '🔥 New Arrivals',
    title: 'Phones & Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]',
    image_url: null,
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const timerRef = useRef(null);

  // Load admin-uploaded promo banners — these replace the defaults entirely
  useEffect(() => {
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(data => {
        if (data && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {
        // Network failed — keep showing default slides with no images (gradient only)
      });
  }, []);

  // Auto-advance
  const startTimer = (slideCount) => {
    clearInterval(timerRef.current);
    if (slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slideCount);
    }, 7000);
  };

  useEffect(() => {
    startTimer(slides.length);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const goTo = (index) => {
    setCurrent(index);
    startTimer(slides.length);
  };

  const prev = () => goTo((current - 1 + slides.length) % slides.length);
  const next = () => goTo((current + 1) % slides.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    setTouchStart(null);
  };

  const slide = slides[current] || DEFAULT_SLIDES[0];

  const ctaHref = slide.cta_link
    ? (slide.cta_link.startsWith('http') ? slide.cta_link : createPageUrl(slide.cta_link))
    : createPageUrl('Shop');

  const gradientClass = slide.bg_gradient && !slide.bg_gradient.startsWith('#')
    ? slide.bg_gradient
    : 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]';

  return (
    <div
      className={`relative bg-gradient-to-r ${gradientClass} overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 
        All slides are rendered in the DOM at all times.
        Only the active slide is visible (opacity 1).
        No AnimatePresence / framer-motion — that was causing the blank flash.
        Admin-uploaded images are shown; if image_url is null, just the gradient shows.
      */}
      <div className="relative min-h-[200px] md:min-h-[280px]">
        {slides.map((s, i) => {
          const isActive = i === current;
          const href = s.cta_link
            ? (s.cta_link.startsWith('http') ? s.cta_link : createPageUrl(s.cta_link))
            : createPageUrl('Shop');

          return (
            <div
              key={s.id}
              style={{
                position: i === 0 ? 'relative' : 'absolute',
                top: 0, left: 0, right: 0,
                // Fade IN only — never fade out (avoids blank white flash)
                opacity: isActive ? 1 : 0,
                transition: isActive ? 'opacity 0.35s ease' : 'none',
                pointerEvents: isActive ? 'auto' : 'none',
                zIndex: isActive ? 1 : 0,
              }}
            >
              <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-between gap-4">
                {/* Text side */}
                <div className="flex-1 max-w-md">
                  {s.badge && (
                    <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                      {s.badge}
                    </span>
                  )}
                  <h1 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">
                    {s.title}
                  </h1>
                  {s.subtitle && (
                    <p className="text-sm md:text-base text-white/90 mb-4 hidden md:block">
                      {s.subtitle}
                    </p>
                  )}
                  <Link to={href}>
                    <Button size="sm" className="bg-white font-bold shadow-lg text-sm" style={{ color: '#0093A6' }}>
                      {s.cta_text || 'Shop Now'} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Image side — only shown if admin uploaded an image */}
                {s.image_url ? (
                  <div className="w-32 h-32 md:w-56 md:h-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-white/10">
                    {/* Show gradient placeholder until image loads */}
                    {!loadedImages[s.id] && (
                      <div className="w-full h-full bg-white/10 animate-pulse rounded-2xl" />
                    )}
                    <img
                      src={s.image_url}
                      alt={s.title}
                      fetchpriority={i === 0 ? 'high' : 'low'}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      onLoad={() => setLoadedImages(prev => ({ ...prev, [s.id]: true }))}
                      onError={(e) => {
                        // If image fails to load, hide it gracefully — no broken icon
                        e.target.style.display = 'none';
                      }}
                      style={{ display: loadedImages[s.id] ? 'block' : 'none' }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null /* No image_url = no image box at all, gradient fills the space */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot navigation */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
