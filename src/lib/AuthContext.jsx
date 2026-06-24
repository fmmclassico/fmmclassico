import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import guestCart from "@/lib/guest-cart";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load user on app start
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    setIsLoadingAuth(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      // ADMIN CHECK (from Vercel env)
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

  // LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);

    window.location.href = "/";
  };

  // REFRESH USER (useful after login)
  const refreshUser = () => {
    checkUser();
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