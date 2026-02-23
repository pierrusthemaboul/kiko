# 🔐 GUIDE CRÉATION COMPTES - TIMALAUS MARKETING

**Date** : 6 décembre 2025
**Objectif** : Créer tous les comptes nécessaires pour le plan marketing

---

## ✅ COMPTES À CRÉER (Par Priorité)

**STRATÉGIE** : 100% GRATUIT pour commencer. On passera au payant seulement quand on aura des données qui le justifient.

---

### 🔴 PRIORITÉ 0 - À faire MAINTENANT (30 min)

#### 1. **Google Cloud Storage** (Accès téléchargements Play Console)
- **URL** : https://console.cloud.google.com
- **Compte** : Utilise le même compte Google que Play Console
- **Étapes** :
  1. Aller sur https://console.cloud.google.com
  2. Sélectionner le projet lié à l'app (ou créer si inexistant)
  3. Activer "Google Play Developer Reporting API"
  4. Créer un bucket pour stocker les rapports CSV
  5. Configurer service account avec accès lecture
- **Ce qu'on récupère** : Clé JSON du service account
- **Coût** : Gratuit (< 1 GB de données)

---

#### 2. **Firebase** (Analytics Complet)
**Note** : Tu as déjà un projet Firebase (`kiko-chrono`), il faut juste le configurer complètement

- **URL** : https://console.firebase.google.com
- **Compte** : Même compte Google
- **Étapes** :
  1. Ouvrir projet `kiko-chrono`
  2. Aller dans Analytics > Events
  3. Activer tous les événements recommandés
  4. Configurer "first_open" comme événement clé
  5. Créer audience "New Users" (first_open dans les dernières 24h)
- **Ce qu'on récupère** : Rien de nouveau, juste configuration
- **Coût** : Gratuit

---

#### 3. **Google Looker Studio** (Dashboard Centralisé)
- **URL** : https://lookerstudio.google.com
- **Compte** : Même compte Google
- **Étapes** :
  1. Aller sur https://lookerstudio.google.com
  2. Cliquer "Create" > "Data Source"
  3. Ne rien configurer pour l'instant (on le fera ensemble après)
- **Ce qu'on récupère** : Compte actif
- **Coût** : Gratuit

---

### 🟠 PRIORITÉ 1 - ASO (20 min)

#### 4. **ASOMobile** (Mots-clés ASO - 100% Gratuit)
- **URL** : https://asomobile.net/en/free-tools/
- **Compte** : AUCUN COMPTE REQUIS (outils directement accessibles)
- **Fonctionnalités** :
  - Recherche de mots-clés
  - Analyse de trafic
  - Tracking rankings quotidien
  - Analyse concurrents
