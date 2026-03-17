/**
 * EXEMPLE : Rendu d'écrans de jeu pour screenshots
 *
 * Ce fichier montre comment vous pourriez générer de VRAIS screenshots PNG
 * à partir des données JSON générées par l'API.
 *
 * NOTE : Ceci est un EXEMPLE à adapter selon votre UI existante.
 * Vous devrez installer : npm install react-native-view-shot
 *
 * @version 1.0.0 (EXAMPLE - NON FONCTIONNEL TEL QUEL)
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

interface GameScreenData {
  evenement: {
    nom: string;
    annee: number;
  };
  gameState: {
    score: number;
    tour: number;
    mode: string;
  };
  choixJoueur?: {
    reponse: 'AVANT' | 'APRES';
    correct: boolean;
  };
}

/**
 * Composant pour rendre un écran de jeu
 * (À adapter selon votre UI Timalaus existante)
 */
export function RenderGameScreen({ data }: { data: GameScreenData }) {
  const viewShotRef = useRef<ViewShot>(null);

  // Fonction pour capturer le screenshot
  const captureScreen = async () => {
    if (viewShotRef.current) {
      const uri = await viewShotRef.current.capture();
      return uri; // Chemin vers le fichier PNG généré
    }
    return null;
  };

  return (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
      <View style={styles.container}>
        {/* Header avec score */}
        <View style={styles.header}>
          <Text style={styles.mode}>{data.gameState.mode}</Text>
          <Text style={styles.score}>Score: {data.gameState.score}</Text>
        </View>

        {/* Carte événement */}
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{data.evenement.nom}</Text>
          <Text style={styles.eventYear}>{data.evenement.annee}</Text>
        </View>

        {/* Feedback si choix fait */}
        {data.choixJoueur && (
          <View
            style={[
              styles.feedback,
              data.choixJoueur.correct ? styles.correct : styles.incorrect,
            ]}
          >
            <Text style={styles.feedbackText}>
              {data.choixJoueur.correct ? '✅ Correct !' : '❌ Incorrect'}
            </Text>
          </View>
        )}

        {/* Tour */}
        <Text style={styles.tourIndicator}>Tour {data.gameState.tour}/6</Text>
      </View>
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#1a1a2e',
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  mode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  score: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventCard: {
    backgroundColor: '#16213e',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  eventName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  eventYear: {
    color: '#ffd700',
    fontSize: 48,
    fontWeight: 'bold',
  },
  feedback: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  correct: {
    backgroundColor: '#4caf50',
  },
  incorrect: {
    backgroundColor: '#f44336',
  },
  feedbackText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tourIndicator: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
});

/**
 * Fonction utilitaire pour générer tous les screenshots d'une partie
 */
export async function generateAllScreenshots(partieJSON: any) {
  const screenshots: string[] = [];

  // Pour chaque événement, générer un screenshot
  for (let i = 0; i < partieJSON.evenements.length; i++) {
    const data: GameScreenData = {
      evenement: partieJSON.evenements[i],
      gameState: {
        score: calculateScore(partieJSON.choix.slice(0, i)),
        tour: i + 1,
        mode: partieJSON.mode,
      },
      choixJoueur: partieJSON.choix[i - 1] || null,
    };

    // Rendre le composant (vous devrez l'intégrer dans un contexte React Native)
    const screen = <RenderGameScreen data={data} />;

    // Capturer le screenshot
    // (Nécessite de render le composant puis de capturer)
    // const uri = await captureScreen();
    // screenshots.push(uri);
  }

  return screenshots;
}

function calculateScore(choix: any[]) {
  return choix.reduce((acc, c) => acc + (c.correct ? 1000 : 0), 0);
}

/**
 * UTILISATION :
 *
 * 1. Installer react-native-view-shot :
 *    npm install react-native-view-shot
 *
 * 2. Adapter le composant RenderGameScreen selon votre UI Timalaus
 *
 * 3. Créer un script qui :
 *    - Charge le JSON généré par tom_api_simulator.js
 *    - Rend chaque écran avec RenderGameScreen
 *    - Capture avec viewShotRef.current.capture()
 *    - Sauvegarde les PNG dans OUTPUTS/screenshots/
 *
 * 4. Exemple de script Node.js (pseudo-code) :
 *
 *    const partie = require('./ASSETS_RAW/partie_XXX.json');
 *    const screenshots = await generateAllScreenshots(partie);
 *    screenshots.forEach((uri, i) => {
 *      fs.copyFileSync(uri, `./OUTPUTS/screenshots/screenshot_${i}.png`);
 *    });
 *
 * NOTE : La génération de screenshots React Native en mode headless
 * est complexe et nécessite un environnement React Native complet.
 * Pour l'instant, le screenshot_generator.js génère des JSON
 * que K-Hive peut utiliser pour créer des visuels avec d'autres outils.
 */
