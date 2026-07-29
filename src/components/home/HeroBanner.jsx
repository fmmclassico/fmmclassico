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

const BLUE_GRADIENT = 'from-[#03143f] via-[#06286d] to-[#0b3ea9]';
const BLUE_TITLE = 'text-[#8dc3ff]';


const REVIEW_SLIDE = {
  id: 'google-review',
  type: 'review',
  title: 'WELCOME TO FMM CLASSICO',
  subtitle: 'Shop smartphones, phone accessories, electronics, home appliances, and lifestyle products in one place.',
  points: [
    'Save items to your wishlist',
    'Track orders and view order history',
    'Manage your account details',
    'Enjoy a faster, more secure checkout',
  ],
  note: 'Sign in with Google or email to access your account quickly and securely.',
};

const BUILT_IN_BANNERS = [
  {
    id: 'fixed-phones',
    type: 'built_in',
    title: 'PHONES',
    subtitle: 'Latest models. Top performance. Unbeatable prices.',
    href: '/phones',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784561540/ChatGPT_Image_Jul_20_2026_03_19_56_PM_vje886.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-accessories',
    type: 'built_in',
    title: 'PHONE ACCESSORIES',
    subtitle: 'Chargers, earbuds, cases, speakers and more for everyday use.',
    href: '/phone-accessories',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784299259/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-home',
    type: 'built_in',
    title: 'HOME APPLIANCES',
    subtitle: 'Quality appliances for your kitchen, comfort and daily living.',
    href: '/home-appliances',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784300533/ChatGPT_Image_Jul_17_2026_03_01_53_PM_hne4gq.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-electronics',
    type: 'built_in',
    title: 'ELECTRONICS',
    subtitle: 'Smart gadgets and everyday electronics at trusted prices.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784301769/ChatGPT_Image_Jul_17_2026_03_20_50_PM_b8mhgl.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-smartwatch',
    type: 'built_in',
    title: 'SMART WATCH',
    subtitle: 'Stay connected with stylish smart watches and wearables.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302040/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-television',
    type: 'built_in',
    title: 'TELEVISION',
    subtitle: 'Big-screen viewing with sharp picture and dependable performance.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1783605377/SLE32S700TCS-2_mowhla.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-projectors',
    type: 'built_in',
    title: 'PROJECTORS',
    subtitle: 'Project larger, brighter visuals for home and office use.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1783605199/519qw7On-vL_b03hux.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-laptops',
    type: 'built_in',
    title: 'LAPTOPS',
    subtitle: 'Affordable and high-quality laptops for work, school and business.',
    href: '/electronics',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784634806/laptop-new-arrivals-cheap-price-laptops-high-quality-core-i7-laptops-brand-new-b0c29e0018_qehdjx.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-infrared-cooker',
    type: 'built_in',
    title: 'INFRARED COOKER',
    subtitle: 'Fast, compact cooking made easy for modern kitchens.',
    href: '/home-appliances',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784635290/Single-Burner-Electric-Infrared-Cooker-Ceramic-Stove-Hob-Cooktop-Electrical_ucsfgz.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
];


function ReviewIntroSlide({ slide }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-r from-[#03143f] via-[#0b2a63] to-[#2E86C1]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.14),transparent_32%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.10),transparent_28%)]" />
      <div className="relative z-10 grid h-full gap-3 px-3 py-3 sm:px-5 md:grid-cols-[1.05fr_0.95fr] md:gap-5 md:px-8 md:py-6">
        <div className="min-w-0 self-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/90 sm:text-xs">
            Welcome to FMM CLASSICO
          </span>
          <h2 className="mt-2 text-lg font-black leading-tight text-white sm:text-2xl md:text-4xl">
            {slide.subtitle}
          </h2>
          <p className="mt-2 max-w-xl text-[11px] leading-5 text-white/88 sm:text-sm md:text-base md:leading-7">
            Create an account or sign in to save favourites, track orders, view order history, manage your details, and enjoy a smoother checkout.
          </p>
        </div>

        <div className="flex h-full items-center justify-center md:justify-end">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-3 text-left shadow-2xl sm:p-4 md:p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#2E86C1] sm:text-xs">
              What you can do after signing in
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {slide.points.map((point) => (
                <div key={point} className="rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-5 text-slate-700 sm:text-xs md:text-sm">
                  {point}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-600 sm:text-xs md:text-sm">
              {slide.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuiltInBannerSlide({ slide }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-r ${slide.gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.10),transparent_35%)]" />
      <div className="relative z-10 grid h-full grid-cols-2 items-center gap-2 px-3 py-3 sm:px-5 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-7">
        <div className="min-w-0 self-center">
          <h2 className={`text-2xl sm:text-3xl md:text-6xl font-black tracking-tight leading-none ${slide.titleClass}`}>
            {slide.title}
          </h2>
          <p className="mt-2 max-w-xl text-xs sm:text-sm md:text-2xl leading-snug text-white/90">
            {slide.subtitle}
          </p>
        </div>

        <div className="flex h-full items-center justify-center md:justify-end">
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="max-h-[80px] sm:max-h-[105px] md:max-h-[220px] w-auto object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.30)] "
            loading="eager"
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
}

function UploadedBannerSlide({ slide, isMobile }) {
  const imageSrc = pickHeroImage(slide, isMobile);
  if (!imageSrc) return null;
  return (
    <div className="fmm-flyer-hero-slide">
      <img
        src={imageSrc}
        alt={slide.title}
        className="fmm-flyer-hero-image"
        loading="eager"
        fetchPriority="high"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
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
      .filter((banner) => {
        const hasImage = !!(banner?.desktop_image_url || banner?.mobile_image_url || banner?.image_url);
        return banner?.is_active !== false && hasImage;
      })
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

  const slides = useMemo(() => [REVIEW_SLIDE, ...BUILT_IN_BANNERS, ...uploadedSlides], [uploadedSlides]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [current, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const delay = current === 0 ? 10000 : 5000;
    const timer = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [current, slides.length]);

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
        {slide.type === 'review' ? <ReviewIntroSlide slide={slide} /> : slide.type === 'built_in' ? <BuiltInBannerSlide slide={slide} /> : <UploadedBannerSlide slide={slide} isMobile={isMobile} />}
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
