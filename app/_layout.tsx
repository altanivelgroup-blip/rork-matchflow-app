import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { MatchProvider } from "@/contexts/MatchContext";
import { MediaProvider } from "@/contexts/MediaContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { TranslateProvider } from "@/contexts/TranslateContext";
import { MembershipProvider } from "@/contexts/MembershipContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const RootLayoutNav = React.memo(function RootLayoutNav() {
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
});

export default function RootLayout() {
  const [queryClient] = useState<QueryClient>(() => new QueryClient());

  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log('[RootLayout] splash hide error', e);
      }
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <I18nProvider>
          <AuthProvider>
            <MatchProvider>
              <MembershipProvider>
                <TranslateProvider>
                  <MediaProvider>
                    <ChatProvider>
                      <ToastProvider>
                        <ErrorBoundary>
                          <RootLayoutNav />
                        </ErrorBoundary>
                      </ToastProvider>
                    </ChatProvider>
                  </MediaProvider>
                </TranslateProvider>
              </MembershipProvider>
            </MatchProvider>
          </AuthProvider>
        </I18nProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}