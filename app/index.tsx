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
    console.log('[index] redirect -> /(tabs)');
    return <Redirect href={'/(tabs)' as any} />;
  }

  console.log('[index] redirect -> /(auth)/login');
  return <Redirect href={'/(auth)/login' as any} />;
}
