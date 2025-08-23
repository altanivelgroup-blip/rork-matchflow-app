import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StyleSheet, InteractionManager } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import "@/lib/consoleTap";
// import { DIAG } from "@/lib/diagnostics";

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
      <Stack.Screen
        name="match-animations-test"
        options={{
          title: "Match Animations Test",
        }}
      />
      <Stack.Screen
        name="diagnostics-report"
        options={{
          title: "Diagnostics",
        }}
      />
      <Stack.Screen
        name="diagnostic-test"
        options={{
          title: "Diagnostic Test",
        }}
      />
      <Stack.Screen
        name="confetti-bomb-test"
        options={{
          title: "Confetti Bomb",
        }}
      />
      <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
    </Stack>
  );
});

export default function RootLayout() {
  const [queryClient] = useState<QueryClient>(() => new QueryClient());
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);
  const [isSplashAnimDone, setIsSplashAnimDone] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        await SplashScreen.hideAsync();
        console.log('[RootLayout] expo splash hidden');
      } catch (e) {
        console.log('[RootLayout] splash hide error', e);
      }
    })();
    const interaction = InteractionManager.runAfterInteractions(() => {
      console.log('[RootLayout] interactions complete, app ready');
      if (isMountedRef.current) setIsAppReady(true);
    });
    return () => {
      if (interaction && typeof (interaction as any).cancel === 'function') {
        (interaction as any).cancel();
      }
      isMountedRef.current = false;
    };
  }, []);



  const onSplashDone = useMemo(() => () => {
    console.log('[RootLayout] in-app splash disabled');
    setIsSplashAnimDone(true);
  }, []);



  return (
    <QueryClientProvider client={queryClient}>

      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
  }
});
