# ✅ QUÊTES CORRIGÉES - Étapes Manuelles Restantes

## 🎉 CE QUI A ÉTÉ FAIT AUTOMATIQUEMENT

✅ **484 quêtes expirées ont été supprimées et réinitialisées**
- 22 utilisateurs affectés
- 660 nouvelles quêtes créées avec les bonnes dates de reset
- 0 quête expirée restante

**Dates de reset actuelles:**
- Daily: 14 octobre 22:00 UTC (minuit en France)
- Weekly: 19 octobre 22:00 UTC (lundi minuit)
- Monthly: 31 octobre 23:00 UTC (1er novembre minuit)

---

## 🔧 ÉTAPES MANUELLES REQUISES (5 minutes)

Pour que les quêtes se réinitialisent automatiquement tous les jours, tu dois:

### 1️⃣ Ouvrir le Dashboard Supabase

🔗 https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc

---

### 2️⃣ Activer l'extension pg_cron

1. Aller dans **Database** → **Extensions** (menu latéral gauche)
2. Chercher **pg_cron** dans la liste
3. Cliquer sur **Enable**

![Extensions](/path/to/screenshot)

---

### 3️⃣ Créer la fonction SQL de reset automatique

1. Aller dans **SQL Editor** (menu latéral gauche)
2. Cliquer sur **New Query**
3. Copier-coller tout le contenu du fichier `scripts/setup-quest-reset-cron.sql`
4. Cliquer sur **Run** (ou Ctrl+Enter)

Tu devrais voir un message de succès :
```
Success! Rows returned: 1
```

---

### 4️⃣ Vérifier que le cron job est créé

Dans le même SQL Editor, exécuter :

```sql
SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';
```

Tu devrais voir une ligne avec :
- **jobname:** `reset-daily-quests`
- **schedule:** `0 0 * * *` (minuit UTC chaque jour)
- **command:** `SELECT public.reset_expired_quests();`

---

## 📊 MONITORING

### Vérifier qu'il n'y a pas de quêtes expirées

```sql
SELECT COUNT(*) as expired_quests
FROM quest_progress
WHERE reset_at < NOW();
```

**Résultat attendu:** `0`

---

### Voir les dernières exécutions du cron job

```sql
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-quests'
)
ORDER BY start_time DESC
LIMIT 10;
```

---

## 🔍 TESTS

### Test manuel de la fonction

Tu peux tester manuellement que la fonction fonctionne :

```sql
SELECT * FROM public.reset_expired_quests();
```

Résultat attendu : `(deleted_count: 0, created_count: 0)` si aucune quête n'est expirée.

---

## ⚙️ CONFIGURATION OPTIONNELLE

### Changer l'heure du reset

Par défaut, le reset se fait à **minuit UTC** (1h-2h du matin en France).

Pour le faire à **minuit heure française** exactement :

```sql
-- Supprimer l'ancien job
SELECT cron.unschedule('reset-daily-quests');

-- Créer le nouveau job à 22h UTC (= minuit France hiver)
SELECT cron.schedule(
  'reset-daily-quests',
  '0 22 * * *',  -- 22h UTC
  $$SELECT public.reset_expired_quests();$$
);
```

---

## 📋 CHECKLIST FINALE

Coche chaque étape une fois terminée :

- [ ] Extension pg_cron activée
- [ ] Fonction SQL `reset_expired_quests()` créée
- [ ] Cron job `reset-daily-quests` créé
- [ ] Vérification : `SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';` retourne 1 ligne
- [ ] Test manuel : `SELECT * FROM public.reset_expired_quests();` fonctionne
- [ ] Vérification : 0 quête expirée actuellement

---

## 📁 FICHIERS DE RÉFÉRENCE

- **Audit complet:** [QUEST_RESET_AUDIT.md](QUEST_RESET_AUDIT.md)
- **Script SQL:** [scripts/setup-quest-reset-cron.sql](scripts/setup-quest-reset-cron.sql)
- **Tests:** [scripts/test-quest-reset.ts](scripts/test-quest-reset.ts)

---

## ❓ EN CAS DE PROBLÈME

### La fonction n'existe pas
```
ERROR: function public.reset_expired_quests() does not exist
```

➜ Retourner à l'étape 3️⃣ et réexécuter le script SQL

### pg_cron n'est pas disponible
```
ERROR: schema "cron" does not exist
```

➜ Retourner à l'étape 2️⃣ et activer l'extension pg_cron

### Permission denied
```
ERROR: permission denied for schema cron
```

➜ S'assurer d'être connecté avec le rôle **postgres** ou **service_role** dans le SQL Editor

---

**Date:** 14 octobre 2025
**Statut:** ✅ Correction effectuée, configuration manuelle requise
