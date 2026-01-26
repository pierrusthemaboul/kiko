// /home/pierre/sword/kiko/hooks/useFonts.ts
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

const fontsToLoad = {
    // Définissez ici vos polices comme vous le faisiez
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
};

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFontsAsync() {
      try {
        await Font.loadAsync(fontsToLoad);
        if (isMounted) {
          setFontsLoaded(true);
        }
      } catch (error) {
        // Le chargement des polices a échoué.
        // Vous pourriez vouloir gérer cette erreur autrement ici,
        // par exemple en définissant un état d'erreur.
        // Pour l'instant, l'erreur est juste ignorée silencieusement.
        console.error('Erreur lors du chargement des polices:', error); // Gardé un console.error minimal, mais peut être enlevé si besoin absolu.
        // Si vous voulez enlever TOUS les logs, même les erreurs, enlevez la ligne ci-dessus.
      }
    }

    loadFontsAsync();

    return () => {
      isMounted = false;
    };
  }, []); // Le tableau vide assure que l'effet ne s'exécute qu'au montage

  return fontsLoaded;
};