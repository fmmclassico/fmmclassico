import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from './pages.config';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation
} from 'react-router-dom';

import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AdminAuthModal from '@/components/AdminAuthModal';

import AdminReviews from './pages/AdminReviews';
import AdminProducts from './pages/AdminProducts';
import BrandProducts from './pages/BrandProducts';
import AdminCategoryImages from './pages/AdminCategoryImages';
import AdminAI from './pages/AdminAI';
import AdminPromoBanners2 from './pages/AdminPromoBanners2';
import AdminBrandLogos from './pages/AdminBrandLogos';
import AdminAbout from './pages/AdminAbout';
import AdminPageContent from './pages/AdminPageContent';
import AdminHomeEditor from './pages/AdminHomeEditor';
import AdminInterfaceControl from './pages/AdminInterfaceControl';
import AdminSMSBroadcast from './pages/AdminSMSBroadcast';
import AdminAccessControl from './pages/AdminAccessControl';
import AdminContactSettings from './pages/AdminContactSettings';

import MobileAppGuide from './pages/MobileAppGuide';
import DownloadApp from './pages/DownloadApp';
import Policies from './pages/Policies';

import GuestLayout from '@/components/layouts/GuestLayout';
import GuestHome from './pages/GuestHome';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const { Pages, Layout, mainPage } = pagesConfig;

const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : () => null;

/**
 * PAGES THAT REQUIRE LOGIN
 */
const PROTECTED_ROUTES = new Set([
  'Checkout',
  'Account',
  'Orders',
  'Invoices',
  'OrderTracking',
  'Notifications',
  'Settings',
  'Chat',

  // ADMIN PAGES (IMPORTANT — ALL INCLUDED)
  'AdminReviews',
  'AdminProducts',
  'AdminCategoryImages',
  'AdminAI',
  'AdminPromoBanners2',
  'AdminBrandLogos',
  'AdminAbout',
  'AdminPageContent',
  'AdminHomeEditor',
  'AdminInterfaceControl',
  'AdminSMSBroadcast',
  'AdminAccessControl',
  'AdminContactSettings'
]);

/**
 * Layout wrapper
 */
const LayoutWrapper = ({ children, currentPageName, isAuthenticated }) => {
  const SelectedLayout = isAuthenticated ? Layout : GuestLayout;

  return SelectedLayout ? (
    <SelectedLayout currentPageName={currentPageName}>
      {children}
    </SelectedLayout>
  ) : (
    <>{children}</>
  );
};

/**
 * Protected route wrapper (FIXED SAFE VERSION)
 */
const ProtectedLayout = ({
  children,
  currentPageName,
  isAuthenticated,
  navigateToLogin
}) => {
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigateToLogin();
    }
  }, [isAuthenticated, navigateToLogin]);

  if (!isAuthenticated) return null;

  return (
    <LayoutWrapper
      currentPageName={currentPageName}
      isAuthenticated={true}
    >
      {children}
    </LayoutWrapper>
  );
};

/**
 * MAIN APP ROUTER
 */
const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    authError,
    navigateToLogin,
    verifyAdminPassword,
    isAuthenticated
  } = useAuth();

  const location = useLocation();

  const isAdminPath = location.pathname.toLowerCase().startsWith('/admin');
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password']
    .includes(location.pathname.toLowerCase());

  // AUTH PAGES (safe render during loading)
  if (isLoadingAuth && isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  // Skip loading screen - render guest page immediately
  if (isLoadingAuth) {
    return (
      <GuestLayout currentPageName="GuestHome">
        <GuestHome />
      </GuestLayout>
    );
  }
  // AUTH ERROR HANDLING
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === 'admin_verification_required' && isAdminPath) {
    return (
      <>
        <AdminAuthModal
          isOpen={true}
          onClose={() => navigateToLogin()}
          onSuccess={verifyAdminPassword}
          userEmail={authError.email}
        />
        <Routes>
          <Route path="*" element={<div />} />
        </Routes>
      </>
    );
  }

  return (
    <Routes>

      {/* HOME */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <LayoutWrapper
              currentPageName={mainPageKey}
              isAuthenticated={true}
            >
              <MainPage />
            </LayoutWrapper>
          ) : (
            <GuestLayout currentPageName="GuestHome">
              <GuestHome />
            </GuestLayout>
          )
        }
      />

      {/* STATIC PAGES */}
      <Route path="/BrandProducts" element={<BrandProducts />} />
      <Route path="/MobileAppGuide" element={<MobileAppGuide />} />
      <Route path="/DownloadApp" element={<DownloadApp />} />
      <Route path="/Policies" element={<Policies />} />

      {/* AUTH PAGES (FIXED — ALWAYS ACCESSIBLE) */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" /> : <Register />}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ADMIN PAGES (EXPLICIT SAFE ROUTES) */}
      <Route
        path="/AdminProducts"
        element={
          <ProtectedLayout
            currentPageName="AdminProducts"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminProducts />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminReviews"
        element={
          <ProtectedLayout
            currentPageName="AdminReviews"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminReviews />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminCategoryImages"
        element={
          <ProtectedLayout
            currentPageName="AdminCategoryImages"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminCategoryImages />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminAI"
        element={
          <ProtectedLayout
            currentPageName="AdminAI"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminAI />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminPromoBanners2"
        element={
          <ProtectedLayout
            currentPageName="AdminPromoBanners2"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminPromoBanners2 />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminBrandLogos"
        element={
          <ProtectedLayout
            currentPageName="AdminBrandLogos"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminBrandLogos />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminAbout"
        element={
          <ProtectedLayout
            currentPageName="AdminAbout"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminAbout />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminHomeEditor"
        element={
          <ProtectedLayout
            currentPageName="AdminHomeEditor"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminHomeEditor />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminAccessControl"
        element={
          <ProtectedLayout
            currentPageName="AdminAccessControl"
            isAuthenticated={isAuthenticated}
            navigateToLogin={navigateToLogin}
          >
            <AdminAccessControl />
          </ProtectedLayout>
        }
      />

      {/* DYNAMIC PAGES */}
      {Object.entries(Pages).map(([path, Page]) => {
        const isProtected = PROTECTED_ROUTES.has(path);

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              isProtected ? (
                <ProtectedLayout
                  currentPageName={path}
                  isAuthenticated={isAuthenticated}
                  navigateToLogin={navigateToLogin}
                >
                  <Page />
                </ProtectedLayout>
              ) : (
                <LayoutWrapper
                  currentPageName={path}
                  isAuthenticated={isAuthenticated}
                >
                  <Page />
                </LayoutWrapper>
              )
            }
          />
        );
      })}

      {/* FALLBACK */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

/**
 * ROOT APP
 */
export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>

        <Toaster />
        <SonnerToaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}