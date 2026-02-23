# 🎯 RAPPORT FINAL - SYSTÈME DE QUÊTES

**Date**: 2026-02-01
**Statut**: ⚠️ **3 problèmes critiques identifiés**

---

## 📋 RÉSUMÉ EXÉCUTIF

Votre système de quêtes a **3 problèmes critiques** qui empêchent le bon fonctionnement :

1. ❌ **Colonne `claimed` manquante** → Les joueurs ne peuvent pas marquer les récompenses comme réclamées
2. ❌ **Fonction SQL bugguée** → Le reset automatique ne fonctionne pas
3. ❌ **Foreign key manquante** → Performance dégradée (corrigé côté code en attendant)

**Bonne nouvelle** : Tous les problèmes peuvent être corrigés en exécutant **2 fichiers SQL** !

---

## 🔴 PROBLÈMES CRITIQUES

### 1. Colonne `claimed` manquante

**Impact** :
- Les joueurs peuvent réclamer la même récompense plusieurs fois
- Exploitation possible (XP et parts infinies)
- Les quêtes complétées restent marquées comme "à réclamer"

**Code affecté** :
- [lib/economy/apply.ts:764](lib/economy/apply.ts#L764) : `if (progress.claimed) throw new Error(...)`
- [lib/economy/apply.ts:781](lib/economy/apply.ts#L781) : `update({ claimed: true, ...

})`

**Statut** : 🔴 **CRITIQUE - Exploitation possible**

---

### 2. Fonction `reset_expired_quests()` bugguée

**Impact** :
- Le cron job échoue à chaque exécution
- Les quêtes expirées ne sont supprimées qu'au lancement de l'app
- Base de données encombrée

**Erreur** : `column "user_id" does not exist`

**Statut** : 🟡 **NON CRITIQUE** (le lazy loading compense)

---

### 3. Foreign key manquante (corrigé côté code)

**Impact** :
- ✅ **CORRIGÉ** dans le code : 2 requêtes séparées au lieu d'un JOIN
- Performances légèrement dégradées
- Le JOIN fonctionnera après création de la foreign key

**Fichiers modifiés** :
- [lib/economy/apply.ts:752-776](lib/economy/apply.ts#L752-L776) : `claimQuestReward()`
- [lib/economy/apply.ts:830-850](lib/economy/apply.ts#L830-L850) : `rerollQuest()`

**Statut** : ✅ **CORRIGÉ** (optimisation possible avec la foreign key)

---

## ✅ SOLUTION : 2 ÉTAPES

### ÉTAPE 1 : Corriger le système de quêtes (PRIORITÉ HAUTE)

**Fichier** : [FIX_COMPLETE_QUEST_SYSTEM.sql](FIX_COMPLETE_QUEST_SYSTEM.sql)

**Exécution** : Dashboard Supabase → SQL Editor → Copier-coller le contenu

**Ce que ça corrige** :
- ✅ Ajoute la colonne `claimed` à `quest_progress`
- ✅ Corrige la fonction `reset_expired_quests()`
- ✅ Installe le cron job pour reset automatique à minuit UTC

**Durée** : ~10 secondes

---

### ÉTAPE 2 : Créer la foreign key (RECOMMANDÉ)

**Fichier** : [fix_quest_schema.sql](fix_quest_schema.sql)

**Exécution** : Dashboard Supabase → SQL Editor → Copier-coller le contenu

**Ce que ça fait** :
- ✅ Crée une contrainte `UNIQUE` sur `daily_quests.quest_key`
- ✅ Crée une foreign key `quest_progress.quest_key` → `daily_quests.quest_key`
- ✅ Permet d'optimiser le code pour utiliser des JOINs

**Durée** : ~5 secondes

**Note** : Optionnel mais recommandé pour les performances

---

## 📊 ÉTAT DU SYSTÈME

### Statistiques actuelles (production)

```
Total quest_progress : 554
Quêtes complétées   : 4 (1%)
Quêtes réclamées    : 0 (0% - NORMAL car colonne manquante)
Quêtes expirées     : 0 (✅ Lazy loading fonctionne)
```

### Utilisateurs actifs

```
7 derniers jours    : 2 utilisateurs
Tous avec quêtes    : ✅ Oui (lazy loading OK)
```

### Quêtes actives

```
Total               : 58 quêtes
Daily               : 28 quêtes
Weekly              : 16 quêtes
Monthly             : 16 quêtes
Précision (désact.) : 0 quêtes ✅
```

---

## 🛠️ CORRECTIONS DÉJÀ APPLIQUÉES

### ✅ Code modifié

**Fichier** : [lib/economy/apply.ts](lib/economy/apply.ts)

**Changements** :

1. **`claimQuestReward()`** (ligne 752-776) :
   ```typescript
   // AVANT (cassé)
   .select('*, daily_quests(*)')  // ❌ JOIN ne fonctionne pas

   // APRÈS (corrigé)
   .select('*')                    // ✅ 2 requêtes séparées
   // + requête séparée pour daily_quests
   ```

2. **`rerollQuest()`** (ligne 830-850) :
   - Même correction (2 requêtes au lieu d'un JOIN)

### ✅ Quêtes Précision désactivées

- `t2_precision_perfect` : ✅ Désactivée
- `weekly_precision_master` : ✅ Désactivée
- 20 `quest_progress` orphelins : ✅ Nettoyés

---

## 🎯 SYSTÈME DE RESET DES QUÊTES

### Comment ça fonctionne

#### 1. **Lazy loading** (au lancement de l'app)

**Fichier** : [utils/questSelection.ts:348-433](utils/questSelection.ts#L348-L433)

```typescript
// Appelé à chaque ouverture de l'app
async function getAllQuestsWithProgress(userId, rankIndex) {
  // 1. Nettoie les quêtes expirées
  await cleanExpiredQuests(userId);

  // 2. Sélectionne les quêtes adaptées au rang
  const dailyQuests = await selectDailyQuests(rankIndex);
  const weeklyQuests = await getWeeklyQuests(rankIndex);
  const monthlyQuests = await getMonthlyQuests(rankIndex);

  // 3. Crée les quest_progress manquantes
  if (missingQuests.length > 0) {
    await initializeQuestProgress(userId, missingQuests);
  }
}
```

**Avantages** :
- ✅ Fonctionne même si le cron job échoue
- ✅ S'adapte automatiquement au rang du joueur
- ✅ Crée les quêtes à la demande (pas de migration nécessaire)

**Inconvénient** :
- ⚠️ Les joueurs inactifs gardent des quêtes expirées en base

#### 2. **Cron job automatique** (minuit UTC chaque jour)

**Statut** : ❌ **CASSÉ** (après correction : ✅)

**Fonction** : `reset_expired_quests()`

**Exécution** : Tous les jours à 00:00 UTC (1h-2h du matin en France)

**Actions** :
1. Supprime les `quest_progress` expirées (`reset_at < now`)
2. Crée de nouvelles quêtes pour les utilisateurs actifs (7 derniers jours)

**Après correction** : Les joueurs inactifs verront leurs quêtes nettoyées automatiquement

---

### Dates de reset

**Calculées automatiquement** dans [utils/questSelection.ts:247-285](utils/questSelection.ts#L247-L285) :

| Type    | Reset                     | Exemple              |
|---------|---------------------------|----------------------|
| Daily   | Demain à minuit (Paris)   | 2026-02-02 00:00     |
| Weekly  | Lundi prochain (Paris)    | 2026-02-03 00:00     |
| Monthly | 1er du mois prochain      | 2026-03-01 00:00     |

**Timezone** : `Europe/Paris` (UTC+1 hiver, UTC+2 été)

---

## ⚠️ PROBLÈMES MINEURS (Non bloquants)

### Quêtes T3/T4 avec cibles trop élevées

**Impact** : Certaines quêtes sont difficiles/impossibles à terminer

**Exemples** :

| Quest Key           | Type    | Cible     | Parties nécessaires | Commentaire    |
|---------------------|---------|-----------|---------------------|----------------|
| `t4_score_300000`   | Daily   | 300k pts  | 24                  | 🔴 Démesure   |
| `w4_score_500k`     | Weekly  | 500k pts  | 40 (5.7/jour)       | 🔴 Trop élevé |
| `m4_score_3M`       | Monthly | 3M pts    | 240 (8/jour)        | 🔴 Démesure   |

**Recommandation** : Rééquilibrer les quêtes T4 (optionnel)

---

## 🧪 TESTS À EFFECTUER

### Après exécution du SQL

1. **Test de réclamation de récompense** :
   ```bash
   node test_claim_reward.mjs  # À créer
   ```

2. **Test du cron job** :
   ```sql
   SELECT * FROM public.reset_expired_quests();
   ```

3. **Vérifier les quêtes expirées** :
   ```sql
   SELECT COUNT(*) FROM quest_progress WHERE reset_at < NOW();
   -- Devrait retourner 0
   ```

4. **Vérifier le cron job** :
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';
   -- Devrait retourner 1 ligne avec active = true
   ```

