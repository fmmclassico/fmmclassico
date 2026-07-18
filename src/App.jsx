import Invoices from './pages/Invoices';
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
import CollectionPage from './pages/CollectionPage';
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
import AdminInvoice from './pages/AdminInvoice';

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

const PROTECTED_ROUTES = new Set([
  'Checkout',
  'Account',
  'Orders',
  'OrderTracking',
  'Notifications',
  'Settings',
  'Chat',
  'Invoices',

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
  'AdminContactSettings',
  'AdminInvoice',
  'AdminOrders',
  'AdminBanners',
  'AdminBroadcast',
  'AdminMessages'
]);

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

const ProtectedLayout = ({ children, currentPageName, isAuthenticated, isLoggingOut, navigateToLogin }) => {
  React.useEffect(() => {
    if (!isAuthenticated && !isLoggingOut) {
      navigateToLogin();
    }
  }, [isAuthenticated, isLoggingOut, navigateToLogin]);

  if (isLoggingOut) return null;
  if (!isAuthenticated) return null;

  return (
    <Layout currentPageName={currentPageName}>
      {children}
    </Layout>
  );
};

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoggingOut,
    authError,
    navigateToLogin,
    verifyAdminPassword,
    isAuthenticated
  } = useAuth();

  const location = useLocation();

  const isAdminPath = location.pathname.toLowerCase().startsWith('/admin');
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password']
    .includes(location.pathname.toLowerCase());

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

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2E60]" />
          <span className="text-sm text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === 'admin_verification_required' && isAdminPath) {
    return (
      <>
        <AdminAuthModal
          open={true}
          onCancel={() => navigateToLogin()}
          onSuccess={verifyAdminPassword}
          userEmail={authError.email}
        />
        <Routes>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Layout currentPageName="Home">
              <MainPage />
            </Layout>
          ) : (
            <GuestLayout currentPageName="GuestHome">
              <GuestHome />
            </GuestLayout>
          )
        }
      />

      <Route path="/MobileAppGuide" element={<MobileAppGuide />} />
      <Route path="/DownloadApp" element={<DownloadApp />} />
      <Route path="/Policies" element={<Policies />} />
      <Route
        path="/BrandProducts"
        element={
          <LayoutWrapper currentPageName="BrandProducts" isAuthenticated={isAuthenticated}>
            <BrandProducts />
          </LayoutWrapper>
        }
      />
      <Route
        path="/:collectionSlug"
        element={
          <LayoutWrapper currentPageName="CollectionPage" isAuthenticated={isAuthenticated}>
            <CollectionPage />
          </LayoutWrapper>
        }
      />

      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/Invoices"
        element={
          <ProtectedLayout currentPageName="Invoices" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <Invoices />
          </ProtectedLayout>
        }
      />

      <Route
        path="/AdminInvoice"
        element={
          <ProtectedLayout currentPageName="AdminInvoice" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminInvoice />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminReviews"
        element={
          <ProtectedLayout currentPageName="AdminReviews" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminReviews />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminProducts"
        element={
          <ProtectedLayout currentPageName="AdminProducts" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminProducts />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminCategoryImages"
        element={
          <ProtectedLayout currentPageName="AdminCategoryImages" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminCategoryImages />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminAI"
        element={
          <ProtectedLayout currentPageName="AdminAI" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminAI />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminPromoBanners2"
        element={
          <ProtectedLayout currentPageName="AdminPromoBanners2" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminPromoBanners2 />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminBrandLogos"
        element={
          <ProtectedLayout currentPageName="AdminBrandLogos" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminBrandLogos />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminAbout"
        element={
          <ProtectedLayout currentPageName="AdminAbout" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminAbout />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminPageContent"
        element={
          <ProtectedLayout currentPageName="AdminPageContent" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminPageContent />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminHomeEditor"
        element={
          <ProtectedLayout currentPageName="AdminHomeEditor" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminHomeEditor />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminInterfaceControl"
        element={
          <ProtectedLayout currentPageName="AdminInterfaceControl" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminInterfaceControl />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminAccessControl"
        element={
          <ProtectedLayout currentPageName="AdminAccessControl" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminAccessControl />
          </ProtectedLayout>
        }
      />
      <Route
        path="/AdminContactSettings"
        element={
          <ProtectedLayout currentPageName="AdminContactSettings" isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
            <AdminContactSettings />
          </ProtectedLayout>
        }
      />

      {Object.entries(Pages).map(([path, Page]) => {
        const isProtected = PROTECTED_ROUTES.has(path);
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              isProtected ? (
                <ProtectedLayout currentPageName={path} isAuthenticated={isAuthenticated} isLoggingOut={isLoggingOut} navigateToLogin={navigateToLogin}>
                  <Page />
                </ProtectedLayout>
              ) : (
                <LayoutWrapper currentPageName={path} isAuthenticated={isAuthenticated}>
                  <Page />
                </LayoutWrapper>
              )
            }
          />
        );
      })}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
