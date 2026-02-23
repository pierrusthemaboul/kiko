# 📊 GUIDE LOOKER STUDIO - DASHBOARD TIMALAUS

**Date** : 6 décembre 2025
**Objectif** : Créer un dashboard centralisé pour toutes les métriques marketing

---

## 🎯 CE QUE TU VAS CRÉER

Un dashboard unique qui affiche :
- 📱 **Stats Play Store** : Téléchargements, notes, reviews
- 🔥 **Firebase Analytics** : Événements, utilisateurs actifs, sessions
- 🎮 **Supabase Data** : Scores, événements custom, quêtes
- 📈 **Graphiques temps réel** : Évolution quotidienne, tendances

---

## 📝 ÉTAPE 1 : CRÉER COMPTE LOOKER STUDIO (2 min)

### 1. Va sur Looker Studio
URL : **https://lookerstudio.google.com**

### 2. Connexion
- Clique **"Use it for free"** ou **"Utiliser gratuitement"**
- Connecte-toi avec ton compte Google (celui qui gère Play Console/Firebase)
- **Important** : Utilise le MÊME compte Google que :
  - Google Play Console
  - Firebase
  - Google Cloud (kiko-chrono)

### 3. Accepter les conditions
- Accepte les termes et conditions
- Sélectionne "Non" pour les emails marketing (optionnel)

### 4. Première page
Tu arrives sur la page d'accueil Looker Studio.

**✅ STOP ICI - Reviens me dire quand c'est fait !**

---

## 📊 ÉTAPE 2 : CONNECTER SUPABASE (5 min)

### Option A : Connecteur PostgreSQL natif

1. Clique **"Create"** > **"Data Source"**

2. Cherche **"PostgreSQL"** dans la liste des connecteurs

3. Remplis les infos de connexion Supabase :
   ```
   Host: ppxmtnuewcixbbmhnzzc.supabase.co
   Port: 5432
   Database: postgres
   Username: postgres
   Password: [Ton mot de passe Supabase]
   ```

4. **Enable SSL** : ✅ Activer

5. Clique **"Authenticate"**

### Option B : Connecteur Community Supabase (si disponible)

1. Cherche **"Supabase"** dans les connecteurs community

2. Entre ton **Supabase URL** :
   ```
   https://ppxmtnuewcixbbmhnzzc.supabase.co
   ```

