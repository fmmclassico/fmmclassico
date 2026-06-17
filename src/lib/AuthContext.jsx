import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setAuthError(null);

    // Safety timeout — never block the user more than 5s
    const loadingTimeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }, 5000);

    try {
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      // Fetch public settings and auth in parallel for maximum speed
      const settingsPromise = appClient.get(`/prod/public-settings/by-id/${appParams.appId}`)
        .then(data => setAppPublicSettings(data))
        .catch(() => {}); // non-fatal

      const authPromise = appParams.token ? checkUserAuth() : Promise.resolve().then(() => {
        // No token = not logged in → Guest Mode (no error)
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthError(null); // Allow guest browsing - no auth error
      });

      // Wait for auth only (settings load in background)
      await authPromise;
      settingsPromise.finally(() => setIsLoadingPublicSettings(false));

    } catch (error) {
      console.error('checkAppState error:', error);

      if (error?.status === 403 && error?.data?.extra_data?.reason) {
        const reason = error.data.extra_data.reason;
        if (reason === 'auth_required') {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
          setIsLoadingAuth(false);
        } else if (reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else {
          setAuthError({ type: reason, message: error.message });
        }
      } else {
        // Network/unknown error — don't force logout, just unblock rendering
        setIsLoadingAuth(false);
      }
      setIsLoadingPublicSettings(false);
    } finally {
      clearTimeout(loadingTimeout);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();

      const ADMIN_EMAILS = ['fmmcompanylimited@gmail.com', 'mensahfedramartha@gmail.com', 'marthamensahfedra@gmail.com'];
      const isAdminEmail = ADMIN_EMAILS.includes(currentUser.email?.toLowerCase());

      if (currentUser.role === 'admin' && isAdminEmail) {
        const adminVerified = sessionStorage.getItem(`admin_verified_${currentUser.email}`);
        if (!adminVerified) {
          setUser(currentUser);
          setIsAuthenticated(true);
          setAuthError({
            type: 'admin_verification_required',
            email: currentUser.email,
            message: 'Admin password verification required',
          });
          setIsLoadingAuth(false);
          return;
        }
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error?.status === 401 || error?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
      }
      // Silently ignore other errors — don't force logout
    }
  };

  const verifyAdminPassword = () => {
    if (user?.email) {
      sessionStorage.setItem(`admin_verified_${user.email}`, 'true');
      setAuthError(null);
    }
  };

  const logout = (redirectToGuest = false) => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    if (redirectToGuest) {
      // Redirect to guest homepage after logout
      base44.auth.logout();
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      verifyAdminPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};