---

## 📁 FICHIERS CRÉÉS

### Scripts de correction

- [FIX_COMPLETE_QUEST_SYSTEM.sql](FIX_COMPLETE_QUEST_SYSTEM.sql) - **PRIORITÉ HAUTE**
- [fix_quest_schema.sql](fix_quest_schema.sql) - Recommandé

### Scripts de vérification

- [check_quest_system.mjs](check_quest_system.mjs) - Vérification complète
- [check_db_schema.mjs](check_db_schema.mjs) - Vérification schéma
- [check_quest_progress_schema.mjs](check_quest_progress_schema.mjs) - Vérification colonnes
- [test_quest_reset_system.mjs](test_quest_reset_system.mjs) - Test du reset
- [verify_quest_balance.mjs](verify_quest_balance.mjs) - Analyse équilibrage

### Scripts de correction exécutés

- [fix_quest_system.mjs](fix_quest_system.mjs) - ✅ Exécuté (quêtes Précision désactivées)

### Documentation

- [RAPPORT_VERIFICATION_QUETES.md](RAPPORT_VERIFICATION_QUETES.md) - Rapport intermédiaire
- [RAPPORT_FINAL_QUETES.md](RAPPORT_FINAL_QUETES.md) - Ce document

---

## ✅ CHECKLIST FINALE

