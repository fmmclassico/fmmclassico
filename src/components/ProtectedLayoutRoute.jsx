import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useEffect } from 'react';

export default function ProtectedLayoutRoute({ children, currentPageName, fallback = null }) {
  const { isAuthenticated, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigateToLogin();
    }
  }, [isAuthenticated, navigateToLogin]);

  if (!isAuthenticated) {
    return fallback || null;
  }

  return children;
}
