import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAVY_GRADIENT = 'from-[#031725] via-[#0A2E60] to-[#102C54]';

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: '🔥 New Arrivals',
    title: 'Phones',
    subtitle: 'Samsung, iPhones & more at unbeatable prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Categories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: NAVY_GRADIENT,
    image_url: '',
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(result => {
        const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : null;
        if (data && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {});
  }, []);

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

  const slide = slides.length > 0 ? slides[current % slides.length] : DEFAULT_SLIDES[0];

  useEffect(() => {
    if (slides.length > 0) setCurrent(0);
  }, [slides.length]);

  const ctaHref = (() => {
    const link = slide.cta_link;
    if (!link) return createPageUrl('Shop');
    if (link.startsWith('http')) return link;
    if (link.startsWith('/')) return link;
    return '/' + link;
  })();

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ background: 'linear-gradient(90deg, #031725 0%, #0A2E60 50%, #102C54 100%)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-center w-full px-4 sm:px-6 lg:px-10 py-6 sm:py-8 md:py-10 lg:py-12"
          style={{ minHeight: 'clamp(180px, 28vw, 320px)' }}
        >
          {/* Text Content */}
          <div className="flex-1 flex flex-col justify-center items-start w-full sm:w-auto sm:pr-4 z-10">
            {slide.badge && (
              <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-white/15 text-white/90 backdrop-blur mb-3">
                {slide.badge}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-sm sm:text-base md:text-lg text-white/80 leading-relaxed mb-4 max-w-md">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref}>
              <Button
                size="sm"
                className="bg-white text-[#031725] hover:bg-gray-100 font-semibold rounded-full px-5 py-2 text-sm sm:text-base flex items-center gap-2 shadow-md"
              >
                {slide.cta_text || 'Shop Now'} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Image: never cropped, uses object-contain */}
          {slide.image_url && (
            <div className="flex-shrink-0 w-full sm:w-2/5 lg:w-[38%] mt-4 sm:mt-0 flex items-center justify-center">
              <img
                src={slide.image_url}
                alt={slide.title || 'Banner'}
                className="w-full max-h-[160px] sm:max-h-[200px] md:max-h-[240px] lg:max-h-[280px] object-contain drop-shadow-lg"
                loading="eager"
                draggable={false}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      {Array.isArray(slides) && slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