3. Entre ta **Service Role Key** :
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ
   ```

### ⚠️ Si tu ne trouves pas le mot de passe Supabase

**On va utiliser une autre méthode** : Export CSV depuis Supabase vers Google Sheets, puis connecter Google Sheets à Looker Studio.

---

## 🔥 ÉTAPE 3 : CONNECTER FIREBASE (2 min)

### 1. Retour sur Looker Studio
Clique **"Create"** > **"Data Source"**

### 2. Cherche "Firebase"
Dans la liste des connecteurs, cherche **"Google Analytics for Firebase"**

### 3. Sélectionne le projet
- Clique **"Authorize"**
- Sélectionne le projet : **kiko-chrono**
- Sélectionne l'app : **com.pierretulle.juno2** (Timalaus)

### 4. Clique "Connect"

✅ Firebase est maintenant connecté !

---

## 📈 ÉTAPE 4 : CRÉER LE PREMIER DASHBOARD (10 min)

### 1. Créer un nouveau rapport
- Retour page d'accueil Looker Studio
- Clique **"Create"** > **"Report"**
- Sélectionne la source Firebase qu'on vient de créer

### 2. Ajouter les premiers graphiques

#### Graphique 1 : Utilisateurs actifs quotidiens
1. Clique **"Add a chart"** > **"Time series chart"**
2. Dimensions : **Date**
3. Metrics : **Active Users** (ou "Utilisateurs actifs")
4. Plage de dates : **Last 30 days**

#### Graphique 2 : Événements principaux
1. **Add a chart** > **"Table"**
2. Dimensions : **Event name**
3. Metrics : **Event count**
4. Tri : Par **Event count** descendant
5. Afficher top 10

#### Graphique 3 : Sessions par jour
1. **Add a chart** > **"Bar chart"**
2. Dimensions : **Date**
3. Metrics : **Sessions**
4. Plage : **Last 7 days**

### 3. Ajouter un titre
- Clique sur le titre par défaut
- Change pour : **"📱 Timalaus - Dashboard Marketing"**

### 4. Personnaliser
- Change les couleurs si tu veux (menu "Style")
- Ajoute ton logo si tu en as un

---

## 📊 ÉTAPE 5 : AJOUTER SUPABASE DATA (Alternative Google Sheets)

### Si connexion directe Supabase ne marche pas :

#### 1. Export depuis Supabase
1. Va sur Supabase : https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc
2. Table Editor > **play_console_stats**
3. Clique **"..."** > **"Export as CSV"**

#### 2. Import dans Google Sheets
1. Va sur Google Sheets : https://sheets.google.com
2. Nouveau fichier : **"Timalaus - Play Console Stats"**
3. Importe le CSV

#### 3. Connecter à Looker Studio
1. Looker Studio > **Create** > **Data Source**
2. Cherche **"Google Sheets"**
3. Sélectionne ton fichier "Timalaus - Play Console Stats"
4. Clique **"Connect"**

#### 4. Ajouter au dashboard
1. Retour sur ton rapport
2. **Resource** > **Manage added data sources**
3. **Add a data source** > Sélectionne Sheets Supabase
4. Ajoute un graphique utilisant ces données

---

## 🎨 ÉTAPE 6 : TEMPLATE DASHBOARD COMPLET

### Structure recommandée (4 pages) :

#### Page 1 : Vue d'ensemble 📊
- KPI en haut : Total users, Active today, Total sessions
- Graphique ligne : Users actifs (30 derniers jours)
- Table : Top 5 événements
- Carte : Pays des utilisateurs

#### Page 2 : Play Store 📱
- KPI : Total reviews, Note moyenne, Téléchargements
- Graphique : Évolution notes
- Table : Derniers reviews
- Graphique : Downloads par jour

#### Page 3 : Engagement 🎮
- Sessions par utilisateur
- Durée moyenne session
- Taux de rétention
- Événements custom (quiz, game over, etc.)

#### Page 4 : Technique 🔧
- Crashes/Erreurs
- Versions OS
- Devices
- Performance

---

## 🚀 ÉTAPE 7 : AUTOMATISATION (Bonus)

### 1. Rafraîchissement auto des données
- Firebase : ✅ Temps réel automatique
- Supabase (via Sheets) : Configure refresh auto
  - Google Sheets > Extensions > Apps Script
  - Ajoute script de refresh quotidien

### 2. Rapports par email
- Looker Studio > **Share** > **Schedule email delivery**
- Configure : Quotidien à 9h
- Destinataires : Ton email

### 3. Partage
- **Share** > **Manage access**
- Ajoute collaborateurs si besoin
- Ou garde en privé

---

## 📋 CHECKLIST COMPLÈTE

### Avant de commencer
- [ ] Compte Google prêt (même que Play Console/Firebase)
- [ ] Accès Supabase (mot de passe ou Service Role Key)
- [ ] Accès Firebase Console

### Étapes
- [ ] Créer compte Looker Studio
- [ ] Connecter Firebase
- [ ] Connecter Supabase (ou Google Sheets alternative)
- [ ] Créer premier rapport
- [ ] Ajouter 3-5 graphiques essentiels
- [ ] Personnaliser design
- [ ] Configurer rafraîchissement auto
- [ ] Tester sur mobile/desktop

### Après création
- [ ] Partager dashboard avec moi (Claude) pour review
- [ ] Configurer alertes si métriques importantes changent
- [ ] Créer rapports hebdomadaires automatisés

---

## 💡 CONSEILS

### 🎯 Métriques essentielles à suivre :

**Acquisition** :
- Nouveaux utilisateurs / jour
- Source d'acquisition (Play Store, organic, etc.)

**Engagement** :
- Utilisateurs actifs quotidiens (DAU)
- Sessions par utilisateur
- Durée moyenne session

**Rétention** :
- Taux de rétention J1, J7, J30
- Utilisateurs qui reviennent

**Monétisation** (si applicable) :
- Revenue par utilisateur
- Taux de conversion achats

**Play Store** :
- Téléchargements quotidiens
- Note moyenne
- Nombre de reviews
- Taux de conversion (page → install)

---

## 🐛 DÉPANNAGE

### "Je ne vois pas mes données Firebase"
- Vérifie que l'app collecte des événements (Firebase Console)
- Attends 24h pour premières données (délai Firebase)
- Vérifie que tu as sélectionné la bonne app (com.pierretulle.juno2)

### "Impossible de connecter Supabase"
- Utilise méthode alternative Google Sheets
- Vérifie que SSL est activé
- Vérifie le mot de passe Supabase

### "Le dashboard est vide"
- Normal si app pas encore publiée
- Les données apparaîtront quand utilisateurs commencent à utiliser l'app
- En attendant, utilise données de test

---

## 🎯 PROCHAINES ÉTAPES

Une fois le dashboard créé :

1. **Je vais t'aider à** :
   - Optimiser les graphiques
   - Ajouter métriques avancées
   - Créer alertes automatiques
   - Connecter Play Console API stats

2. **Tu pourras** :
   - Suivre croissance en temps réel
   - Prendre décisions data-driven
   - Partager avec investisseurs/équipe
   - Monitorer santé de l'app

---

## 📞 BESOIN D'AIDE ?

**Pendant la création** :
- Fais des captures d'écran si tu bloques
- Dis-moi à quelle étape tu es
- Je te guide pas à pas

**Après la création** :
- Partage-moi le lien du dashboard (en lecture seule)
- On optimisera ensemble les métriques
- On ajoutera des graphiques avancés

---

## ✅ ACTION - MAINTENANT

**Étape 1 (2 min)** :
1. Va sur https://lookerstudio.google.com
2. Connecte-toi avec ton compte Google
3. Accepte les conditions
4. Reviens me dire "Looker Studio créé ✅"

**Je t'accompagne pour la suite ! 🚀**
