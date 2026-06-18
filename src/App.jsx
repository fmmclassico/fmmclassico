import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AdminAuthModal from '@/components/AdminAuthModal';
import Payment from './pages/Payment';
import PaymentConfirmed from './pages/PaymentConfirmed';
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
import MobileAppGuide from './pages/MobileAppGuide';
import DownloadApp from './pages/DownloadApp';
import Policies from './pages/Policies';
import AdminSMSBroadcast from './pages/AdminSMSBroadcast';
import AdminAccessControl from './pages/AdminAccessControl';
import AdminContactSettings from './pages/AdminContactSettings';
import GuestLayout from '@/components/layouts/GuestLayout';
import GuestHome from './pages/GuestHome';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const { Pages, Layout, mainPage } = pagesConfig;
// make Pages accessible in JSX scope for fallback routes
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Protected routes that require authentication
// NOTE: 'Cart' was removed from this list — guests MUST be able to view/manage
// their cart. Only Checkout (and the buttons inside Cart.jsx) require login.
const PROTECTED_ROUTES = new Set(['Checkout', 'Account', 'Orders', 'OrderTracking', 'Notifications', 'Settings', 'Chat', 'AdminReviews', 'AdminProducts', 'AdminCategoryImages', 'AdminAI', 'AdminPromoBanners2', 'AdminBrandLogos', 'AdminAbout', 'AdminPageContent', 'AdminHomeEditor', 'AdminInterfaceControl', 'AdminSMSBroadcast', 'AdminAccessControl', 'AdminContactSettings']);

// Helper component for routes that can render in both guest and authenticated modes
const LayoutWrapper = ({ children, currentPageName, isAuthenticated }) => {
  const SelectedLayout = isAuthenticated ? Layout : GuestLayout;
  return SelectedLayout ? (
    <SelectedLayout currentPageName={currentPageName}>{children}</SelectedLayout>
  ) : (
    <>{children}</>
  );
};

// Helper component for protected routes
// FIX: useEffect MUST be called unconditionally (Rules of Hooks).
// Previously, useEffect was inside an if(!isAuthenticated) block — that is invalid React.
const ProtectedLayout = ({ children, currentPageName, isAuthenticated, navigateToLogin }) => {
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigateToLogin();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;
  return <LayoutWrapper currentPageName={currentPageName} isAuthenticated={true}>{children}</LayoutWrapper>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, verifyAdminPassword, isAuthenticated } = useAuth();

  // Show loading spinner only while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'admin_verification_required') {
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
  }

  // Render the main app
  return (
    <Routes>
      {/* Home route - conditionally renders GuestHome or authenticated Home */}
      <Route path="/" element={
        isAuthenticated ? (
          <LayoutWrapper currentPageName={mainPageKey} isAuthenticated={true}>
            <MainPage />
          </LayoutWrapper>
        ) : (
          <GuestLayout currentPageName="GuestHome">
            <GuestHome />
          </GuestLayout>
        )
      } />

      <Route path="/Payment" element={<Payment />} />
      <Route path="/PaymentConfirmed" element={
        <LayoutWrapper currentPageName="PaymentConfirmed" isAuthenticated={isAuthenticated}>
          <PaymentConfirmed />
        </LayoutWrapper>
      } />
      <Route path="/BrandProducts" element={
        <LayoutWrapper currentPageName="BrandProducts" isAuthenticated={isAuthenticated}>
          <BrandProducts />
        </LayoutWrapper>
      } />
      <Route path="/MobileAppGuide" element={
        <LayoutWrapper currentPageName="MobileAppGuide" isAuthenticated={isAuthenticated}>
          <MobileAppGuide />
        </LayoutWrapper>
      } />
      <Route path="/DownloadApp" element={
        <LayoutWrapper currentPageName="DownloadApp" isAuthenticated={isAuthenticated}>
          <DownloadApp />
        </LayoutWrapper>
      } />
      <Route path="/Policies" element={
        <LayoutWrapper currentPageName="Policies" isAuthenticated={isAuthenticated}>
          <Policies />
        </LayoutWrapper>
      } />
      
      {/* Case-insensitive fallback routes for common pages */}
      <Route path="/shop" element={<LayoutWrapper currentPageName="Shop" isAuthenticated={isAuthenticated}><Pages.Shop /></LayoutWrapper>} />
      <Route path="/shop/*" element={<LayoutWrapper currentPageName="Shop" isAuthenticated={isAuthenticated}><Pages.Shop /></LayoutWrapper>} />

      {/* Protected admin routes */}
      <Route path="/AdminReviews" element={
        <ProtectedLayout currentPageName="AdminReviews" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminReviews />
        </ProtectedLayout>
      } />
      <Route path="/AdminProducts" element={
        <ProtectedLayout currentPageName="AdminProducts" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminProducts />
        </ProtectedLayout>
      } />
      <Route path="/AdminCategoryImages" element={
        <ProtectedLayout currentPageName="AdminCategoryImages" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminCategoryImages />
        </ProtectedLayout>
      } />
      <Route path="/AdminAI" element={
        <ProtectedLayout currentPageName="AdminAI" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminAI />
        </ProtectedLayout>
      } />
      <Route path="/AdminPromoBanners2" element={
        <ProtectedLayout currentPageName="AdminPromoBanners2" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminPromoBanners2 />
        </ProtectedLayout>
      } />
      <Route path="/AdminBrandLogos" element={
        <ProtectedLayout currentPageName="AdminBrandLogos" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminBrandLogos />
        </ProtectedLayout>
      } />
      <Route path="/AdminAbout" element={
        <ProtectedLayout currentPageName="AdminAbout" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminAbout />
        </ProtectedLayout>
      } />
      <Route path="/AdminPageContent" element={
        <ProtectedLayout currentPageName="AdminPageContent" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminPageContent />
        </ProtectedLayout>
      } />
      <Route path="/AdminHomeEditor" element={
        <ProtectedLayout currentPageName="AdminHomeEditor" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminHomeEditor />
        </ProtectedLayout>
      } />
      <Route path="/AdminInterfaceControl" element={
        <ProtectedLayout currentPageName="AdminInterfaceControl" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminInterfaceControl />
        </ProtectedLayout>
      } />
      <Route path="/AdminSMSBroadcast" element={
        <ProtectedLayout currentPageName="AdminSMSBroadcast" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminSMSBroadcast />
        </ProtectedLayout>
      } />
      <Route path="/AdminAccessControl" element={
        <ProtectedLayout currentPageName="AdminAccessControl" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminAccessControl />
        </ProtectedLayout>
      } />
      <Route path="/AdminContactSettings" element={
        <ProtectedLayout currentPageName="AdminContactSettings" isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
          <AdminContactSettings />
        </ProtectedLayout>
      } />

      {/* Dynamic routes - public and protected handled by Pages components */}
      {Object.entries(Pages).map(([path, Page]) => {
        const isProtected = PROTECTED_ROUTES.has(path);
        return path === 'Payment' ? null : (
          <Route
            key={path}
            path={`/${path}`}
            element={
              isProtected ? (
                <ProtectedLayout currentPageName={path} isAuthenticated={isAuthenticated} navigateToLogin={navigateToLogin}>
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

      {/* Auth pages — these are the customer's actual sign-in / sign-up screens.
          They must be public (reachable whether or not authError is set) and
          must NOT be wrapped in Layout/GuestLayout since AuthLayout already
          provides its own full-screen chrome. If already logged in, bounce
          straight to the homepage instead of showing the form again. */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App