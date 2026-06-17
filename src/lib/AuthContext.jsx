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

      const settingsPromise = appClient
        .get(`/prod/public-settings/by-id/${appParams.appId}`)
        .then(data => setAppPublicSettings(data))
        .catch(() => {});

      const hasToken =
        appParams.token ||
        localStorage.getItem('base44_access_token') ||
        localStorage.getItem('token');

      if (hasToken) {
        // User has a token — try to verify it
        await checkUserAuth();
      } else {
        // No token — user is a guest. Allow them to browse publicly.
        // Do NOT set auth_required here — that would block the homepage.
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        // No authError set — guests can browse freely
      }

      settingsPromise.finally(() => setIsLoadingPublicSettings(false));

    } catch (error) {
      console.error('checkAppState error:', error);

      if (error?.status === 403 && error?.data?.extra_data?.reason) {
        const reason = error.data.extra_data.reason;

        if (reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else if (reason !== 'auth_required') {
          // Only set non-auth errors — auth_required just means guest, which is fine
          setAuthError({ type: reason, message: error.message });
        }

        setIsLoadingAuth(false);
      } else {
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

      if (!currentUser) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      const ADMIN_EMAILS = [
        'fmmcompanylimited@gmail.com',
        'mensahfedramartha@gmail.com',
        'marthamensahfedra@gmail.com'
      ];

      const isAdminEmail = ADMIN_EMAILS.includes(
        currentUser.email?.toLowerCase()
      );

      if (currentUser.role === 'admin' && isAdminEmail) {
        const adminVerified = sessionStorage.getItem(
          `admin_verified_${currentUser.email}`
        );

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

      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);

      // Token was invalid/expired — clear it and allow guest browsing
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      // Do NOT set authError here — guest can still browse
    }
  };

  const verifyAdminPassword = () => {
    if (user?.email) {
      sessionStorage.setItem(`admin_verified_${user.email}`, 'true');
      setAuthError(null);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  // Redirect to your own /login page (NOT base44's external login page)
  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const us