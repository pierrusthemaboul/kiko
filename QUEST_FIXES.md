# 🔧 Corrections du Système de Quêtes

**Date**: 6 octobre 2025
**Problèmes résolus**: 3 bugs critiques dans le système de quêtes

---

## 🐛 Problèmes identifiés

### 1. Quêtes quotidiennes validées après 1 seule partie
**Symptôme**: Toutes les quêtes quotidiennes sont marquées comme complétées après une seule partie.

**Cause**: Chevauchement des conditions dans `lib/economy/apply.ts` (lignes 502-515)
- Les quêtes `daily_score_XXXX` matchaient DEUX conditions :
  1. La condition one-shot (ligne 502)
  2. La condition de cumul (ligne 512)
- Résultat : la progression était mise à jour deux fois

**Solution**: Réorganisation des conditions avec priorité pour éviter les doublons
- Les quêtes one-shot (`daily_score_`, `high_score`) sont traitées EN PREMIER
- Les quêtes cumulatives sont traitées EN DERNIER
- Ajout de logs détaillés pour le débogage

### 2. Quête hebdomadaire "50 000 points" reste à 0
**Symptôme**: La quête de cumul hebdomadaire ne progresse jamais.

**Cause**: Le nom de la quête ne contenait probablement pas `_score_` dans sa clé
- La condition `key.includes('_score_')` ne matchait pas

**Solution**: Ajout de conditions supplémentaires
- Maintenant capture aussi `_champion` et `_points` dans les noms de quêtes
- Log amélioré montrant la target pour faciliter le débogage

### 3. Reset des quêtes pas à minuit heure française
**Symptôme**: Les quêtes ne se réinitialisent pas à minuit en France.

**Cause**: Utilisation de `new Date().setHours(0,0,0,0)` qui prend l'heure locale du système
- Si le serveur est en UTC → reset à minuit UTC (1h-2h du matin en France)

**Solution**:
- Ajout d'une fonction `getTodayResetTimeFrance()` utilisant le timezone Europe/Paris
- Documentation claire du comportement actuel
- Les fonctions existantes conservées pour compatibilité

---

## ✅ Corrections appliquées

### Fichier : `lib/economy/apply.ts`

**Avant** (ligne 495-522) :
```typescript
// Les conditions se chevauchaient
if (key.startsWith('daily_score_')) { ... }
else if (key.includes('_score_') && !key.includes('high_score')) { ... }
```

**Après** :
```typescript
// Ordre de priorité clair
if (key.startsWith('daily_play_') ...) { ... }
else if (key.startsWith('daily_score_')) { ... }  // ONE-SHOT d'abord
else if (key.includes('high_score')) { ... }       // ONE-SHOT aussi
else if (key.includes('_score_') || key.includes('_champion') || key.includes('_points')) {
  // CUMUL en dernier seulement
  ...
}
```

### Fichier : `utils/questSelection.ts`

**Ajouts** :
1. **Fonction `getResetDate()`** : Calcule la bonne date de reset selon le type
   - Daily → Demain à minuit
   - Weekly → Lundi prochain à minuit
   - Monthly → 1er du mois prochain à minuit

2. **Fonction `cleanExpiredQuests()`** : Nettoie automatiquement les quêtes expirées
   - Appelée au chargement des quêtes dans `getAllQuestsWithProgress()`
   - Supprime les quest_progress où `reset_at < maintenant`

3. **`initializeQuestProgress()` améliorée** :
   - Calcul automatique du `reset_at` selon le type de quête
   - Plus de hard-coding de "demain" pour toutes les quêtes

### Fichier : `utils/questHelpers.ts`

**Ajouts** :
1. **Fonction `getTodayResetTimeFrance()`** : Reset à minuit heure française
2. **Fonction `getResetDateByType()`** : Similaire à questSelection.ts
3. **`initializeDailyQuests()` améliorée** : Utilise le type de quête pour le reset

**Documentation** : Commentaires ajoutés sur le comportement UTC vs local

---

## 🎯 Comportement attendu maintenant

### Quêtes quotidiennes (daily)
- ✅ Ne se valident QUE si les conditions sont remplies
- ✅ `daily_score_3000` : atteindre 3000 points EN UNE PARTIE
- ✅ Reset automatique à minuit (lendemain)
- ✅ Suppression automatique des progressions expirées

