import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    id: 1,
    badge: '🔥 New Arrivals',
    title: 'Premium Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg: 'from-orange-600 via-orange-500 to-amber-400',
    image: 'https://i.pinimg.com/1200x/99/64/a2/9964a202c67115b1f40714082848c312.jpg',
    link: createPageUrl('Shop?category=phones'),
    cta: 'Shop Now',
  },
  {
    id: 2,
    badge: '⚡ Best Deals',
    title: 'Electronic Appliances',
    subtitle: 'Top quality electronics for your everyday needs',
    bg: 'from-blue-600 via-blue-500 to-indigo-400',
    image: 'https://m.media-amazon.com/images/I/519qw7On-vL.jpg',
    link: createPageUrl('Shop?category=electronic_appliances'),
    cta: 'Shop Now',
  },
  {
    id: 3,
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg: 'from-green-600 via-emerald-500 to-teal-400',
    image: 'https://i.pinimg.com/1200x/60/53/2f/60532f215514eb6e5068ec232e1428c1.jpg',
    link: createPageUrl('Shop?category=home_appliances'),
    cta: 'Shop Now',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent(prev => (prev - 1 + slides.length) % slides.length);
  const next = () => setCurrent(prev => (prev + 1) % slides.length);
  const slide = slides[current];

  return (
    <div className={`relative bg-gradient-to-r ${slide.bg} overflow-hidden transition-all duration-700`}>
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
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                {slide.badge}
              </span>
              <h1 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">
                {slide.title}
              </h1>
              <p className="text-sm md:text-base text-white/90 mb-4 hidden md:block">
                {slide.subtitle}
              </p>
              <Link to={slide.link}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg text-sm">
                  {slide.cta} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="w-32 h-32 md:w-56 md:h-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl">
              <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Arrows */}
      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-all">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-1.5 transition-all">
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all ${i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}