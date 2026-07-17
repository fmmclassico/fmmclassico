import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { useQuery } from '@tanstack/react-query';
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
    cta_link: createPageUrl('Shop?category=phones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-1b',
    badge: '🔥 Classico Deals',
    title: 'Phone Accessories',
    subtitle: 'Cases, chargers, earphones & more at unbeatable prices',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('Shop?category=phone_accessories'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-2',
    badge: '🏡 Home Deals',
    title: 'Home Appliances',
    subtitle: 'Quality home appliances delivered to your door',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('Shop?category=home_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-3',
    badge: '⚡ Best Deals',
    title: 'Electronic',
    subtitle: 'Top quality electronics for your everyday needs',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('Shop?category=electronic_appliances'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-4',
    badge: '📱 Top Brands',
    title: 'Samsung & Apple',
    subtitle: 'Genuine Samsung & Apple products at great prices',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('BrandProducts?brand=Samsung'),
    cta_text: 'Shop Brands',
  },
  {
    id: 'default-5',
    badge: '🎧 Accessories',
    title: 'Earphones & Speakers',
    subtitle: 'Premium sound at affordable prices — Oraimo, JBL & more',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('Shop?category=earphones'),
    cta_text: 'Shop Now',
  },
  {
    id: 'default-6',
    badge: '⌚ Smart Wear',
    title: 'Smart Watches',
    subtitle: 'Stay connected with the latest smartwatches',
    bg_gradient: NAVY_GRADIENT,
    cta_link: createPageUrl('Shop?category=smart_watches'),
    cta_text: 'Shop Now',
  },
];

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function getSettingValue(settings, key) {
  const value = settings.find((setting) => setting?.key === key)?.value;
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBannerLink(link) {
  if (!link) return createPageUrl('Shop');
  if (link.startsWith('http')) return link;
  if (link.startsWith('/')) return link;
  return createPageUrl(link);
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const { data: promoBanners = [] } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: async () => {
      try {
        const result = await base44.entities.PromoBanner.list('order', 50);
        return normalizeQueryResult(result);
      } catch (error) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const result = await base44.entities.AppSetting.list();
        return normalizeQueryResult(result);
      } catch (error) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const slides = useMemo(() => {
    const safePromoBanners = Array.isArray(promoBanners) ? promoBanners : [];
    const safeSettings = Array.isArray(appSettings) ? appSettings : [];

    const activePromoSlides = safePromoBanners
      .filter((banner) => banner?.is_active !== false)
      .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
      .map((banner) => ({
        id: banner.id,
        badge: banner.badge || '',
        title: banner.title || 'FMM CLASSICO',
        subtitle: banner.subtitle || '',
        image_url: banner.image_url || '',
        bg_gradient: banner.bg_gradient || NAVY_GRADIENT,
        cta_link: banner.cta_link || 'Shop',
        cta_text: banner.cta_text || 'Shop Now',
      }))
      .filter((banner) => banner.title || banner.image_url);

    if (activePromoSlides.length > 0) {
      return activePromoSlides;
    }

    const heroImage = getSettingValue(safeSettings, 'hero_bg_image');
    const heroTitle = getSettingValue(safeSettings, 'hero_title');
    const heroSubtitle = getSettingValue(safeSettings, 'hero_subtitle');
    const heroCtaText = getSettingValue(safeSettings, 'hero_cta');
    const heroCtaLink = getSettingValue(safeSettings, 'hero_cta_link');

    if (heroImage || heroTitle || heroSubtitle || heroCtaText) {
      return [
        {
          id: 'app-setting-hero',
          badge: '',
          title: heroTitle || 'FMM CLASSICO',
          subtitle:
            heroSubtitle ||
            'Shop quality phones, accessories, electronics and home appliances at great prices.',
          image_url: heroImage || '',
          bg_gradient: NAVY_GRADIENT,
          cta_link: heroCtaLink || 'Shop',
          cta_text: heroCtaText || 'Shop Now',
        },
      ];
    }

    return DEFAULT_SLIDES;
  }, [promoBanners, appSettings]);

  useEffect(() => {
    if (current >= slides.length) {
      setCurrent(0);
    }
  }, [current, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
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
  const ctaHref = normalizeBannerLink(slide.cta_link);

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
            {slide.badge && <span className="fmm-stable-hero-badge">{slide.badge}</span>}
            <h2 className="fmm-stable-hero-title">{slide.title}</h2>
            {slide.subtitle && <p className="fmm-stable-hero-subtitle">{slide.subtitle}</p>}
            <Link to={ctaHref} className="fmm-stable-hero-cta-wrap">
              <Button className="fmm-stable-hero-cta bg-white text-[#0A2E60] hover:bg-gray-100 font-semibold">
                {slide.cta_text || 'Shop Now'}
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
