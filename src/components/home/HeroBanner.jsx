import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

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

// Duration of the crossfade in ms — keep in sync with the CSS transition below
const FADE_DURATION = 600;

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  // prev tracks the slide that is fading OUT so it stays visible during transition
  const [prev, setPrev] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);
  const [loadedImages, setLoadedImages] = useState({});
  const timerRef = useRef(null);
  const transitionRef = useRef(null);

  useEffect(() => {
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(data => {
        if (data && data.length > 0) setSlides(data);
      })
      .catch(() => {});
  }, []);

  const startTimer = (slideCount) => {
    clearInterval(timerRef.current);
    if (slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % slideCount);
    }, 7000);
  };

  // Smooth transition: record previous index, mark transitioning, then clear after duration
  const goTo = (nextIndex) => {
    if (transitioning || nextIndex === current) return;
    clearTimeout(transitionRef.current);
    setPrev(current);
    setTransitioning(true);
    setCurrent(nextIndex);
    startTimer(slides.length);
    transitionRef.current = setTimeout(() => {
      setPrev(null);
      setTransitioning(false);
    }, FADE_DURATION);
  };

  useEffect(() => {
    startTimer(slides.length);
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(transitionRef.current);
    };
  }, [slides.length]);

  // Auto-advance via goTo so the smooth transition is always used
  useEffect(() => {
    clearInterval(timerRef.current);
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      // Read current from ref to avoid stale closure
      setCurrent(c => {
        const next = (c + 1) % slides.length;
        setPrev(c);
        setTransitioning(true);
        clearTimeout(transitionRef.current);
        transitionRef.current = setTimeout(() => {
          setPrev(null);
          setTransitioning(false);
        }, FADE_DURATION);
        return next;
      });
    }, 7000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0
        ? goTo((current + 1) % slides.length)
        : goTo((current - 1 + slides.length) % slides.length);
    }
    setTouchStart(null);
  };

  const renderSlide = (s, role) => {
    // role: 'active' | 'leaving'
    const isActive = role === 'active';
    const href = s.cta_link
      ? (s.cta_link.startsWith('http') ? s.cta_link : createPageUrl(s.cta_link))
      : createPageUrl('Shop');

    return (
      <div
        key={`${s.id}-${role}`}
        style={{
          position: 'absolute',
          inset: 0,
          // Active slide fades in; leaving slide fades out simultaneously
          opacity: isActive ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          // Active slide sits on top during crossfade
          zIndex: isActive ? 2 : 1,
          pointerEvents: isActive ? 'auto' : 'none',
          willChange: 'opacity',
        }}
      >
        <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-between gap-4 h-full">
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

          {/* Image side */}
          {s.image_url ? (
            <div className="w-32 h-32 md:w-56 md:h-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-white/10">
              {!loadedImages[s.id] && (
                <div className="w-full h-full bg-white/10 animate-pulse rounded-2xl" />
              )}
              <img
                src={s.image_url}
                alt={s.title}
                fetchpriority={isActive ? 'high' : 'low'}
                loading={isActive ? 'eager' : 'lazy'}
                onLoad={() => setLoadedImages(p => ({ ...p, [s.id]: true }))}
                onError={(e) => { e.target.style.display = 'none'; }}
                style={{ display: loadedImages[s.id] ? 'block' : 'none' }}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const activeSlide = slides[current] || DEFAULT_SLIDES[0];
  const leavingSlide = prev !== null ? slides[prev] : null;

  const gradientClass = activeSlide.bg_gradient && !activeSlide.bg_gradient.startsWith('#')
    ? activeSlide.bg_gradient
    : 'from-[#00A3A6] via-[#0093A6] to-[#007a8a]';

  return (
    <div
      className={`relative bg-gradient-to-r ${gradientClass} overflow-hidden`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fixed-height stage so layout never reflows during transition */}
      <div className="relative min-h-[200px] md:min-h-[280px]">
        {/* Leaving slide stays rendered and fades out beneath the incoming one */}
        {leavingSlide && renderSlide(leavingSlide, 'leaving')}
        {/* Active slide fades in on top */}
        {renderSlide(activeSlide, 'active')}
      </div>

      {/* Dot navigation */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
