# Context pour Claude Code - Projet Kiko

## 🔌 Accès Supabase

Le projet utilise Supabase comme base de données. Pour accéder aux données :

```bash
# Vue d'ensemble complète (quêtes, achievements, stats)
node scripts/supabase-helper.mjs

# Ou dans vos scripts :
import { supabase, viewQuests, viewAchievements, viewStats } from './scripts/supabase-helper.mjs';

// Utilisation
const quests = await viewQuests();
const achievements = await viewAchievements();
const stats = await viewStats();
```

### Fonctions disponibles :
- `viewQuests()` - Affiche toutes les quêtes quotidiennes
- `viewAchievements()` - Affiche tous les achievements
- `viewStats()` - Affiche les statistiques générales
- `getTopPlayers(limit)` - Récupère les top joueurs
- `getProfile(userId)` - Récupère un profil utilisateur
- `getUserQuests(userId)` - Récupère les quêtes d'un utilisateur
- `overview()` - Vue d'ensemble complète

### Scripts utiles :
```bash
# Synchroniser les achievements
node scripts/sync-achievements.mjs

# Synchroniser les quêtes
node scripts/sync-quests.mjs

# Voir l'état actuel
node scripts/view-quests.mjs

# Rapport de rééquilibrage
node scripts/rapport-reequilibrage.mjs
```

## 📊 Système de progression

Le projet utilise un système de progression complexe avec :
- **Points en partie** → convertis en XP
- **XP total** → détermine le rang
- **Rang** → détermine le nombre de parties/jour
- **Quêtes quotidiennes** → bonus XP
- **Achievements** → bonus XP uniques

### Fichiers clés :
- `lib/economy/ranks.ts` - Courbe XP et rangs
- `lib/economy/convert.ts` - Conversion Points → XP
- `lib/economy/quests.ts` - Définition des quêtes et achievements
- `lib/economy/apply.ts` - Logique d'application en fin de partie

### Base de données (Supabase) :
- `profiles` - Profils utilisateurs avec XP, rang, streak, etc.
- `daily_quests` - 9 quêtes quotidiennes
- `achievements` - 17 achievements disponibles
- `quest_progress` - Progression des quêtes par utilisateur
- `user_achievements` - Achievements débloqués par utilisateur
- `runs` - Historique des parties jouées

## 🎮 Modes de jeu

1. **Mode Classique** - Ordre chronologique (avant/après)
2. **Mode Précision** - Deviner l'année exacte (système HP)

## 📝 Rééquilibrage récent (2025-10-04)

Le système a été entièrement rééquilibré :
- Courbe XP : -27% XP requis
- Conversion Points→XP : +45% XP gagné
- Quêtes quotidiennes : x3 (9 au lieu de 3)
- Achievements : +7 nouveaux (17 total)
- Progression globale : ~3x plus rapide

Voir [REEQUILIBRAGE.md](../REEQUILIBRAGE.md) pour les détails complets.

## 🔧 Variables d'environnement

Le projet nécessite :
- `EXPO_PUBLIC_SUPABASE_URL` - URL Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase

Ces variables sont chargées depuis `.env` et sont disponibles dans tous les scripts via `dotenv`.

## 🚀 Commandes rapides

```bash
# Développement
npm start

# Build Android
npm run build:android:production

# Tests
npm test

# Accès Supabase
node scripts/supabase-helper.mjs
```

---

*Ce contexte est automatiquement chargé dans chaque nouvelle conversation Claude Code*
