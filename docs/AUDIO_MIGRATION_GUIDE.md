# Guide de migration audio : expo-audio SDK 52

## Problème rencontré

### Erreur initiale
```
ERROR  Error: Value is undefined, expected an Object, js engine: hermes
```

Cette erreur apparaissait au lancement de l'application, avant même l'initialisation de l'audio.

### Cause racine
**`createAudioPlayer()` est buggé dans expo-audio 0.3.5 (SDK 52)**

L'API `createAudioPlayer()` utilisée avec `require()` pour charger des assets audio provoque une erreur dans expo-audio version 0.3.5, qui est la version compatible avec Expo SDK 52.

```typescript
// ❌ NE FONCTIONNE PAS avec expo-audio 0.3.5 (SDK 52)
const player = createAudioPlayer(require('../assets/sounds/bop.wav'));
```

### Pourquoi ne pas upgrader vers expo-audio 1.0.14 ?

expo-audio 1.0.14 (stable) nécessite **Expo SDK 53**, mais le projet utilise **Expo SDK 52**. Tenter d'utiliser expo-audio 1.0.14 avec SDK 52 provoque :
```
ERROR  Received 3 arguments, but 2 was expected
```

L'API a changé entre les versions et n'est pas rétrocompatible.

## Solution : Migration vers `useAudioPlayer`

### API recommandée pour SDK 52
Au lieu de `createAudioPlayer()`, utiliser le hook **`useAudioPlayer()`** qui fonctionne correctement avec expo-audio 0.3.5.

### Pattern de migration

#### Avant (buggé) :
```typescript
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

const soundPaths = {
  correct: require('../assets/sounds/correct.wav'),
  incorrect: require('../assets/sounds/incorrect.wav'),
};

export const useAudio = () => {
  const players = useRef<Partial<Record<string, AudioPlayer>>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // ❌ Provoque l'erreur "Value is undefined"
      const player = createAudioPlayer(soundPaths.correct);
      players.current.correct = player;
      setIsInitialized(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const playSound = (key: string) => {
    if (!isInitialized) return;
    const player = players.current[key];
    player?.play();
  };
};
```

#### Après (fonctionne) :
```typescript
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import { useRef } from 'react';

const soundPaths = {
  correct: require('../assets/sounds/correct.wav'),
  incorrect: require('../assets/sounds/incorrect.wav'),
};

export const useAudio = () => {
  // ✅ Créer les players directement avec useAudioPlayer
  const correctPlayer = useAudioPlayer(soundPaths.correct);
  const incorrectPlayer = useAudioPlayer(soundPaths.incorrect);

  // Map pour accès facile
  const playersRef = useRef<Record<string, AudioPlayer>>({
    correct: correctPlayer,
    incorrect: incorrectPlayer,
  });

  const playSound = (key: string) => {
    const player = playersRef.current[key];
    if (!player) return;

    player.seekTo(0);
    player.play();
  };
};
```

### Avantages de useAudioPlayer

1. **Pas d'initialisation asynchrone** : Les players sont créés au rendu du composant
2. **Pas de useEffect complexe** : Simplifie le code
3. **Pas de state isInitialized** : Plus besoin de tracker l'état d'initialisation
4. **Compatibilité SDK 52** : Fonctionne correctement avec expo-audio 0.3.5
5. **Approche React** : Utilise les hooks React natifs

### Checklist de migration

- [ ] Remplacer `createAudioPlayer` par `useAudioPlayer` dans les imports
- [ ] Créer un player par son avec `useAudioPlayer(soundPath)`
- [ ] Créer un `playersRef` pour mapper les players
- [ ] Supprimer le `useEffect` d'initialisation
- [ ] Supprimer le state `isInitialized`
- [ ] Retirer `isInitialized` des dépendances des callbacks
- [ ] Supprimer `useEffect` des imports si non utilisé ailleurs

## Fichiers migrés

- ✅ `/hooks/game/usePrecisionAudio.ts` - Mode Precision (10 sons)
- ✅ `/hooks/useAudio.ts` - Mode Classique (5 sons)

## Stratégie audio du projet

### Mode Precision (usePrecisionAudio.ts)
- **Son neutre** pour validation : `bop.wav`
- **Son spécial** uniquement pour date exacte : `corectok.wav`
- Pas de son pour les autres cas (feedback visuel)
- Gestion des canaux pour éviter les superpositions

### Mode Classique (useAudio.ts)
- Sons pour correct/incorrect
- Sons pour level up et game over
- Son de countdown

## Migration future vers SDK 53

Quand le projet migrera vers Expo SDK 53, il sera possible d'upgrader vers expo-audio 1.0.14+ qui est la version stable. Cependant, `useAudioPlayer` continuera de fonctionner, donc cette migration n'est pas urgente d'un point de vue audio.

## Références

- [expo-audio documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- Issue GitHub Expo : createAudioPlayer bug avec require() dans SDK 52
- Migration vers SDK 53 : Prévoir mise à jour expo-audio

## Note importante

⚠️ **NE PAS revenir à `createAudioPlayer` avec expo-audio 0.3.5**

Si vous voyez l'erreur `Value is undefined, expected an Object`, c'est probablement que du code utilise encore `createAudioPlayer`. Vérifiez les fichiers audio et migrez vers `useAudioPlayer`.
