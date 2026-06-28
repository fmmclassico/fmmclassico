import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

var PERMANENT_SLIDES = [
  { id: 'perm-1', badge: 'New Arrivals', title: 'Phones', subtitle: 'Samsung, iPhones & more at unbeatable prices', cta_link: '/Shop?category=phones', cta_text: 'Shop Now', image_url: '' },
  { id: 'perm-2', badge: 'Classico Deals', title: 'Phone Accessories', subtitle: 'Cases, chargers, earphones & more at great prices', cta_link: '/Shop?category=phone_cases', cta_text: 'Shop Now', image_url: '' },
  { id: 'perm-3', badge: 'Best Deals', title: 'Electronics', subtitle: 'Top quality electronics for your everyday needs', cta_link: '/Shop?category=electronic_appliances', cta_text: 'Shop Now', image_url: '' },
  { id: 'perm-4', badge: 'Home Deals', title: 'Home Appliances', subtitle: 'Quality home appliances delivered to your door', cta_link: '/Shop?category=home_appliances', cta_text: 'Shop Now', image_url: '' },
];

export default function HeroBanner() {
  var [current, setCurrent] = useState(0);
  var [adminSlides, setAdminSlides] = useState([]);
  var [touchStart, setTouchStart] = useState(null);

  useEffect(function() {
    base44.entities.PromoBanner.filter({ is_active: true }, 'order', 20)
      .then(function(result) {
        var data = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
        setAdminSlides(data);
      })
      .catch(function() { setAdminSlides([]); });
  }, []);

  // 4 permanent slides always show first, then admin slides after
  var slides = PERMANENT_SLIDES.concat(adminSlides);

  useEffect(function() {
    if (slides.length <= 1) return;
    var timer = setInterval(function() {
      setCurrent(function(prev) { return (prev + 1) % slides.length; });
    }, 7000);
    return function() { clearInterval(timer); };
  }, [slides.length]);

  var goToPrev = function() { setCurrent(function(prev) { return (prev - 1 + slides.length) % slides.length; }); };
  var goToNext = function() { setCurrent(function(prev) { return (prev + 1) % slides.length; }); };

  var handleTouchStart = function(e) { setTouchStart(e.touches[0].clientX); };
  var handleTouchEnd = function(e) {
    if (touchStart === null) return;
    var diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? goToNext() : goToPrev(); }
    setTouchStart(null);
  };

  var slide = slides[current % slides.length];

  var ctaHref = (function() {
    var link = slide.cta_link;
    if (!link) return '/Shop';
    if (link.startsWith('http')) return link;
    if (link.startsWith('/')) return link;
    return '/' + link;
  })();

  return (
    <div
      className="relative w-full overflow-hidden rounded-none md:rounded-2xl"
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
          <div className="flex-1 p-5 md:p-8 z-10">
            {slide.badge && (
              <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                {slide.badge}
              </span>
            )}
            <h2 className="text-white text-xl md:text-3xl font-black leading-tight mb-1">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className="text-white/80 text-xs md:text-sm mb-3 max-w-[240px]">
                {slide.subtitle}
              </p>
            )}
            <Link to={ctaHref}>
              <Button size="sm" className="bg-white text-[#0A2E60] hover:bg-gray-100 font-bold rounded-full px-4 text-xs">
                {slide.cta_text || 'Shop Now'} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {slide.image_url && (
            <div className="w-[140px] h-[160px] md:w-[200px] md:h-[220px] mr-4 md:mr-8 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg">
              <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map(function(_, i) {
            return (
              <button
                key={i}
                onClick={function() { setCurrent(i); }}
                className={i === current ? 'w-6 h-2 rounded-full bg-white transition-all' : 'w-2 h-2 rounded-full bg-white/50 transition-all'}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
