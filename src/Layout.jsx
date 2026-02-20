/* eslint-disable */
import React, { useState, useEffect } from 'react';
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
  Bot,
  Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
    };
    checkAuth();
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: () => base44.entities.CartItem.filter({ user_email: user?.email }),
    enabled: !!user?.email
  });

  const { data: userNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  // Real-time notification updates
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data.user_email === user.email) {
        const queryClient = useQueryClient();
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
      }
    });
    return unsubscribe;
  }, [user?.email]);

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const unreadNotifCount = userNotifications.filter(n => !n.is_read).length;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Shop?search=${encodeURIComponent(searchQuery)}`));
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isAdmin = user?.role === 'admin';

          const menuItems = [
            { icon: Home, label: 'Home', page: 'Home' },
            { icon: Grid3X3, label: 'Categories', page: 'Categories' },
            { icon: ShoppingCart, label: 'Cart', page: 'Cart', badge: cartCount },
            { icon: Package, label: 'My Orders', page: 'Orders' },
            { icon: Bell, label: 'Notifications', page: 'Notifications' },
            { icon: MessageCircle, label: 'Chat Support', page: 'Chat' },
            { icon: MessageCircle, label: 'Feedback / Report Issue', page: 'Feedback' },
            { icon: Info, label: 'About Us', page: 'About' },
            { icon: Settings, label: 'Settings', page: 'Settings' },
            ...(isAdmin ? [
            { icon: Settings, label: 'Admin Orders', page: 'AdminOrders' },
            { icon: MessageCircle, label: 'Customer Messages', page: 'AdminMessages' },
          ] : []),
          ];

  const categories = [
    { id: 'phones', name: 'Phones' },
    { id: 'phone_cases', name: 'Phone Cases' },
    { id: 'chargers', name: 'Chargers' },
    { id: 'earphones', name: 'Earphones' },
    { id: 'cables', name: 'Cables' },
    { id: 'power_banks', name: 'Power Banks' },
    { id: 'screen_protectors', name: 'Screen Protectors' },
    { id: 'holders', name: 'Holders & Mounts' },
    { id: 'speakers', name: 'Speakers' },
    { id: 'smart_watches', name: 'Smart Watches' },
    { id: 'electronic_appliances', name: 'Electronic Appliances' },
    { id: 'home_appliances', name: 'Home Appliances' },
  ];



  // SEO: set page title and meta tags for all search engines
  useEffect(() => {
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
    setMeta('name', 'bingbot', 'index, follow');
    setMeta('name', 'author', 'FMM CLASSICO');
    setMeta('name', 'revisit-after', '3 days');
    setMeta('name', 'language', 'English');
    setMeta('name', 'rating', 'General');
    setMeta('name', 'geo.region', 'GH');
    setMeta('name', 'geo.placename', 'Ghana');
    setMeta('name', 'geo.position', '5.0;-1.0');
    setMeta('name', 'ICBM', '5.0, -1.0');

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'FMM CLASSICO');
    setMeta('property', 'og:title', 'FMM CLASSICO – Phone Accessories, Electronics & Home Appliances in Ghana');
    setMeta('property', 'og:description', 'Shop premium phone accessories, electronics and home appliances at FMM CLASSICO. Fast delivery across Ghana. Tarkwa (UMAT Campus) & Accra (Ashongman Estate).');
    setMeta('property', 'og:image', 'https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg');
    setMeta('property', 'og:image:alt', 'FMM CLASSICO – Phone Accessories, Electronics & Home Appliances Ghana');
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:url', window.location.origin);
    setMeta('property', 'og:locale', 'en_GH');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', 'FMM CLASSICO – Phone Accessories & Electronics Ghana');
    setMeta('name', 'twitter:description', 'Premium phone accessories, electronics & home appliances. Fast delivery across Ghana. Shop FMMCLASSICO now!');
    setMeta('name', 'twitter:image', 'https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin;

    // Bing/Yahoo verification placeholder (add your own verification code if needed)
    setMeta('name', 'msvalidate.01', '');
    setMeta('name', 'yandex-verification', '');

    // Prompt search engines to index
    let pingGoogle = document.querySelector('#ping-google');
    if (!pingGoogle) {
      pingGoogle = document.createElement('link');
      pingGoogle.id = 'ping-google';
      pingGoogle.rel = 'preconnect';
      pingGoogle.href = 'https://www.google.com';
      document.head.appendChild(pingGoogle);
    }

    let jsonLd = document.querySelector('#fmm-jsonld');
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'fmm-jsonld'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "name": "FMM CLASSICO",
        "alternateName": ["FMMCLASSICO", "FMMClassico", "fmmclassico"],
        "description": "FMM CLASSICO is an online store for premium phone accessories, electronic appliances and home appliances in Ghana. Serving Tarkwa (UMAT Campus) and Accra (Ashongman Estate).",
        "url": window.location.origin,
        "logo": { "@type": "ImageObject", "url": "https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg", "width": 1200, "height": 1200 },
        "image": "https://i.pinimg.com/1200x/7b/12/4f/7b124f42aefb35999bab0f52ebf07e85.jpg",
        "telephone": "+233599676419",
        "email": "fmmclassico@gmail.com",
        "address": [
          { "@type": "PostalAddress", "streetAddress": "UMAT Campus", "addressLocality": "Tarkwa", "addressRegion": "Western Region", "addressCountry": "GH" },
          { "@type": "PostalAddress", "streetAddress": "Ashongman Estate", "addressLocality": "Accra", "addressRegion": "Greater Accra", "addressCountry": "GH" }
        ],
        "areaServed": { "@type": "Country", "name": "Ghana" },
        "priceRange": "₵₵",
        "openingHours": "Mo-Su 08:00-20:00",
        "currenciesAccepted": "GHS",
        "paymentAccepted": "Mobile Money, Credit Card, Bank Transfer",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "FMM CLASSICO Products",
          "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Phone Accessories Ghana" } },
            { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Electronic Appliances Ghana" } },
            { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Home Appliances Ghana" } }
          ]
        },
        "sameAs": [
          "https://wa.me/233599676419"
        ]
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Menu */}
            <div className="flex items-center gap-3">
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-orange-600">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
                    <SheetTitle className="text-white text-xl font-bold">FMM CLASSICO</SheetTitle>
                    {user && (
                      <p className="text-orange-100 text-sm mt-1">Hello, {user.full_name || user.email}</p>
                    )}
                  </SheetHeader>
                  <div className="py-4">
                    {menuItems.map((item) => (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center justify-between px-6 py-3 hover:bg-orange-50 transition-colors ${
                          currentPageName === item.page ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-500' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        {item.badge > 0 && (
                          <Badge className="bg-orange-500">{item.badge}</Badge>
                        )}
                      </Link>
                    ))}
                    
                    <div className="border-t my-4" />
                    
                    <div className="px-6 py-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categories</p>
                    </div>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={createPageUrl(`Shop?category=${cat.id}`)}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center justify-between px-6 py-2.5 hover:bg-orange-50 text-gray-600 transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    ))}
                    
                    <div className="border-t my-4" />
                    
                    {isAuthenticated && (
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-6 py-3 w-full hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Logout</span>
                      </button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
              
              <Link to={createPageUrl('Home')} className="flex items-center">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  FMM <span className="text-orange-200">CLASSICO</span>
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 hover:bg-orange-600 h-8 w-8"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-1">
              <Link to={createPageUrl('Notifications')} className="relative">
                <Button variant="ghost" size="icon" className="text-white hover:bg-orange-600">
                  <Bell className="h-6 w-6" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link to={createPageUrl('Cart')} className="relative">
                <Button variant="ghost" size="icon" className="text-white hover:bg-orange-600">
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-white text-orange-600 text-xs font-bold">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to={createPageUrl('Settings')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-orange-600">
                  <User className="h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar - Mobile */}
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
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 hover:bg-orange-600 h-8 w-8"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {currentPageName !== 'Home' && (
          <div className="container mx-auto px-4 pt-3">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors group"
            >
              <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back</span>
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
        <div className="flex items-center justify-around py-2">
          <Link to={createPageUrl('Home')} className={`flex flex-col items-center p-2 ${currentPageName === 'Home' ? 'text-orange-500' : 'text-gray-500'}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to={createPageUrl('Categories')} className={`flex flex-col items-center p-2 ${currentPageName === 'Categories' ? 'text-orange-500' : 'text-gray-500'}`}>
            <Grid3X3 className="h-5 w-5" />
            <span className="text-xs mt-1">Categories</span>
          </Link>
          <Link to={createPageUrl('Cart')} className={`flex flex-col items-center p-2 relative ${currentPageName === 'Cart' ? 'text-orange-500' : 'text-gray-500'}`}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-0 right-2 h-4 w-4 flex items-center justify-center p-0 bg-orange-500 text-white text-[10px]">
                {cartCount}
              </Badge>
            )}
            <span className="text-xs mt-1">Cart</span>
          </Link>
          <Link to={createPageUrl('Notifications')} className={`flex flex-col items-center p-2 ${currentPageName === 'Notifications' ? 'text-orange-500' : 'text-gray-500'}`}>
            <Bell className="h-5 w-5" />
            <span className="text-xs mt-1">Alerts</span>
          </Link>
          <Link to={createPageUrl('Settings')} className={`flex flex-col items-center p-2 ${currentPageName === 'Settings' ? 'text-orange-500' : 'text-gray-500'}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Account</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="md:hidden h-20" />

      {/* Floating AI Chat Button */}
      {currentPageName !== 'Chat' && (
        <Link
          to={createPageUrl('Chat')}
          className="fixed bottom-24 md:bottom-8 right-4 z-50 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
          style={{ boxShadow: '0 4px 20px rgba(249,115,22,0.5)' }}
        >
          <Bot className="h-5 w-5" />
          <span className="text-sm font-bold hidden sm:inline">AI Support</span>
        </Link>
      )}
    </div>
  );
}