import React, { createContext, useState, useContext, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import guestCart from "@/lib/guest-cart";

var AuthContext = createContext();

export var AuthProvider = function({ children }) {
  var [user, setUser] = useState(null);
  var [isAuthenticated, setIsAuthenticated] = useState(false);
  var [isLoadingAuth, setIsLoadingAuth] = useState(true);
  var [authError, setAuthError] = useState(null);

  useEffect(function() { checkUser(); }, []);

  var checkUser = async function() {
    setIsLoadingAuth(true);
    try {
      var result = await supabase.auth.getUser();
      var userData = result.data?.user;
      if (!userData) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }
      var envAdminEmails = import.meta.env.VITE_ADMIN_EMAILS || "";
      var ADMIN_EMAILS = envAdminEmails.split(",").map(function(e) { return e.trim().toLowerCase(); }).filter(Boolean);
      var isAdmin = ADMIN_EMAILS.includes(userData.email?.toLowerCase());
      setUser({ ...userData, isAdmin: isAdmin });
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  var logout = async function() {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  var refreshUser = function() { checkUser(); };

  var navigateToLogin = function(redirectPath) {
    var target = redirectPath || window.location.pathname + window.location.search;
    try { sessionStorage.setItem('redirectAfterLogin', target); } catch (e) {}
    window.location.href = '/login';
  };

  var verifyAdminPassword = function(password) {
    var adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!adminPassword) return false;
    return password === adminPassword;
  };

  return (
    <AuthContext.Provider value={{ user: user, isAuthenticated: isAuthenticated, isLoadingAuth: isLoadingAuth, authError: authError, logout: logout, refreshUser: refreshUser, navigateToLogin: navigateToLogin, verifyAdminPassword: verifyAdminPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export var useAuth = function() {
  var context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
