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

function WelcomePhonePreview({ products = [] }) {
  const heroProducts = products.length
    ? products.slice(0, 4)
    : [
        {
          id: "hero-1",
          name: "iPhone 15 Pro",
          price: 12999,
          image: "",
        },
        {
          id: "hero-2",
          name: "Wireless Earbuds",
          price: 649,
          image: "",
        },
        {
          id: "hero-3",
          name: "Smart Watch",
          price: 599,
          image: "",
        },
        {
          id: "hero-4",
          name: "JBL Speaker",
          price: 1250,
          image: "",
        },
      ];

  return (
    <div className="fmm-hero-phone-stage">
      <div className="fmm-hero-phone">

        {/* PHONE BODY */}
        <div className="fmm-hero-phone-shell">

          {/* SIDE BUTTONS */}
          <div className="fmm-hero-phone-button fmm-hero-phone-button-1" />
          <div className="fmm-hero-phone-button fmm-hero-phone-button-2" />

          {/* SCREEN */}
          <div className="fmm-hero-phone-screen">

            {/* TOP STATUS / DYNAMIC ISLAND */}
            <div className="fmm-hero-phone-status">
              <span>9:41</span>

              <div className="fmm-hero-phone-island" />

              <div className="fmm-hero-phone-status-icons">
                <span>●</span>
                <span>▮▮</span>
              </div>
            </div>

            {/* WEBSITE HEADER */}
            <div className="fmm-hero-phone-header">
              <div className="fmm-hero-mini-logo">
                FMM
              </div>

              <div className="fmm-hero-mini-brand">
                <strong>FMM</strong> CLASSICO
              </div>

              <div className="fmm-hero-mini-icons">
                ♡
              </div>
            </div>

            {/* SEARCH */}
            <div className="fmm-hero-phone-search">
              <span>⌕</span>
              <span>Search products...</span>
            </div>

            {/* PROMO CARD */}
            <div className="fmm-hero-phone-promo">
              <div>
                <small>FMM CLASSICO DEALS</small>
                <strong>Shop smarter.<br />Live better.</strong>
              </div>

              <button>Shop Now</button>
            </div>

            {/* CATEGORY CHIPS */}
            <div className="fmm-hero-phone-categories">
              <span className="active">Phones</span>
              <span>Accessories</span>
              <span>Electronics</span>
              <span>Home</span>
            </div>

            {/* PRODUCTS HEADER */}
            <div className="fmm-hero-phone-products-header">
              <strong>Popular Products</strong>
              <span>View all</span>
            </div>

            {/* PRODUCTS */}
            <div className="fmm-hero-phone-products">

              {heroProducts.map((product, index) => (
                <div
                  className="fmm-hero-phone-product"
                  key={product.id || index}
                >

                  <div className="fmm-hero-phone-product-image">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                      />
                    ) : (
                      <div className="fmm-hero-product-placeholder">
                        {index === 0 ? "📱" :
                         index === 1 ? "🎧" :
                         index === 2 ? "⌚" : "🔊"}
                      </div>
                    )}
                  </div>

                  <div className="fmm-hero-phone-product-info">
                    <strong>
                      {product.name}
                    </strong>

                    <span>
                      GH₵ {Number(product.price || 0).toLocaleString()}
                    </span>
                  </div>

                  <button className="fmm-hero-phone-add">
                    +
                  </button>

                </div>
              ))}

            </div>

            {/* BOTTOM NAV */}
            <div className="fmm-hero-phone-nav">
              <div className="active">
                <span>⌂</span>
                <small>Home</small>
              </div>

              <div>
                <span>▦</span>
                <small>Categories</small>
              </div>

              <div>
                <span>🛒</span>
                <small>Cart</small>
              </div>

              <div>
                <span>♙</span>
                <small>Account</small>
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
    <div className="relative h-full w-full overflow-hidden bg-[#03143f]">
      {/* Keep the existing FMM CLASSICO blue background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#03143f] via-[#082a6f] to-[#0b3ea9]" />

      {/* Soft background lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.10),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(255,255,255,0.07),transparent_25%),radial-gradient(circle_at_80%_85%,rgba(46,134,193,0.18),transparent_28%)]" />

      <div className="relative z-10 grid h-full grid-cols-[1.55fr_0.85fr] items-center gap-2 px-5 py-4 sm:px-7 md:grid-cols-[1.45fr_0.85fr] md:px-10 lg:px-12">

        {/* LEFT SIDE */}
        <div className="min-w-0 text-white">

          {/* Welcome */}
          <h2 className="font-light leading-none tracking-tight text-white
            text-[25px]
            sm:text-[34px]
            md:text-[45px]
            lg:text-[52px]"
          >
            {slide.titleLead}
          </h2>

          {/* FMM CLASSICO */}
          <h3 className="mt-1 font-black leading-none tracking-[-0.035em] text-[#8dc3ff]
            text-[31px]
            sm:text-[43px]
            md:text-[57px]
            lg:text-[66px]"
          >
            {slide.titleAccent}
          </h3>

          {/* Description */}
          <p className="mt-3 max-w-[720px] font-normal leading-snug text-white/95
            text-[10px]
            sm:text-[12px]
            md:text-[15px]
            lg:text-[17px]"
          >
            {slide.description}
          </p>

          {/* Feature grid */}
          <div className="mt-4 grid max-w-[680px] grid-cols-2 gap-x-5 gap-y-2.5
            sm:mt-5 sm:gap-x-8 sm:gap-y-3
            md:mt-6 md:gap-x-10 md:gap-y-3.5"
          >
            {slide.features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="flex items-center gap-2 text-white"
                >
                  {/* Circular icon */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b5fc7] shadow-[0_4px_12px_rgba(0,0,0,0.18)]
                    sm:h-8 sm:w-8
                    md:h-9 md:w-9"
                  >
                    <Icon
                      className="h-3.5 w-3.5 text-white
                        sm:h-4 sm:w-4
                        md:h-4.5 md:w-4.5"
                    />
                  </div>

                  <span className="font-medium leading-tight
                    text-[8px]
                    sm:text-[9px]
                    md:text-[11px]
                    lg:text-[13px]"
                  >
                    {feature.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom trust categories */}
          <div className="mt-4 border-t border-[#3d8bd4]/70 pt-3
            sm:mt-5 sm:pt-3.5
            md:mt-6 md:pt-4"
          >
            <div className="flex items-center justify-between gap-3">

              {slide.trustItems.map((item) => (
                <div
                  key={item}
                  className="flex min-w-0 items-center gap-1.5 text-white"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[#8dc3ff]
                      sm:h-4.5 sm:w-4.5
                      md:h-5 md:w-5"
                  />

                  <span className="truncate font-medium
                    text-[7px]
                    sm:text-[8px]
                    md:text-[10px]
                    lg:text-[12px]"
                  >
                    {item}
                  </span>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* RIGHT SIDE — IPHONE */}
        <div className="flex h-full items-center justify-center md:justify-end">
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
