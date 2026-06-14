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
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    // Safety timeout — if loading takes more than 8s, clear the spinner so users aren't stuck
    const loadingTimeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }, 8000);

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Only handle app-level 403s with a specific reason from the platform
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            // App requires login — only redirect if there's truly no token
            if (!appParams.token) {
              setAuthError({ type: 'auth_required', message: 'Authentication required' });
            } else {
              // Token exists but app check failed — try to check auth anyway before redirecting
              await checkUserAuth();
            }
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          // Network error, timeout, etc. — don't log out, just clear the loading state
          // so the user stays on the page they were on
          setIsLoadingAuth(false);
        }
        clearTimeout(loadingTimeout);
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      console.error('Unexpected error in checkAppState:', error);
      // Don't set a hard auth error on unexpected failures — this prevents spurious logouts
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    } finally {
      clearTimeout(loadingTimeout);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      
      // Check if user needs to verify admin password
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
            message: 'Admin password verification required'
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
      // Only force logout/redirect on a definitive 401 from the auth endpoint itself.
      // Do NOT redirect on network errors, timeouts, or other transient failures —
      // those would cause spurious logouts when navigating between pages.
      if (error.status === 401) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
      // For 403 and other errors, stay silent — user stays on page without forced redirect.
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
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
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
      verifyAdminPassword
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