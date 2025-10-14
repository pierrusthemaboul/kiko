# 🔍 AUDIT DU SYSTÈME DE RESET DES QUÊTES

**Date:** 14 octobre 2025
**Statut:** 🔴 PROBLÈME CRITIQUE DÉTECTÉ

---

## 🚨 PROBLÈME IDENTIFIÉ

Le système de reset automatique des quêtes **NE FONCTIONNE PAS**.

### Symptômes
- **308 quêtes daily** sont expirées depuis le 7 octobre (7 jours)
- Les quêtes ne se réinitialisent pas automatiquement à minuit
- Le reset ne se fait que lorsque l'utilisateur ouvre l'application

### Cause racine
1. ❌ **Pas de cron job** configuré dans Supabase
2. ❌ **Pas de fonction SQL** `reset_expired_quests` dans la base
3. ❌ **pg_cron non activé** dans l'instance Supabase
4. ✅ Le code TypeScript `cleanExpiredQuests()` fonctionne, mais s'exécute **uniquement à la connexion utilisateur**

---

## 📊 RÉSULTATS DES TESTS

### Test des quêtes expirées
```
📈 Résumé: 20/20 quêtes testées sont EXPIRÉES

📅 Distribution des dates de reset:
- 2025-10-07: 308 quêtes (DAILY - expirées depuis 7 jours)
- 2025-10-13: 176 quêtes (WEEKLY - correctes)
- 2025-11-01: 176 quêtes (MONTHLY - correctes)
```

### Configuration actuelle
```
📋 Quêtes actives:
- Daily:   14 quêtes
- Weekly:  8 quêtes
- Monthly: 8 quêtes

🔧 Infrastructure:
- Fonction SQL 'reset_expired_quests': ❌ N'existe pas
- pg_cron: ❌ Non activé
- Trigger automatique: ❌ Aucun
```

---

## ✅ SOLUTION PROPOSÉE

### 1. Correction immédiate (URGENT)
Exécuter le script de migration pour nettoyer les quêtes expirées actuelles :

```bash
npx tsx scripts/fix-expired-quests-now.ts
```

Ce script va :
- Supprimer toutes les quêtes expirées (308 entrées)
- Réinitialiser les quêtes pour tous les utilisateurs affectés
- Recalculer les bonnes dates de reset

### 2. Solution à long terme (OBLIGATOIRE)
Mettre en place un système de reset automatique dans Supabase :

#### Étape A : Activer pg_cron
1. Aller dans le Dashboard Supabase
2. Database > Extensions
3. Activer **pg_cron**

#### Étape B : Créer la fonction SQL
Exécuter le script SQL dans l'éditeur SQL de Supabase (avec service_role) :

```bash
# Le fichier est prêt à être copié-collé
cat scripts/setup-quest-reset-cron.sql
```

Ce script va :
1. Créer la fonction `reset_expired_quests()` qui :
   - Supprime les quêtes dont `reset_at < NOW()`
   - Réinitialise les quêtes pour les utilisateurs actifs (7 derniers jours)
   - Recalcule les dates de reset selon le type (daily/weekly/monthly)

2. Configurer un cron job qui s'exécute **chaque jour à minuit UTC**

---

## 📝 DÉTAILS TECHNIQUES

### Logique de reset actuelle (Code TypeScript)

#### Fichier: `utils/questSelection.ts`

**Fonction `cleanExpiredQuests()` (ligne 187-206)**
```typescript
// ✅ Logique correcte
// ❌ S'exécute uniquement à l'ouverture de l'app par l'utilisateur
async function cleanExpiredQuests(userId: string): Promise<void> {
  const now = new Date();
  await supabase
    .from('quest_progress')
    .delete()
    .eq('user_id', userId)
    .lt('reset_at', now.toISOString());
}
```

**Appelée dans `getAllQuestsWithProgress()` (ligne 211-277)**
```typescript
export async function getAllQuestsWithProgress(userId: string) {
  // Nettoie UNIQUEMENT à la connexion utilisateur
  await cleanExpiredQuests(userId);
  // ...
}
```

