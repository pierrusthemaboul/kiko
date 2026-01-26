# 🔧 Correction des chevauchements de sons

## Problème identifié

Plusieurs sons se jouaient simultanément, créant une cacophonie désagréable. Causes identifiées :

1. **Ré-exécution multiple des effets** : Les hooks `useEffect` se déclenchaient plusieurs fois
2. **Pas d'arrêt des sons précédents** : Un nouveau son démarrait sans stopper le précédent
3. **Appels dupliqués** : La fonction `playAnswerResult` était appelée plusieurs fois avec le même résultat

## Solutions implémentées

### 1. Protection contre les sons multiples simultanés

**Fichier** : `hooks/game/usePrecisionAudio.ts`

```typescript
// Ajout de refs pour tracker l'état
const currentlyPlayingRef = useRef<Audio.Sound | null>(null);
const lastPlayedResultRef = useRef<{ time: number; difference: number } | null>(null);
```

**Comportement** :
- Arrête automatiquement le son précédent avant d'en jouer un nouveau
- Exception : les sons de touches (`keyPress`) peuvent se chevaucher

### 2. Arrêt du son précédent

```typescript
// Arrêter le son précédent s'il est encore en cours (sauf pour les touches)
if (currentlyPlayingRef.current && soundKey !== 'keyPress') {
  console.log('[usePrecisionAudio] Stopping previous sound to avoid overlap');
  await currentlyPlayingRef.current.stopAsync();
  await currentlyPlayingRef.current.unloadAsync();
  currentlyPlayingRef.current = null;
}
```

**Avantages** :
- Évite les chevauchements désagréables
- Les sons de touches restent réactifs
- Nettoyage propre des ressources audio

### 3. Protection anti-doublons pour les résultats

```typescript
// Protection contre les appels multiples avec le même résultat (dans les 500ms)
if (lastPlayedResultRef.current) {
  const timeSinceLastPlay = now - lastPlayedResultRef.current.time;
  const sameDifference = lastPlayedResultRef.current.difference === absDifference;

  if (sameDifference && timeSinceLastPlay < 500) {
    console.log('[usePrecisionAudio] playAnswerResult - DUPLICATE CALL BLOCKED');
    return; // ❌ Bloqué !
  }
}
```

**Comportement** :
- Si `playAnswerResult` est appelé 2 fois avec le même écart dans les 500ms → bloqué
- Évite que les re-rendus React ne jouent le son plusieurs fois
- Fenêtre de 500ms = assez longue pour bloquer les doublons, assez courte pour ne pas gêner

### 4. Logs de debug détaillés

Tous les événements audio sont maintenant loggés :

```
[usePrecisionAudio] playSound called: goodAnswer enabled: true initialized: true
[usePrecisionAudio] Playing goodAnswer at volume: 0.6
[usePrecisionAudio] Stopping previous sound to avoid overlap
[usePrecisionAudio] Sound goodAnswer playing successfully
```

**Utilité** :
- Identifier les appels multiples
- Vérifier que les sons sont bien arrêtés
- Débugger les problèmes de timing

## Tests recommandés

### Test 1 : Réponse rapide successive
1. Soumettez une réponse
2. Attendez que le son commence
3. Cliquez rapidement sur "Continuer"
4. **Résultat attendu** : Le premier son s'arrête, pas de chevauchement

### Test 2 : Appui rapide sur les touches
1. Appuyez rapidement sur plusieurs touches du pavé
2. **Résultat attendu** : Chaque son de touche se joue (ils peuvent se chevaucher légèrement)

### Test 3 : Temps écoulé
1. Laissez le temps s'écouler sans répondre
2. **Résultat attendu** : Un seul son "timerExpired", pas de doublon

### Test 4 : Réponses variées
1. Testez différentes précisions de réponse :
   - Exacte (0 écart)
   - Proche (5 ans)
   - Moyenne (20 ans)
   - Loin (50 ans)
   - Très loin (200 ans)
2. **Résultat attendu** : Un son différent et approprié pour chaque cas

## Vérification dans les logs

Si vous voyez dans la console :

✅ **Bon signe** :
```
[usePrecisionAudio] Stopping previous sound to avoid overlap
[usePrecisionAudio] playAnswerResult - DUPLICATE CALL BLOCKED
```

❌ **Problème potentiel** :
```
[usePrecisionAudio] playSound called: wrongAnswer ...
[usePrecisionAudio] playSound called: wrongAnswer ...
[usePrecisionAudio] playSound called: wrongAnswer ...
```
→ Si vous voyez 3 appels identiques rapprochés = il reste un problème

## Configuration

### Désactiver la protection anti-doublons

Si vous avez besoin de jouer le même son plusieurs fois rapidement :

```typescript
// Dans usePrecisionAudio.ts, commentez cette partie :
// if (sameDifference && timeSinceLastPlay < 500) {
//   return;
// }
```

### Changer le délai de protection

```typescript
// Actuellement 500ms, ajustez selon vos besoins
if (sameDifference && timeSinceLastPlay < 1000) { // 1 seconde
  return;
}
```

### Permettre le chevauchement de certains sons

```typescript
// Dans playSound, ajoutez d'autres exceptions :
if (currentlyPlayingRef.current && soundKey !== 'keyPress' && soundKey !== 'submit') {
  // Ne pas arrêter pour les touches ET les soumissions
}
```

## Performance

Les optimisations implémentées améliorent aussi les performances :

- **Moins de sons simultanés** → Moins de charge CPU
- **Nettoyage automatique** → Pas de fuite mémoire
- **Blocage des doublons** → Moins d'appels audio inutiles

## Prochaines améliorations possibles

- [ ] Ajouter un système de priorités (certains sons peuvent interrompre d'autres)
- [ ] Implémenter un fade-out au lieu d'un arrêt brutal
- [ ] Créer des transitions sonores fluides entre les sons
- [ ] Ajouter une file d'attente pour jouer les sons séquentiellement si nécessaire

## Résumé

✅ **Problème** : Sons multiples se jouant en même temps
✅ **Solution** : Arrêt automatique + protection anti-doublons + logs
✅ **Résultat** : Un seul son à la fois, expérience audio propre et claire
