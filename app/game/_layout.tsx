import { Stack } from 'expo-router';

export default function GameLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Masquer complètement l'en-tête dans le groupe game
        header: () => null,
        // Assurer qu'il n'y a pas de padding ou de marge
        contentStyle: {
          backgroundColor: 'transparent'
        }
      }}
    />
  );
}

// app/game/_layout.tsx