- **Coût** : 100% GRATUIT (toujours, pas d'essai limité)
- **Note** : ⚠️ TheTool.io racheté par AppRadar (89€/mois), ASODesk aussi payant

---

#### 5. **AppFollow** (ASO Complémentaire)
- **URL** : https://appfollow.io
- **Compte** : Créer avec email pro ou perso
- **Étapes** :
  1. S'inscrire (version gratuite - 14 jours trial puis free tier)
  2. Ajouter l'app via URL Play Store
  3. Configurer alertes pour nouveaux avis
- **Ce qu'on récupère** : Email + mot de passe
- **Coût** : Gratuit (free tier)

---

### 🟡 PRIORITÉ 2 - Automatisation (30-60 min)

#### 6. **n8n** (Automatisation Workflows)

**✅ CHOIX VALIDÉ : Self-Hosted (100% Gratuit)**

- **Installation** : Docker sur ton PC/serveur
- **Étapes** :
  1. Installer Docker (si pas déjà fait)
  2. Lancer n8n via Docker Compose (je fournis le fichier)
  3. Accès via http://localhost:5678
- **Coût** : 0€ (consomme ~500MB RAM)
- **Avantage** : Contrôle total, pas de limite d'exécutions

**Je m'occupe de l'installation technique une fois que Docker est prêt.**

---

#### 7. **Canva** (Création Visuels)

**✅ CHOIX VALIDÉ : Version Gratuite**

- **URL** : https://www.canva.com
- **Compte** : Créer avec email
- **Étapes** :
  1. S'inscrire (version FREE)
  2. Chercher templates "App Screenshots" (filtrer par Free)
  3. Créer 5-8 screenshots EN-US
- **Ce qu'on récupère** : Email + mot de passe
- **Coût** : 0€ (version gratuite largement suffisante pour commencer)

---

### 🔵 OUTILS PAYANTS - ON ATTEND D'AVOIR DES DONNÉES

**Stratégie** : On ne paie RIEN tant qu'on n'a pas validé que ça marche.

#### Conditions pour passer au payant :

| Outil | Seuil de décision | Coût | Bénéfice |
|-------|-------------------|------|----------|
| **Mobile Action** | >100 téléchargements/jour | 49€/mois | Tracking mots-clés avancé |
| **n8n Cloud** | Si self-hosted trop compliqué | 20€/mois | Simplicité, pas de maintenance |
| **Canva Pro** | Si templates gratuits insuffisants | 13€/mois | Templates premium, Brand Kit |

**Pour l'instant : 0€ investi jusqu'à avoir de la traction.**

---

## 📝 FICHIER CREDENTIALS (À Créer Après)

Une fois les comptes créés, on stockera tout dans un fichier sécurisé :

```
/home/pierre/kiko/.credentials.env
```

**Format** :
```env
# Google Cloud
GCS_BUCKET_NAME=timalaus-play-console-reports
GCS_SERVICE_ACCOUNT_KEY=...

# Firebase
FIREBASE_PROJECT_ID=kiko-chrono
FIREBASE_API_KEY=...

# ASO Tools
THETOOL_EMAIL=...
THETOOL_PASSWORD=...
APPFOLLOW_API_KEY=...

# n8n
N8N_URL=...
N8N_API_KEY=...

# Canva
CANVA_EMAIL=...
CANVA_PASSWORD=...
```

⚠️ **IMPORTANT** : Ce fichier sera en `.gitignore` pour éviter de commit les credentials !

---

## 🚀 PROCHAINES ÉTAPES

### Toi (Pierre) :
1. ✅ Créer les comptes Priorité 0 (Google Cloud Storage, Firebase config, Looker Studio)
2. ✅ Créer les comptes Priorité 1 (TheTool, AppFollow)
3. ✅ Me donner les credentials/accès dans le chat (je créerai le fichier `.credentials.env`)

### Moi (Claude) :
1. ⏳ Configurer Google Cloud Storage (script parsing CSV)
2. ⏳ Créer dashboard Looker Studio
3. ⏳ Setup n8n workflows (une fois compte créé)
4. ⏳ Intégrer TheTool/AppFollow dans dashboard

---

## ⏱️ ESTIMATION TEMPS

- **Priorité 0** : 30 minutes
- **Priorité 1** : 20 minutes
- **n8n** : 30-60 minutes (selon option choisie)

**TOTAL** : ~1h30 pour avoir tout configuré

---

## ✅ DÉCISIONS VALIDÉES

- ✅ **100% gratuit** pour commencer
- ✅ **n8n self-hosted** (je m'occupe de l'installation Docker)
- ✅ **Canva version free**
- ✅ **Pas d'outils payants** avant d'avoir de la traction

---

## 🎯 ACTION PLAN - TOI (Pierre)

### Étape 1 : Comptes Google (15 min)
1. Va sur https://console.cloud.google.com
2. Configure Google Cloud Storage (je te guide)
3. Configure Firebase Analytics complet
4. Crée un compte Looker Studio

### Étape 2 : Outils ASO Gratuits (10 min)
1. Va sur https://asomobile.net/en/free-tools/ (pas de compte nécessaire !)
2. Inscris-toi sur https://appfollow.io (free tier - 7j trial)
3. Optionnel : https://keyapp.top/free-aso-tools (aussi gratuit sans compte)

### Étape 3 : Canva (5 min)
1. Inscris-toi sur https://www.canva.com (version gratuite)
2. On créera les screenshots ensemble après

### Étape 4 : Docker (si pas installé)
1. Vérifie si Docker est installé : `docker --version`
2. Si non installé, dis-le moi, je te donne les commandes

**TOTAL : 30 minutes maximum**

---

## 🚀 ACTION PLAN - MOI (Claude)

Une fois que tu as créé les comptes, je m'occupe de :

1. ✅ Installer et configurer n8n (Docker)
2. ✅ Créer le script Google Cloud Storage → Supabase
3. ✅ Configurer dashboard Looker Studio
4. ✅ Setup workflows n8n (alertes, posts auto)
5. ✅ Intégrer TheTool + AppFollow dans le monitoring

---

_Dès que tu es prêt, commence par l'Étape 1 et envoie-moi les infos ! 🚀_
