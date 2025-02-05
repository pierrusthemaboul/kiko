import 'react-native-reanimated';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="auth" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}