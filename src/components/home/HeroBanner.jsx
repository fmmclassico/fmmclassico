import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const NAVY_BACKGROUND = 'linear-gradient(90deg, #031725 0%, #0A2E60 50%, #102C54 100%)';

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: '🔥 New Arrivals',
    title: 'Phones',
    subtitle: 'Samsung, iPhones & more at unbeatable prices',
    image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1400&q=90',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1400&q=90',
    cta_link: createPageUrl('Categories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=90',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '⚡ Best Deals',
    title: 'Electronic',
    subtitle: 'Top quality electronics for your everyday needs',
    image_url: 'https://www.sencor.com/Sencor/media/content/Products/SLE32S700TCS-2.jpg?w=1200&q=90',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    image_url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=1400&q=90',
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&q=90',
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    image_url: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=1400&q=90',
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const slides = useMemo(() => DEFAULT_SLIDES, []);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [slides]);

  const prev = () => setCurrent((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  const next = () => setCurrent((prevIndex) => (prevIndex + 1) % slides.length);

  const handleTouchStart = (event) => setTouchStart(event.touches[0].clientX);

  const handleTouchEnd = (event) => {
    if (touchStart === null) return;

    const diff = touchStart - event.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }

    setTouchStart(null);
  };

  const slide = slides[current] ?? slides[0];

  const ctaHref = (() => {
    const link = slide?.cta_link;
    if (!link) return createPageUrl('Shop');
    if (link.startsWith('http') || link.startsWith('/')) return link;
    return `/${link}`;
  })();

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ background: NAVY_BACKGROUND }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fmm-stable-hero"
        >
          <div className="fmm-stable-hero-copy">
            {slide.badge && <span className="fmm-stable-hero-badge">{slide.badge}</span>}

            <h2 className="fmm-stable-hero-title">{slide.title}</h2>

            {slide.subtitle && <p className="fmm-stable-hero-subtitle">{slide.subtitle}</p>}

            <Link to={ctaHref} className="fmm-stable-hero-cta-wrap">
              <Button className="fmm-stable-hero-cta bg-white text-[#0A2E60] hover:bg-[#f4f7fb] font-semibold rounded-full">
                {slide.cta_text || 'Shop Now'}
              </Button>
            </Link>
          </div>

          {slide.image_url && (
            <div className="fmm-stable-hero-image-wrap">
              <div className="fmm-stable-hero-image-frame">
                <img
                  src={slide.image_url}
                  alt={slide.title}
                  className="fmm-stable-hero-image"
                />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Go to ${item.title} slide`}
              className={`rounded-full transition-all duration-300 ${
                index === current ? 'h-2.5 w-8 bg-white' : 'h-2.5 w-2.5 bg-white/45'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
