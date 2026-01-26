# 🎯 Rééquilibrage Complet du Système de Progression

**Date**: 2025-10-04
**Statut**: ✅ Terminé

## 📊 Vue d'ensemble

Le système de progression a été entièrement rééquilibré pour offrir une expérience plus gratifiante et encourager l'engagement quotidien des joueurs.

### Objectifs du rééquilibrage
1. **Accélérer la progression** pour maintenir l'engagement
2. **Augmenter les récompenses quotidiennes** via les quêtes
3. **Diversifier les objectifs** avec plus de quêtes et achievements
4. **Équilibrer difficulté et récompense** pour tous les types de joueurs

---

## 🔄 Changements principaux

### 1. Courbe XP des rangs (-27% XP requis)

| Rang | Ancien XP | Nouveau XP | Gain |
|------|-----------|------------|------|
| Baron | 7,200 | 5,250 | -27% |
| Vicomte | 10,100 | 7,350 | -27% |
| Comte | 17,400 | 12,630 | -27% |
| Duc | 38,000 | 27,510 | -28% |
| Roi | 93,300 | 67,410 | -28% |
| Empereur | 124,500 | 89,910 | -28% |

**Formule mise à jour** :
```typescript
// Ancien: 250×index² + 150×index + 200
// Nouveau: 180×index² + 120×index + 150
xpCurve(index) = Math.round(180 * index² + 120 * index + 150)
```

### 2. Conversion Points → XP (+45% XP gagné)

| Points en partie | Ancien XP | Nouveau XP | Gain |
|------------------|-----------|------------|------|
| 100 | 47 | 72 | +53% |
| 500 | 83 | 120 | +45% |
| 1000 | 121 | 166 | +37% |
| 2000 | 183 | 256 | +40% |

**Configuration mise à jour** :
```typescript
{
  basePerMode: { classic: 50, date: 60 },     // +66% base
  kPerMode: { classic: 0.8, date: 0.9 },      // +33% coefficient
  softcap: { threshold: 1000, slope: 0.6 },   // Seuil plus haut
  clamp: { min: 20, max: 600 }                // Limites augmentées
}
```

### 3. Quêtes quotidiennes (x3 quêtes)

**Avant** : 3 quêtes, ~225 XP/jour max
**Après** : 9 quêtes, ~1,780 XP/jour max
**Amélioration** : +691% 🚀

#### Nouvelles quêtes

**Volume** (2 quêtes)
- 🎮 Jouer 3 parties → 100 XP
- 🎮 Jouer 5 parties → 200 XP

**Streak** (2 quêtes)
- 🔥 Série de 5 → 150 XP
- 🔥 Série de 10 → 300 XP

**Score** (2 quêtes)
- ⭐ Score de 500 → 150 XP
- ⭐ Score de 1000 → 250 XP

**Skill** (2 quêtes)
- 💎 Niveau Parfait → 200 XP
- ⚡ Vitesse Éclair (10 réponses <5s) → 180 XP

**Précision** (1 quête)
- 🎯 Précision Parfaite (±10 ans) → 250 XP

### 4. Achievements (+7 achievements)

**Avant** : 10 achievements, ~31,000 XP total
**Après** : 17 achievements, ~34,600 XP total
**Amélioration** : +12%

#### Nouveaux achievements de skill

| Achievement | Description | XP |
|-------------|-------------|-----|
| 💎 Perfection | Partie sans perdre de vie | 1,500 |
| ⚡ Éclair | 20 réponses <3s chacune | 1,000 |
| 🏛️ Maître Antique | 50 événements avant l'an 0 | 1,200 |
| 🎯 Précision Absolue | 10 dates à ±5 ans | 2,000 |

#### Achievements rééquilibrés

**Streaks** (augmentés car difficiles) :
- Semaine Parfaite (7j) : 1,500 → **2,000 XP** (+33%)
- Mois Légendaire (30j) : 5,000 → **8,000 XP** (+60%)

**Parties** (réduits) :
- 500 parties : 10,000 → **5,000 XP** (-50%)

**Scores** (ajustés) :
- 1,000 points : 500 → **300 XP** (-40%)
- 2,000 points : 1,500 → **800 XP** (-47%)
- 5,000 points : 5,000 → **3,000 XP** (-40%)

---

## 📈 Impact sur la progression

### Estimation de progression quotidienne

**Scénario moyen** (3 parties/jour, 600 pts/partie, 60% quêtes complétées) :

