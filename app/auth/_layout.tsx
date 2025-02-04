import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: 'transparent'
        }
      }}
    >
      <Stack.Screen 
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="signup"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}