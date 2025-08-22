import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";
import { AuthProvider } from "@/contexts/AuthContext";
import { MatchProvider } from "@/contexts/MatchContext";
import { MediaProvider } from "@/contexts/MediaContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { TranslateProvider } from "@/contexts/TranslateContext";
import { MembershipProvider } from "@/contexts/MembershipContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { DreamDateProvider } from "@/contexts/DreamDateContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppSplashScreen from "@/components/SplashScreen";

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
      <Stack.Screen
        name="dream-date/[matchId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="dream-date-test"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-test"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="splash-test"
        options={{
          title: "Splash Test",
        }}
      />
    </Stack>
  );
});

export default function RootLayout() {
  const [queryClient] = useState<QueryClient>(() => new QueryClient());
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('[RootLayout] expo splash hidden');
      } catch (e) {
        console.log('[RootLayout] splash hide error', e);
      }
    })();
  }, []);

  const onSplashDone = useMemo(() => () => {
    console.log('[RootLayout] in-app splash complete');
    setShowSplash(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <I18nProvider>
          <AuthProvider>
            <MatchProvider>
              <MembershipProvider>
                <TranslateProvider>
                  <DreamDateProvider>
                    <MediaProvider>
                      <ChatProvider>
                        <ToastProvider>
                          <ErrorBoundary>
                            <AnalyticsProvider>
                              <NotificationsProvider>
                                <View style={styles.appContainer} testID="root-app">
                                  <RootLayoutNav />
                                  {showSplash ? (
                                    <View style={styles.splashOverlay} pointerEvents="none" testID="splash-overlay">
                                      <AppSplashScreen onAnimationComplete={onSplashDone} />
                                    </View>
                                  ) : null}
                                </View>
                              </NotificationsProvider>
                            </AnalyticsProvider>
                          </ErrorBoundary>
                        </ToastProvider>
                      </ChatProvider>
                    </MediaProvider>
                  </DreamDateProvider>
                </TranslateProvider>
              </MembershipProvider>
            </MatchProvider>
          </AuthProvider>
        </I18nProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});