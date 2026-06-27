import React, { useState, useEffect } from 'react';
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
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&h=400&fit=crop',
    cta_link: createPageUrl('Categories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&h=400&fit=crop',
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&h=400&fit=crop',
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

  const NAVY_BACKGROUND = 'linear-gradient(90deg, #031725 0%, #0A2E60 50%, #102C54 100%)';

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-lg"
      style={{ background: NAVY_BACKGROUND }}
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
          <div className="flex-1 p-6 md:p-10 space-y-3">
            {slide.badge && (
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                {slide.badge}
              </span>
            )}
            <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-white/80 text-sm md:text-base max-w-md">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref}>
              <Button className="mt-2 bg-white text-[#0A2E60] hover:bg-gray-100 font-bold rounded-full px-6 py-2 text-sm">
                {slide.cta_text || 'Shop Now'} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {slide.image_url && (
            <div className="hidden sm:flex items-center justify-center w-1/3 pr-6">
              <img
                src={slide.image_url}
                alt={slide.title}
                className="max-h-[200px] md:max-h-[240px] object-contain drop-shadow-xl rounded-lg"
                onError={(e) => { e.target.style.display = 'none'; }}
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