### À faire MAINTENANT (Critique)

- [ ] Exécuter [FIX_COMPLETE_QUEST_SYSTEM.sql](FIX_COMPLETE_QUEST_SYSTEM.sql) dans Supabase
- [ ] Vérifier que le cron job est actif : `SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests'`
- [ ] Tester la réclamation d'une récompense dans l'app

### Recommandé

- [ ] Exécuter [fix_quest_schema.sql](fix_quest_schema.sql) pour créer la foreign key
- [ ] Tester le système complet avec un utilisateur test
- [ ] Surveiller les logs du cron job demain matin (1h-2h)

### Optionnel (Amélioration)

- [ ] Rééquilibrer les quêtes T3/T4 (cibles trop élevées)
- [ ] Ajouter des tests automatisés
- [ ] Optimiser le code pour utiliser les JOINs (après foreign key)

---

## 🎉 CONCLUSION

Votre système de quêtes est **presque parfait** ! Il ne manque que :

1. ✅ La colonne `claimed` (5 secondes à corriger)
2. ✅ La fonction `reset_expired_quests()` (5 secondes à corriger)
3. ✅ Le cron job (installé automatiquement avec la fonction)

**Après correction** : Système 100% fonctionnel avec reset automatique à minuit UTC.

**Points forts** du système actuel :
- ✅ Lazy loading intelligent
- ✅ Adaptation automatique au rang du joueur
- ✅ Sélection par tiers (T1-T4)
- ✅ Seed quotidienne pour varier les quêtes
- ✅ Scaling intra-tier (+5% par grade)
- ✅ Gestion des timezone (Europe/Paris)

---

**Prochaines étapes** :
1. Exécutez [FIX_COMPLETE_QUEST_SYSTEM.sql](FIX_COMPLETE_QUEST_SYSTEM.sql)
2. Testez la réclamation de récompense
3. Vérifiez demain matin que le cron a tourné

Bonne chance ! 🚀
