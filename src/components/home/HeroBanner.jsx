import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function normalizeBannerLink(link) {
  if (!link || !String(link).trim()) return null;

  const safeLink = String(link).trim();

  if (safeLink.startsWith('http://') || safeLink.startsWith('https://')) {
    return safeLink;
  }

  if (safeLink.startsWith('/')) {
    return safeLink;
  }

  return createPageUrl(safeLink);
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const { data: promoBanners = [], isLoading } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: async () => {
      try {
        const result = await base44.entities.PromoBanner.list('order', 500);
        return normalizeQueryResult(result);
      } catch (error) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides = useMemo(() => {
    const safePromoBanners = Array.isArray(promoBanners) ? promoBanners : [];

    return safePromoBanners
      .filter((banner) => banner?.is_active !== false && banner?.image_url)
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
      .map((banner, index) => ({
        id: banner.id || `hero-flyer-${index}`,
        title: banner.title || `Hero Flyer ${index + 1}`,
        image_url: banner.image_url,
        href: normalizeBannerLink(banner.cta_link),
      }));
  }, [promoBanners]);

  useEffect(() => {
    if (current >= slides.length) {
      setCurrent(0);
    }
  }, [current, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = () => {
    if (slides.length <= 1) return;
    setCurrent((prevIndex) => (prevIndex - 1 + slides.length) % slides.length);
  };

  const next = () => {
    if (slides.length <= 1) return;
    setCurrent((prevIndex) => (prevIndex + 1) % slides.length);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null || slides.length <= 1) return;

    const diff = touchStart - e.changedTouches[0].clientX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }

    setTouchStart(null);
  };

  if (isLoading) {
    return (
      <div className="fmm-flyer-hero-shell">
        <div className="fmm-flyer-hero-frame fmm-flyer-hero-skeleton" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="fmm-flyer-hero-shell">
        <div className="fmm-flyer-hero-frame fmm-flyer-hero-empty" />
      </div>
    );
  }

  const slide = slides[current];
  const isExternal = slide.href && /^https?:\/\//i.test(slide.href);

  const FlyerContent = (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fmm-flyer-hero-slide"
        >
          <img
            src={slide.image_url}
            alt={slide.title}
            className="fmm-flyer-hero-image"
            loading="eager"
          />
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="fmm-flyer-hero-dots">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrent(index);
              }}
              className={`fmm-flyer-hero-dot ${index === current ? 'is-active' : ''}`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      className="fmm-flyer-hero-shell"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {slide.href ? (
        isExternal ? (
          <a
            href={slide.href}
            target="_blank"
            rel="noreferrer"
            className="fmm-flyer-hero-frame fmm-flyer-hero-link"
          >
            {FlyerContent}
          </a>
        ) : (
          <Link to={slide.href} className="fmm-flyer-hero-frame fmm-flyer-hero-link">
            {FlyerContent}
          </Link>
        )
      ) : (
        <div className="fmm-flyer-hero-frame">
          {FlyerContent}
        </div>
      )}
    </div>
  );
}
