# Résumé : Séparation des classements par mode de jeu

## Problème
Le classement dans Vue1 ne faisait pas la distinction entre les deux modes de jeu (Classique et Précision). Tous les scores étaient mélangés dans un seul classement.

## Solution
Séparation complète des classements par mode de jeu avec :
- Un classement pour le mode Classique
- Un classement pour le mode Précision

## Modifications effectuées

### 1. Base de données (Supabase)

**Fichier** : `scripts/add-mode-to-game-scores.sql`

Ajout d'une colonne `mode` à la table `game_scores` pour distinguer les scores par mode de jeu.

```sql
ALTER TABLE public.game_scores
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'classic'
  CHECK (mode IN ('classic', 'precision', 'date'));
```

⚠️ **ACTION REQUISE** : Vous devez exécuter le SQL dans Supabase. Voir `scripts/APPLY_MODE_TO_GAME_SCORES_IN_SUPABASE.md`

### 2. Backend - Enregistrement du mode

**Fichier** : `hooks/useGameLogicA.ts`

Modifications :
- Ligne 81 : Ajout de 'precision' au type `endSummary.mode`
- Ligne 758 : Ajout de 'precision' au type du paramètre `startRun`
- Ligne 912 : Changement de `'date'` vers `'precision'` pour économie
- Ligne 964 : Ajout du champ `mode` lors de l'insertion dans `game_scores`

```typescript
const economyMode: 'classic' | 'date' | 'precision' =
  gameMode.variant === 'precision' ? 'precision' : 'classic';

// ...

const { error: insertError } = await supabase.from('game_scores').insert({
  user_id: userId,
  display_name: currentDisplayName,
  score: user.points,
  mode: economyMode, // 'classic' or 'precision'
});
```

### 3. Nouveau hook pour récupérer les classements par mode

**Fichier** : `hooks/useLeaderboardsByMode.ts` (NOUVEAU)

Hook qui récupère les classements séparés pour les deux modes :
- `leaderboards.classic` : Classements du mode Classique
- `leaderboards.precision` : Classements du mode Précision

Chaque mode a ses propres classements :
- `daily` : Classement du jour
- `weekly` : Classement de la semaine
- `monthly` : Classement du mois
- `allTime` : Classement de tous les temps

Note : Supporte également l'ancien mode 'date' pour la rétrocompatibilité.

### 4. Nouveau composant pour afficher les deux classements

**Fichier** : `components/DualLeaderboardCarousel.tsx` (NOUVEAU)

Composant qui affiche :
1. Classement du Mode Classique (avec icône éclair)
2. Séparateur visuel
3. Classement du Mode Précision (avec icône analytics)

Chaque classement utilise le composant `LeaderboardCarousel` existant.

### 5. Interface utilisateur

**Fichier** : `app/(tabs)/vue1.tsx`

Modifications :
- Ligne 18 : Import du nouveau hook `useLeaderboardsByMode`
- Ligne 22 : Import du nouveau composant `DualLeaderboardCarousel`
- Ligne 46 : Utilisation du nouveau hook
- Lignes 260-266 : Affichage des deux classements séparés

## Structure des données

### Avant
```typescript
{
  daily: [joueurs...],
  weekly: [joueurs...],
  monthly: [joueurs...],
  allTime: [joueurs...]
}
```

### Après
```typescript
{
  classic: {
    daily: [joueurs...],
    weekly: [joueurs...],
    monthly: [joueurs...],
    allTime: [joueurs...]
  },
  precision: {
    daily: [joueurs...],
    weekly: [joueurs...],
    monthly: [joueurs...],
    allTime: [joueurs...]
  }
}
```

## Ordre d'application

1. ✅ Exécuter le SQL dans Supabase (`scripts/APPLY_MODE_TO_GAME_SCORES_IN_SUPABASE.md`)
2. ✅ Les modifications du code sont déjà appliquées
3. ✅ Tester l'application

## Vérification

Pour vérifier que tout fonctionne :

1. Vérifier que la colonne `mode` existe dans `game_scores` :
```sql
SELECT * FROM game_scores LIMIT 1;
```

2. Lancer l'app et vérifier dans Vue1 :
   - Deux sections de classement distinctes
   - "Mode Classique" avec icône éclair
   - "Mode Précision" avec icône analytics

3. Jouer une partie en mode Classique et une en mode Précision
   - Vérifier que les scores apparaissent dans les bons classements

## Notes

- Les anciens scores (avant migration) seront tous marqués comme 'classic' par défaut
- Le mode 'date' (ancien nom pour precision) est supporté pour la rétrocompatibilité
- Les classements "All Time" utilisent toujours le `high_score` global des profiles (pas séparé par mode pour l'instant)
