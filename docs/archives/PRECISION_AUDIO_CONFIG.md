# ⚙️ Configuration Audio - Mode Précision

## Réglages actuels

### Volumes par défaut

Les volumes sont définis dans `usePrecisionAudio.ts` via le paramètre `volumeMultiplier` de chaque fonction :

| Son | Volume | Justification |
|-----|--------|---------------|
| Pression touche | 30% | Discret, se répète beaucoup |
| Soumission | 60% | Notable mais pas dominant |
| Réponse parfaite | 100% | Célébration ! |
| Bonne réponse | 80% | Satisfaction |
| Mauvaise réponse | 70% | Feedback négatif modéré |
| Avertissement temps | 50% | Alerte sans stress |
| Temps écoulé | 80% | Événement important |
| Montée de niveau | 80% | Célébration importante |
| Game Over | 80% | Événement majeur |

### Comment ajuster les volumes

Éditez `/hooks/game/usePrecisionAudio.ts` :

```typescript
// Exemple : réduire le son des touches
const playKeyPress = useCallback(() => {
  playSound('keyPress', 0.3); // Changez 0.3 en 0.1 pour plus discret
}, [playSound]);
```

## Activation/Désactivation des sons

### Désactiver complètement les sons

L'utilisateur peut désactiver tous les sons via les paramètres de l'application (hook `useAudio`). Cette préférence est respectée automatiquement.

### Désactiver des sons spécifiques

#### Option 1 : Commentaire simple

Dans `PrecisionGameContent.tsx`, commentez l'appel :

```typescript
const handleDigitPress = useCallback((digit: string) => {
  setInputError(null);
  // precisionAudio.playKeyPress(); // ← Son des touches désactivé
  setGuessValue((prev) => {
    // ...
  });
}, [precisionAudio]);
```

#### Option 2 : Configuration centralisée

Ajoutez un système de configuration dans `usePrecisionAudio.ts` :

```typescript
// En haut du fichier
const AUDIO_CONFIG = {
  enableKeyPress: true,      // Sons de touches
  enableSubmit: true,        // Son de soumission
  enableResults: true,       // Sons de résultats
  enableTimer: true,         // Sons de chronomètre
  enableEvents: true,        // Montée niveau, game over
};

// Puis dans chaque fonction
const playKeyPress = useCallback(() => {
  if (!AUDIO_CONFIG.enableKeyPress) return;
  playSound('keyPress', 0.3);
}, [playSound]);
```

## Sons conditionnels

### Activer le tick du chronomètre

Actuellement désactivé pour éviter le bruit. Pour l'activer :

1. Dans `PrecisionGameContent.tsx`, ajoutez un effet :

```typescript
// Son de tick à chaque seconde
useEffect(() => {
  if (timeLeft > 0 && !lastResult && !isGameOver) {
    precisionAudio.playTimerTick();
  }
}, [timeLeft, lastResult, isGameOver, precisionAudio]);
```

⚠️ **Attention** : Ce son se répétera 20 fois par partie, peut être envahissant !

### Sons variables selon l'écart de réponse

Pour ajouter plus de nuances, modifiez `playAnswerResult` dans `usePrecisionAudio.ts` :

```typescript
const playAnswerResult = useCallback(
  (absDifference: number, timedOut: boolean = false) => {
    if (timedOut) {
      playSound('timerExpired', 0.8);
    } else if (absDifference === 0) {
      playPerfectAnswer();
    } else if (absDifference <= 2) {
      // Très proche !
      playSound('perfectAnswer', 0.9);
    } else if (absDifference <= 5) {
      playGoodAnswer();
    } else if (absDifference <= 20) {
      // Moyennement loin
      playSound('wrongAnswer', 0.5);
    } else {
      // Très loin
      playWrongAnswer();
    }
  },
  [playSound, playPerfectAnswer, playGoodAnswer, playWrongAnswer]
);
```

## Retours haptiques

Les vibrations haptiques complètent les sons. Configuration actuelle :

### Dans PrecisionGameContent.tsx

```typescript
// Soumission
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Temps écoulé
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

### Pour désactiver les vibrations

Commentez les appels `Haptics.*` dans le code.

### Pour ajouter plus de vibrations

```typescript
// Réponse parfaite
if (lastResult.absDifference === 0) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// Mauvaise réponse
if (lastResult.absDifference > 20) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
```

## Timing et synchronisation

### Délai avant le son

Pour ajouter un délai avant un son :

```typescript
setTimeout(() => {
  precisionAudio.playPerfectAnswer();
}, 200); // 200ms de délai
```

### Enchaînement de sons

Pour jouer plusieurs sons séquentiellement :

```typescript
precisionAudio.playSubmit();
setTimeout(() => {
  precisionAudio.playGoodAnswer();
}, 500); // Le second son démarre 500ms après
```

## Performance

### Optimisations actuelles

- Pas de cache des sons (évite les problèmes de concurrence)
- Déchargement automatique après lecture
- Volume calculé une seule fois par lecture

### Si les sons causent des lags

1. **Réduire la qualité** : Convertir les WAV en MP3
2. **Pré-charger** : Implémenter un cache avec chargement au démarrage
3. **Désactiver** : Désactiver les sons les plus fréquents (touches)

## Débogage audio

### Logs Firebase Analytics

Les événements audio importants sont loggés. Pour voir dans la console :

```typescript
// Dans usePrecisionAudio.ts
console.log('[AUDIO] Playing sound:', soundKey, 'volume:', finalVolume);
```

### Vérifier si un son se joue

```typescript
const playSound = useCallback(
  async (soundKey: keyof typeof soundPaths, volumeMultiplier: number = 1.0) => {
    console.log('🔊 Playing:', soundKey);
    // ... reste du code
  },
  [isSoundEnabled, soundVolume]
);
```

### Tester les sons manuellement

Ajoutez des boutons de test dans votre interface :

```tsx
<Button
  title="Test Perfect Answer"
  onPress={() => precisionAudio.playPerfectAnswer()}
/>
```

## Exemples de configurations

### Configuration "Silencieuse"
- Seulement les sons de résultats
- Pas de sons d'interface

```typescript
const AUDIO_CONFIG = {
  enableKeyPress: false,
  enableSubmit: false,
  enableResults: true,
  enableTimer: false,
  enableEvents: true,
};
```

### Configuration "Complète"
- Tous les sons activés y compris le tick

```typescript
const AUDIO_CONFIG = {
  enableKeyPress: true,
  enableSubmit: true,
  enableResults: true,
  enableTimer: true,      // + tick activé
  enableEvents: true,
};
```

### Configuration "Événements uniquement"
- Seulement les sons importants

```typescript
const AUDIO_CONFIG = {
  enableKeyPress: false,
  enableSubmit: false,
  enableResults: true,
  enableTimer: false,
  enableEvents: true,
};
```

## Préférences utilisateur (à implémenter)

Pour permettre aux utilisateurs de configurer les sons :

1. Ajouter dans les settings de l'app
2. Stocker dans AsyncStorage
3. Passer la config au hook usePrecisionAudio

Exemple :

```typescript
interface AudioPreferences {
  enableInterfaceSounds: boolean;
  enableResultSounds: boolean;
  enableTimerSounds: boolean;
  interfaceVolume: number;
  resultVolume: number;
}
```
