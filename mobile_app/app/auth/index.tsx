// app/index.tsx
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    // Redirige vers le groupe (tabs)
    router.replace('/(tabs)');
  }, []);

  return null;
}
