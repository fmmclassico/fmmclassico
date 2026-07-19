import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../../utils';

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

const MAIN_CATEGORY_ROUTES = {
  phones: '/phones',
  'phone accessories': '/phone-accessories',
  'phone-accessories': '/phone-accessories',
  phone_accessories: '/phone-accessories',
  electronics: '/electronics',
  'home appliances': '/home-appliances',
  'home-appliances': '/home-appliances',
  home_appliances: '/home-appliances',
};

const SHOP_CATEGORY_TO_MAIN_ROUTE = {
  phones: '/phones',
  phone_cases: '/phone-accessories',
  chargers: '/phone-accessories',
  earphones: '/phone-accessories',
  cables: '/phone-accessories',
  power_banks: '/phone-accessories',
  screen_protectors: '/phone-accessories',
  holders: '/phone-accessories',
  speakers: '/phone-accessories',
  smart_watches: '/electronics',
  electronic_appliances: '/electronics',
  home_appliances: '/home-appliances',
};

function normalizeBannerLink(link) {
  if (!link || !String(link).trim()) return null;

  const safeLink = String(link).trim();

  if (safeLink.startsWith('http://') || safeLink.startsWith('https://')) return safeLink;

  const withoutLeadingSlash = safeLink.replace(/^\//, '');
  const lowerLink = withoutLeadingSlash.toLowerCase();

  if (lowerLink.startsWith('shop?category=')) {
    const params = new URLSearchParams(withoutLeadingSlash.split('?')[1] || '');
    const category = String(params.get('category') || '').replace(/^\//, '');
    const mappedRoute = SHOP_CATEGORY_TO_MAIN_ROUTE[category];
    if (mappedRoute && !params.get('sub')) return mappedRoute;
    return safeLink.startsWith('/') ? safeLink : `/${withoutLeadingSlash}`;
  }

  if (MAIN_CATEGORY_ROUTES[lowerLink]) return MAIN_CATEGORY_ROUTES[lowerLink];
  if (safeLink.startsWith('/')) return safeLink;
  return createPageUrl(safeLink);
}

function pickHeroImage(slide, isMobile) {
  if (isMobile) return slide.mobile_image_url || slide.image_url || slide.desktop_image_url || '';
  return slide.desktop_image_url || slide.image_url || slide.mobile_image_url || '';
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const { data: promoBanners = [], isLoading } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: async () => {
      try {
        const result = await base44.entities.PromoBanner.list('order', 500);
        return normalizeQueryResult(result);
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slides = useMemo(() => {
    return (Array.isArray(promoBanners) ? promoBanners : [])
      .filter((banner) => banner?.is_active !== false && (banner?.desktop_image_url || banner?.mobile_image_url || banner?.image_url))
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
      .map((banner, index) => ({
        id: banner.id || `hero-flyer-${index}`,
        title: banner.title || `Hero Flyer ${index + 1}`,
        image_url: banner.image_url || '',
        desktop_image_url: banner.desktop_image_url || '',
        mobile_image_url: banner.mobile_image_url || '',
        href: normalizeBannerLink(banner.cta_link),
      }));
  }, [promoBanners]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
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

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
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
    return <div className="fmm-flyer-hero-shell"><div className="fmm-flyer-hero-frame fmm-flyer-hero-skeleton" /></div>;
  }

  if (slides.length === 0) {
    return <div className="fmm-flyer-hero-shell"><div className="fmm-flyer-hero-frame fmm-flyer-hero-empty" /></div>;
  }

  const slide = slides[current];
  const imageSrc = pickHeroImage(slide, isMobile);
  const isExternal = slide.href && /^https?:\/\//i.test(slide.href);

  const flyerContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${slide.id}-${isMobile ? 'mobile' : 'desktop'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fmm-flyer-hero-slide"
      >
        <img
          src={imageSrc}
          alt={slide.title}
          className="fmm-flyer-hero-image"
          loading="eager"
        />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="fmm-flyer-hero-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="fmm-flyer-hero-frame">
        {slide.href ? (
          isExternal ? (
            <a href={slide.href} target="_blank" rel="noreferrer" className="fmm-flyer-hero-clickable">{flyerContent}</a>
          ) : (
            <Link to={slide.href} className="fmm-flyer-hero-clickable">{flyerContent}</Link>
          )
        ) : (
          <div className="fmm-flyer-hero-clickable">{flyerContent}</div>
        )}

        {slides.length > 1 && (
          <div className="fmm-flyer-hero-dots">
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrent(index)}
                className={`fmm-flyer-hero-dot ${index === current ? 'is-active' : ''}`}
                aria-label={`Go to flyer ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
