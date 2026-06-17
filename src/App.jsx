import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
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
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, navigateToLogin, user, verifyAdminPassword } = useAuth();

  // Show loading spinner while checking auth
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
          <Adm
      );
    } else if (authError.type === 'auth_required') {
      // Allow public auth pages to render normally — everything else redirects to /login
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
      const isPublicPath = publicPaths.some(p => window.location.pathname.toLowerCase().startsWith(p));
      if (!isPublicPath) {
        // Redirect to our own /login page (NOT base44's external page)
        window.location.href = '/login';
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {/* Auth pages — no Layout wrapper (they use AuthLayout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/Register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Payment — own header (no layout wrapper) */}
      <Route path="/Payment" element={<Payment />} />

      <Route path="/AdminReviews" element={
        <LayoutWrapper currentPageName="AdminReviews">
          <AdminReviews />
        </LayoutWrapper>
      } />
      <Route path="/AdminProducts" element={
        <LayoutWrapper currentPageName="AdminProducts">
          <AdminProducts />
        </LayoutWrapper>
      } />
      <Route path="/BrandProducts" element={
        <LayoutWrapper currentPageName="BrandProducts">
          <BrandProducts />
        </LayoutWrapper>
      } />
      <Route path="/AdminCategoryImages" element={
        <LayoutWrapper currentPageName="AdminCategoryImages">
          <AdminCategoryImages />
        </LayoutWrapper>
      } />
      <Route path="/AdminAI" element={
        <LayoutWrapper currentPageName="AdminAI">
          <AdminAI />
        </LayoutWrapper>
      } />
      <Route path="/AdminPromoBanners2" element={
        <LayoutWrapper currentPageName="AdminPromoBanners2">
          <AdminPromoBanners2 />
        </LayoutWrapper>
      } />
      <Route path="/AdminBrandLogos" element={
        <LayoutWrapper currentPageName="AdminBrandLogos">
          <AdminBrandLogos />
        </LayoutWrapper>
      } />
      <Route path="/AdminAbout" element={
        <LayoutWrapper currentPageName="AdminAbout">
          <AdminAbout />
        </LayoutWrapper>
      } />
      <Route path="/AdminPageContent" element={
        <LayoutWrapper currentPageName="AdminPageContent">
          <AdminPageContent />
        </LayoutWrapper>
      } />
      <Route path="/AdminHomeEditor" element={
        <LayoutWrapper currentPageName="AdminHomeEditor">
          <AdminHomeEditor />
        </LayoutWrapper>
      } />
      <Route path="/AdminInterfaceControl" element={
        <LayoutWrapper currentPageName="AdminInterfaceControl">
          <AdminInterfaceControl />
        </LayoutWrapper>
      } />
      <Route path="/MobileAppGuide" element={
        <LayoutWrapper currentPageName="MobileAppGuide">
          <MobileAppGuide />
        </LayoutWrapper>
      } />
      <Route path="/DownloadApp" element={
        <LayoutWrapper currentPageName="DownloadApp">
          <DownloadApp />
        </LayoutWrapper>
      } />
      <Route path="/Policies" element={
        <LayoutWrapper currentPageName="Policies">
          <Policies />
        </LayoutWrapper>
      } />
      <Route path="/AdminSMSBroadcast" element={
        <LayoutWrapper currentPageName="AdminSMSBroadcast">
          <AdminSMSBroadcast />
        </LayoutWrapper>
      } />
      <Route path="/AdminAccessControl" element={
        <LayoutWrapper currentPageName="AdminAccessControl">
          <AdminAccessControl />
        </LayoutWrapper>
      } />
      <Route path="/AdminContactSettings" element={
        <LayoutWrapper currentPageName="AdminContactSettings">
          <AdminContactSettings />
        </LayoutWrapper>
      } />
      {/* Case-insensitive fallback routes for common pages */}
      <Route path="/shop" element={<LayoutWrapper currentPageName="Shop"><Pages.Shop /></LayoutWrapper>} />
      <Route path="/shop/*" element={<LayoutWrapper currentPageName="Shop"><Pages.Shop /></LayoutWrapper>} />
      {/* PaymentConfirmed — WITH layout so header/nav is visible for tracking */}
      <Route path="/PaymentConfirmed" element={
        <LayoutWrapper currentPageName="PaymentConfirmed">
          <PaymentConfirmed />
        </LayoutWrapper>
      } />

      {Object.entries(Pages).map(([path, Page]) => (
        // Skip pages that already have explicit routes above
        ['Payment', 'Login', 'Register', 'ForgotPassword', 'ResetPassword'].includes(path) ? null :
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
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