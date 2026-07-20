import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Smartphone, Headphones, Home as HomeIcon, Tv, ShieldCheck, Truck, Bot, Headset, Sparkles, CreditCard, ChevronRight } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { createPageUrl } from '@/lib/utils';

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

const BUILT_IN_BANNERS = [
  {
    id: 'fixed-phones',
    type: 'built_in',
    eyebrow: 'FMM CLASSICO',
    title: 'PHONES',
    subtitle: 'Latest models. Top performance. Unbeatable prices.',
    href: '/phones',
    theme: {
      shell: 'from-slate-950 via-[#081a3f] to-[#0e3b94]',
      glow: 'bg-blue-500/25',
      accent: 'text-blue-300',
      button: 'bg-blue-500 hover:bg-blue-400 text-white',
      ring: 'ring-blue-400/30',
      card: 'from-slate-900/90 to-blue-950/70 border-blue-300/20',
    },
    bullets: ['Latest models', 'Top performance', 'Unbeatable prices'],
    features: [
      { icon: ShieldCheck, label: 'Premium Quality' },
      { icon: Sparkles, label: 'Best Prices' },
      { icon: Truck, label: 'Fast Delivery' },
      { icon: Headset, label: 'Reliable Support' },
    ],
    showcase: [
      { label: 'iPhone Pro', tone: 'bg-slate-900 text-white' },
      { label: 'Galaxy Ultra', tone: 'bg-blue-100 text-slate-900' },
      { label: 'Pixel Series', tone: 'bg-zinc-900 text-white' },
      { label: 'OnePlus', tone: 'bg-cyan-100 text-slate-900' },
    ],
  },
  {
    id: 'fixed-accessories',
    type: 'built_in',
    eyebrow: 'EVERYDAY ESSENTIALS',
    title: 'PHONE ACCESSORIES',
    subtitle: 'Chargers, power banks, cases, earbuds and more for every device.',
    href: '/phone-accessories',
    theme: {
      shell: 'from-[#041b1f] via-[#063e52] to-[#0b8ca0]',
      glow: 'bg-cyan-400/20',
      accent: 'text-cyan-200',
      button: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
      ring: 'ring-cyan-300/30',
      card: 'from-slate-950/90 to-cyan-950/70 border-cyan-200/20',
    },
    bullets: ['Cases & screen protectors', 'Earbuds & speakers', 'Power & charging'],
    features: [
      { icon: Headphones, label: 'Audio Gear' },
      { icon: CreditCard, label: 'Budget Friendly' },
      { icon: Truck, label: 'Quick Dispatch' },
      { icon: ShieldCheck, label: 'Trusted Quality' },
    ],
    showcase: [
      { label: 'Power Banks', tone: 'bg-cyan-100 text-slate-900' },
      { label: 'Fast Chargers', tone: 'bg-white text-slate-900' },
      { label: 'Smart Cases', tone: 'bg-slate-900 text-white' },
      { label: 'Wireless Audio', tone: 'bg-sky-100 text-slate-900' },
    ],
  },
  {
    id: 'fixed-home',
    type: 'built_in',
    eyebrow: 'SMART LIVING',
    title: 'HOME APPLIANCES',
    subtitle: 'Cook, clean, cool and power your space with dependable appliances.',
    href: '/home-appliances',
    theme: {
      shell: 'from-[#0f2516] via-[#1f5b2f] to-[#7abf4b]',
      glow: 'bg-emerald-300/20',
      accent: 'text-emerald-100',
      button: 'bg-emerald-300 hover:bg-emerald-200 text-slate-950',
      ring: 'ring-emerald-200/30',
      card: 'from-green-950/80 to-emerald-900/60 border-emerald-200/20',
    },
    bullets: ['Cookers & blenders', 'Fridges & freezers', 'Fans & home comfort'],
    features: [
      { icon: HomeIcon, label: 'Home Ready' },
      { icon: ShieldCheck, label: 'Durable Picks' },
      { icon: Truck, label: 'Safe Delivery' },
      { icon: Headset, label: 'After-Sales Help' },
    ],
    showcase: [
      { label: 'Rice Cookers', tone: 'bg-lime-100 text-slate-900' },
      { label: 'Blenders', tone: 'bg-white text-slate-900' },
      { label: 'Fridges', tone: 'bg-emerald-950 text-white' },
      { label: 'Fans', tone: 'bg-green-100 text-slate-900' },
    ],
  },
  {
    id: 'fixed-electronics',
    type: 'built_in',
    eyebrow: 'UPGRADE YOUR SETUP',
    title: 'ELECTRONICS',
    subtitle: 'TVs, smart gadgets and dependable electronics for work and entertainment.',
    href: '/electronics',
    theme: {
      shell: 'from-[#140a25] via-[#3a1a6d] to-[#5f2eea]',
      glow: 'bg-violet-300/20',
      accent: 'text-violet-100',
      button: 'bg-violet-300 hover:bg-violet-200 text-slate-950',
      ring: 'ring-violet-200/30',
      card: 'from-violet-950/80 to-fuchsia-950/60 border-violet-200/20',
    },
    bullets: ['TVs & displays', 'Smart watches & gadgets', 'Reliable daily tech'],
    features: [
      { icon: Tv, label: 'Top Displays' },
      { icon: Sparkles, label: 'Latest Tech' },
      { icon: Truck, label: 'Nationwide Delivery' },
      { icon: ShieldCheck, label: 'Warranty Support' },
    ],
    showcase: [
      { label: 'Smart TVs', tone: 'bg-violet-100 text-slate-900' },
      { label: 'Wearables', tone: 'bg-white text-slate-900' },
      { label: 'Speakers', tone: 'bg-purple-950 text-white' },
      { label: 'Gaming Gear', tone: 'bg-fuchsia-100 text-slate-900' },
    ],
  },
  {
    id: 'fixed-services',
    type: 'built_in',
    eyebrow: 'WHY SHOP WITH US',
    title: 'SECURE. FAST. RELIABLE.',
    subtitle: 'Secure payment, fast delivery and responsive support built for modern online shopping.',
    href: '/Policies',
    theme: {
      shell: 'from-[#10131a] via-[#1c2636] to-[#334155]',
      glow: 'bg-white/10',
      accent: 'text-slate-100',
      button: 'bg-white hover:bg-slate-100 text-slate-950',
      ring: 'ring-white/20',
      card: 'from-slate-900/90 to-slate-800/60 border-white/15',
    },
    bullets: ['Secure payments', 'Fast delivery', '24/7 AI support'],
    features: [
      { icon: CreditCard, label: 'Secure Payment' },
      { icon: Truck, label: 'Fast Delivery' },
      { icon: Bot, label: '24/7 AI Support' },
      { icon: ShieldCheck, label: 'Trusted Store' },
    ],
    showcase: [
      { label: 'Payment Safety', tone: 'bg-white text-slate-900' },
      { label: 'Delivery Updates', tone: 'bg-slate-200 text-slate-900' },
      { label: 'Customer Support', tone: 'bg-slate-900 text-white' },
      { label: 'Verified Orders', tone: 'bg-sky-100 text-slate-900' },
    ],
  },
  {
    id: 'fixed-headsets',
    type: 'built_in',
    eyebrow: 'AUDIO PICKS',
    title: 'LATEST HEADSETS',
    subtitle: 'Wireless, gaming and everyday listening options with clean sound and comfort.',
    href: createPageUrl('Shop?category=earphones'),
    theme: {
      shell: 'from-[#1a1208] via-[#5e3415] to-[#d97706]',
      glow: 'bg-amber-300/20',
      accent: 'text-amber-100',
      button: 'bg-amber-300 hover:bg-amber-200 text-slate-950',
      ring: 'ring-amber-200/30',
      card: 'from-amber-950/80 to-orange-900/60 border-amber-200/20',
    },
    bullets: ['Wireless freedom', 'Strong bass', 'Comfort all day'],
    features: [
      { icon: Headphones, label: 'Wireless Audio' },
      { icon: Sparkles, label: 'New Arrivals' },
      { icon: Truck, label: 'Fast Delivery' },
      { icon: Headset, label: 'Daily Comfort' },
    ],
    showcase: [
      { label: 'Neckbands', tone: 'bg-amber-100 text-slate-900' },
      { label: 'Gaming Headsets', tone: 'bg-white text-slate-900' },
      { label: 'Earbuds', tone: 'bg-zinc-900 text-white' },
      { label: 'Bluetooth Speakers', tone: 'bg-orange-100 text-slate-900' },
    ],
  },
];

