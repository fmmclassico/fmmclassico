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

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
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

  // Admin password verified server-side via Supabase RPC
  const verifyAdminPassword = async (password) => {
    try {
      const { data, error } = await supabase.rpc('verify_admin_password', {
        input_password: password
      });
      if (error) return false;
      return data === true;
    } catch {
      return false;
    }
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
