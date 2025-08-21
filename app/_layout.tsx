import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { MatchProvider } from "@/contexts/MatchContext";
import { MediaProvider } from "@/contexts/MediaContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { TranslateProvider } from "@/contexts/TranslateContext";
import { MembershipProvider } from "@/contexts/MembershipContext";
import ErrorBoundary from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="chat/[matchId]" 
        options={{ 
          headerShown: true,
          title: "Chat",
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTintColor: "#000",
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <MatchProvider>
            <MembershipProvider>
              <MediaProvider>
                <ChatProvider>
                  <TranslateProvider>
                    <ErrorBoundary>
                      <RootLayoutNav />
                    </ErrorBoundary>
                  </TranslateProvider>
                </ChatProvider>
              </MediaProvider>
            </MembershipProvider>
          </MatchProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}