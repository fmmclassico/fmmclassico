import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import { appClient } from '@/api/appClient.js';
import guestCart from "@/lib/guest-cart";

const AuthContext = createContext();
const AUTH_LOAD_TIMEOUT_MS = 10000;

function withTimeout(promise, timeoutMs = AUTH_LOAD_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication request timed out.')), timeoutMs);
    }),
  ]);
}

function isAdminPathname(pathname = '') {
  return String(pathname || '').toLowerCase().startsWith('/admin');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUser = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) {
      setIsLoadingAuth(true);
    }

    try {
      const nextUser = await withTimeout(
        appClient.auth.me({ forceAdminRefresh: isAdminPathname(window.location.pathname) }),
        AUTH_LOAD_TIMEOUT_MS
      );

      if (!nextUser) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return null;
      }

      setUser(nextUser);
      setIsAuthenticated(true);

      if (nextUser.admin_requires_verification && isAdminPathname(window.location.pathname)) {
        setAuthError({
          type: 'admin_verification_required',
          email: nextUser.email,
        });
      } else {
        setAuthError(null);
      }

      return nextUser;
    } catch (err) {
      console.error('Auth error:', err);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUser();

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        checkUser({ showLoader: false });
      }
    };

    const handleWindowFocus = () => {
      checkUser({ showLoader: false });
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        appClient.auth.clearAdminVerification();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        setIsLoadingAuth(false);
        return;
      }

      setTimeout(() => {
        checkUser({ showLoader: false });
      }, 0);
    });

    return () => {
      subscription?.unsubscribe?.();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [checkUser]);

  const logout = async () => {
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    }

    appClient.auth.clearAdminVerification(user?.email);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && (key.includes('fmmclassico') || key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.error('Storage clear error:', e);
    }

    try {
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }

    guestCart.clear();
    window.location.replace('/');
  };

  const refreshUser = useCallback(() => checkUser({ showLoader: false }), [checkUser]);

  const navigateToLogin = useCallback((redirectPath) => {
    const target = redirectPath || window.location.pathname + window.location.search;
    appClient.auth.redirectToLogin(target);
  }, []);

  const verifyAdminPassword = useCallback(async (password) => {
    const result = await appClient.auth.verifyAdminAccess(password);
    if (result?.success) {
      await checkUser({ showLoader: false });
      return true;
    }
    return false;
  }, [checkUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoggingOut,
        authError,
        logout,
        refreshUser,
        navigateToLogin,
        verifyAdminPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
