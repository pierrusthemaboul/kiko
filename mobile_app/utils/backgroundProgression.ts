// utils/backgroundProgression.ts
// Gestion de la progression des backgrounds au fil des niveaux

export type BackgroundImage = number;

// Importation des backgrounds
const BACKGROUNDS = {
  1: require('../assets/images/bg-level-1.png'), // Squelette avec sablier - Début sombre
  2: require('../assets/images/bg-level-2.png'), // Portail mystérieux - Progression
  3: require('../assets/images/bg-level-3.png'), // Horloge océanique - Milieu de partie
  4: require('../assets/images/bg-level-4.png'), // Horloge sombre - Niveaux avancés
  5: require('../assets/images/bg-level-5.png'), // Sablier épique - Niveaux experts
};

/**
 * Retourne l'image de background correspondant au niveau actuel
 * La progression se fait par paliers pour éviter les changements trop fréquents
 *
 * @param level - Le niveau actuel du joueur
 * @returns L'image de background à utiliser
 */
export function getBackgroundForLevel(level: number): BackgroundImage {
  // Paliers de progression :
  // Niveau 1-2 : Background 1 (début sombre avec squelette)
  // Niveau 3-5 : Background 2 (portail mystérieux)
  // Niveau 6-10 : Background 3 (horloge océanique)
  // Niveau 11-15 : Background 4 (horloge sombre)
  // Niveau 16+ : Background 5 (sablier épique final)

  if (level <= 2) {
    return BACKGROUNDS[1];
  } else if (level <= 5) {
    return BACKGROUNDS[2];
  } else if (level <= 10) {
    return BACKGROUNDS[3];
  } else if (level <= 15) {
    return BACKGROUNDS[4];
  } else {
    return BACKGROUNDS[5];
  }
}

/**
 * Retourne le nom descriptif du background actuel (pour debug/analytics)
 */
export function getBackgroundName(level: number): string {
  if (level <= 2) return 'Début du voyage';
  if (level <= 5) return 'Portail temporel';
  if (level <= 10) return 'Océan du temps';
  if (level <= 15) return 'Ère sombre';
  return 'Maître du temps';
}

/**
 * Vérifie si le joueur vient de franchir un palier de changement de background
 * Utile pour déclencher une animation de transition
 */
export function hasBackgroundChanged(previousLevel: number, currentLevel: number): boolean {
  const previousBg = getBackgroundForLevel(previousLevel);
  const currentBg = getBackgroundForLevel(currentLevel);
  return previousBg !== currentBg;
}
