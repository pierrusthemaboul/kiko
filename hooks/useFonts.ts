// /home/pierre/sword/kiko/hooks/useFonts.ts
import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

const fontsToLoad = {
    // ... (vos polices comme avant) ...
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
    console.log("useFonts: useEffect triggered."); // Log 1

    async function loadFontsAsync() {
      console.log("useFonts: loadFontsAsync called."); // Log 2
      try {
        console.log("useFonts: Attempting Font.loadAsync..."); // Log 3
        await Font.loadAsync(fontsToLoad);
        // SI VOUS VOYEZ CE LOG, loadAsync a réussi !
        console.log(">>> useFonts: Font.loadAsync SUCCEEDED! <<<"); // Log 4
        if (isMounted) {
          console.log("useFonts: Setting fontsLoaded to true."); // Log 5
          setFontsLoaded(true);
        } else {
          console.log("useFonts: Component unmounted before fonts loaded."); // Log 6
        }
      } catch (error) {
        // SI VOUS VOYEZ CE LOG, loadAsync a échoué.
        console.error('>>> useFonts: Font.loadAsync FAILED! <<<', error); // Log 7
      }
    }

    loadFontsAsync();

    return () => {
      console.log("useFonts: Cleanup function ran (component unmounted?)."); // Log 8
      isMounted = false;
    };
  }, []);

  console.log("useFonts: Hook returning fontsLoaded =", fontsLoaded); // Log 9
  return fontsLoaded;
};