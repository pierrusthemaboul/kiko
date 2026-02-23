# 📊 ANALYSE DE SCALABILITÉ - Système de Quêtes

**Date:** 14 octobre 2025

---

## 📈 SITUATION ACTUELLE

### Quêtes par utilisateur
- **Daily:** 14 quêtes
- **Weekly:** 8 quêtes
- **Monthly:** 8 quêtes
- **TOTAL:** 30 quêtes/utilisateur

### Utilisateurs actuels
- Total: ~22 utilisateurs
- Actifs (7 derniers jours): ~22 utilisateurs
- Lignes dans `quest_progress`: 836

---

## 🔢 PROJECTIONS DE SCALABILITÉ

| Utilisateurs | Lignes totales | Taille DB | Reset daily | Problèmes potentiels |
|--------------|----------------|-----------|-------------|----------------------|
| **100** | 3 000 | ~1,5 MB | 1 400 ops | ✅ Aucun |
| **1 000** | 30 000 | ~15 MB | 14 000 ops | ✅ Acceptable |
| **10 000** | 300 000 | ~150 MB | 140 000 ops | ⚠️ Lenteur possible |
| **50 000** | 1 500 000 | ~750 MB | 700 000 ops | 🔴 Problématique |
| **100 000** | 3 000 000 | ~1,5 GB | 1 400 000 ops | 🔴 Critique |

**Note:** "Reset daily" = nombre de DELETE + INSERT par jour (14 quêtes daily × utilisateurs actifs)

---

## ⚠️ PROBLÈMES À ANTICIPER

### 1. **Performance des requêtes** (> 10 000 utilisateurs)

**Problème:**
```sql
-- Cette requête devient lente avec 300 000+ lignes
SELECT * FROM quest_progress WHERE user_id = '...' AND completed = false;
```

**Solution:**
```sql
-- Créer des index
CREATE INDEX idx_quest_progress_user_completed ON quest_progress(user_id, completed);
CREATE INDEX idx_quest_progress_reset_at ON quest_progress(reset_at) WHERE completed = false;
```

---

### 2. **Reset quotidien lent** (> 10 000 utilisateurs)

**Problème actuel:**
- La fonction `reset_expired_quests()` fait :
  1. DELETE de ~140 000 lignes (quêtes daily expirées)
  2. INSERT de ~140 000 nouvelles lignes
  3. Durée estimée : **30-60 secondes** pour 10k users

**Impact:**
- Si ça prend > 2 minutes, le cron timeout
- Peut causer des locks sur la table

**Solution 1: Optimiser la fonction (UPDATE au lieu de DELETE+INSERT)**
```sql
-- Au lieu de supprimer et recréer, on met à jour en place
UPDATE quest_progress
SET
  current_value = 0,
  completed = false,
  completed_at = null,
  reset_at = CASE quest_type
    WHEN 'daily' THEN (CURRENT_DATE + INTERVAL '1 day')
    ...
  END
WHERE reset_at < NOW();
```
➜ **10x plus rapide** (pas de DELETE/INSERT)

**Solution 2: Lazy loading (recommandé)**
- Ne créer les quêtes que quand l'utilisateur ouvre l'app
- Le cron nettoie juste les anciennes
- Réduit de 70% les lignes en base

---

### 3. **Coûts Supabase** (> 50 000 utilisateurs)

| Plan | Database | Prix/mois | Limite users |
|------|----------|-----------|--------------|
| **Free** | 500 MB | 0€ | ~3 300 users |
| **Pro** | 8 GB | 25$ | ~53 000 users |
| **Team** | 100 GB | 599$ | ~666 000 users |

➜ À 10 000 users : **Plan Pro obligatoire**

---

### 4. **Utilisateurs inactifs** (problème actuel)

**Problème:**
- Les utilisateurs qui ne jouent plus gardent leurs quêtes en base
- Accumulation inutile de données

**Solution actuelle:**
✅ Le cron ne crée des quêtes QUE pour les users actifs (7 derniers jours)

**Amélioration possible:**
```sql
-- Nettoyer les quêtes des utilisateurs inactifs (> 30 jours)
DELETE FROM quest_progress
WHERE user_id IN (
  SELECT id FROM profiles
  WHERE last_play_date < (CURRENT_DATE - INTERVAL '30 days')
);
```

---

## 🚀 SOLUTIONS RECOMMANDÉES

### ✅ COURT TERME (< 1 000 utilisateurs)
**Statut actuel:** ✅ Le système est optimal

**Rien à faire**, sauf :
```sql
-- Ajouter ces index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id ON quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_reset_at ON quest_progress(reset_at);
```

---

### 🔧 MOYEN TERME (1 000 - 10 000 utilisateurs)

**1. Optimiser la fonction de reset**

Remplacer DELETE+INSERT par UPDATE :

```sql
CREATE OR REPLACE FUNCTION public.reset_expired_quests_v2()
RETURNS TABLE(updated_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated BIGINT := 0;
BEGIN
  -- Réinitialiser les quêtes expirées en place
  WITH quest_types AS (
    SELECT quest_key, quest_type
    FROM daily_quests
    WHERE is_active = true
  )
  UPDATE quest_progress qp
  SET
    current_value = 0,
    completed = false,
    completed_at = null,
    reset_at = CASE qt.quest_type
      WHEN 'daily' THEN (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
      WHEN 'weekly' THEN (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
      WHEN 'monthly' THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone
    END,
    updated_at = NOW()
  FROM quest_types qt
  WHERE qp.quest_key = qt.quest_key
    AND qp.reset_at < NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN QUERY SELECT v_updated;
END;
$$;
```

