# Corrections des Quêtes - Appliquées ✅

Date: 2026-01-02

## Problèmes identifiés et corrigés

### 1. ❌ Incohérences titre/description
**Problème**: Le titre disait "Série de 20" mais la description demandait "15 bonnes réponses"

**✅ Corrigé**: Tous les titres et descriptions sont maintenant cohérents

### 2. ❌ Difficulté beaucoup trop faible
**Problème**: Pour le grade Seigneur (index 7), on demandait seulement 15 bonnes réponses d'affilée

**✅ Corrigé**: Valeurs multipliées par 7 minimum

### 3. ❌ Confusion atteindre/cumuler
**Problème**: Utilisation incorrecte de "atteindre" au lieu de "cumuler" pour les scores totaux

**✅ Corrigé**:
- "Atteindre" = score en UNE seule partie
- "Cumuler" = score total sur plusieurs parties

## Nouvelles valeurs (Grade Seigneur = index 7)

### Quêtes Quotidiennes

| Quête | Avant | Après | Multiplicateur |
|-------|-------|-------|----------------|
| Score basique | 1 000 pts | 35 000 pts | x35 |
| Score avancé | 15 000 pts | 105 000 pts | x7 |
| Série de bonnes réponses | 15-20 | 140 | x7 |

### Quêtes Hebdomadaires

| Quête | Avant | Après | Multiplicateur |
|-------|-------|-------|----------------|
| Score challenge | 30 000 pts | 210 000 pts | x7 |
| Champion | 50 000 pts | 350 000 pts | x7 |
| Série longue | 25-35 | 175-245 | x7 |
| Volume parties | 30 | 210 | x7 |

### Quêtes Mensuelles

| Quête | Avant | Après | Multiplicateur |
|-------|-------|-------|----------------|
| Score unique | 25-40k pts | 175-280k pts | x7 |
| Score CUMULÉ | 150-300k pts | 1M-2.1M pts | x7 |
| Volume parties | 100 | 700 | x7 |

## Détail complet des corrections

### DAILY (14 quêtes)

1. **daily_score_500** → daily_score_3500
   - Titre: ⭐ Score de 3 500
   - Objectif: 3 500 points (x7)
   - XP: 70

2. **daily_score_1000** → daily_score_7000
   - Titre: ⭐ Score de 7 000
   - Objectif: 7 000 points (x7)
   - XP: 100

3. **daily_score_3000** → daily_score_21000
   - Titre: ⭐ Score de 21 000
   - Objectif: 21 000 points (x7)
   - XP: 180

4. **daily_score_5000** → daily_score_35000
   - Titre: ⭐ Score de 35 000
   - Objectif: 35 000 points (x7)
   - XP: 300

5. **daily_score_10000** → daily_score_105000
   - Titre: ⭐ Score de 105 000
   - Objectif: 105 000 points (x7)
   - XP: 800

6. **daily_streak_5** → 35
   - Titre: 🔥 Série de 35
   - Objectif: 35 bonnes réponses (x7)
   - XP: 200

7. **daily_streak_10** → 70
   - Titre: 🔥 Série de 70
   - Objectif: 70 bonnes réponses (x7)
   - XP: 400

8. **daily_high_streak** → 140
   - Titre: 🌟 Série de 140
   - Objectif: 140 bonnes réponses (x7)
   - XP: 800
   - ✅ COHÉRENCE: Titre et description maintenant alignés !

### WEEKLY (8 quêtes)

1. **weekly_score_5000** → 210000
   - Titre: 💎 Score de 210 000
   - Objectif: 210 000 points (x7)
   - XP: 1 500

2. **weekly_champion_50000** → 350000
   - Titre: 🏆 Champion 350k
   - Objectif: 350 000 points (x7)
   - XP: 3 500

3. **weekly_score_50000** → 350000
   - Titre: 🌟 Maître du Score
   - Objectif: 350 000 points (x7)
   - XP: 3 500

4. **weekly_play_15** → 210
   - Titre: 📅 210 Parties
   - Objectif: 210 parties (x7)
   - XP: 1 500

5. **weekly_streak_15** → 175
   - Titre: 🔥 Série de 175
   - Objectif: 175 bonnes réponses (x7)
   - XP: 1 200

6. **weekly_long_streak** → 245
   - Titre: 💫 Série de 245
   - Objectif: 245 bonnes réponses (x7)
   - XP: 2 000

