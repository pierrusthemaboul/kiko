import 'react-native-reanimated';
import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" />
      <Stack.Screen name="vue1" />
    </Stack>
  );
}
