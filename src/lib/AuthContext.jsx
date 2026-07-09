import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import guestCart from "@/lib/guest-cart";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
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

      const envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
      const ADMIN_EMAILS = envAdminEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase());

      setUser({
        ...user,
        isAdmin,
      });

      setIsAuthenticated(true);
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // LOGOUT - clears everything and goes to guest homepage
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    }

    // Clear ALL auth-related storage
    setUser(null);
    setIsAuthenticated(false);

    // Remove any base44 tokens from localStorage
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('base44') || key.includes('supabase') || key.includes('sb-') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Storage clear error:', e);
    }

    // Also clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {}

    // Hard redirect to guest homepage
    window.location.href = '/';
  };

  const refreshUser = () => {
    checkUser();
  };

  const navigateToLogin = (redirectPath) => {
    const target = redirectPath || window.location.pathname + window.location.search;
    try {
      sessionStorage.setItem('redirectAfterLogin', target);
    } catch (_) {}
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