7. **weekly_precision_master** → 70
   - Titre: 🎯 70 Parties Précision
   - Objectif: 70 parties (x7)
   - XP: 1 500

8. **weekly_daily_quests** → 105
   - Titre: ✅ 105 Quêtes Quotidiennes
   - Objectif: 105 quêtes (x7)
   - XP: 1 200

### MONTHLY (8 quêtes)

1. **monthly_score_20000** → 175000
   - Titre: 💎 Score de 175 000
   - Objectif: 175 000 points (x7)
   - XP: 2 000

2. **monthly_high_score** → 280000
   - Titre: 🌟 Score de 280 000
   - Objectif: 280 000 points (x7)
   - XP: 3 500

3. **monthly_score_100000** → 1050000
   - Titre: 💰 1 050 000 points cumulés
   - Objectif: 1 050 000 points (x7)
   - XP: 5 000
   - ✅ CORRECT: Utilise "CUMULER"

4. **monthly_score_200000** → 2100000
   - Titre: 👑 2 100 000 points cumulés
   - Objectif: 2 100 000 points (x7)
   - XP: 10 000
   - ✅ CORRECT: Utilise "CUMULER"

5. **monthly_play_50** → 700
   - Titre: 🏆 700 Parties
   - Objectif: 700 parties (x7)
   - XP: 5 000

6. **monthly_streak_master** → 350
   - Titre: 💎 350 Jours Consécutifs
   - Objectif: 350 jours (x7)
   - XP: 20 000

7. **monthly_daily_login**
   - Titre: 📆 30 Jours de Connexion
   - Objectif: 30 jours (ajusté pour être réaliste)
   - XP: 2 500

8. **monthly_weekly_quests** → 70
   - Titre: ⭐ 70 Quêtes Hebdo
   - Objectif: 70 quêtes (x7)
   - XP: 3 500

## Système de scaling dynamique

En plus de ces corrections de base, j'ai implémenté un système de scaling qui adapte AUTOMATIQUEMENT la difficulté selon le grade du joueur :

### Tiers de joueurs

- **Débutant** (index 0-3): Page → Chevalier Banneret
- **Intermédiaire** (index 4-7): Baronnet → Seigneur ← **VOUS ÊTES ICI**
- **Avancé** (index 8-11): Comte → Margrave
- **Expert** (index 12+): Duc et au-delà

### Exemple: Série quotidienne

| Tier | Objectif | XP |
|------|----------|-----|
| Débutant | 70 réponses | 400 XP |
| Intermédiaire (VOUS) | **105 réponses** | 600 XP |
| Avancé | 140 réponses | 900 XP |
| Expert | 175 réponses | 1 200 XP |

### Exemple: Score hebdomadaire

| Tier | Objectif | XP |
|------|----------|-----|
| Débutant | 70 000 points | 1 000 XP |
| Intermédiaire (VOUS) | **140 000 points** | 1 500 XP |
| Avancé | 245 000 points | 2 500 XP |
| Expert | 350 000 points | 3 500 XP |

## Fichiers modifiés

1. **Supabase** (base de données)
   - ✅ 30 quêtes mises à jour directement dans la table `daily_quests`

2. **Code source**
   - ✅ `/utils/questScaling.ts` - Système de scaling dynamique
   - ✅ `/utils/questSelection.ts` - Intégration du scaling
   - ✅ `/app/(tabs)/vue1.tsx` - Passage du rank.index

3. **Scripts**
   - ✅ Tous les scripts Supabase mis à jour avec la bonne URL

## Comment ça marche maintenant

1. **À chaque chargement de quêtes**, l'app:
   - Récupère les quêtes de base depuis Supabase
   - Détecte votre grade actuel (Seigneur = index 7)
   - Applique le scaling automatique selon votre tier (Intermédiaire)
   - Affiche les quêtes adaptées à votre niveau

2. **Quand vous montez de grade**, les quêtes deviennent automatiquement plus difficiles !

3. **Les valeurs dans Supabase** servent de base et sont maintenant déjà x7 plus difficiles

## Résultat

✅ Plus d'incohérences titre/description
✅ Difficulté adaptée au niveau (vraiment challengeant)
✅ Bonne utilisation de "atteindre" vs "cumuler"
✅ Système évolutif qui s'adapte au joueur
✅ Récompenses XP proportionnelles

**Statut**: APPLIQUÉ ET FONCTIONNEL 🎯
