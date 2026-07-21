import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import guestCart from "@/lib/guest-cart";

const AuthContext = createContext();

function getAdminEmailList() {
  return [...new Set([
    ...(import.meta.env.VITE_ADMIN_EMAILS || '').split(','),
    ...(import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '').split(','),
    import.meta.env.VITE_MASTER_ADMIN_EMAIL || '',
  ]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean))];
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setIsLoadingAuth(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      const adminEmails = getAdminEmailList();
      const isAdmin = adminEmails.includes(user.email?.toLowerCase());

      setUser({
        ...user,
        isAdmin,
      });

      setIsAuthenticated(true);
      setAuthError(null);
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    }

    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('fmmclassico') || key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
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

  const refreshUser = () => {
    checkUser();
  };

  const navigateToLogin = (redirectPath) => {
    const target = redirectPath || window.location.pathname + window.location.search;
    try {
      sessionStorage.setItem('redirectAfterLogin', target);
    } catch (_) {
      // ignore
    }
    window.location.href = '/login';
  };

  const verifyAdminPassword = (password) => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!adminPassword) return false;
    return password === adminPassword;
  };

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
