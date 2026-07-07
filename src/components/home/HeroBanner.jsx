import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
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

// Preload an image so it's cached before display
function preloadImage(url) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);
  const [imageLoaded, setImageLoaded] = useState({});

  useEffect(() => {
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(result => {
        const data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : null;
        if (data && data.length > 0) {
          setSlides(data);
          // Preload first 3 slide images for instant display
          data.slice(0, 3).forEach(s => preloadImage(s.image_url));
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

  // Preload next slide image
  useEffect(() => {
    const nextIndex = (current + 1) % slides.length;
    preloadImage(slides[nextIndex]?.image_url);
  }, [current, slides]);

  const prev = () => setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  const next = () => setCurrent(prev => (prev + 1) % slides.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
    setTouchStart(null);
  };

  const slide = slides.length > 0 ? slides[current % slides.length] : DEFAULT_SLIDES[0];

  useEffect(() => {
    if (slides.length > 0) {
      setCurrent(0);
    }
  }, [slides.length]);

  const ctaHref = (() => {
    const link = slide.cta_link;
    if (!link) return createPageUrl('Shop');
    if (link.startsWith('http')) return link;
    if (link.startsWith('/')) return link;
    return '/' + link;
  })();

  const handleImageLoad = (slideId) => {
    setImageLoaded(prev => ({ ...prev, [slideId]: true }));
  };

  return (
    <div
      className="relative w-full rounded-b-2xl overflow-hidden mx-auto"
      style={{ background: 'linear-gradient(90deg, #031725 0%, #0A2E60 50%, #102C54 100%)' }}
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
          className="flex items-center min-h-[200px] md:min-h-[280px]"
        >
          <div className="flex-1 px-5 py-6 md:px-10">
            {slide.badge && (
              <span className="inline-block bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-full mb-2 backdrop-blur-sm">
                {slide.badge}
              </span>
            )}
            <h2 className="text-white font-black text-xl md:text-3xl leading-tight drop-shadow-md">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-gray-200 text-xs md:text-sm mt-1.5 max-w-[200px] md:max-w-sm">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref}>
              <Button size="sm" className="mt-4 bg-white text-[#0A2E60] font-bold shadow-lg hover:bg-gray-100 rounded-full px-5">
                {slide.cta_text || 'Shop Now'} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {slide.image_url && (
            <div className="hidden sm:flex items-center justify-center w-[40%] pr-4">
              {/* Shimmer placeholder */}
              {!imageLoaded[slide.id] && (
                <div className="w-[180px] h-[180px] md:w-[240px] md:h-[240px] rounded-2xl bg-white/10 animate-pulse" />
              )}
              <img
                src={slide.image_url}
                alt={slide.title}
                loading={current === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={() => handleImageLoad(slide.id)}
                className={`object-contain max-h-[180px] md:max-h-[260px] drop-shadow-2xl transition-opacity duration-500 ${
                  imageLoaded[slide.id] ? 'opacity-100' : 'opacity-0 absolute'
                }`}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {Array.isArray(slides) && slides.length > 1 && (
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
