import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import {
  Search,
  Info,
  ShoppingCart,
  User,
  ChevronUp,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/lib/AuthContext';
import guestCart from '@/lib/guest-cart';
import { applySeoMetadata, applyStructuredData, buildSeoMetadata } from '@/lib/seo';

export default function GuestLayout({ children, currentPageName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const helpRef = useRef(null);
  const accountRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { } = useAuth();

  const isGuestHomepage = location.pathname === '/' || location.pathname.toLowerCase() === '/home';

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

  const handleAuthRedirect = (redirectPath) => {
    setAccountOpen(false);
    try {
      sessionStorage.setItem('redirectAfterLogin', redirectPath || window.location.pathname);
    } catch (_) {}
    navigate('/login');
  };

  const ASH = '#2E86C1';
  const ASH_HOVER = '#2578ae';

  useEffect(() => {
    applySeoMetadata(buildSeoMetadata(location.pathname, location.search));
    applyStructuredData(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full" style={{ maxWidth: '100vw', boxSizing: 'border-box' }}>
      <header className="sticky top-0 z-50 shadow-lg" style={{ background: `linear-gradient(90deg, ${ASH} 0%, ${ASH_HOVER} 100%)` }}>
        <div className="w-full px-4 md:px-8 xl:px-[2cm]">
          <div className="flex items-center justify-between h-16 gap-2">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 flex-shrink-0 -ml-1 md:ml-0">
              <span className="flex h-8 w-auto min-w-[32px] items-center justify-center overflow-hidden sm:h-9 md:h-10">
                <img
                  src="/logo.png"
                  alt="FMM CLASSICO logo"
                  className="block h-full w-auto shrink-0 object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </span>
              <h1 className="text-lg sm:text-xl md:text-3xl font-black text-white tracking-tight">
                FMM <span className="text-white">CLASSICO</span>
              </h1>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-4 lg:mx-6 xl:mx-8">
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

            <div className="flex items-center gap-1 sm:gap-2 ml-2 md:ml-0 flex-shrink-0">
              <div className="relative" ref={accountRef}>
                <button
                  className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors"
                  onClick={() => setAccountOpen((open) => !open)}
                  title="Account Menu"
                >
                  <User className="h-5 w-5" />
                  <span className="text-[10px] font-semibold leading-tight">Account</span>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 py-1 overflow-hidden">
                    <button onClick={() => handleAuthRedirect('/login')} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"><User className="h-4 w-4" /> Sign In</button>
                    <button onClick={() => handleAuthRedirect('/register')} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"><User className="h-4 w-4" /> Sign Up</button>
                    <div className="border-t my-1" />
                    <button onClick={() => handleAuthRedirect('/login')} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"><User className="h-4 w-4" /> My Account</button>
                    <button onClick={() => handleAuthRedirect('/login')} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Track Order</button>
                    <button onClick={() => handleAuthRedirect('/login')} className="w-full px-4 py-2.5 hover:bg-gray-50 text-left text-sm text-gray-700 font-medium transition-colors flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Cancel Order</button>
                  </div>
                )}
              </div>

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

              <div className="relative" ref={helpRef}>
                <button
                  className="flex flex-col items-center text-white hover:bg-white/10 rounded-md px-2 py-1 transition-colors"
                  onClick={() => setHelpOpen((open) => !open)}
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
                    <Link to={createPageUrl('HowToUse')} onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">🛍️ How to Place an Order</Link>
                    <Link to={createPageUrl('Policies')} onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">📄 Store Policies</Link>
                    <Link to={createPageUrl('About')} onClick={() => setHelpOpen(false)} className="flex items-center px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">ℹ️ About Us</Link>
                    <div className="border-t my-1" />
                    <a href="https://wa.me/233509896035" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 hover:bg-green-50 text-sm text-green-700 font-medium transition-colors">WhatsApp</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative">
              <Input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-4 pr-12 py-2 rounded-full border-0 bg-white/90" />
              <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 text-white" style={{ background: ASH }}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </header>

      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {isGuestHomepage && (
        <footer className="border-t border-[#0f2f62] bg-[#0B2450] text-white" aria-label="Guest homepage footer">
          <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <section>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-auto min-w-[36px] items-center justify-center overflow-hidden sm:h-10">
                    <img
                      src="/logo.png"
                      alt="FMM CLASSICO logo"
                      className="block h-full w-auto object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="text-base font-black tracking-[0.18em] text-white sm:text-lg">FMM CLASSICO</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-blue-100">
                  <a
                    href="mailto:fmmclassico@gmail.com?subject=FMM%20CLASSICO%20Support"
                    className="max-w-full break-all transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                  >
                    Email: fmmclassico@gmail.com
                  </a>
                  <span aria-hidden="true" className="hidden text-white/40 sm:inline">|</span>
                  <a
                    href="https://wa.me/233208207543"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                  >
                    Whatsapp: 0208207543
                  </a>
                </div>
              </section>

              <nav aria-labelledby="guest-footer-service">
                <h2 id="guest-footer-service" className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Customer Service</h2><ul className="mt-3 space-y-2">
                  <li>
                    <a
                      href="mailto:fmmclassico@gmail.com?subject=FMM%20CLASSICO%20Help%20Center"
                      className="text-sm text-blue-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                    >
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://wa.me/233208207543"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                    >
                      Contact Us
                    </a>
                  </li>
                </ul>
              </nav>

              <nav aria-labelledby="guest-footer-legal">
                <h2 id="guest-footer-legal" className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Legal</h2><ul className="mt-3 space-y-2">
                  <li>
                    <Link
                      to="/privacy-policy"
                      className="text-sm text-blue-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms-of-service"
                      className="text-sm text-blue-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B2450]"
                    >
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>

            <div className="mt-6 border-t border-white/15 pt-4">
              <p className="text-xs text-blue-100 sm:text-sm">© {new Date().getFullYear()} FMM CLASSICO. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}

      <div className="h-4" />

      {showScrollTop && (currentPageName === 'Home' || isGuestHomepage) && (
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

