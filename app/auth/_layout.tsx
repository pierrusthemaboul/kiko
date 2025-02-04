import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function AuthLayout() {
  useEffect(() => {
    // AuthLayout mounted

    // Configuration des props du Stack
    const stackProps = {
      screenOptions: {
        headerShown: false,
        headerMode: 'none',
        header: null,
      }
    };

    return () => {
      // Cleanup si nécessaire
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerMode: 'none',
        header: null,
        contentStyle: {
          backgroundColor: 'transparent'
        }
      }}
    >
      <Stack.Screen 
        name="Login"
        options={{
          title: null,
          headerShown: false,
          headerTitle: '',
          header: () => null,
        }}
        listeners={{
          focus: () => { },
          beforeRemove: () => { }
        }}
      />
      <Stack.Screen 
        name="signup"
        options={{
          title: null,
          headerShown: false,
          headerTitle: '',
          header: () => null,
        }}
        listeners={{
          focus: () => { },
          beforeRemove: () => { }
        }}
      />
    </Stack>
  );
}
