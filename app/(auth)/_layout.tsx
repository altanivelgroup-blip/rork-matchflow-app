import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="verify-photo" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="questionnaire" options={{ headerShown: true, title: 'Profile Questionnaire' }} />
    </Stack>
  );
}