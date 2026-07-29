import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgePercent,
  Bell,
  CheckCircle2,
  Heart,
  LogIn,
  Menu,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  UserCircle2,
  UserPlus,
} from 'lucide-react';
import { appClient } from '@/api/appClient.js';
import './hero-banner-overrides.css';

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
const BLUE_ACCENT = '#2E86C1';

const REVIEW_SLIDE = {
  id: 'fmm-welcome-slide',
  type: 'review',
  eyebrow: 'WELCOME TO FMM CLASSICO',
  titleLead: 'Your One-Stop Shop for',
  titleAccent: 'Smart Tech & Lifestyle',
  description:
    'Shop smartphones, phone accessories, electronics, home appliances, and lifestyle products — all in one place.',
  features: [
    {
      title: 'Save Wishlist',
      description: 'Save your favorite items for later.',
      icon: Heart,
    },
    {
      title: 'Track Orders',
      description: 'Track and monitor your orders easily.',
      icon: Truck,
    },
    {
      title: 'Order History',
      description: 'View your past orders anytime.',
      icon: ReceiptText,
    },
    {
      title: 'Manage Account',
      description: 'Update your details and preferences.',
      icon: UserCircle2,
    },
    {
      title: 'Secure Checkout',
      description: 'Enjoy a faster and more secure checkout.',
      icon: ShieldCheck,
    },
    {
      title: 'Exclusive Offers',
      description: 'Get access to special deals and promotions.',
      icon: BadgePercent,
    },
  ],
  trustItems: ['100% Genuine Products', 'Trusted Support', 'Fast & Reliable Delivery'],
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

function WelcomePhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[112px] md:max-w-[290px] lg:max-w-[320px]">
      <div className="absolute -bottom-2 left-1/2 h-6 w-[88%] -translate-x-1/2 rounded-full bg-[#02153f]/85 blur-md md:-bottom-3 md:h-8" />
      <div className="absolute -bottom-1 left-1/2 h-3 w-[94%] -translate-x-1/2 rounded-[999px] border border-[#1e5bb8]/45 bg-[#072764] md:h-4" />

      <div className="relative ml-auto w-[92px] rotate-[10deg] rounded-[1.5rem] border border-white/20 bg-[#0d1629] p-[4px] shadow-[0_20px_40px_rgba(0,0,0,0.35)] md:w-[250px] md:rounded-[2.5rem] md:p-[8px]">
        <div className="absolute left-1/2 top-[7px] z-20 h-[7px] w-[32px] -translate-x-1/2 rounded-full bg-[#101827] md:top-3 md:h-4 md:w-20" />

        <div className="overflow-hidden rounded-[1.2rem] bg-white md:rounded-[2rem]">
          <div className="px-2 pt-3 pb-2 md:px-4 md:pt-5 md:pb-3">
            <div className="flex items-center justify-between text-[#0f224f]">
              <Menu className="h-3.5 w-3.5 md:h-5 md:w-5" />
              <div className="flex items-center gap-1 text-[8px] font-black tracking-tight md:gap-1.5 md:text-[16px]">
                <span style={{ color: BLUE_ACCENT }}>FMM</span>
                <span>CLASSICO</span>
              </div>
              <Bell className="h-3.5 w-3.5 md:h-5 md:w-5" />
            </div>

            <div className="mt-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 md:mt-3 md:gap-2 md:px-3 md:py-2">
              <Search className="h-2.5 w-2.5 text-slate-400 md:h-3.5 md:w-3.5" />
              <span className="text-[6.5px] text-slate-400 md:text-[11px]">Search for products...</span>
            </div>

            <div className="mt-2 rounded-[0.9rem] bg-gradient-to-r from-[#03143f] via-[#0b2a63] to-[#2E86C1] px-2 py-2 text-white md:mt-4 md:rounded-[1.3rem] md:px-4 md:py-4">
              <p className="text-[8px] font-black leading-tight md:text-xl">iPhone 15 Pro</p>
              <p className="mt-0.5 text-[5.8px] text-white/80 md:mt-1 md:text-xs">Titanium. So strong.</p>
              <div className="mt-1.5 inline-flex rounded-full bg-white px-1.5 py-0.5 text-[5.5px] font-bold text-[#0b3ea9] md:mt-3 md:px-3 md:py-1 md:text-[11px]">
                Shop Now
              </div>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[5.5px] font-medium text-slate-600 md:mt-4 md:gap-2 md:text-[10px]">
              <div className="flex flex-col items-center gap-0.5"><Smartphone className="h-2.5 w-2.5 md:h-4 md:w-4" /><span>Phones</span></div>
              <div className="flex flex-col items-center gap-0.5"><ShoppingBag className="h-2.5 w-2.5 md:h-4 md:w-4" /><span>Accessories</span></div>
              <div className="flex flex-col items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5 md:h-4 md:w-4" /><span>Electronics</span></div>
              <div className="flex flex-col items-center gap-0.5"><ReceiptText className="h-2.5 w-2.5 md:h-4 md:w-4" /><span>Appliances</span></div>
              <div className="flex flex-col items-center gap-0.5"><Heart className="h-2.5 w-2.5 md:h-4 md:w-4" /><span>Lifestyle</span></div>
            </div>

            <div className="mt-2 md:mt-4">
              <div className="flex items-center justify-between">
                <p className="text-[6.5px] font-bold text-slate-800 md:text-xs">Best Selling</p>
                <span className="text-[5.5px] font-semibold text-[#2E86C1] md:text-[10px]">View All</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 md:mt-2 md:gap-2">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-1 md:p-2">
                    <div className="aspect-[0.78] rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" />
                    <div className="mt-1 h-1 rounded bg-slate-200 md:mt-2 md:h-2" />
                    <div className="mt-0.5 h-1 w-2/3 rounded bg-slate-100 md:mt-1 md:h-2" />
                  </div>
                ))}
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
      <div className="absolute inset-0 bg-gradient-to-r from-[#03143f] via-[#082a6f] to-[#0b3ea9]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.13),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_80%_84%,rgba(46,134,193,0.22),transparent_24%)]" />

      <div className="relative z-10 grid h-full grid-cols-[minmax(0,1.05fr)_108px] items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:px-4 md:grid-cols-[minmax(0,1.08fr)_minmax(250px,0.92fr)] md:gap-6 md:px-8 md:py-5 lg:px-10 lg:py-6">
        <div className="min-w-0 self-center text-white">
          <span className="inline-flex items-center rounded-full border border-[#5daeff]/35 bg-[#0d2f79]/55 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-[#d9ecff] sm:text-[9px] md:px-4 md:py-2 md:text-xs">
            {slide.eyebrow}
          </span>

          <h2 className="mt-2 text-[15px] font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-[18px] md:mt-4 md:max-w-[9.5ch] md:text-[44px] lg:text-[52px]">
            <span className="block">{slide.titleLead}</span>
            <span className="mt-1 block text-[#8dc3ff]">{slide.titleAccent}</span>
          </h2>

          <p className="mt-2 max-w-[28ch] text-[8.7px] leading-[1.4] text-white/88 sm:text-[10px] md:mt-4 md:max-w-[40ch] md:text-base md:leading-7">
            {slide.description}
          </p>

          <div className="mt-4 hidden md:grid md:grid-cols-3 md:gap-x-5 md:gap-y-4 lg:mt-5">
            {slide.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-3 text-white/95">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#5daeff]/25 bg-[#0a2458]/45 text-[#8dc3ff]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold leading-5">{feature.title}</p>
                    <p className="mt-1 text-[12px] leading-5 text-white/72">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 hidden items-center gap-3 md:flex">
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2E86C1] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_rgba(46,134,193,0.35)] transition hover:bg-[#256fa0]">
              <Smartphone className="h-4 w-4" />
              Continue with Google
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              <LogIn className="h-4 w-4" />
              Sign In
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#8dc3ff]/35 bg-[#0a2458]/50 px-5 py-3 text-sm font-bold text-[#d9ecff] transition hover:bg-[#0d2f79]">
              <UserPlus className="h-4 w-4" />
              Create Account
            </button>
          </div>

          <div className="mt-3 hidden items-center gap-5 border-t border-white/10 pt-3 text-[13px] text-white/82 md:flex lg:mt-4 lg:pt-4">
            {slide.trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#8dc3ff]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-full items-center justify-center md:justify-end">
          <WelcomePhonePreview />
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
            className="max-h-[80px] sm:max-h-[105px] md:max-h-[220px] w-auto object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.30)]"
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
    const timer = window.setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, current === 0 ? 10000 : 6000);
    return () => window.clearTimeout(timer);
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
        transition={{ duration: 0.35 }}
        className="h-full"
      >
        {slide.type === 'review'
          ? <ReviewBannerSlide slide={slide} />
          : slide.type === 'built_in'
            ? <BuiltInBannerSlide slide={slide} />
            : <UploadedBannerSlide slide={slide} isMobile={isMobile} />}
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
