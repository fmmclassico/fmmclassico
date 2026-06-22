import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import { 
  Search, 
  Info, 
  ShoppingCart,
  User,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/lib/AuthContext';
import guestCart from '@/lib/guest-cart';

export default function GuestLayout({ children, currentPageName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const helpRef = useRef(null);
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const { navigateToLogin } = useAuth();

  // Load cart count from guest storage and update on cart changes
  useEffect(() => {
    const updateCartCount = (event) => {
      try {
        const count = event?.detail?.total ?? guestCart.getTotal();
        setCartCount(count);
      } catch (e) {
        setCartCount(0);
      }
    };

    updateCartCount();
    
    // Listen for storage changes and custom cart-update events
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('fmm-cart-updated', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('fmm-cart-updated', updateCartCount);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Shop?search=${encodeURIComponent(searchQuery)}`));
      setSearchQuery('');
    }
  };

  const handleAuthRedirect = (path) => {
    setAccountOpen(false);
    navigateToLogin();
  };

  const ASH = '#2E86C1';
  const ASH_HOVER = '#2578ae';

  // SEO
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
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full" style={{maxWidth:'100vw', boxSizing:'border-box'}}>
      {/* Guest Header — dark ash */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                FMM <span className="text-white">CLASSICO</span>
              </h1>
            </Link>

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

            {/* Right Actions - Guest Mode Order: Account, Cart, Help */}
            <div className="flex items-center gap-2">
              {/* Account Button */}
              <div className="relative" ref={accountRef}>
                <button 
                  className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors" 
                  onClick={() => setAccountOpen(o => !o)}
                  title="Account Menu"
                >
                  <User className="h-5 w-5" />
                  <span className="text-[10px] font-semibold leading-tight">Account</span>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden">
                    <button
                      onClick={handleAuthRedirect}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <User className="h-4 w-4" /> Sign In
                    </button>
                    <button
                      onClick={handleAuthRedirect}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <User className="h-4 w-4" /> Sign Up
                    </button>
                    <div className="border-t my-1" />
                    <button
                      onClick={handleAuthRedirect}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <User className="h-4 w-4" /> My Account
                    </button>
                    <button
                      onClick={handleAuthRedirect}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" /> Track Order
                    </button>
                    <button
                      onClick={handleAuthRedirect}
                      className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" /> Cancel Order
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Button */}
              <Link 
                to={createPageUrl('Cart')} 
                className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors relative"
                title="Shopping Cart"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-white text-[11px] font-bold" style={{ background: '#ef4444' }}>
                      {cartCount > 9 ? '9+' : cartCount}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-tight">Cart</span>
              </Link>

              {/* Help Button */}
              <div className="relative" ref={helpRef}>
                <button 
                  className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors" 
                  onClick={() => setHelpOpen(o => !o)}
                  title="Help & Support"
                >
                  <Info className="h-5 w-5" />
                  <span className="text-[10px] font-semibold leading-tight">Help</span>
                </button>
                {helpOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-2 overflow-hidden">
                    <p className="text-xs font-bold text-gray-400 uppercase px-4 pt-1 pb-2 tracking-wider">Help Center</p>
                    <div className="px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-100">
                      <p className="font-semibold text-gray-700 mb-1">👋 Need help?</p>
                      <p>Browse guides or contact us directly.</p>
                    </div>
                    <Link 
                      to={createPageUrl('HowToUse')} 
                      onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
                    >
                      🛍️ How to Place an Order
                    </Link>
                    <Link 
                      to={createPageUrl('Policies')} 
                      onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
                    >
                      📄 Store Policies
                    </Link>
                    <Link 
                      to={createPageUrl('About')} 
                      onClick={() => setHelpOpen(false)}
                      className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
                    >
                      ℹ️ About Us
                    </Link>
                    <div className="border-t my-1" />
                    <a 
                      href="https://wa.me/233509896035" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-medium transition-colors"
                    >
                      <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
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
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white"
                style={{ background: ASH }}
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

      {/* Spacer - No bottom navigation for guests */}
      <div className="h-4" />

      {/* Scroll to top button */}
      {showScrollTop && currentPageName === 'Home' && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-4 z-50 text-white rounded-full p-2.5 shadow-xl transition-all hover:scale-110 active:scale-95"
          style={{ background: ASH, boxShadow: '0 4px 16px rgba(31,41,55,0.4)' }}
          aria-label="Back to top"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