**Avantage:** 10x plus rapide, pas de réallocation mémoire

---

**2. Nettoyer les utilisateurs inactifs**

Ajouter un deuxième cron job mensuel :

```sql
-- Nettoyer les quêtes des users inactifs > 30 jours
SELECT cron.schedule(
  'cleanup-inactive-users-quests',
  '0 2 1 * *',  -- Le 1er du mois à 2h du matin
  $$
    DELETE FROM quest_progress
    WHERE user_id IN (
      SELECT id FROM profiles
      WHERE last_play_date < (CURRENT_DATE - INTERVAL '30 days')
    );
  $$
);
```

---

### 🎯 LONG TERME (> 10 000 utilisateurs)

**1. Passer au système "Lazy Loading"**

**Principe:** Créer les quêtes **à la demande** au lieu de les pré-créer

**Code TypeScript à modifier:**

```typescript
// Dans getAllQuestsWithProgress()
export async function getAllQuestsWithProgress(userId: string) {
  // 1. Nettoyer les expirées
  await cleanExpiredQuests(userId);

  // 2. Vérifier si l'utilisateur a des quêtes
  const { data: existingProgress } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId);

  // 3. Si aucune quête, les créer maintenant
  if (!existingProgress || existingProgress.length === 0) {
    await initializeQuestProgress(userId, [
      ...await selectDailyQuests(),
      ...await getWeeklyQuests(),
      ...await getMonthlyQuests()
    ]);
  }

  // 4. Retourner les quêtes
  return fetchQuestsWithProgress(userId);
}
```

**Avantages:**
- ✅ Réduit de 70% les lignes en base (seuls les users actifs ont des quêtes)
- ✅ Reset quotidien ultra-rapide (juste un DELETE)
- ✅ Scalabilité jusqu'à 100k+ utilisateurs

**Le cron devient super simple:**
```sql
-- Nettoyer toutes les quêtes expirées (pas de recréation)
DELETE FROM quest_progress WHERE reset_at < NOW();
```

---

**2. Archivage des quêtes complétées**

Créer une table d'historique :

```sql
-- Table d'historique (lecture seule)
CREATE TABLE quest_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_key text NOT NULL,
  completed_at timestamp with time zone NOT NULL,
  xp_earned integer,
  quest_type text,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Index pour les stats
CREATE INDEX idx_quest_history_user_id ON quest_history(user_id);
CREATE INDEX idx_quest_history_completed_at ON quest_history(completed_at);
```

**Trigger pour archiver automatiquement:**
```sql
CREATE OR REPLACE FUNCTION archive_completed_quest()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    INSERT INTO quest_history (user_id, quest_key, completed_at, quest_type)
    VALUES (NEW.user_id, NEW.quest_key, NEW.completed_at,
      (SELECT quest_type FROM daily_quests WHERE quest_key = NEW.quest_key)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER archive_quest_on_complete
AFTER UPDATE ON quest_progress
FOR EACH ROW
EXECUTE FUNCTION archive_completed_quest();
```

**Avantage:** Garder l'historique sans alourdir `quest_progress`

---

## 📊 RÉSUMÉ DES RECOMMANDATIONS

| Utilisateurs | Action requise | Priorité |
|--------------|----------------|----------|
| **< 1 000** | Ajouter des index | 🟡 Moyen |
| **1 000 - 10 000** | Optimiser le reset (UPDATE) | 🟠 Important |
| **> 10 000** | Passer au lazy loading | 🔴 Critique |
| **> 50 000** | + Archivage historique | 🔴 Critique |

---

## 🎯 PROCHAINES ÉTAPES IMMÉDIATES

### 1. Ajouter les index (maintenant)

```bash
# Créer un script SQL
cat > scripts/add-performance-indexes.sql << 'EOF'
-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id
  ON quest_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_quest_progress_reset_at
  ON quest_progress(reset_at)
  WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_quest_progress_user_completed
  ON quest_progress(user_id, completed);

-- Vérifier les index créés
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'quest_progress';
EOF
```

**À exécuter dans Supabase SQL Editor**

---

### 2. Surveiller la croissance (hebdomadaire)

```sql
-- Requête de monitoring
SELECT
  COUNT(*) as total_quests,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(current_value) as avg_progress,
  COUNT(*) FILTER (WHERE completed = true) as completed_count,
  COUNT(*) FILTER (WHERE reset_at < NOW()) as expired_count
FROM quest_progress;
```

---

### 3. Décision à prendre à 1 000 utilisateurs

- [ ] Implémenter l'optimisation UPDATE au lieu de DELETE+INSERT
- [ ] Tester les performances du reset
- [ ] Évaluer si le lazy loading est nécessaire

---

**Créé par:** Claude Code
**Date:** 14 octobre 2025
**Prochain review:** À 1 000 utilisateurs
