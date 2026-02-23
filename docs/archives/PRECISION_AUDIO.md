# 🔊 Ambiance Sonore - Mode Précision

## Vue d'ensemble

Le mode Précision dispose désormais d'une ambiance sonore complète qui enrichit l'expérience de jeu avec des retours audio contextuels.

## Architecture

### Hook `usePrecisionAudio`
Situé dans `/hooks/game/usePrecisionAudio.ts`, ce hook gère tous les sons spécifiques au mode Précision.

### Sons disponibles

#### 🎹 Sons d'interface
- **`playKeyPress()`** : Son subtil joué à chaque pression sur une touche du pavé numérique
  - Volume réduit (30%) pour ne pas être envahissant
  - Fichier : `bop.wav`

- **`playSubmit()`** : Son distinctif lors de la soumission d'une réponse
  - Volume : 60%
  - Fichier : `361261__japanyoshithegamer__8-bit-spaceship-startup.wav`

#### 🎯 Sons de résultat
- **`playPerfectAnswer()`** : Réponse parfaite (écart = 0 an)
  - Volume : 100%
  - Fichier : `corectok.wav`

- **`playGoodAnswer()`** : Bonne réponse (écart ≤ 30 ans)
  - Volume : 80% (1-10 ans) ou 60% (11-30 ans)
  - Fichier : `corectok.wav`

- **`playWrongAnswer()`** : Mauvaise réponse (écart > 30 ans)
  - Volume : 50% (31-100 ans) ou 70% (>100 ans)
  - Fichier : `361260__japanyoshithegamer__8-bit-wrong-sound.wav`

- **`playAnswerResult(absDifference, timedOut)`** : Fonction intelligente qui choisit automatiquement le son approprié
  - **0 écart** → Son parfait (🎯)
  - **1-10 ans** → Son de succès à 80% (✅ Très bien)
  - **11-30 ans** → Son de succès à 60% (👍 Bien)
  - **31-100 ans** → Son d'échec à 50% (⚠️ Assez loin)
  - **>100 ans** → Son d'échec à 70% (❌ Très loin)
  - **Temps écoulé** → Son spécial timerExpired (⏱️)

#### ⏱️ Sons de chronomètre
- **`playTimerWarning()`** : Déclenché à 5 secondes restantes
  - Volume : 50%
  - Fichier : `countdown.wav`

- **`playTimerExpired()`** : Quand le temps est écoulé
  - Volume : 80%
  - Fichier : `242208__wagna__failfare.mp3`

- **`playTimerTick()`** : Tick optionnel du chronomètre (non utilisé actuellement pour éviter le bruit)
  - Volume : 20%
  - Fichier : `count.wav`

#### 🎊 Sons d'événements spéciaux
- **`playLevelUp()`** : Passage de niveau
  - Volume : 80%
  - Fichier : `423455__ohforheavensake__trumpet-brass-fanfare.wav`

- **`playGameOver()`** : Fin de partie
  - Volume : 80%
  - Fichier : `242208__wagna__failfare.mp3`

## Intégration dans PrecisionGameContent

Le composant `PrecisionGameContent` utilise maintenant le hook `usePrecisionAudio` avec :
- Respect des préférences utilisateur (volume et activation/désactivation des sons)
- Coordination avec les vibrations haptiques
- Timing optimal pour chaque événement

### Déclencheurs automatiques

1. **Pression de touches** : `handleDigitPress()` et `handleBackspace()`
2. **Soumission** : `handleSubmit()`
3. **Résultats** : Effet déclenché quand `lastResult` change
4. **Avertissement temps** : Effet déclenché à 5 secondes

## Configuration audio

Les sons respectent les paramètres utilisateur :
- `isSoundEnabled` : Active/désactive tous les sons
- `soundVolume` : Volume global (0.0 à 1.0)
- Chaque son a un multiplicateur de volume spécifique pour un équilibre optimal

## Fichiers audio utilisés

Tous les sons sont dans `/assets/sounds/` :
```
bop.wav                          # Touche du pavé
361261__japanyoshithegamer...    # Soumission
corectok.wav                     # Réponse correcte
361260__japanyoshithegamer...    # Réponse incorrecte
countdown.wav                    # Avertissement temps
count.wav                        # Tick (optionnel)
242208__wagna__failfare.mp3     # Temps écoulé/Game Over
423455__ohforheavensake...       # Montée de niveau
```

## Analytics

Les événements audio importants sont tracés via Firebase Analytics :
- Sons de réponse (parfaite, correcte, incorrecte)
- Passage de niveau
- Game Over

## Améliorations futures possibles

- [ ] Musique d'ambiance en boucle pour le mode Précision
- [ ] Sons différents selon les périodes historiques
- [ ] Variations de sons selon les combos/séries de réponses
- [ ] Sons spéciaux pour les records personnels
- [ ] Option pour activer/désactiver les sons d'interface séparément des sons d'événements

## Notes techniques

- Utilise `expo-av` pour la lecture audio
- Gestion automatique du nettoyage des ressources audio
- Pas de mise en cache des sons pour éviter les problèmes de concurrence
- Compatible iOS et Android avec configuration audio appropriée
