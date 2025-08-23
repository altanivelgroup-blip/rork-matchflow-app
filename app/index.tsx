import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('[index] boot', { isAuthenticated });
  }, [isAuthenticated]);

  if (isAuthenticated) {
    console.log('[index] redirect -> /(tabs)/home');
    return <Redirect href="/(tabs)/home" />;
  }

  console.log('[index] redirect -> /(auth)/login');
  return <Redirect href="/(auth)/login" />;
}
