# Système de Scaling des Quêtes par Grade

## Vue d'ensemble

Le système de scaling adapte automatiquement la difficulté des quêtes en fonction du grade (rang) du joueur. Plus le joueur progresse, plus les quêtes deviennent exigeantes, tout en offrant des récompenses proportionnelles.

## Tiers de joueurs

Les joueurs sont répartis en 4 tiers basés sur leur index de grade :

| Tier | Grades inclus | Index de grade |
|------|---------------|----------------|
| **Débutant** | Page → Chevalier Banneret | 0-3 |
| **Intermédiaire** | Baronnet → Seigneur | 4-7 |
| **Avancé** | Comte → Margrave | 8-11 |
| **Expert** | Duc et au-delà | 12+ |

## Quêtes adaptées

### Quêtes de Score Quotidiennes

**daily_score_500/1000/3000/5000** (Score basique)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 1 000 points | 50 XP | Atteindre 1 000 points en une partie |
| Intermédiaire | 5 000 points | 120 XP | Atteindre 5 000 points en une partie |
| Avancé | 10 000 points | 200 XP | Atteindre 10 000 points en une partie |
| Expert | 15 000 points | 300 XP | Atteindre 15 000 points en une partie |

**daily_score_10000** (Gros score quotidien)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 5 000 points | 150 XP | Atteindre 5 000 points en une partie |
| Intermédiaire | 10 000 points | 250 XP | Atteindre 10 000 points en une partie |
| Avancé | 15 000 points | 400 XP | Atteindre 15 000 points en une partie |
| Expert | 20 000 points | 600 XP | Atteindre 20 000 points en une partie |

### Quêtes de Score Hebdomadaires

**weekly_score_5000/50000/champion_50000** (Défi hebdomadaire)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 10 000 points | 400 XP | Atteindre 10 000 points en une partie |
| Intermédiaire | 20 000 points | 700 XP | Atteindre 20 000 points en une partie |
| Avancé | 35 000 points | 1 000 XP | Atteindre 35 000 points en une partie |
| Expert | 50 000 points | 1 500 XP | Atteindre 50 000 points en une partie |

### Quêtes de Score Mensuelles

**monthly_score_20000/high_score** (Score unique mensuel)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 15 000 points | 600 XP | Atteindre 15 000 points en une partie |
| Intermédiaire | 25 000 points | 900 XP | Atteindre 25 000 points en une partie |
| Avancé | 40 000 points | 1 500 XP | Atteindre 40 000 points en une partie |
| Expert | 60 000 points | 2 500 XP | Atteindre 60 000 points en une partie |

**monthly_score_100000/200000** (Score cumulé mensuel)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 50 000 points | 800 XP | **Cumuler** 50 000 points dans le mois |
| Intermédiaire | 150 000 points | 2 000 XP | **Cumuler** 150 000 points dans le mois |
| Avancé | 300 000 points | 4 000 XP | **Cumuler** 300 000 points dans le mois |
| Expert | 500 000 points | 6 000 XP | **Cumuler** 500 000 points dans le mois |

### Quêtes de Volume

**weekly_play_15** (Parties hebdomadaires)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 15 parties | 400 XP | Jouer 15 parties dans la semaine |
| Intermédiaire | 25 parties | 600 XP | Jouer 25 parties dans la semaine |
| Avancé | 35 parties | 900 XP | Jouer 35 parties dans la semaine |
| Expert | 50 parties | 1 200 XP | Jouer 50 parties dans la semaine |

**monthly_play_50** (Parties mensuelles)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 50 parties | 1 000 XP | Jouer 50 parties dans le mois |
| Intermédiaire | 100 parties | 2 000 XP | Jouer 100 parties dans le mois |
| Avancé | 150 parties | 3 000 XP | Jouer 150 parties dans le mois |
| Expert | 200 parties | 4 500 XP | Jouer 200 parties dans le mois |

### Quêtes de Streak

**daily_high_streak** (Série quotidienne)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 10 réponses | 150 XP | Faire une série de 10 bonnes réponses |
| Intermédiaire | 15 réponses | 250 XP | Faire une série de 15 bonnes réponses |
| Avancé | 20 réponses | 350 XP | Faire une série de 20 bonnes réponses |
| Expert | 25 réponses | 500 XP | Faire une série de 25 bonnes réponses |

**weekly_streak_15/long_streak** (Série hebdomadaire)

| Tier | Objectif | Récompense XP | Description |
|------|----------|---------------|-------------|
| Débutant | 15 réponses | 350 XP | Faire une série de 15 bonnes réponses |
| Intermédiaire | 25 réponses | 500 XP | Faire une série de 25 bonnes réponses |
| Avancé | 35 réponses | 800 XP | Faire une série de 35 bonnes réponses |
| Expert | 50 réponses | 1 200 XP | Faire une série de 50 bonnes réponses |

## Corrections de terminologie

### ✅ Corrections appliquées

- **"Atteindre X points en une partie"** → Pour les quêtes de score unique (meilleur score d'une seule partie)
- **"Cumuler X points dans le mois"** → Pour les quêtes de score total (somme de plusieurs parties)

### Exemples

- ✅ **Correct** : "Atteindre 15 000 points en une partie" (score unique)
- ✅ **Correct** : "Cumuler 150 000 points dans le mois" (score total)
- ❌ **Incorrect** : "Atteindre 150 000 points dans le mois" (confusion)

## Implémentation technique

### Fichiers modifiés

1. **`/utils/questScaling.ts`** (nouveau)
   - Logique de détermination du tier
   - Règles de scaling par quête
   - Fonctions d'adaptation des quêtes

2. **`/utils/questSelection.ts`** (modifié)
   - Ajout du paramètre `rankIndex` à `getAllQuestsWithProgress()`
   - Application automatique du scaling avant de retourner les quêtes

3. **`/app/(tabs)/vue1.tsx`** (modifié)
   - Passage du `rank.index` lors du chargement des quêtes
   - Rechargement des quêtes quand le grade change

### Utilisation

```typescript
import { getAllQuestsWithProgress } from '@/utils/questSelection';
import { rankFromXP } from '@/lib/economy/ranks';

// Obtenir le grade du joueur
const rank = rankFromXP(profile.xp_total);

// Charger les quêtes adaptées au grade
const quests = await getAllQuestsWithProgress(profile.id, rank.index);

// Les quêtes retournées sont automatiquement scalées
console.log(quests.daily); // Quêtes quotidiennes adaptées
console.log(quests.weekly); // Quêtes hebdomadaires adaptées
console.log(quests.monthly); // Quêtes mensuelles adaptées
```

## Avantages du système

1. **Progression naturelle** : Les quêtes évoluent avec le joueur
2. **Motivation** : Défis adaptés au niveau, ni trop faciles ni trop difficiles
3. **Récompenses équilibrées** : XP proportionnel à l'effort requis
4. **Transparence** : Le joueur voit clairement son niveau de défi
5. **Pas de modification de BDD** : Scaling côté client, pas besoin de nouvelles tables

## Notes importantes

- Les quêtes qui ne sont pas dans les règles de scaling gardent leurs valeurs originales
- Le tier est recalculé à chaque chargement de quêtes
- Les quêtes en cours gardent leur objectif initial jusqu'à expiration
- Le scaling s'applique uniquement aux nouvelles quêtes créées

## Prochaines étapes (optionnel)

1. Ajouter un indicateur visuel du tier du joueur dans l'interface
2. Créer des notifications lors du passage à un tier supérieur
3. Ajouter des statistiques de complétion par tier
4. Permettre au joueur de voir les quêtes du prochain tier
