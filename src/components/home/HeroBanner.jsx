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

function normalizeQueryResult(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return [];
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
    { title: 'Save Wishlist', icon: Heart },
    { title: 'Track Orders', icon: Truck },
    { title: 'Order History', icon: ReceiptText },
    { title: 'Manage Account', icon: UserCircle2 },
    { title: 'Secure Checkout', icon: ShieldCheck },
    { title: 'Exclusive Offers', icon: BadgePercent },
  ],
  trustItems: ['100% Genuine Products', 'Trusted Support', 'Fast & Reliable Delivery'],
};

const BUILT_IN_BANNERS = [
  {
    id: 'fixed-phones',
    type: 'built_in',
    title: 'PHONES',
    subtitle: 'Latest models. Top performance. Unbeatable prices.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784561540/ChatGPT_Image_Jul_20_2026_03_19_56_PM_vje886.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-accessories',
    type: 'built_in',
    title: 'PHONE ACCESSORIES',
    subtitle: 'Chargers, earbuds, cases, speakers and more for everyday use.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784299259/ChatGPT_Image_Jul_17_2026_02_37_29_PM_qlihyw.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-home',
    type: 'built_in',
    title: 'HOME APPLIANCES',
    subtitle: 'Quality appliances for your kitchen, comfort and daily living.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784300533/ChatGPT_Image_Jul_17_2026_03_01_53_PM_hne4gq.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-electronics',
    type: 'built_in',
    title: 'ELECTRONICS',
    subtitle: 'Smart gadgets and everyday electronics at trusted prices.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784301769/ChatGPT_Image_Jul_17_2026_03_20_50_PM_b8mhgl.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-smartwatch',
    type: 'built_in',
    title: 'SMART WATCH',
    subtitle: 'Stay connected with stylish smart watches and wearables.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784302040/ChatGPT_Image_Jul_17_2026_03_27_00_PM_tv3lay.png',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-television',
    type: 'built_in',
    title: 'TELEVISION',
    subtitle: 'Big-screen viewing with sharp picture and dependable performance.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1783605377/SLE32S700TCS-2_mowhla.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-projectors',
    type: 'built_in',
    title: 'PROJECTORS',
    subtitle: 'Project larger, brighter visuals for home and office use.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1783605199/519qw7On-vL_b03hux.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-laptops',
    type: 'built_in',
    title: 'LAPTOPS',
    subtitle: 'Affordable and high-quality laptops for work, school and business.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784634806/laptop-new-arrivals-cheap-price-laptops-high-quality-core-i7-laptops-brand-new-b0c29e0018_qehdjx.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
  {
    id: 'fixed-infrared-cooker',
    type: 'built_in',
    title: 'INFRARED COOKER',
    subtitle: 'Fast, compact cooking made easy for modern kitchens.',
    imageUrl: 'https://res.cloudinary.com/xz7s2qzt/image/upload/v1784635290/Single-Burner-Electric-Infrared-Cooker-Ceramic-Stove-Hob-Cooktop-Electrical_ucsfgz.jpg',
    gradient: BLUE_GRADIENT,
    titleClass: BLUE_TITLE,
  },
];

function WelcomePhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[96px] sm:max-w-[118px] md:max-w-[178px] lg:max-w-[196px]">
      <div className="absolute -bottom-1.5 left-1/2 h-4 w-[86%] -translate-x-1/2 rounded-full bg-[#02153f]/70 blur-md md:-bottom-2 md:h-5" />
      <div className="absolute -bottom-0.5 left-1/2 h-2.5 w-[92%] -translate-x-1/2 rounded-[999px] border border-[#1e5bb8]/35 bg-[#072764] md:h-3" />

      <div className="relative ml-auto w-[82px] rotate-[9deg] rounded-[1.35rem] border border-white/18 bg-[#0d1629] p-[4px] shadow-[0_14px_32px_rgba(0,0,0,0.28)] md:w-[164px] md:rounded-[2rem] md:p-[6px] lg:w-[182px]">
        <div className="absolute left-1/2 top-[6px] z-20 h-[6px] w-[28px] -translate-x-1/2 rounded-full bg-[#101827] md:top-2.5 md:h-3 md:w-14" />

        <div className="overflow-hidden rounded-[1rem] bg-white md:rounded-[1.5rem]">
          <div className="px-2 pt-3 pb-2 md:px-3 md:pt-4 md:pb-2.5">
            <div className="flex items-center justify-between text-[#0f224f]">
              <Menu className="h-3 w-3 md:h-4 md:w-4" />
              <div className="flex items-center gap-1 text-[7px] font-black tracking-tight md:text-[11px]">
                <span style={{ color: BLUE_ACCENT }}>FMM</span>
                <span>CLASSICO</span>
              </div>
              <Bell className="h-3 w-3 md:h-4 md:w-4" />
            </div>

            <div className="mt-2 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 md:gap-1.5 md:px-2.5 md:py-1.5">
              <Search className="h-2.5 w-2.5 text-slate-400 md:h-3 md:w-3" />
              <span className="text-[5.8px] text-slate-400 md:text-[8px]">Search products...</span>
            </div>

            <div className="mt-2 rounded-[0.8rem] bg-gradient-to-r from-[#03143f] via-[#0b2a63] to-[#2E86C1] px-2 py-2 text-white md:mt-3 md:rounded-[1rem] md:px-3 md:py-3">
              <p className="text-[7px] font-black leading-tight md:text-[12px]">iPhone 15 Pro</p>
              <p className="mt-0.5 text-[5px] text-white/80 md:text-[7px]">Titanium. So strong.</p>
              <div className="mt-1 inline-flex rounded-full bg-white px-1.5 py-0.5 text-[4.8px] font-bold text-[#0b3ea9] md:mt-2 md:text-[6px]">
                Shop Now
              </div>
            </div>

            <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[4.8px] font-medium text-slate-600 md:text-[6px]">
              <div className="flex flex-col items-center gap-0.5"><Smartphone className="h-2 w-2 md:h-3 md:w-3" /><span>Phones</span></div>
              <div className="flex flex-col items-center gap-0.5"><ShoppingBag className="h-2 w-2 md:h-3 md:w-3" /><span>Accessories</span></div>
              <div className="flex flex-col items-center gap-0.5"><ShieldCheck className="h-2 w-2 md:h-3 md:w-3" /><span>Electronics</span></div>
              <div className="flex flex-col items-center gap-0.5"><ReceiptText className="h-2 w-2 md:h-3 md:w-3" /><span>Appliances</span></div>
              <div className="flex flex-col items-center gap-0.5"><Heart className="h-2 w-2 md:h-3 md:w-3" /><span>Lifestyle</span></div>
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.10),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_84%,rgba(46,134,193,0.16),transparent_22%)]" />

      <div className="relative z-10 grid h-full grid-cols-[minmax(0,1fr)_92px] items-center gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_112px] sm:px-4 md:grid-cols-[minmax(0,1.08fr)_184px] md:gap-4 md:px-7 md:py-4 lg:grid-cols-[minmax(0,1.08fr)_200px] lg:px-8 lg:py-4">
        <div className="min-w-0 self-center text-white">
          <span className="inline-flex items-center rounded-full border border-[#5daeff]/35 bg-[#0d2f79]/55 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.18em] text-[#d9ecff] sm:text-[8px] md:px-3 md:py-1.5 md:text-[10px]">
            {slide.eyebrow}
          </span>

          <h2 className="mt-2 text-[14px] font-black leading-[1.04] tracking-[-0.03em] text-white sm:text-[16px] md:mt-3 md:max-w-[11ch] md:text-[28px] lg:text-[32px]">
            <span className="block">{slide.titleLead}</span>
            <span className="mt-1 block text-[#8dc3ff]">{slide.titleAccent}</span>
          </h2>

          <p className="mt-2 max-w-[27ch] text-[8px] leading-[1.38] text-white/86 sm:text-[8.8px] md:mt-2.5 md:max-w-[40ch] md:text-[12px] md:leading-5 lg:text-[13px]">
            {slide.description}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-1.5 md:mt-3 md:gap-2 lg:gap-2.5">
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

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[7px] text-white/80 sm:text-[7.5px] md:mt-3 md:gap-x-4 md:text-[10px] lg:text-[11px]">
            {slide.trustItems.map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-2.5 w-2.5 text-[#8dc3ff] md:h-3.5 md:w-3.5" />
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
            src={slide.imageUrl}
            alt={slide.title}
            className="max-h-[84px] sm:max-h-[100px] md:max-h-[160px] lg:max-h-[176px] w-auto object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.26)]"
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
            ? <BuiltInBannerSlide slide={slide} />
            : <UploadedBannerSlide slide={slide} isMobile={isMobile} />}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="fmm-flyer-hero-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="fmm-flyer-hero-frame">
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
