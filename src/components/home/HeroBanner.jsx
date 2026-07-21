import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { appClient } from '@/api/appClient.js';

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function normalizeBannerLink(link) {
  if (!link || !String(link).trim()) return null;
  const safeLink = String(link).trim();
  if (safeLink.startsWith('http://') || safeLink.startsWith('https://')) return safeLink;
  return safeLink.startsWith('/') ? safeLink : `/${safeLink.replace(/^\//, '')}`;
}

function pickHeroImage(slide, isMobile) {
  if (slide.type === 'built_in') return slide.imageUrl;
  if (isMobile) return slide.mobile_image_url || slide.image_url || slide.desktop_image_url || '';
  return slide.desktop_image_url || slide.image_url || slide.mobile_image_url || '';
}

const BUILT_IN_BANNERS = [
  {
    id: 'fixed-phones',
    type: 'built_in',
    title: 'PHONES',
    subtitle: 'Latest models. Top performance. Unbeatable prices.',
    href: '/phones',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784561540/ChatGPT_Image_Jul_20_2026_03_19_56_PM_vje886.png',
    gradient: 'from-[#03143f] via-[#06286d] to-[#0b3ea9]',
    titleClass: 'text-[#8dc3ff]',
  },
  {
    id: 'fixed-accessories',
    type: 'built_in',
    title: 'PHONE ACCESSORIES',
    subtitle: 'Chargers, earbuds, cases, speakers and more for everyday use.',
    href: '/phone-accessories',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784299259/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw.png',
    gradient: 'from-[#042126] via-[#0a4d59] to-[#12a1b7]',
    titleClass: 'text-[#8ef2ff]',
  },
  {
    id: 'fixed-home',
    type: 'built_in',
    title: 'HOME APPLIANCES',
    subtitle: 'Quality appliances for your kitchen, comfort and daily living.',
    href: '/home-appliances',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784300533/ChatGPT_Image_Jul_17_2026_03_01_53_PM_hne4gq.png',
    gradient: 'from-[#0b2010] via-[#225329] to-[#6cb33f]',
    titleClass: 'text-[#b8f28c]',
  },
  {
    id: 'fixed-electronics',
    type: 'built_in',
    title: 'ELECTRONICS',
    subtitle: 'Smart gadgets and everyday electronics at trusted prices.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784301769/ChatGPT_Image_Jul_17_2026_03_20_50_PM_b8mhgl.png',
    gradient: 'from-[#160926] via-[#38207c] to-[#5c33d6]',
    titleClass: 'text-[#c0b6ff]',
  },
  {
    id: 'fixed-smartwatch',
    type: 'built_in',
    title: 'SMART WATCH',
    subtitle: 'Stay connected with stylish smart watches and wearables.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302040/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay.png',
    gradient: 'from-[#1b1207] via-[#6d4312] to-[#d58a1f]',
    titleClass: 'text-[#ffd48a]',
  },
  {
    id: 'fixed-television',
    type: 'Television',
    subtitle: 'Big-screen entertainment and presentation solutions made simple.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1783605377/SLE32S700TCS-2_mowhla.jpg',
    gradient: 'from-[#111827] via-[#1f2937] to-[#374151]',
    titleClass: 'text-[#d6e4ff]',
  },
];

function BuiltInBannerSlide({ slide }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-r ${slide.gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.08),transparent_35%)]" />
      <div className="relative z-10 grid h-full grid-cols-1 items-center gap-4 px-4 py-5 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-7">
        <div className="min-w-0">
          <h2 className={`text-4xl font-black tracking-tight md:text-6xl ${slide.titleClass}`}>
            {slide.title}
          </h2>
          <p className="mt-3 max-w-xl text-base text-white/90 md:text-2xl">
            {slide.subtitle}
          </p>
        </div>

        <div className="hidden h-full items-center justify-end md:flex">
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="max-h-[220px] w-auto object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,0.35)]"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
    </div>
  );
}

function UploadedBannerSlide({ slide, isMobile }) {
  const imageSrc = pickHeroImage(slide, isMobile);
  return (
    <div className="fmm-flyer-hero-slide">
      <img
        src={imageSrc}
        alt={slide.title}
        className="fmm-flyer-hero-image"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  const { data: promoBanners = [] } = useQuery({
    queryKey: ['promoBanners'],
    queryFn: async () => {
      try {
        const result = await appClient.entities.PromoBanner.list('order', 500);
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

  const uploadedSlides = useMemo(() => {
    return (Array.isArray(promoBanners) ? promoBanners : [])
      .filter((banner) => banner?.is_active !== false && (banner?.desktop_image_url || banner?.mobile_image_url || banner?.image_url))
      .sort((a, b) => Number(a?.order ?? 0) - Number(b?.order ?? 0))
      .map((banner, index) => ({
        id: banner.id || `hero-flyer-${index}`,
        type: 'uploaded',
        title: banner.title || `Hero Flyer ${index + 1}`,
        image_url: banner.image_url || '',
        desktop_image_url: banner.desktop_image_url || '',
        mobile_image_url: banner.mobile_image_url || '',
        href: normalizeBannerLink(banner.cta_link),
      }));
  }, [promoBanners]);

  const slides = useMemo(() => [...BUILT_IN_BANNERS, ...uploadedSlides], [uploadedSlides]);

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
      diff > 0 ? next() : prev();
    }
    setTouchStart(null);
  };

  if (slides.length === 0) {
    return <div className="fmm-flyer-hero-shell"><div className="fmm-flyer-hero-frame fmm-flyer-hero-empty" /></div>;
  }

  const slide = slides[current];
  const isExternal = slide.href && /^https?:\/\//i.test(slide.href);

  const flyerContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${slide.id}-${isMobile ? 'mobile' : 'desktop'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="h-full"
      >
        {slide.type === 'built_in' ? <BuiltInBannerSlide slide={slide} /> : <UploadedBannerSlide slide={slide} isMobile={isMobile} />}
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
