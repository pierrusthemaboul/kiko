// app/(tabs)/index.tsx
import React from 'react';
import { Image, StyleSheet, Platform, View } from 'react-native';
import { AdMobBanner } from 'expo-ads-admob';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12'
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Explore tab to learn more about what's included in this starter app.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, run{' '}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>

      {/* Affichage de la bannière de test AdMob */}
      <View style={styles.adContainer}>
        {/**
          Pour le moment, si tu es sur Android et que tu rencontres des problèmes, 
          tu peux afficher cette bannière uniquement sur iOS.
          Pour tester sur Android, il te faudra un build de développement personnalisé.
        */}
        {Platform.OS === 'ios' ? (
          <AdMobBanner
            bannerSize="smartBannerPortrait"
            // ID de test pour une bannière fourni par Google
            adUnitID="ca-app-pub-3940256099942544/6300978111"
            servePersonalizedAds={true}
            onDidFailToReceiveAdWithError={(error) =>
              console.error("Erreur lors du chargement de l'annonce :", error)
            }
          />
        ) : (
          <ThemedText type="default">
            La bannière AdMob nécessite un build de développement sur Android.
          </ThemedText>
        )}
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  adContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
});
