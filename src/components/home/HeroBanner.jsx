import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgePercent,
  Bell,
  CheckCircle2,
  Heart,
  Menu,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  UserCircle2,
} from 'lucide-react';
import { appClient } from '@/api/appClient.js';
import './hero-banner-overrides.css';
import { getOptimizedMediaUrl, normalizeMediaUrl } from '@/lib/media';

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function pickHeroImage(slide, isMobile) {
  const raw = slide.type === 'built_in'
    ? slide.imageUrl
    : isMobile
      ? slide.mobile_image_url || slide.image_url || slide.desktop_image_url || ''
      : slide.desktop_image_url || slide.image_url || slide.mobile_image_url || '';

  return normalizeMediaUrl(raw);
}

const BLUE_GRADIENT = 'from-[#03143f] via-[#06286d] to-[#0b3ea9]';
const BLUE_TITLE = 'text-[#8dc3ff]';
const BLUE_ACCENT = '#2E86C1';

const heroImageCache = new Set();

function buildHeroSlideImage(slide, isMobile) {
  if (!slide || slide.type === 'review') return '';
  const source = slide.type === 'built_in'
    ? slide.imageUrl
    : pickHeroImage(slide, isMobile);
  if (!source) return '';
  return getOptimizedMediaUrl(source, {
    width: isMobile ? 960 : 1680,
    quality: 'auto',
  });
}

function getSlideReadyKey(slide, isMobile) {
  return `${slide?.id || 'unknown'}-${isMobile ? 'mobile' : 'desktop'}`;
}

function preloadHeroImage(src) {
  if (!src || heroImageCache.has(src) || typeof window === 'undefined') {
    return Promise.resolve(src);
  }

  return new Promise((resolve) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => {
      heroImageCache.add(src);
      resolve(src);
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });
}

const REVIEW_SLIDE = {
  id: 'fmm-welcome-slide',
  type: 'review',
  titleLead: 'Welcome to',
  titleAccent: 'FMM CLASSICO',
  description:
    'FMM CLASSICO is an online shopping platform for smartphones, phone accessories, electronics, home appliances, and lifestyle products.',
  features: [
    { title: 'Save Wishlist', icon: Heart },
    { title: 'Track Orders', icon: Truck },
    { title: 'Order History', icon: ReceiptText },
    { title: 'Manage Account', icon: UserCircle2 },
    { title: 'Secure Checkout', icon: ShieldCheck },
    { title: 'Exclusive Offers', icon: BadgePercent },
  ],
  trustItems: ['Phones & Accessories', 'Electronics', 'Home Appliances'],
};

