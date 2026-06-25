/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Home, 
  ShoppingCart,
  User, 
  Menu, 
  X, 
  Search, 
  Info, 
  Settings, 
  Grid3X3, 
  MessageCircle,
  Package,
  LogOut,
  ChevronRight,
  ChevronUp,
  Bot,
  Bell,
  Send,
  Phone,
  Star,
  Gem,
  FileText,
  Shield,
  HelpCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/lib/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Layout({ children, currentPageName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const helpRef = useRef(null);
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close help dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cart count — only for authenticated users
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
   queryFn: async () => { try { const r = await base44.entities.CartItem.filter({ user_email: user?.email }); return Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []; } catch(e) { return []; } },
    enabled: !!user?.email && isAuthenticated,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Notifications — only for authenticated users
   const { data: userNotifications = [] } = useQuery({
  queryKey: ['notifications', user?.email],
  queryFn: async () => {
    try {
      const r = await base44.entities.Notification.filter(
        { user_email: user?.email },
        '-created_date',
        50
      );
      return Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
    } catch (e) {
      console.error('Notifications load failed:', e);
      return [];
    }
  },
  enabled: !!user?.email && isAuthenticated,
  staleTime: 20000,
  refetchInterval: 15000,
});

  useEffect(() => {
    if (!user?.email || !isAuthenticated) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data.user_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
      }
    });
    return unsubscribe;
  }, [user?.email, isAuthenticated, queryClient]);

  const cartCount = Array.isArray(cartItems) ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
  const unreadNotifCount = Array.isArray(userNotifications) ? userNotifications.filter(n => !n.is_read).length : 0;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Shop?search=${encodeURIComponent(searchQuery)}`));
      setSearchQuery('');
    }
  };

  // LOGOUT: clears session and returns user to Guest Homepage (not /login)
  const handleLogout = async () => {
    try {
      logout();
    } catch (e) {<<<<<<< HEAD
      console.error('Logout failed', e);
    }
    queryClient.clear();
    navigate('/');
    window.location.reload(); // force clean state
  };

  // Redirect guest to login, saving where they came from
  const requireAuth = (targetPath) => {
    sessionStorage.setItem('redirectAfterLogin', targetPath || window.location.pathname);
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  // Authenticated menu items (hamburger menu)
  const authenticatedMenuItems = [
    { icon: Home, label: 'Home', page: 'Home' },
    { icon: Grid3X3, label: 'Categories', page: 'Categories' },
    { icon: ShoppingCart, label: 'Cart', page: 'Cart', badge: cartCount },
    { icon: Package, label: 'My Orders', page: 'Orders' },
    { icon: Bell, label: 'Notifications', page: 'Notifications' },
    { icon: MessageCircle, label: 'Chat Support', page: 'Chat' },
    { icon: MessageCircle, label: 'Feedback / Report Issue', page: 'Feedback' },
    { icon: Info, label: 'How to Use the Site', page: 'HowToUse' },
    { icon: Info, label: 'About Us', page: 'About' },
    { icon: Settings, label: 'Settings', page: 'Settings' },
    ...(isAdmin ? [
      { icon: Settings, label: 'Admin Orders', page: 'AdminOrders' },
      { icon: MessageCircle, label: 'Customer Messages', page: 'AdminMessages' },
      { icon: Settings, label: 'Invoices', page: 'AdminInvoice' },
      { icon: Bell, label: 'Promo Banners', page: 'AdminBanners' },
      { icon: Send, label: 'Broadcast to Customers', page: 'AdminBroadcast' },
      { icon: Phone, label: 'WhatsApp Broadcast', page: 'AdminSMSBroadcast' },
      { icon: Star, label: 'Manage Reviews', page: 'AdminReviews' },
      { icon: Settings, label: 'Manage Products', page: 'AdminProducts' },
      { icon: Settings, label: 'Category Images', page: 'AdminCategoryImages' },
      { icon: Bell, label: 'Promo Banner Cards', page: 'AdminPromoBanners2' },
      { icon: Gem, label: 'Brand Logos', page: 'AdminBrandLogos' },
      { icon: Info, label: 'Edit About Page', page: 'AdminAbout' },
      { icon: Settings, label: 'Edit Page Content', page: 'AdminPageContent' },
      { icon: Home, label: 'Edit Home & Categories', page: 'AdminHomeEditor' },
      { icon: Settings, label: 'Interface Control', page: 'AdminInterfaceControl' },
      { icon: Bot, label: 'AI Assistant', page: 'AdminAI' },
      { icon: Shield, label: 'Admin Access Control', page: 'AdminAccessControl' },
      { icon: Settings, label: 'Contact Settings', page: 'AdminContactSettings' },
    ] : []),
  ];

  // SEO meta tags
  useEffect(() => {
    const merchantPhone = import.meta.env.VITE_MERCHANT_PHONE || '+233XXXXXXXXX';
    const merchantEmail = import.meta.env.VITE_MERCHANT_EMAIL || 'merchant@example.com';
    const merchantWhatsapp = import.meta.env.VITE_MERCHANT_WHATSAPP_URL || `https://wa.me/XXXXXXXXXXX`;
    document.title = 'FMM CLASSICO – Phone Accessories, Electronics & Home Appliances in Ghana | FMMCLASSICO';
    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('name', 'description', 'FMM CLASSICO (FMMCLASSICO) – Your trusted online store for premium phone accessories, electronic appliances and home appliances in Ghana. Shop chargers, earphones, phone cases, smart watches and more. Fast delivery to Tarkwa (UMAT Campus), Accra (Ashongman Estate) and across Ghana.');
    setMeta('name', 'keywords', 'FMMCLASSICO, FMM CLASSICO, fmmclassico, phone accessories Ghana, buy phones Ghana, chargers Ghana, earphones Ghana, smart watches Ghana, electronic appliances Ghana, home appliances Ghana, Tarkwa accessories, UMAT campus shop, Accra phone shop, Ashongman Estate, online shopping Ghana');
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'googlebot', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'author', 'FMM CLASSICO');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'FMM CLASSICO');
    setMeta('property', 'og:title', 'FMM CLASSICO – Phone Accessories, Electronics & Home Appliances in Ghana');
    setMeta('property', 'og:description', 'Shop premium phone accessories, electronics and home appliances at FMM CLASSICO. Fast delivery across Ghana.');
    setMeta('property', 'og:image', 'https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg');
    setMeta('property', 'og:url', window.location.origin);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', 'FMM CLASSICO – Phone Accessories & Electronics Ghana');
    setMeta('name', 'twitter:description', 'Premium phone accessories, electronics & home appliances. Fast delivery across Ghana. Shop FMMCLASSICO now!');
    setMeta('name', 'twitter:image', 'https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg');
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin;
    let jsonLd = document.querySelector('#fmm-jsonld');
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'fmm-jsonld'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "name": "FMM CLASSICO",
        "alternateName": ["FMMCLASSICO", "FMMClassico", "fmmclassico"],
        "description": "FMM CLASSICO is an online store for premium phone accessories, electronic appliances and home appliances in Ghana.",
        "url": window.location.origin,
        "logo": { "@type": "ImageObject", "url": "https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg", "width": 1200, "height": 1200 },
        "image": "https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg",
          "telephone": merchantPhone,
          "email": merchantEmail,
        "address": [
          { "@type": "PostalAddress", "streetAddress": "UMAT Campus", "addressLocality": "Tarkwa", "addressRegion": "Western Region", "addressCountry": "GH" },
          { "@type": "PostalAddress", "streetAddress": "Ashongman Estate", "addressLocality": "Accra", "addressRegion": "Greater Accra", "addressCountry": "GH" }
        ],
        "areaServed": { "@type": "Country", "name": "Ghana" },
        "priceRange": "₵₵",
        "openingHours": "Mo-Su 08:00-20:00",
        "currenciesAccepted": "GHS",
        "paymentAccepted": "Mobile Money, Credit Card, Bank Transfer",
          "sameAs": [merchantWhatsapp]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "FMM CLASSICO",
        "url": window.location.origin,
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": `${window.location.origin}?page=Shop&search={search_term_string}` },
          "query-input": "required name=search_term_string"
        }
      }
    ]);
  }, []);

  const ASH = '#2E86C1';
  const ASH_HOVER = '#2578ae';

  // ─── GUEST HEADER (unauthenticated) ───────────────────────────────────────
  const GuestHeader = () => (
    <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* Logo */}
          <Link to={createPageUrl('Home')} className="flex items-center flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              FMM <span className="text-white">CLASSICO</span>
            </h1>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex flex-1 max-w-xl mx-2 md:mx-6">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white text-sm"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                style={{ background: ASH }}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Right icons: Account | Cart | Help */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Account Dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors"
                onClick={() => setAccountDropdownOpen(o => !o)}
              >
                <User className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">Account</span>
              </button>
              {accountDropdownOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase px-4 pt-1 pb-2 tracking-wider">My Account</p>
                  {[
                    { label: '🔑 Sign In', path: '/login' },
                    { label: '📝 Sign Up', path: '/register' },
                  ].map(item => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setAccountDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 font-semibold transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t my-1" />
                  {[
                    { label: '👤 My Account', path: '/login' },
                    { label: '📦 Track Order', path: '/login' },
                    { label: '❌ Cancel Order', path: '/login' },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { setAccountDropdownOpen(false); requireAuth(item.path); }}
                      className="flex items-center w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-600 font-medium transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart (guests can view cart but checkout requires login) */}
            <button
              onClick={() => requireAuth('/Cart')}
              className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors relative"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="text-[10px] font-semibold leading-tight">Cart</span>
            </button>

            {/* Help */}
            <div className="relative" ref={helpRef}>
              <button
                className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors"
                onClick={() => setHelpOpen(o => !o)}
              >
                <HelpCircle className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">Help</span>
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase px-4 pt-1 pb-2 tracking-wider">Help Center</p>
                  <div className="px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-100">
                    <p className="font-semibold text-gray-700 mb-1">👋 Need help?</p>
                    <p>Browse the guides below or chat with us on WhatsApp.</p>
                  </div>
                  {[
                    { label: '🛍️ How to Place an Order', page: 'HowToUse' },
                    { label: '💳 How to Pay for an Order', page: 'HowToUse' },
                    { label: '📄 Store Policies', page: 'Policies' },
                    { label: 'ℹ️ About Us', page: 'About' },
                  ].map(item => (
                    <Link key={item.page + item.label} to={createPageUrl(item.page)} onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t my-1" />
                  <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-medium transition-colors">
                    <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Support
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  // ─── AUTHENTICATED HEADER ─────────────────────────────────────────────────
  const AuthenticatedHeader = () => (
    <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Menu */}
          <div className="flex items-center gap-2">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-7 w-7" style={{color:'#fff', opacity:1, strokeWidth:3}} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-6 text-white" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
                  <SheetTitle className="text-white text-xl font-bold">FMM CLASSICO</SheetTitle>
                  {user && (
                    <p className="text-gray-300 text-sm mt-1">Hello, {user.full_name || user.email}</p>
                  )}
                </SheetHeader>
                <div className="py-4 overflow-y-auto" style={{maxHeight: 'calc(100vh - 120px)'}}>
                  {authenticatedMenuItems.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center justify-between px-6 py-3 hover:bg-gray-100 transition-colors ${
                        currentPageName === item.page ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <Badge style={{ background: ASH }}>{item.badge}</Badge>
                      )}
                    </Link>
                  ))}
                  <div className="border-t my-4" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-3 w-full hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            <Link to={createPageUrl('Home')} className="flex items-center">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                FMM <span className="text-white">CLASSICO</span>
              </h1>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Search for phone accessories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                style={{ background: ASH }}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Help Button */}
            <div className="relative" ref={helpRef}>
              <button className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors" onClick={() => setHelpOpen(o => !o)}>
                <Info className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-tight">Help</span>
              </button>
              {helpOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase px-4 pt-1 pb-2 tracking-wider">Help Center</p>
                  <div className="px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-100">
                    <p className="font-semibold text-gray-700 mb-1">👋 Need help?</p>
                    <p>Browse the guides below or chat with us directly on WhatsApp or our AI Chat.</p>
                  </div>
                  {[
                    { label: '🛍️ How to Place an Order', page: 'HowToUse' },
                    { label: '💳 How to Pay for an Order', page: 'HowToUse' },
                    { label: '📦 Track Your Order', page: 'Orders' },
                    { label: '❌ Cancel an Order', page: 'Orders' },
                    { label: '📄 Store Policies', page: 'Policies' },
                  ].map(item => (
                    <Link key={item.page + item.label} to={createPageUrl(item.page)} onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t my-1" />
                  <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-medium transition-colors">
                    <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Support
                  </a>
                  <Link to={createPageUrl('Chat')} onClick={() => setHelpOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
                    <Bot className="h-4 w-4" /> Live Chat
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications */}
            <Link to={createPageUrl('Notifications')} className="relative flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors">
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold leading-tight">Alerts</span>
            </Link>
          </div>
        </div>

        {/* Search Bar - Mobile (authenticated) */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
              style={{ background: ASH }}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full" style={{maxWidth:'100vw', boxSizing:'border-box'}}>

      {/* Render the correct header based on auth state */}
      {isAuthenticated ? <AuthenticatedHeader /> : <GuestHeader />}

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {currentPageName !== 'Home' && (
          <div className="container mx-auto px-4 pt-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
            >
              <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Bottom Navigation — ONLY for authenticated users */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
          <div className="flex items-center justify-around py-3 max-w-2xl mx-auto">
            <Link to={createPageUrl('Home')} className={`flex flex-col items-center p-2 ${currentPageName === 'Home' ? 'text-gray-800' : 'text-gray-400'}`}>
              <Home className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </Link>
            <Link to={createPageUrl('Categories')} className={`flex flex-col items-center p-2 ${currentPageName === 'Categories' ? 'text-gray-800' : 'text-gray-400'}`}>
              <Grid3X3 className="h-5 w-5" />
              <span className="text-xs mt-1">Categories</span>
            </Link>
            <Link to={createPageUrl('Cart')} className={`flex flex-col items-center p-2 relative ${currentPageName === 'Cart' ? 'text-gray-800' : 'text-gray-400'}`}>
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-white text-[11px] font-bold" style={{ background: ASH }}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1">Cart</span>
            </Link>
            <Link to={createPageUrl('Settings')} className={`flex flex-col items-center p-2 ${currentPageName === 'Settings' ? 'text-gray-800' : 'text-gray-400'}`}>
              <User className="h-5 w-5" />
              <span className="text-xs mt-1">Account</span>
            </Link>
          </div>
        </nav>
      )}

      {/* Spacer for bottom nav — only needed when authenticated */}
      {isAuthenticated && <div className="h-20" />}

      {/* Scroll to top button */}
      {showScrollTop && currentPageName === 'Home' && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed ${isAuthenticated ? 'bottom-24 md:bottom-8' : 'bottom-8'} right-4 z-50 text-white rounded-full p-2.5 shadow-xl transition-all hover:scale-110 active:scale-95`}
          style={{ background: ASH, boxShadow: '0 4px 16px rgba(31,41,55,0.4)' }}
          aria-label="Back to top"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Floating WhatsApp + AI Chat Buttons — only on ProductDetail page */}
      {currentPageName === 'ProductDetail' && (
        <>
          <a
            href="https://wa.me/233509896035"
            target="_blank"
            rel="noopener noreferrer"
            className={`fixed ${isAuthenticated ? 'bottom-24 md:bottom-8' : 'bottom-8'} right-1 z-40 flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 opacity-80 hover:opacity-100`}
            style={{ boxShadow: '0 4px 20px rgba(34,197,94,0.5)', fontSize: '10px' }}
          >
            <svg className="h-3 w-3 fill-white flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="font-bold">WA</span>
          </a>
          {isAuthenticated && (
            <Link
              to={createPageUrl('Chat')}
              className="fixed bottom-36 md:bottom-16 right-1 z-40 flex items-center gap-1 text-white px-2 py-1 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 opacity-80 hover:opacity-100"
              style={{ background: ASH, boxShadow: '0 4px 20px rgba(31,41,55,0.5)', fontSize: '10px' }}
            >
              <Bot className="h-3 w-3 flex-shrink-0" />
              <span className="font-bold">AI</span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
