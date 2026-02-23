# 📊 RAPPORT DE VÉRIFICATION DU SYSTÈME DE QUÊTES

**Date**: 2026-02-01
**Système**: Kiko - Application de quiz historique

---

## 🔍 PROBLÈMES IDENTIFIÉS

### 1. ❌ **CRITIQUE: Foreign Key Manquante**

**Problème**: La base de données n'a pas de foreign key entre `quest_progress.quest_key` et `daily_quests.quest_key`.

**Impact**:
- Le JOIN dans `claimQuestReward()` échoue
- Erreur "Quête non trouvée" lors de la réclamation de récompenses
- Le code attend `progress.daily_quests` mais reçoit `null`

**Localisation**:
- `lib/economy/apply.ts:757` (claimQuestReward)
- `lib/economy/apply.ts:833` (rerollQuest)

**Statut**: ✅ **CORRIGÉ** (code modifié pour faire 2 requêtes séparées)

---

### 2. ⚠️ **Quêtes du mode "Précision" toujours actives**

**Problème**: 2 quêtes liées au mode "Précision" (caché) étaient encore actives:
- `t2_precision_perfect`: "🎯 Œil de Lynx" (daily)
- `weekly_precision_master`: "🎯 70 Parties Précision" (weekly)

**Impact**:
- Les joueurs pouvaient recevoir des quêtes impossibles à terminer
- 20 `quest_progress` orphelins en base

**Statut**: ✅ **CORRIGÉ**
- Quêtes désactivées (`is_active = false`)
- 20 quest_progress nettoyés

---

### 3. ⚠️ **Quêtes quotidiennes avec cibles excessives**

**Problème**: Certaines quêtes "quotidiennes" ont des cibles trop élevées:

| Quest Key           | Cible     | Parties nécessaires | Commentaire |
|---------------------|-----------|---------------------|-------------|
| `t3_score_20000`    | 20k pts   | 2 parties           | ⚠️ Limite  |
| `t3_score_35000`    | 35k pts   | 3 parties           | ⚠️ Élevé   |
| `t3_score_50000`    | 50k pts   | 4 parties           | ⚠️ Élevé   |
| `t4_score_75000`    | 75k pts   | 6 parties           | 🔴 Trop élevé |
| `t4_score_150000`   | 150k pts  | 12 parties          | 🔴 Trop élevé |
| `t4_score_300000`   | 300k pts  | 24 parties          | 🔴 Démesure |

**Recommandation**: Les quêtes T4 (150k-300k) devraient être hebdomadaires ou mensuelles, pas quotidiennes.

**Statut**: ⚠️ **À CORRIGER** (nécessite ajustement manuel)

---

### 4. ⚠️ **Quêtes hebdomadaires trop exigeantes**

**Problème**: Certaines quêtes hebdomadaires nécessitent trop de parties/jour:

| Quest Key               | Cible     | Parties/semaine | Parties/jour | Commentaire |
|-------------------------|-----------|-----------------|--------------|-------------|
| `weekly_score_50000`    | 350k pts  | 28              | 4.0          | ⚠️ Élevé   |
| `weekly_champion_50000` | 350k pts  | 28              | 4.0          | ⚠️ Élevé   |
| `w4_score_500k`         | 500k pts  | 40              | 5.7          | 🔴 Trop élevé |

**Recommandation**: Réduire les cibles à 50k-200k pour les quêtes hebdomadaires.

**Statut**: ⚠️ **À CORRIGER** (nécessite ajustement manuel)

---

### 5. ⚠️ **Quêtes mensuelles démesurées**

**Problème**: Certaines quêtes mensuelles sont irréalistes:

| Quest Key              | Cible     | Parties/mois | Parties/jour | Commentaire |
|------------------------|-----------|--------------|--------------|-------------|
| `monthly_score_100000` | 1.05M pts | 84           | 2.8          | ⚠️ Élevé   |
| `monthly_score_200000` | 2.1M pts  | 168          | 5.6          | 🔴 Trop élevé |
| `m4_score_3M`          | 3M pts    | 240          | 8.0          | 🔴 Démesure |

**Recommandation**: Réduire les cibles maximales à 500k-1M pour les quêtes mensuelles.

**Statut**: ⚠️ **À CORRIGER** (nécessite ajustement manuel)

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. **Code corrigé**: Réclamation de récompenses

**Fichier**: `lib/economy/apply.ts`

**Changements**:
```typescript
// AVANT (cassé - JOIN ne fonctionne pas)
const { data: progress } = await supabase
  .from('quest_progress')
  .select('*, daily_quests(*)')
  .eq('user_id', userId)
  .eq('quest_key', questKey)
  .single();

const quest = progress.daily_quests; // ❌ null

// APRÈS (corrigé - 2 requêtes séparées)
const { data: progress } = await supabase
  .from('quest_progress')
  .select('*')
  .eq('user_id', userId)
  .eq('quest_key', questKey)
  .single();

const { data: quest } = await supabase
  .from('daily_quests')
  .select('*')
  .eq('quest_key', questKey)
  .single();
```

