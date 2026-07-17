import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
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
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784300190/ChatGPT_Image_Jul_17_2026_02_56_04_PM_wnvfi1.png',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784299259/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw.png,
    cta_link: createPageUrl('Categories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784300533/ChatGPT_Image_Jul_17_2026_03_01_53_PM_hne4gq.png',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '⚡ Best Deals',
    title: 'Electronic',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784301769/ChatGPT_Image_Jul_17_2026_03_20_50_PM_b8mhgl.png',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302250/ChatGPT_Image_Jul_17_2026_03_30_29_PM_jvrpnh.png',
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302646/ChatGPT_Image_Jul_17_2026_03_37_00_PM_xddojj.png',
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: NAVY_GRADIENT,
    image_url: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302040/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay.png',
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const slides = DEFAULT_SLIDES;

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);
  const next = () => setCurrent((p) => (p + 1) % slides.length);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }
    setTouchStart(null);
  };

  const slide = slides[current % slides.length];

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
      className="relative w-full overflow-hidden"
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
          className="fmm-stable-hero"
        >
          <div className="fmm-stable-hero-copy">
            {slide.badge && (
              <span className="fmm-stable-hero-badge">
                {slide.badge}
              </span>
            )}
            <h2 className="fmm-stable-hero-title">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="fmm-stable-hero-subtitle">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref} className="fmm-stable-hero-cta-wrap">
              <Button className="fmm-stable-hero-cta bg-white text-[#0A2E60] hover:bg-gray-100 font-semibold rounded-full">
                {slide.cta_text || 'Shop Now'} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {slide.image_url && (
            <div className="fmm-stable-hero-image-wrap">
              <img
                src={slide.image_url}
                alt={slide.title}
                className="fmm-stable-hero-image drop-shadow-2xl"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
              aria-label={`Go to hero slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
