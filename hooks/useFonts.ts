import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
          'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
          'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Erreur lors du chargement des polices:', error);
        setFontsLoaded(false);
      }
    }

    loadFonts();
  }, []);

  return fontsLoaded;
};