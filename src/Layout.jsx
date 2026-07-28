/* eslint-disable */
import { supabaseNotifications } from '@/lib/supabaseNotifications';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { appClient } from '@/api/appClient.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  ShoppingCart,
  User,
  Menu,
  Info,
  Settings,
  Grid3X3,
  MessageCircle,
  Package,
  LogOut,
  ChevronUp,
  Bot,
  Bell,
  Send,
  Phone,
  Star,
  Gem,
  FileText,
  Shield,
  HelpCircle,
} from 'lucide-react';
import HeaderSearchBar from '@/components/search/HeaderSearchBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { applySeoMetadata, buildSeoMetadata } from '@/lib/seo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function Layout({ children, currentPageName }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const helpRef = useRef(null);
  const accountRef = useRef(null);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setHelpOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cartItems', user?.email],
    queryFn: async () => {
      try {
        const result = await appClient.entities.CartItem.filter({ user_email: user?.email });
        return Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user?.email && isAuthenticated,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: userNotifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => supabaseNotifications.filter(user.email, 50),
    enabled: !!user?.email && isAuthenticated,
    staleTime: 20000,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user?.email || !isAuthenticated) return;

    const unsubscribe = supabaseNotifications.subscribe(user.email, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.email] });
    });

    return unsubscribe;
  }, [user?.email, isAuthenticated, queryClient]);

  useEffect(() => {
    applySeoMetadata(buildSeoMetadata(location.pathname, location.search));
  }, [location.pathname, location.search]);

  const cartCount = Array.isArray(cartItems)
    ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;

  const unreadNotifCount = Array.isArray(userNotifications)
    ? userNotifications.filter((notification) => !notification.is_read).length
    : 0;

  const handleLogout = async () => {
    try {
      queryClient.clear();
      await logout();
    } catch (error) {
      console.error('Logout failed', error);
      window.location.href = '/';
    }
  };

  const routeForPage = useCallback((page) => {
    if (!page || page === 'Home' || page === 'GuestHome') return '/';
    return createPageUrl(page);
  }, []);

  const isAdmin = user?.isAdmin === true;
  const isCurrentPage = useCallback(
    (page) => {
      if (!page) return false;
      if (page === 'Home') return location.pathname === '/';
      return currentPageName === page || location.pathname.toLowerCase() === routeForPage(page).toLowerCase();
    },
    [currentPageName, location.pathname, routeForPage]
  );

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Account';

  const primaryNavItems = useMemo(
    () => [
      { icon: Home, label: 'Home', page: 'Home' },
      { icon: Grid3X3, label: 'Categories', page: 'Categories' },
      { icon: Package, label: 'Orders', page: 'Orders' },
      { icon: MessageCircle, label: 'Support', page: 'Chat' },
    ],
    []
  );

  const authenticatedMenuItems = useMemo(
    () => [
      { icon: Home, label: 'Home', page: 'Home' },
      { icon: Grid3X3, label: 'Categories', page: 'Categories' },
      { icon: ShoppingCart, label: 'Cart', page: 'Cart', badge: cartCount },
      { icon: Package, label: 'My Orders', page: 'Orders' },
      { icon: FileText, label: 'My Invoices', page: 'Invoices' },
      { icon: Bell, label: 'Notifications', page: 'Notifications', badge: unreadNotifCount },
      { icon: MessageCircle, label: 'Chat Support', page: 'Chat' },
      { icon: MessageCircle, label: 'Feedback / Report Issue', page: 'Feedback' },
      { icon: Info, label: 'How to Use the Site', page: 'HowToUse' },
      { icon: Info, label: 'About Us', page: 'About' },
      { icon: Settings, label: 'Settings', page: 'Settings' },
      ...(isAdmin
        ? [
            { icon: Settings, label: 'Admin Orders', page: 'AdminOrders' },
            { icon: MessageCircle, label: 'Customer Messages', page: 'AdminMessages' },
            { icon: FileText, label: 'Invoices', page: 'AdminInvoice' },
            { icon: Bell, label: 'Promo Banners', page: 'AdminBanners' },
            { icon: Send, label: 'Broadcast to Customers', page: 'AdminBroadcast' },
            { icon: Phone, label: 'WhatsApp Broadcast', page: 'AdminSMSBroadcast' },
            { icon: Star, label: 'Manage Reviews', page: 'AdminReviews' },
            { icon: Settings, label: 'Manage Products', page: 'AdminProducts' },
            { icon: Settings, label: 'Category Images', page: 'AdminCategoryImages' },
            { icon: Gem, label: 'Brand Logos', page: 'AdminBrandLogos' },
            { icon: Info, label: 'Edit About Page', page: 'AdminAbout' },
            { icon: Settings, label: 'Edit Page Content', page: 'AdminPageContent' },
            { icon: Home, label: 'Edit Home & Categories', page: 'AdminHomeEditor' },
            { icon: Settings, label: 'Interface Control', page: 'AdminInterfaceControl' },
            { icon: Bot, label: 'AI Assistant', page: 'AdminAI' },
            { icon: Shield, label: 'Admin Access Control', page: 'AdminAccessControl' },
            { icon: Settings, label: 'Contact Settings', page: 'AdminContactSettings' },
          ]
        : []),
    ],
    [cartCount, isAdmin, unreadNotifCount]
  );

  const adminMenuItems = authenticatedMenuItems.filter((item) => String(item.page).startsWith('Admin'));
  const standardMenuItems = authenticatedMenuItems.filter((item) => !String(item.page).startsWith('Admin'));

  const accountActions = [
    { icon: User, label: 'My Account', page: 'Settings' },
    { icon: Package, label: 'Orders', page: 'Orders' },
    { icon: MessageCircle, label: 'Support Chat', page: 'Chat' },
    ...(isAdmin ? [{ icon: Shield, label: 'Admin Area', page: 'AdminOrders' }] : []),
  ];

  const navLinkClass = (active) =>
    [
      'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors',
      active ? 'bg-[#0A2E60] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100',
    ].join(' ');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-4 lg:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="rounded-2xl bg-[#0A2E60] px-3 py-2 text-sm font-black tracking-wide text-white sm:text-base">
              FMM CLASSICO
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 md:block">
            <HeaderSearchBar
              createPageUrl={routeForPage}
              className="w-full"
              inputClassName="rounded-full border-slate-200 bg-slate-50 pr-12"
              placeholder="Search products..."
            />
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.page} to={routeForPage(item.page)} className={navLinkClass(isCurrentPage(item.page))}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              to={routeForPage('Notifications')}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Badge>
              )}
            </Link>

            <Link
              to={routeForPage('Cart')}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-[1.25rem] justify-center rounded-full bg-[#0A2E60] px-1 text-[10px] text-white">
                  {cartCount > 9 ? '9+' : cartCount}
                </Badge>
              )}
            </Link>

            <div className="relative hidden sm:block" ref={helpRef}>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
                aria-label="Help"
                onClick={() => setHelpOpen((open) => !open)}
              >
                <HelpCircle className="h-5 w-5" />
              </button>

              {helpOpen && (
                <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Help Center</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">Quick links for support and store info.</p>
                  </div>
                  <div className="p-2">
                    {[
                      { label: 'How to Use the Site', page: 'HowToUse' },
                      { label: 'Store Policies', page: 'Policies' },
                      { label: 'About Us', page: 'About' },
                    ].map((item) => (
                      <Link
                        key={item.page}
                        to={routeForPage(item.page)}
                        onClick={() => setHelpOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <a
                      href="https://wa.me/233208207543"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                    >
                      WhatsApp Support
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="relative hidden sm:block" ref={accountRef}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setAccountDropdownOpen((open) => !open)}
              >
                <User className="h-4 w-4" />
                <span className="max-w-28 truncate">{displayName}</span>
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{displayName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{user?.email || 'Signed in'}</p>
                  </div>
                  <div className="p-2">
                    {accountActions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={routeForPage(item.page)}
                          onClick={() => setAccountDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto px-0">
                <SheetHeader className="border-b border-slate-100 px-5 pb-4">
                  <SheetTitle className="text-left text-base font-black tracking-wide text-[#0A2E60]">
                    FMM CLASSICO
                  </SheetTitle>
                </SheetHeader>

                <div className="border-b border-slate-100 px-4 py-4 md:hidden">
                  <HeaderSearchBar
                    createPageUrl={routeForPage}
                    className="w-full"
                    inputClassName="rounded-full border-slate-200 bg-slate-50 pr-12"
                    placeholder="Search products..."
                  />
                </div>

                <div className="px-3 py-3">
                  <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Menu</p>
                  <div className="space-y-1">
                    {standardMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          to={routeForPage(item.page)}
                          className={[
                            'flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-semibold transition-colors',
                            isCurrentPage(item.page) ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                          ].join(' ')}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </span>
                          {item.badge > 0 ? (
                            <Badge className="rounded-full bg-[#0A2E60] px-2 py-0.5 text-[10px] text-white">
                              {item.badge > 9 ? '9+' : item.badge}
                            </Badge>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && adminMenuItems.length > 0 && (
                  <div className="border-t border-slate-100 px-3 py-3">
                    <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Admin</p>
                    <div className="space-y-1">
                      {adminMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.label}
                            to={routeForPage(item.page)}
                            className={[
                              'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors',
                              isCurrentPage(item.page) ? 'bg-[#0A2E60] text-white' : 'text-slate-700 hover:bg-slate-100',
                            ].join(' ')}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 px-3 py-3">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="border-t border-slate-100 px-3 pb-3 pt-3 md:hidden">
          <HeaderSearchBar
            createPageUrl={routeForPage}
            className="w-full"
            inputClassName="rounded-full border-slate-200 bg-slate-50 pr-12"
            placeholder="Search products..."
          />
        </div>
      </header>

      {isAdmin && location.pathname.toLowerCase().startsWith('/admin') && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-800">
          Admin mode is active.
        </div>
      )}

      <main className="min-h-[calc(100vh-4rem)]">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] sm:hidden">
        <div className="grid grid-cols-5 gap-1">
          {[
            { icon: Home, label: 'Home', page: 'Home' },
            { icon: Grid3X3, label: 'Categories', page: 'Categories' },
            { icon: ShoppingCart, label: 'Cart', page: 'Cart', badge: cartCount },
            { icon: Package, label: 'Orders', page: 'Orders' },
            { icon: User, label: 'Account', page: 'Settings' },
          ].map((item) => {
            const Icon = item.icon;
            const active = isCurrentPage(item.page);
            return (
              <Link
                key={item.label}
                to={routeForPage(item.page)}
                className={[
                  'relative flex flex-col items-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors',
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
              >
                <Icon className="mb-1 h-4 w-4" />
                <span>{item.label}</span>
                {item.badge > 0 ? (
                  <Badge className="absolute right-3 top-1 h-4 min-w-[1rem] justify-center rounded-full bg-red-500 px-1 text-[9px] text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-4 z-50 rounded-full bg-[#0A2E60] p-3 text-white shadow-xl transition-transform hover:scale-105 sm:bottom-6"
          aria-label="Back to top"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
