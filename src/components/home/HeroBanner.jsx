import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SLIDES = [
  {
    id: 'default-1',
    badge: '🔥 New Arrivals',
    title: 'Premium Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: 'from-orange-600 via-orange-500 to-amber-400',
    image_url: 'https://i.pinimg.com/1200x/99/64/a2/9964a202c67115b1f40714082848c312.jpg',
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: 'from-blue-600 via-blue-500 to-indigo-400',
    image_url: 'https://m.media-amazon.com/images/I/519qw7On-vL.jpg',
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: 'from-gray-800 via-gray-700 to-gray-600',
    image_url: 'https://i.pinimg.com/1200x/60/53/2f/60532f215514eb6e5068ec232e1428c1.jpg',
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [touchStart, setTouchStart] = useState(null);

  useEffect(() => {
    // Load any active promo banners from admin
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(data => {
        if (data && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {}); // fallback to default slides on error
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
  const slide = slides[current] || DEFAULT_SLIDES[0];

  const ctaHref = slide.cta_link
    ? (slide.cta_link.startsWith('http') ? slide.cta_link : createPageUrl(slide.cta_link))
    : createPageUrl('Shop');

  return (
    <div
      className={`relative bg-gradient-to-r ${slide.bg_gradient || 'from-orange-600 via-orange-500 to-amber-400'} overflow-hidden transition-all duration-700`}
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
          <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              {slide.badge && (
                <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                  {slide.badge}
                </span>
              )}
              <h1 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-sm md:text-base text-white/90 mb-4 hidden md:block">
                  {slide.subtitle}
                </p>
              )}
              <Link to={ctaHref}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg text-sm">
                  {slide.cta_text || 'Shop Now'} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            {slide.image_url && (
              <div className="w-32 h-32 md:w-56 md:h-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl">
                <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
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