**Résultat**: ✅ La réclamation de récompenses fonctionne maintenant

---

### 2. **Base de données**: Quêtes Précision désactivées

**Actions effectuées**:
```sql
-- Désactivation des quêtes
UPDATE daily_quests
SET is_active = false
WHERE quest_key IN ('t2_precision_perfect', 'weekly_precision_master');

-- Nettoyage des quest_progress orphelins
DELETE FROM quest_progress
WHERE quest_key IN ('t2_precision_perfect', 'weekly_precision_master');
```

**Résultat**: ✅ 2 quêtes désactivées, 20 quest_progress nettoyés

---

## 📋 ACTIONS REQUISES

### 🔴 PRIORITÉ HAUTE: Créer la Foreign Key

**Objectif**: Permettre le JOIN entre `quest_progress` et `daily_quests`

**SQL à exécuter** (Dashboard Supabase > SQL Editor):
```sql
-- 1. Ajouter contrainte unique sur quest_key
ALTER TABLE daily_quests
ADD CONSTRAINT daily_quests_quest_key_unique UNIQUE (quest_key);

-- 2. Ajouter la foreign key
ALTER TABLE quest_progress
ADD CONSTRAINT quest_progress_quest_key_fkey
FOREIGN KEY (quest_key)
REFERENCES daily_quests(quest_key)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 3. Vérification
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'quest_progress';
```

**Après création**, vous pourrez revenir au code avec JOIN:
```typescript
// Pourra refonctionner après la foreign key
const { data: progress } = await supabase
  .from('quest_progress')
  .select('*, daily_quests(*)')
  .eq('user_id', userId)
  .eq('quest_key', questKey)
  .single();
```

---

### 🟡 PRIORITÉ MOYENNE: Rééquilibrer les quêtes T3/T4

**Recommandations**:

1. **Quêtes quotidiennes T3** (20k-50k):
   - Garder 20k (2 parties = acceptable)
   - Déplacer 35k et 50k en hebdomadaire

2. **Quêtes quotidiennes T4** (75k-300k):
   - Déplacer toutes en mensuel ou les supprimer
   - Ces cibles ne sont pas adaptées au quotidien

3. **Quêtes hebdomadaires**:
   - Cibles idéales: 50k-200k (4-16 parties/semaine)
   - Réduire 350k → 200k
   - Réduire 500k → 250k

4. **Quêtes mensuelles**:
   - Cibles idéales: 200k-800k (16-64 parties/mois)
   - Réduire 1.05M → 600k
   - Réduire 2.1M → 1M
   - Réduire 3M → 1.5M

---

## 📊 STATISTIQUES DU SYSTÈME

### Conversion Points → XP (mode Date)
```
Score      | XP gagné  | Parties pour 1000 XP
-----------|-----------|---------------------
5 000      | 168 XP    | 6 parties
10 000     | 248 XP    | 5 parties
12 500     | 283 XP    | 4 parties (moyen supérieur)
15 000     | 315 XP    | 4 parties (bon joueur)
20 000     | 375 XP    | 3 parties
```

### Progression des Grades
```
Grade                  | XP requis | Parties (12.5k/partie)
-----------------------|-----------|----------------------
Page                   | 1 000     | 4
Écuyer                 | 2 875     | 11
Chevalier Bachelier    | 7 000     | 25
Seigneur               | 61 375    | 217
Comte                  | 79 000    | 280
Duc                    | 172 000   | 608
Prince Électeur        | 265 375   | 938
Grand Roi              | 466 000   | 1 647
Empereur des Empereurs | 722 875   | 2 555
```

**Conclusion**: La progression XP et les grades sont bien équilibrés. Le problème principal est dans les cibles de quêtes T3/T4.

---

## 🎯 RÉSUMÉ

### ✅ Corrigé
- Code de réclamation de récompenses (2 requêtes au lieu de JOIN)
- Quêtes du mode Précision désactivées
- Quest_progress orphelins nettoyés

### ⚠️ À faire
- Créer la foreign key (SQL ci-dessus)
- Rééquilibrer les quêtes T3/T4 (cibles trop élevées)

### 📈 Système global
- ✅ Conversion Points → XP : bien équilibrée
- ✅ Système de grades : cohérent et progressif
- ✅ Quêtes T1/T2 : bien adaptées aux joueurs moyens
- ⚠️ Quêtes T3/T4 : cibles trop élevées pour leur période

---

**Fichiers créés pour analyse**:
- `check_quest_system.mjs` - Vérification complète du système
- `check_db_schema.mjs` - Vérification du schéma DB
- `fix_quest_system.mjs` - Script de correction (déjà exécuté)
- `verify_quest_balance.mjs` - Analyse de l'équilibrage
- `fix_quest_schema.sql` - SQL pour la foreign key

---

**Prochaines étapes recommandées**:
1. Exécuter le SQL pour créer la foreign key
2. Tester la réclamation de récompenses en production
3. Planifier le rééquilibrage des quêtes T3/T4 (optionnel mais recommandé)