function BuiltInBannerSlide({ slide }) {
  return (
    <div className={`relative h-full w-full overflow-hidden bg-gradient-to-r ${slide.theme.shell}`}>
      <div className={`absolute -right-10 top-6 h-40 w-40 rounded-full blur-3xl ${slide.theme.glow}`} />
      <div className={`absolute -left-10 bottom-0 h-32 w-32 rounded-full blur-3xl ${slide.theme.glow}`} />
      <div className="relative z-10 grid h-full grid-cols-1 gap-4 px-4 py-5 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-7">
        <div className="flex flex-col justify-between min-w-0">
          <div>
            <div className={`mb-2 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur ${slide.theme.ring}`}>
              {slide.eyebrow}
            </div>
            <h2 className="max-w-xl text-3xl font-black tracking-tight text-white md:text-5xl">
              <span className={slide.theme.accent}>{slide.title}</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 md:text-lg">
              {slide.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slide.bullets.map((bullet) => (
                <span key={bullet} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                  {bullet}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:mt-5">
            <div className="flex flex-wrap gap-2 md:gap-3">
              {slide.features.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 rounded-2xl bg-black/20 px-3 py-2 text-white/95 backdrop-blur">
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] font-semibold md:text-xs">{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur">
              Shop now <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="hidden h-full items-center justify-end md:flex">
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            {slide.showcase.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className={`rounded-[1.75rem] border bg-gradient-to-br p-4 shadow-2xl ${slide.theme.card}`}
              >
                <div className="mb-8 flex items-start justify-between">
                  <div className="rounded-2xl bg-white/10 p-3 text-white backdrop-blur">
                    {slide.id === 'fixed-phones' && <Smartphone className="h-7 w-7" />}
                    {slide.id === 'fixed-accessories' && <Headphones className="h-7 w-7" />}
                    {slide.id === 'fixed-home' && <HomeIcon className="h-7 w-7" />}
                    {slide.id === 'fixed-electronics' && <Tv className="h-7 w-7" />}
                    {slide.id === 'fixed-services' && <ShieldCheck className="h-7 w-7" />}
                    {slide.id === 'fixed-headsets' && <Headphones className="h-7 w-7" />}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${card.tone}`}>FMM</span>
                </div>
                <p className="text-base font-extrabold text-white">{card.label}</p>
                <p className="mt-1 text-xs text-white/70">Ready for your next order</p>
              </motion.div>
            ))}
          </div>
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
      if (diff > 0) next();
      else prev();
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
