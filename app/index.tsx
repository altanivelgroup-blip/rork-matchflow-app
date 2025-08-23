import React, { useEffect } from 'react';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const root = useRootNavigationState();

  useEffect(() => {
    console.log('[index] boot', { key: root?.key, isAuthenticated });
  }, [root?.key, isAuthenticated]);

  if (!root?.key) return null;

  if (isAuthenticated) {
    console.log('[index] redirect -> /home');
    return <Redirect href="/home" />;
  }

  console.log('[index] redirect -> /login');
  return <Redirect href="/login" />;
}