| Métrique | Ancien | Nouveau | Gain |
|----------|--------|---------|------|
| XP par partie | 90 | 130 | +44% |
| XP quotidien total | ~383 | ~1,458 | +281% |

### Temps pour atteindre les rangs

| Rang | Ancien | Nouveau | Gain |
|------|--------|---------|------|
| Duc | ~99 jours | ~19 jours | **-81%** |
| Roi | ~244 jours | ~46 jours | **-81%** |
| Empereur | ~325 jours | ~62 jours | **-81%** |

---

## 🔧 Fichiers modifiés

### Code TypeScript
1. **[lib/economy/ranks.ts](lib/economy/ranks.ts#L40)** - Nouvelle courbe XP
2. **[lib/economy/convert.ts](lib/economy/convert.ts#L9-15)** - Conversion Points→XP
3. **[lib/economy/quests.ts](lib/economy/quests.ts#L4-5,28-174)** - Types et achievements mis à jour

### Base de données Supabase
1. **Table `daily_quests`** - 9 quêtes (au lieu de 3)
2. **Table `achievements`** - 17 achievements (au lieu de 10)

### Scripts de synchronisation
1. **[scripts/sync-achievements.mjs](scripts/sync-achievements.mjs)** - Sync achievements
2. **[scripts/sync-quests.mjs](scripts/sync-quests.mjs)** - Sync quêtes
3. **[scripts/rapport-reequilibrage.mjs](scripts/rapport-reequilibrage.mjs)** - Rapport comparatif
4. **[scripts/view-quests.mjs](scripts/view-quests.mjs)** - Visualisation état actuel

---

## ✅ Validation

Pour vérifier l'état actuel du système :

```bash
# Voir les quêtes et achievements
node scripts/view-quests.mjs

# Générer le rapport de rééquilibrage
node scripts/rapport-reequilibrage.mjs
```

---

## 🎮 Prochaines étapes recommandées

### Court terme
1. ✅ **Tester en conditions réelles** avec quelques utilisateurs
2. ⏳ **Implémenter la logique de suivi** des nouvelles quêtes (skill, precision)
3. ⏳ **Ajouter les achievements de skill** dans la logique du jeu

### Moyen terme
1. ⏳ **Créer le système de quêtes hebdomadaires** (3 quêtes/semaine, ~1,200 XP)
2. ⏳ **Ajouter des quêtes événementielles** (saisonnières, thématiques)
3. ⏳ **Implémenter un système de "daily login rewards"**

### Long terme
1. ⏳ **Battle Pass / Season Pass** avec progression parallèle
2. ⏳ **Classements par saison** avec récompenses
3. ⏳ **Système de guildes/clans** avec quêtes coopératives

---

## 📊 Métriques à suivre

Pour évaluer l'impact du rééquilibrage, suivre :

1. **Rétention** :
   - Taux de retour J1, J7, J30
   - Nombre de jours consécutifs moyen

2. **Engagement** :
   - Nombre moyen de parties/jour
   - Taux de complétion des quêtes
   - Temps de session moyen

3. **Progression** :
   - Distribution des joueurs par rang
   - Temps moyen pour atteindre Baron, Vicomte, Comte
   - Nombre d'achievements débloqués/joueur

4. **Monétisation** (si applicable) :
   - Conversion vers version premium
   - Achats in-app liés à la progression

---

## 🔍 Notes techniques

### Quêtes à implémenter

Certaines quêtes nécessitent une logique supplémentaire :

1. **daily_perfect_round** : Tracker les vies à la fin d'un niveau
2. **daily_speed_master** : Mesurer le temps de réponse (<5s)
3. **daily_precision_perfect** : Calculer la différence d'années (mode Précision)

### Achievements à implémenter

Les nouveaux achievements de skill nécessitent :

1. **perfect_run** : Vérifier lives === maxLives à la fin
2. **speed_demon** : Compteur de réponses <3s
3. **ancient_master** : Compteur d'événements avec date < 0
4. **precision_master** : Compteur de dates devinées à ±5 ans

---

## 🎯 Conclusion

Le rééquilibrage a pour objectif de :
- ✅ Rendre la progression **2-3x plus rapide**
- ✅ Augmenter les **récompenses quotidiennes** via les quêtes
- ✅ Diversifier les **objectifs** avec 26 quêtes/achievements au total
- ✅ Maintenir l'**engagement** à long terme

**Prochaine étape** : Implémenter la logique de tracking des nouvelles quêtes et achievements dans le code du jeu.

---

*Document généré automatiquement le 2025-10-04*
