import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StyleSheet, InteractionManager, BackHandler, Platform } from "react-native";
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
  const [showSplash, setShowSplash] = useState<boolean>(true);
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
    console.log('[RootLayout] in-app splash complete');
    if (isMountedRef.current) {
      setIsSplashAnimDone(true);
      if (isAppReady) {
        setShowSplash(false);
      }
    } else {
      console.log('[RootLayout] skip setShowSplash, not mounted');
    }
  }, [isAppReady]);

  useEffect(() => {
    if (showSplash && Platform.OS !== 'web') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        console.log('[RootLayout] Back press blocked during splash');
        return true;
      });
      return () => {
        sub.remove();
      };
    }
  }, [showSplash]);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <link rel="icon" type="image/png" sizes="32x32" href="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ej8wpdgrhkud76f3w6rio" />
        <link rel="icon" type="image/png" sizes="16x16" href="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ej8wpdgrhkud76f3w6rio" />
        <link rel="shortcut icon" href="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ej8wpdgrhkud76f3w6rio" />
        <link rel="apple-touch-icon" sizes="180x180" href="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ej8wpdgrhkud76f3w6rio" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
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
                                    <View style={styles.splashOverlay} pointerEvents="auto" testID="splash-overlay">
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
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
