# 🔧 Guide d'installation du reset automatique des quêtes

## ✅ Étape 1 : Reset manuel (TERMINÉ)

Le reset manuel a été effectué avec succès :
- ✅ 836 quêtes expirées supprimées
- ✅ 660 nouvelles quêtes créées pour 22 utilisateurs
- ✅ 0 quêtes expirées restantes

---

## 🚀 Étape 2 : Configuration du reset automatique dans Supabase

### A. Activer l'extension pg_cron

1. Ouvrez votre [Dashboard Supabase](https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc)
2. Allez dans **Database** → **Extensions**
3. Recherchez **pg_cron**
4. Cliquez sur **Enable** à côté de pg_cron

### B. Installer la fonction SQL et le cron job

1. Dans le Dashboard Supabase, allez dans **SQL Editor**
2. Créez une **New query**
3. Copiez-collez TOUT le contenu du fichier `scripts/setup-quest-reset-cron.sql`
4. Cliquez sur **Run** (ou Ctrl+Enter)

**Le script va :**
- Créer la fonction `reset_expired_quests()` qui nettoie et réinitialise automatiquement les quêtes
- Configurer un cron job qui s'exécute **chaque jour à minuit UTC** (1h du matin en France)

### C. Vérifier que tout fonctionne

Dans le **SQL Editor** de Supabase, exécutez ces requêtes de vérification :

#### 1. Vérifier que la fonction existe
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'reset_expired_quests';
```
**Résultat attendu :** Une ligne avec `reset_expired_quests`

#### 2. Vérifier que le cron job est créé
```sql
SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';
```
**Résultat attendu :** Une ligne avec les détails du job

#### 3. Tester la fonction manuellement
```sql
SELECT * FROM public.reset_expired_quests();
```
**Résultat attendu :** `deleted_count: 0, created_count: 0` (car on vient de tout réinitialiser)

---

## 📊 Monitoring (Optionnel)

### Voir les dernières exécutions du cron job

```sql
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-quests')
ORDER BY start_time DESC
LIMIT 10;
```

### Vérifier qu'il n'y a pas de quêtes expirées

```sql
SELECT COUNT(*) as expired_quests
FROM quest_progress
WHERE reset_at < NOW();
```
**Résultat attendu :** `0`

---

## ⏰ Calendrier de reset

| Type de quête | Fréquence | Prochaine date |
|---------------|-----------|----------------|
| **Daily** | Chaque jour à minuit | Demain 00:00 |
| **Weekly** | Chaque lundi à minuit | Prochain lundi 00:00 |
| **Monthly** | Le 1er de chaque mois à minuit | 1er janvier 2026 00:00 |

**Note :** Le cron job s'exécute à minuit UTC, ce qui correspond à :
- 1h du matin en France (heure d'hiver)
- 2h du matin en France (heure d'été)

---

## 🆘 Dépannage

### Le cron job ne s'exécute pas

1. Vérifiez que pg_cron est bien activé dans Extensions
2. Vérifiez que le job existe : `SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests';`
3. Regardez les logs d'erreur : `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;`

### Des quêtes sont toujours expirées

Si vous trouvez des quêtes expirées, vous pouvez relancer le script de correction :

```bash
npx tsx scripts/fix-expired-quests-now.ts
```

---

## ✅ Checklist finale

- [ ] pg_cron activé dans Supabase
- [ ] Fonction `reset_expired_quests()` créée
- [ ] Cron job `reset-daily-quests` configuré
- [ ] Fonction testée manuellement
- [ ] Vérification : 0 quêtes expirées

Une fois ces 5 étapes validées, votre système de quêtes se réinitialisera automatiquement, même si Supabase est mis en pause !

---

**Date de création :** 29 décembre 2025
**Statut :** 🟢 Reset manuel terminé / ⚠️ Configuration automatique à faire
