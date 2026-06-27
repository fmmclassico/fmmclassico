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

  useEffect(() => {
    const handler = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: async () => { try { const r = await base44.entities.CartItem.filter({ user_email: user?.email }); return Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []; } catch(e) { return []; } },
    enabled: !!user?.email && isAuthenticated,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

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

  const handleLogout = async () => {
    try { logout(); } catch (e) {}
    queryClient.clear();
    navigate('/');
    window.location.reload();
  };

  const requireAuth = (targetPath) => {
    sessionStorage.setItem('redirectAfterLogin', targetPath || window.location.pathname);
    navigate('/login');
  };

  const isAdmin = user?.isAdmin === true;

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

  // ═══════════════════════════════════════════
  // SEO META TAGS - FIXED
  // ═══════════════════════════════════════════
  useEffect(() => {
    document.title = 'FMM Classico - Phones & Accessories, Home Appliances and Electronics in Ghana';

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', 'FMM Classico is a trusted online and physical retail and wholesale store specializing in premium phone accessories, quality electronics, and home appliances. We are committed to providing authentic products at competitive prices to both individual customers and businesses.');
    setMeta('name', 'keywords', 'FMM Classico, FMMCLASSICO, fmm classico, phones accessories Ghana, home appliances Ghana, electronics Ghana, buy phones Ghana, chargers, earphones, smart watches, Tarkwa, UMAT, Accra, Ashongman Estate, online shopping Ghana, wholesale electronics Ghana');
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'author', 'FMM Classico');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'FMM Classico');
    setMeta('property', 'og:title', 'FMM Classico - Phones & Accessories, Home Appliances and Electronics');
    setMeta('property', 'og:description', 'Shop for premium phones & accessories, quality electronics, and trusted home appliances all in one place. Browse a wide selection of authentic products, enjoy competitive prices, secure payments, and fast, reliable delivery.');
    setMeta('property', 'og:image', 'https://fmmclassico.com/logo-white.png');
    setMeta('property', 'og:url', window.location.origin);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', 'FMM Classico - Phones & Accessories, Home Appliances and Electronics');
    setMeta('name', 'twitter:description', 'Shop for premium phones & accessories, quality electronics, and trusted home appliances all in one place. Authentic products, competitive prices, fast delivery across Ghana.');
    setMeta('name', 'twitter:image', 'https://fmmclassico.com/logo-white.png');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin;

    let jsonLd = document.querySelector('#fmm-jsonld');
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'fmm-jsonld'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "name": "FMM Classico",
        "alternateName": ["FMMCLASSICO", "FMMClassico", "fmmclassico", "FMM CLASSICO"],
        "description": "FMM Classico is a trusted online and physical retail and wholesale store specializing in premium phone accessories, quality electronics, and home appliances. We are committed to providing authentic products at competitive prices.",
        "url": window.location.origin,
        "logo": { "@type": "ImageObject", "url": window.location.origin + "/logo-white.png", "width": 512, "height": 512 },
        "image": window.location.origin + "/logo-white.png",
        "telephone": "0208207543",
        "address": [
          { "@type": "PostalAddress", "streetAddress": "UMAT Campus", "addressLocality": "Tarkwa", "addressRegion": "Western Region", "addressCountry": "GH" },
          { "@type": "PostalAddress", "streetAddress": "Ashongman Estate", "addressLocality": "Accra", "addressRegion": "Greater Accra", "addressCountry": "GH" }
        ],
        "areaServed": { "@type": "Country", "name": "Ghana" },
        "priceRange": "GHS",
        "openingHours": "Mo-Su 08:00-20:00",
        "currenciesAccepted": "GHS",
        "paymentAccepted": "Mobile Money, Credit Card, Bank Transfer",
        "sameAs": ["https://wa.me/233208207543"]
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "FMM Classico",
        "url": window.location.origin,
        "potentialAction": {
          "@type": "SearchAction",
          "target": { "@type": "EntryPoint", "urlTemplate": window.location.origin + "?page=Shop&search={search_term_string}" },
          "query-input": "required name=search_term_string"
        }
      }
    ]);
  }, []);

  const ASH = '#2E86C1';

  // ─── GUEST HEADER ───
  const GuestHeader = () => (
    <header className="sticky top-0 z-50 shadow-md" style={{ background: ASH }}>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-white font-black text-base tracking-tight">FMM CLASSICO</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="mt-2 relative">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90 focus:bg-white text-sm"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-gray-500" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2">
          <div ref={accountRef} className="relative">
            <button onClick={() => setAccountDropdownOpen(o => !o)} className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
              <User className="h-5 w-5" />
              <span className="text-[10px]">Account</span>
            </button>
            {accountDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border z-50 py-2">
                <p className="px-4 py-1.5 text-xs font-bold text-gray-500 uppercase">My Account</p>
                {[
                  { label: 'Sign In', path: '/login' },
                  { label: 'Sign Up', path: '/register' },
                ].map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setAccountDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 hover:bg-blue-50 text-sm text-gray-700 font-semibold">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => requireAuth('/Cart')} className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[10px]">Cart</span>
          </button>

          <div ref={helpRef} className="relative">
            <button onClick={() => setHelpOpen(o => !o)} className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1">
              <HelpCircle className="h-5 w-5" />
              <span className="text-[10px]">Help</span>
            </button>
            {helpOpen && (
              <div className="absolute top-full right-0 mt-1 w-60 bg-white rounded-xl shadow-xl border z-50 py-2">
                <p className="px-4 py-1.5 text-xs font-bold text-gray-800">Help Center</p>
                {[
                  { label: 'How to Place an Order', page: 'HowToUse' },
                  { label: 'How to Pay for an Order', page: 'HowToUse' },
                  { label: 'Store Policies', page: 'Policies' },
                  { label: 'About Us', page: 'About' },
                ].map(item => (
                  <Link key={item.label} to={createPageUrl(item.page)} onClick={() => setHelpOpen(false)}
                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium">
                    {item.label}
                  </Link>
                ))}
                <a href="https://wa.me/233208207543" target="_blank" rel="noopener noreferrer"
                  className="flex items-center px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-semibold">
                  WhatsApp Support
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  // ─── AUTHENTICATED HEADER ───
  const AuthenticatedHeader = () => (
    <header className="sticky top-0 z-50 shadow-md" style={{ background: ASH }}>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button className="text-white p-1"><Menu className="h-6 w-6" /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left font-black">FMM CLASSICO</SheetTitle>
                {user && <p className="text-xs text-gray-500">Hello, {user.full_name || user.email}</p>}
              </SheetHeader>
              <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
                {authenticatedMenuItems.map((item) => (
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between px-6 py-3 hover:bg-gray-100 transition-colors ${
                      currentPageName === item.page ? 'bg-gray-100 text-gray-900 border-r-4 border-gray-800' : 'text-gray-700'
                    }`}>
                    <span className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </span>
                    {item.badge > 0 && <Badge className="bg-red-500 text-white text-xs">{item.badge}</Badge>}
                  </Link>
                ))}
              </div>
              <div className="p-4 border-t">
                <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-red-600">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex-shrink-0">
            <span className="text-white font-black text-base">FMM CLASSICO</span>
          </Link>

          <div className="flex items-center gap-1">
            <div ref={helpRef} className="relative">
              <button onClick={() => setHelpOpen(o => !o)} className="flex flex-col items-center text-white px-1.5 py-0.5">
                <HelpCircle className="h-4 w-4" />
                <span className="text-[9px]">Help</span>
              </button>
              {helpOpen && (
                <div className="absolute top-full right-0 mt-1 w-60 bg-white rounded-xl shadow-xl border z-50 py-2">
                  <p className="px-4 py-1.5 text-xs font-bold text-gray-800">Help Center</p>
                  {[
                    { label: 'How to Place an Order', page: 'HowToUse' },
                    { label: 'How to Pay for an Order', page: 'HowToUse' },
                    { label: 'Track Your Order', page: 'Orders' },
                    { label: 'Cancel an Order', page: 'Orders' },
                    { label: 'Store Policies', page: 'Policies' },
                  ].map(item => (
                    <Link key={item.label} to={createPageUrl(item.page)} onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium">
                      {item.label}
                    </Link>
                  ))}
                  <a href="https://wa.me/233208207543" target="_blank" rel="noopener noreferrer"
                    className="flex items-center px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-semibold">
                    WhatsApp Support
                  </a>
                  <Link to={createPageUrl('Chat')} onClick={() => setHelpOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium">
                    <Bot className="w-4 h-4" /> Live Chat
                  </Link>
                </div>
              )}
            </div>

            <Link to={createPageUrl('Notifications')} className="flex flex-col items-center text-white px-1.5 py-0.5 relative">
              <Bell className="h-4 w-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
              <span className="text-[9px]">Alerts</span>
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-2 relative">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="h-4 w-4 text-gray-500" />
          </button>
        </form>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated ? <AuthenticatedHeader /> : <GuestHeader />}

      <main className="relative">
        {currentPageName !== 'Home' && (
          <div className="px-4 pt-3">
            <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
              <ChevronRight className="h-4 w-4 rotate-180" />
              <span>Back</span>
            </button>
          </div>
        )}
        {children}
      </main>

      {isAuthenticated && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="flex items-center justify-around py-2">
            <Link to={createPageUrl('Home')} className="flex flex-col items-center text-gray-600 hover:text-blue-700">
              <Home className="h-5 w-5" />
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link to={createPageUrl('Categories')} className="flex flex-col items-center text-gray-600 hover:text-blue-700">
              <Grid3X3 className="h-5 w-5" />
              <span className="text-[10px] font-medium">Categories</span>
            </Link>
            <Link to={createPageUrl('Cart')} className="flex flex-col items-center text-gray-600 hover:text-blue-700 relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
              <span className="text-[10px] font-medium">Cart</span>
            </Link>
            <Link to={createPageUrl('Account')} className="flex flex-col items-center text-gray-600 hover:text-blue-700">
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Account</span>
            </Link>
          </div>
        </nav>
      )}

      {isAuthenticated && <div className="h-16" />}

      {showScrollTop && currentPageName === 'Home' && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed ${isAuthenticated ? 'bottom-24 md:bottom-8' : 'bottom-8'} right-4 z-50 text-white rounded-full p-2.5 shadow-xl`}
          style={{ background: ASH }}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      {currentPageName === 'ProductDetail' && (
        <>
          <a href="https://wa.me/233208207543" target="_blank" rel="noopener noreferrer"
            className={`fixed ${isAuthenticated ? 'bottom-20' : 'bottom-4'} left-4 z-40 bg-green-500 text-white rounded-full p-3 shadow-lg`}>
            <Phone className="h-5 w-5" />
            <span className="sr-only">WA</span>
          </a>
          {isAuthenticated && (
            <Link to={createPageUrl('Chat')}
              className={`fixed ${isAuthenticated ? 'bottom-20' : 'bottom-4'} right-4 z-40 bg-blue-600 text-white rounded-full p-3 shadow-lg`}>
              <Bot className="h-5 w-5" />
              <span className="sr-only">AI</span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
