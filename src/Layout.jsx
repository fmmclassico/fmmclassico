/* eslint-disable */
import { supabaseNotifications } from '@/lib/supabaseNotifications';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { appClient } from '@/api/appClient.js';
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
import HeaderSearchBar from '@/components/search/HeaderSearchBar';
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
   queryFn: async () => { try { const r = await appClient.entities.CartItem.filter({ user_email: user?.email }); return Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []; } catch(e) { return []; } },
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

  const cartCount = Array.isArray(cartItems) ? cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
  const unreadNotifCount = Array.isArray(userNotifications) ? userNotifications.filter(n => !n.is_read).length : 0;

  const handleLogout = async () => {
    try {
      queryClient.clear();
      await logout();
    } catch (e) {
      console.error('Logout failed', e);
      window.location.href = '/';
    }
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
    { icon: FileText, label: 'My Invoices', page: 'Invoices' },
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
      { icon: Bell, label: 'Hero Banners', page: 'AdminBanners' },
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

  useEffect(() => {
    const merchantPhone = '+233208207543';
    const merchantEmail = 'fmmclassico@gmail.com';
    const merchantWhatsapp = 'https://wa.me/233208207543';

    document.title = 'FMM CLASSICO';

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    const siteDescription = 'FMM CLASSICO – Your trusted online store for phones & accessories, home appliances, and electronics in Ghana.';

    setMeta('name', 'description', siteDescription);
    setMeta('name', 'keywords', 'FMM Classico, phones & Accessories Ghana, phone accessories Ghana, buy phones Ghana, chargers Ghana, earphones Ghana, smart watches Ghana, electronics Ghana, home appliances Ghana, Tarkwa accessories, UMAT campus shop, Accra phone shop, Kumasi phone shop, Ashongman Estate, Airport Residential Area, online shopping Ghana, wholesale electronics Ghana');
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'googlebot', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('name', 'author', 'FMM CLASSICO');
    setMeta('name', 'application-name', 'FMM CLASSICO');
    setMeta('name', 'apple-mobile-web-app-title', 'FMM CLASSICO');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'FMM CLASSICO');
    setMeta('property', 'og:title', 'FMM CLASSICO');
    setMeta('property', 'og:description', siteDescription);
    setMeta('property', 'og:url', window.location.origin);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', 'FMM CLASSICO');
    setMeta('name', 'twitter:description', siteDescription);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = window.location.origin;
  }, []);

  return <div />;
}