### Calcul des dates de reset

**Daily:**
```typescript
const tomorrow = new Date();
tomorrow.setHours(24, 0, 0, 0); // Demain à minuit
```

**Weekly:**
```typescript
const nextMonday = new Date();
const dayOfWeek = nextMonday.getDay();
const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
nextMonday.setHours(0, 0, 0, 0); // Lundi prochain à minuit
```

**Monthly:**
```typescript
const nextMonth = new Date();
nextMonth.setMonth(nextMonth.getMonth() + 1);
nextMonth.setDate(1);
nextMonth.setHours(0, 0, 0, 0); // 1er du mois prochain à minuit
```

✅ **Ces calculs sont corrects** et sont reproduits dans la fonction SQL.

---

## 🎯 DATES DE RESET ATTENDUES

Pour aujourd'hui (14 octobre 2025) :

| Type | Prochaine date | Explication |
|------|----------------|-------------|
| **Daily** | 15 octobre 2025 00:00 | Demain à minuit |
| **Weekly** | 20 octobre 2025 00:00 | Lundi prochain |
| **Monthly** | 1 novembre 2025 00:00 | 1er du mois prochain |

---

## ⚙️ CONFIGURATION DU CRON JOB

### Expression cron recommandée

```
'0 22 * * *'  # 22h UTC = minuit heure française (hiver)
'0 23 * * *'  # 23h UTC = minuit heure française (été DST)
```

**Note:** Le cron actuel est configuré pour `0 0 * * *` (minuit UTC), ce qui correspond à :
- 1h du matin en France (heure d'hiver)
- 2h du matin en France (heure d'été)

Si vous voulez un reset exactement à minuit heure française, ajustez l'expression cron.

---

## 📋 CHECKLIST DE MISE EN PRODUCTION

- [ ] **URGENT** : Exécuter `fix-expired-quests-now.ts` pour corriger l'état actuel
- [ ] Activer pg_cron dans Supabase Dashboard
- [ ] Exécuter `setup-quest-reset-cron.sql` dans l'éditeur SQL Supabase
- [ ] Vérifier que le cron job est créé : `SELECT * FROM cron.job WHERE jobname = 'reset-daily-quests'`
- [ ] Tester manuellement la fonction : `SELECT * FROM reset_expired_quests()`
- [ ] Surveiller les logs d'exécution pendant 3 jours
- [ ] Documenter dans le README du projet

---

## 🔍 MONITORING

### Vérifier que le cron job s'exécute

```sql
-- Voir les 10 dernières exécutions
SELECT *
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid FROM cron.job WHERE jobname = 'reset-daily-quests'
)
ORDER BY start_time DESC
LIMIT 10;
```

### Vérifier qu'il n'y a pas de quêtes expirées

```sql
SELECT COUNT(*) as expired_quests
FROM quest_progress
WHERE reset_at < NOW();
```

Résultat attendu : **0**

---

## 🚀 OPTIMISATIONS FUTURES

1. **Notification aux utilisateurs** : Envoyer une notification push quand les quêtes se réinitialisent
2. **Historique des quêtes** : Sauvegarder les quêtes complétées dans une table `quest_history`
3. **Dashboard admin** : Créer un tableau de bord pour surveiller les stats des quêtes
4. **Retry logic** : Ajouter un système de retry si le cron job échoue

---

## 📚 FICHIERS CRÉÉS

- ✅ `scripts/test-quest-reset.ts` - Test diagnostic
- ✅ `scripts/check-sql-function.ts` - Vérification de la configuration
- ✅ `scripts/fix-expired-quests-now.ts` - Migration immédiate
- ✅ `scripts/setup-quest-reset-cron.sql` - Configuration SQL complète
- ✅ `QUEST_RESET_AUDIT.md` - Ce document

---

**Date de création :** 14 octobre 2025
**Créé par :** Claude Code
**Priorité :** 🔴 CRITIQUE