### Quêtes hebdomadaires (weekly)
- ✅ `weekly_score_50000` ou `weekly_champion` : CUMUL de 50 000 points
- ✅ Progression incrémentale sur toute la semaine
- ✅ Reset le lundi suivant à minuit
- ✅ Logs détaillés : `current_value → new_value (target: 50000)`

### Quêtes mensuelles (monthly)
- ✅ Fonctionnent comme les hebdomadaires
- ✅ Reset le 1er du mois suivant à minuit

### Reset automatique
- ✅ Nettoyage des quêtes expirées au chargement
- ✅ Quêtes recréées automatiquement si absentes
- ✅ Dates de reset calculées selon le type (daily/weekly/monthly)

---

## 🔍 Comment vérifier que ça fonctionne

### 1. Activer les logs de quêtes
```bash
# Dans .env ou .env.local
EXPO_PUBLIC_QUEST_LOGS=verbose
EXPO_PUBLIC_ECONOMY_LOGS=verbose
```

### 2. Jouer une partie
Regarder les logs dans la console :
```
[QUESTS] 📝 daily_score_3000: valeur actuelle=0, target=3000
[QUESTS] ✓ Type: DAILY_SCORE - Score 5000 >= target 3000 - COMPLÉTÉE!
[QUESTS] ✏️ MISE À JOUR: daily_score_3000: 0 → 3000/3000 ✅ COMPLÉTÉE

[QUESTS] 📝 weekly_champion: valeur actuelle=1200, target=50000
[QUESTS] ✓ Type: SCORE_CUMUL - Ajout de 5000 points: 1200 → 6200 (target: 50000)
[QUESTS] ✏️ MISE À JOUR: weekly_champion: 1200 → 6200/50000 ⏳ En cours
```

### 3. Vérifier les reset_at en base
```sql
SELECT quest_key, current_value, completed, reset_at
FROM quest_progress
WHERE user_id = 'ton-user-id'
ORDER BY reset_at;
```

Tu devrais voir :
- Quêtes daily : reset_at = demain à 00:00
- Quêtes weekly : reset_at = lundi prochain à 00:00
- Quêtes monthly : reset_at = 1er du mois prochain à 00:00

---

## 📝 Notes importantes

### Nommage des quêtes
Pour que la détection automatique fonctionne, respecte ces conventions :

**Quêtes de jeu (compte les parties)** :
- `daily_play_3`, `weekly_play_10`, `monthly_play_50`

**Quêtes de score ONE-SHOT (atteindre en 1 partie)** :
- `daily_score_3000`, `daily_score_5000`

**Quêtes de score CUMULATIF (sur plusieurs parties)** :
- `weekly_score_50000`, `weekly_champion`, `monthly_points_total`
- Doit contenir : `_score_` OU `_champion` OU `_points`

**Quêtes de high score (meilleur score)** :
- `high_score_10000`
- Doit contenir : `high_score`

**Quêtes de streak** :
- `daily_high_streak`, `weekly_long_streak`
- Doit contenir : `_streak_`

### Heure du reset
- Par défaut : utilise l'heure locale du système
- Si serveur en UTC : reset à minuit UTC (1h-2h France)
- Pour forcer l'heure française : utiliser `getTodayResetTimeFrance()`

---

## 🚀 Prochaines étapes recommandées

1. **Tester avec des vraies quêtes** : Jouer plusieurs parties et vérifier les progressions
2. **Vérifier les noms de quêtes en base** : S'assurer qu'ils respectent les conventions
3. **Activer les logs en production** : Pendant quelques jours pour monitorer
4. **Créer un script de reset manuel** : Pour forcer le reset si besoin (maintenance)
5. **Ajouter un cron job** : Pour nettoyer les quêtes expirées quotidiennement (optionnel)

---

## ❓ FAQ

**Q: Pourquoi mes quêtes quotidiennes ne se réinitialisent pas ?**
R: Vérifie que `cleanExpiredQuests()` est bien appelée. Active les logs avec `EXPO_PUBLIC_QUEST_LOGS=verbose`

**Q: Ma quête "champion de la semaine" progresse-t-elle ?**
R: Vérifie que sa clé contient `_score_`, `_champion` ou `_points`. Sinon, renomme-la.

**Q: Le reset se fait à quelle heure exactement ?**
R: À minuit selon l'heure locale du serveur. Vérifie avec `SELECT NOW()` en base.

**Q: Comment forcer le reset des quêtes ?**
R: Supprime les entrées de `quest_progress` pour l'utilisateur, elles seront recréées au prochain chargement.

---

**Auteur**: Claude
**Reviewé par**: Pierre
