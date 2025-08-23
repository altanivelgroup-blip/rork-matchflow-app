import { Tabs, useRouter, useRootNavigationState } from "expo-router";
import { Heart, MessageCircle, User, Settings as SettingsIcon, Grid3X3, Globe2 } from "lucide-react-native";
import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DIAG } from "@/lib/diagnostics";

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (!isAuthenticated) {
      DIAG.push({ level: 'warn', code: 'NAV_GUARD', scope: 'tabs', message: 'Blocked unauthenticated access to tabs' });
      router.replace('/login' as any);
    }
  }, [isAuthenticated, router, rootNavigationState?.key]);

  if (!rootNavigationState?.key) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FF6B6B",
        tabBarInactiveTintColor: "#999",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Heart color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
          tabBarIcon: ({ color }) => <Grid3X3 color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="international"
        options={{
          title: "International",
          tabBarIcon: ({ color }) => <Globe2 color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <SettingsIcon color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