const BUILT_IN_BANNERS = [
  {
    id: 'fixed-phones',
    type: 'built_in',
    title: 'PHONES',
    subtitle: 'Latest models. Top performance. Unbeatable prices.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_20_2026_03_19_56_PM_vje886_nkr8m6.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-accessories',
    type: 'built_in',
    title: 'PHONE ACCESSORIES',
    subtitle: 'Chargers, earbuds, cases, speakers and more for everyday use.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw_x6uouz.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-home',
    type: 'built_in',
    title: 'HOME APPLIANCES',
    subtitle: 'Quality appliances for your kitchen, comfort and daily living.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_17_2026_03_01_53_PM_hne4gq_jmfln9.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-electronics',
    type: 'built_in',
    title: 'ELECTRONICS',
    subtitle: 'Smart gadgets and everyday electronics at trusted prices.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_17_2026_03_20_50_PM_b8mhgl_j5fboe.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-smartwatch',
    type: 'built_in',
    title: 'SMART WATCH',
    subtitle: 'Stay connected with stylish smart watches and wearables.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830024/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay_zbfoid.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-television',
    type: 'built_in',
    title: 'TELEVISION',
    subtitle: 'Big-screen viewing with sharp picture and dependable performance.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830024/SLE32S700TCS-2_mowhla_1_fyvwol.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-projectors',
    type: 'built_in',
    title: 'PROJECTORS',
    subtitle: 'Project larger, brighter visuals for home and office use.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/519qw7On-vL_b03hux_rburk4.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-laptops',
    type: 'built_in',
    title: 'LAPTOPS',
    subtitle: 'Affordable and high-quality laptops for work, school and business.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830222/laptop-new-arrivals-cheap-price-laptops-high-quality-core-i7-laptops-brand-new-b0c29e0018_qehdjx_1_dvrf0z.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-infrared-cooker',
    type: 'built_in',
    title: 'INFRARED COOKER',
    subtitle: 'Fast, compact cooking made easy for modern kitchens.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830329/Single-Burner-Electric-Infrared-Cooker-Ceramic-Stove-Hob-Cooktop-Electrical_ucsfgz_1_tcomde.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
];

function WelcomePhonePreview() {
  const products = [
    {
      name: 'iPhone 15 Pro',
      price: '₵12,999',
      image:
        'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_20_2026_03_19_56_PM_vje886_nkr8m6.jpg',
    },
    {
      name: 'Wireless Earbuds',
      price: '₵349',
      image:
        'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830025/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw_x6uouz.jpg',
    },
    {
      name: 'Smart Watch',
      price: '₵599',
      image:
        'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830024/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay_zbfoid.jpg',
    },
    {
      name: 'Home Cooker',
      price: '₵449',
      image:
        'https://res.cloudinary.com/xz7s2qzt/image/upload/v1785830329/Single-Burner-Electric-Infrared-Cooker-Ceramic-Stove-Hob-Cooktop-Electrical_ucsfgz_1_tcomde.jpg',
    },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[150px] sm:max-w-[170px] md:max-w-[190px] lg:max-w-[205px]">
      {/* Soft phone shadow */}
      <div className="absolute -bottom-3 left-1/2 h-5 w-[72%] -translate-x-1/2 rounded-full bg-black/40 blur-xl" />

      {/* iPhone body */}
      <div className="relative mx-auto w-[112px] rounded-[1.9rem] border-[3px] border-[#222936] bg-[#11151d] p-[3px] shadow-[0_22px_45px_rgba(0,0,0,0.42)] sm:w-[126px] sm:rounded-[2.1rem] md:w-[140px] md:rounded-[2.3rem] md:p-[4px] lg:w-[148px]">

        {/* Side buttons */}
        <div className="absolute -left-[4px] top-[42px] h-[22px] w-[2px] rounded-l-full bg-[#343b48]" />
        <div className="absolute -left-[4px] top-[70px] h-[32px] w-[2px] rounded-l-full bg-[#343b48]" />
        <div className="absolute -right-[4px] top-[58px] h-[38px] w-[2px] rounded-r-full bg-[#343b48]" />

        {/* iPhone screen */}
        <div className="relative overflow-hidden rounded-[1.55rem] bg-white sm:rounded-[1.7rem] md:rounded-[1.9rem]">

          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-[5px] z-30 flex h-[10px] w-[43px] -translate-x-1/2 items-center justify-center rounded-full bg-black md:top-[6px] md:h-[11px] md:w-[48px]">
            <div className="h-[3px] w-[3px] rounded-full bg-[#252b35]" />
          </div>

          {/* Website header */}
          <div className="px-[7px] pb-[5px] pt-[20px] md:px-[8px] md:pb-[6px] md:pt-[21px]">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[2px] text-[6px] font-black md:text-[7px]">
                <span style={{ color: BLUE_ACCENT }}>FMM</span>
                <span className="text-[#101828]">CLASSICO</span>
              </div>

              <div className="flex items-center gap-[4px] text-[#172033]">
                <Heart className="h-[8px] w-[8px] md:h-[9px] md:w-[9px]" />
                <ShoppingBag className="h-[8px] w-[8px] md:h-[9px] md:w-[9px]" />
              </div>
            </div>

            {/* Search */}
            <div className="mt-[6px] flex h-[16px] items-center gap-[3px] rounded-full border border-slate-200 bg-[#f7f8fa] px-[5px] md:h-[18px]">
              <Search className="h-[7px] w-[7px] text-slate-400" />
              <span className="text-[5px] text-slate-400 md:text-[5.5px]">
                Search products...
              </span>
            </div>

            {/* Website hero inside phone */}
            <div className="mt-[6px] overflow-hidden rounded-[7px] bg-gradient-to-r from-[#03143f] via-[#0b2a63] to-[#2E86C1] px-[7px] py-[7px]">
              <p className="text-[5px] font-black text-white md:text-[5.5px]">
                FMM CLASSICO DEALS
              </p>

              <p className="mt-[2px] text-[7px] font-black leading-tight text-white md:text-[8px]">
                Shop smarter.
                <br />
                Live better.
              </p>

              <div className="mt-[4px] inline-flex rounded-full bg-white px-[5px] py-[2px] text-[4.5px] font-bold text-[#0b3ea9]">
                Shop Now
              </div>
            </div>

            {/* Category row */}
            <div className="mt-[7px] flex gap-[3px] overflow-hidden">
              {['Phones', 'Accessories', 'Electronics', 'Home'].map(
                (category, index) => (
                  <div
                    key={category}
                    className={`whitespace-nowrap rounded-full px-[4px] py-[2px] text-[4px] font-semibold ${
                      index === 0
                        ? 'bg-[#0b3ea9] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {category}
                  </div>
                )
              )}
            </div>

            {/* Products heading */}
            <div className="mt-[8px] flex items-center justify-between">
              <span className="text-[6px] font-black text-[#111827] md:text-[7px]">
                Popular Products
              </span>

              <span className="text-[4.5px] font-semibold text-[#2E86C1]">
                View all
              </span>
            </div>

            {/* Product rows */}
            <div className="mt-[4px] space-y-[3px]">
              {products.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center gap-[4px] rounded-[6px] border border-slate-100 bg-white px-[3px] py-[3px] shadow-[0_1px_4px_rgba(15,23,42,0.05)]"
                >
                  {/* Product image */}
                  <div className="h-[25px] w-[25px] shrink-0 overflow-hidden rounded-[4px] bg-slate-50 md:h-[27px] md:w-[27px]">
                    <img
                      src={product.image}
                      alt=""
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Product information */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[5px] font-bold leading-tight text-[#172033] md:text-[5.5px]">
                      {product.name}
                    </p>

                    <p className="mt-[2px] text-[5px] font-black text-[#0b3ea9] md:text-[5.5px]">
                      {product.price}
                    </p>
                  </div>

                  {/* Add button */}
                  <div className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-[#0b3ea9] text-[8px] font-bold text-white">
                    +
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom navigation */}
            <div className="mt-[7px] border-t border-slate-100 pt-[5px]">
              <div className="flex items-center justify-around text-[4px] text-slate-400">
                <div className="flex flex-col items-center gap-[2px] text-[#0b3ea9]">
                  <ShoppingBag className="h-[8px] w-[8px]" />
                  <span>Home</span>
                </div>

                <div className="flex flex-col items-center gap-[2px]">
                  <Search className="h-[8px] w-[8px]" />
                  <span>Explore</span>
                </div>

                <div className="flex flex-col items-center gap-[2px]">
                  <Heart className="h-[8px] w-[8px]" />
                  <span>Wishlist</span>
                </div>

                <div className="flex flex-col items-center gap-[2px]">
                  <UserCircle2 className="h-[8px] w-[8px]" />
                  <span>Account</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewBannerSlide({ slide }) {
  return (
    <div className="fmm-review-slide relative h-full w-full overflow-hidden bg-[#03143f]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#03143f] via-[#082a6f] to-[#0b3ea9]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.10),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_84%,rgba(46,134,193,0.16),transparent_22%)]" />

      <div className="fmm-review-slide__grid">
        <div className="fmm-review-slide__content min-w-0 text-white">
          {slide.eyebrow ? (
            <span className="inline-flex items-center rounded-full border border-[#5daeff]/35 bg-[#0d2f79]/55 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.18em] text-[#d9ecff] sm:text-[8px] md:px-3 md:py-1.5 md:text-[10px]">
              {slide.eyebrow}
            </span>
          ) : null}

          <h2 className="fmm-review-slide__title mt-2 font-black leading-[1.08] tracking-[-0.03em] text-white">
            <span className="block sm:inline">{slide.titleLead} </span>
            <span className="block text-[#8dc3ff] sm:inline">{slide.titleAccent}</span>
          </h2>

          <p className="fmm-review-slide__description mt-2 text-white/86">
            {slide.description}
          </p>

          <div className="fmm-review-slide__features mt-3 grid grid-cols-3 md:mt-4 lg:mt-5">
            {slide.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-xl border border-white/12 bg-white/8 px-1.5 py-1.5 text-white/94 backdrop-blur-[2px] md:rounded-2xl md:px-2 md:py-2">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <Icon className="h-2.5 w-2.5 text-[#8dc3ff] md:h-3.5 md:w-3.5" />
                    <span className="text-[5.9px] font-semibold leading-tight sm:text-[6.2px] md:text-[9px] lg:text-[10px]">{feature.title}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fmm-review-slide__trust mt-2 flex flex-wrap items-center text-white/80 sm:text-[7.5px] md:mt-3 md:text-[10px] lg:text-[11px]">
            {slide.trustItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-2.5 w-2.5 text-[#8dc3ff] md:h-3.5 md:w-3.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fmm-review-slide__preview flex items-center justify-center md:justify-end">
          <WelcomePhonePreview />
        </div>
      </div>
    </div>
  );
}

function BuiltInBannerSlide({ slide, isMobile }) {
  const imageSrc = buildHeroSlideImage(slide, isMobile);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-r ${slide.gradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.10),transparent_35%)]" />
      <div className="relative z-10 grid h-full grid-cols-2 items-center gap-2 px-3 py-3 sm:px-5 md:grid-cols-[1.05fr_0.95fr] md:px-7 md:py-5 lg:px-8 lg:py-5">
        <div className="min-w-0 self-center">
          <h2 className={`text-[22px] sm:text-[30px] md:text-[42px] lg:text-[48px] font-black tracking-tight leading-none ${slide.titleClass}`}>
            {slide.title}
          </h2>
          <p className="mt-2 max-w-xl text-[11px] sm:text-sm md:text-[17px] lg:text-[18px] leading-snug text-white/90">
            {slide.subtitle}
          </p>
        </div>

        <div className="flex h-full items-center justify-center md:justify-end">
          <img
            src={imageSrc || slide.imageUrl}
            alt={slide.title}
            className="max-h-[120px] sm:max-h-[170px] md:max-h-[255px] w-auto object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.26)]"
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
  const imageSrc = buildHeroSlideImage(slide, isMobile);
  if (!imageSrc) return null;
  return (
    <div className="fmm-flyer-hero-slide">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="fmm-flyer-hero-backdrop"
        loading="eager"
        fetchPriority="high"
      />
      <img
        src={imageSrc}
        alt={slide.title}
        className="fmm-flyer-hero-image"
        loading="eager"
        fetchPriority="high"
        referrerPolicy="no-referrer"
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
  const [readySlides, setReadySlides] = useState({});

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
      }));
  }, [promoBanners]);

  const slides = useMemo(() => [REVIEW_SLIDE, ...BUILT_IN_BANNERS, ...uploadedSlides], [uploadedSlides]);

  useEffect(() => {
    let active = true;

    const markReady = (slide) => {
      const key = getSlideReadyKey(slide, isMobile);
      if (!key) return;
      setReadySlides((currentReady) => currentReady[key] ? currentReady : { ...currentReady, [key]: true });
    };

    slides.forEach((slide) => {
      if (!slide || slide.type === 'review') {
        markReady(slide);
        return;
      }

      const imageSrc = buildHeroSlideImage(slide, isMobile);
      if (!imageSrc) {
        markReady(slide);
        return;
      }

      if (heroImageCache.has(imageSrc)) {
        markReady(slide);
        return;
      }

      preloadHeroImage(imageSrc).then(() => {
        if (!active) return;
        markReady(slide);
      });
    });

    return () => {
      active = false;
    };
  }, [slides, isMobile]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [current, slides.length]);

  const isSlideReady = (index) => {
    const slide = slides[index];
    if (!slide || slide.type === 'review') return true;
    return Boolean(readySlides[getSlideReadyKey(slide, isMobile)]);
  };

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const nextIndex = (current + 1) % slides.length;
    const timer = window.setTimeout(() => {
      if (isSlideReady(nextIndex)) {
        setCurrent(nextIndex);
      }
    }, current === 0 ? 10000 : 6000);
    return () => window.clearTimeout(timer);
  }, [current, isMobile, readySlides, slides]);

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
  const isReviewSlide = slide?.type === 'review';

  const flyerContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${slide.id}-${isMobile ? 'mobile' : 'desktop'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {slide.type === 'review'
          ? <ReviewBannerSlide slide={slide} />
          : slide.type === 'built_in'
            ? <BuiltInBannerSlide slide={slide} isMobile={isMobile} />
            : <UploadedBannerSlide slide={slide} isMobile={isMobile} />}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="fmm-flyer-hero-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={`fmm-flyer-hero-frame ${isReviewSlide ? 'is-review-slide' : ''}`}>
        <div className="fmm-flyer-hero-static">{flyerContent}</div>

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
