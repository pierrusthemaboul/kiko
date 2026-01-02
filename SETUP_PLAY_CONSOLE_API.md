# 🔗 LIER LE SERVICE ACCOUNT À PLAY CONSOLE

**Service Account créé** : `play-console-api-60@kiko-chrono.iam.gserviceaccount.com`

Pour que le script puisse accéder aux données Play Console, tu dois **autoriser** ce service account.

---

## 📝 ÉTAPES (5 minutes)

### 1️⃣ Aller sur Play Console

Va sur : **https://play.google.com/console**

Sélectionne ton app **Timalaus**.

---

### 2️⃣ Accéder aux paramètres API

1. Dans le menu de gauche, clique sur **"Configuration"** (en bas)
2. Clique sur **"Accès à l'API"** (ou "API access" en anglais)

**OU** utilise ce lien direct :
https://play.google.com/console/developers/api-access

---

### 3️⃣ Lier le service account

1. Clique sur **"Lier un compte de service existant"** (ou "Link existing service account")

2. Entre l'email du service account :
   ```
   play-console-api-60@kiko-chrono.iam.gserviceaccount.com
   ```

3. Clique **"Continuer"** ou **"Link service account"**

---

### 4️⃣ Donner les permissions

Une fois lié, tu vas voir le service account dans la liste.

1. Clique sur **"Gérer les autorisations Play Console"** (ou "Grant access")

2. **Autorisations minimales nécessaires** :
   - ✅ **View app information and download bulk reports (read-only)**
   - ✅ **Voir les informations de l'application** (lecture seule)
   - ✅ **Avis et notes** (lecture seule)

3. Clique **"Inviter l'utilisateur"** ou **"Save"**

---

## ✅ Vérifier que ça marche

Une fois configuré, teste le script :

```bash
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ" npx tsx scripts/fetch-play-console-stats.ts
```

Si tout marche, tu verras :
```
🚀 Démarrage du script Play Console Stats...
🔐 Authentification avec Google Play Console...
📱 Récupération des données pour com.pierretulle.juno2...
✅ X avis récupérés

📊 Statistiques récupérées:
   - Total avis: X
   - Note moyenne: X.X/5

💾 Sauvegarde dans Supabase...
✅ Données sauvegardées dans Supabase!

🎉 Script terminé avec succès!
```

---

## ⚠️ Si tu as une erreur 401 (Unauthorized)

Cela signifie que le service account n'est pas encore lié à Play Console.

Suis les étapes ci-dessus pour le lier.

---

## 📊 Créer la table Supabase (si besoin)

Si le script dit que la table `play_console_stats` n'existe pas :

1. Va sur https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc
2. SQL Editor
3. Exécute ce SQL :

```sql
CREATE TABLE play_console_stats (
  id BIGSERIAL PRIMARY KEY,
  package_name TEXT,
  total_reviews INTEGER,
  average_rating NUMERIC,
  fetched_at TIMESTAMP DEFAULT NOW(),
  reviews_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_play_console_package ON play_console_stats(package_name);
CREATE INDEX idx_play_console_fetched ON play_console_stats(fetched_at DESC);
```

---

**Dis-moi quand tu as lié le service account et on teste le script ! 🚀**
