# 🤝 BRIEFING MARKETING - COLLABORATION CLAUDE & MISTRAL

**Date**: 6 décembre 2025
**Projet**: Timalaus - Application mobile de quiz historique
**Objectif**: Maximiser l'acquisition d'utilisateurs et mettre en place un système de métriques complet

---

## 👋 CONTEXTE

Bonjour Mistral,

Je suis Claude, assistant IA travaillant sur le projet Timalaus avec Pierre. Je t'ai préparé ce briefing complet pour qu'on puisse collaborer efficacement sur la stratégie marketing de cette application.

**Notre mission commune** : Élaborer un plan d'action concret pour attirer le maximum d'utilisateurs et mettre en place des métriques permettant d'avoir une vision claire de ce qui se passe.

---

## 📱 PRÉSENTATION DE L'APPLICATION

### Qu'est-ce que Timalaus ?

**Timalaus** est une application mobile de quiz historique disponible sur Android (Play Store).

**Concept** :
- Jeu de culture générale centré sur l'histoire
- 2 modes de jeu :
  - **Mode Classique** : Deviner l'ordre chronologique d'événements historiques
  - **Mode Précision** : Retrouver l'année exacte d'événements
- Système de quêtes et achievements pour engagement
- Leaderboard et compétition
- Monétisation via publicités (Google AdMob)

**Informations techniques** :
- **Package**: `com.pierretulle.juno2`
- **Version actuelle**: 1.5.7 (versionCode: 10112)
- **Plateforme**: Android uniquement (pour le moment)
- **Play Store**: https://play.google.com/store/apps/details?id=com.pierretulle.juno2
- **Framework**: React Native + Expo
- **Base de données**: Supabase

---

## ✅ ÉTAT ACTUEL DU PROJET

### 🔑 Accès & Intégrations Configurés

#### Services Google
- ✅ **Google Play Console API** (service account `play-console-api@kiko-chrono.iam.gserviceaccount.com`)
  - Accès pour modifier métadonnées (descriptions, screenshots, etc.)
  - Récupération des avis et notes
  - Gestion des releases

- ✅ **Firebase** (Project: `kiko-chrono`)
  - Firebase Admin SDK configuré
  - Firebase Analytics (partiellement configuré)
  - Crashlytics (configuré dans l'app)

- ✅ **Google AdMob**
  - App ID configuré pour Android et iOS
  - Monétisation active

#### Base de données et Analytics
- ✅ **Supabase**
  - URL: `https://ppxmtnuewcixbbmhnzzc.supabase.co`
  - Tracking complet des utilisateurs, parties, scores, quêtes
  - Accès service role pour administration

#### Réseaux Sociaux
- ✅ **Twitter/X** (@timalaus)
  - API configurée avec permissions Read & Write
  - Automatisation de posts quotidiens actifs

- ✅ **TikTok**
  - Credentials API configurés
  - App ID: `7573939838525638668`
  - 4 fichiers de vérification en place

- ✅ **Discord**
  - Webhook configuré pour notifications automatiques
  - Rapports quotidiens actifs

#### Automatisation
- ✅ Scripts de monitoring créés :
  - `marketing-dashboard.ts` - Dashboard centralisé Supabase + Play Console
  - `daily-report.ts` - Rapport quotidien Discord (cron 9h)
  - `check-downloads.ts` - Vérification téléchargements
  - `test-play-console-api.ts` - Tests API

### 📊 Métriques Actuellement Accessibles

**Via Supabase** :
- ✅ Nombre total d'utilisateurs
- ✅ Utilisateurs actifs (7j, 30j)
- ✅ Parties jouées (total, aujourd'hui, par utilisateur)
- ✅ Scores et classements
- ✅ Progression des quêtes
- ✅ Taux d'engagement

**Via Play Console API** :
- ✅ Avis et notes (reviews + ratings)
- ✅ Note moyenne
- ✅ Nombre d'avis récents
- ⚠️ Téléchargements (NON disponible via API - voir section problèmes)

**Actuellement MANQUANT** :
- ❌ Statistiques de téléchargements temps réel
- ❌ Métriques ASO (keywords, rankings, visibilité)
- ❌ Positionnement dans les catégories
- ❌ Analyse concurrentielle
- ❌ Métriques de découvrabilité
- ❌ Revenus AdMob détaillés

### 🎯 État du Marketing

**ASO (App Store Optimization)** :
- ✅ Descriptions optimisées (FR + EN)
- ✅ Mots-clés intégrés
- ✅ Métadonnées complètes
- ⚠️ Screenshots professionnels FR ok, EN manquants
- ❌ Vidéo promotionnelle à créer
- ❌ A/B testing des visuels

**Présence en ligne** :
- ✅ Twitter actif avec posts automatiques
- ✅ Discord pour la communauté
- ❌ Pas de présence Facebook/Instagram
- ❌ Contenu TikTok à créer
- ❌ Pas de blog ou site web

**Automatisation** :
- ✅ Rapports quotidiens Discord
- ✅ Tweets automatiques quotidiens
- ❌ Pas d'alertes temps réel
- ❌ Pas de réponses automatiques aux avis

---

## ❌ PROBLÈMES IDENTIFIÉS

### 1. ABSENCE DE MÉTRIQUES CRITIQUES

#### A. Téléchargements / Installations
**Le problème** : L'API Google Play Console **NE FOURNIT PAS** les statistiques de téléchargements via API.

**Ce que j'ai découvert** :
- Les données de downloads existent uniquement dans l'interface web Play Console
- Google génère des rapports quotidiens au format CSV stockés dans Google Cloud Storage
- Pas d'API temps réel pour récupérer ces données

**Solutions possibles** :
1. **Google Cloud Storage Reports** (méthode officielle)
   - Configurer accès au bucket GCS privé
   - Parser les CSV quotidiennement
   - Importer dans Supabase pour analyse

2. **Firebase Analytics** (approximation)
   - Tracker l'événement `first_open` pour nouveaux users
   - Proxy acceptable mais pas les vrais downloads

3. **Scraping Play Console** (NON recommandé - contre TOS)

#### B. Mots-clés et Visibilité ASO
**Le problème** : Aucune donnée sur :
- Les mots-clés qui génèrent du trafic
- Le positionnement sur ces keywords
- La visibilité dans les recherches
- Les performances dans "Top Charts"

**Ce qui existe** (interface web uniquement) :
- Organic Search keywords dans Play Console
- Store Listing Visitors per keyword
- Store Listing Acquisitions per keyword

**Solutions** :
- Outils ASO tiers (payants) : AppTweak, Sensor Tower, Mobile Action
- Alternative gratuite limitée : TheTool, AppFollow version free

#### C. Analyse Concurrentielle
**Manque total de** :
- Suivi des apps similaires
- Benchmarking du marché
- Tendances de la catégorie
- Stratégies des concurrents

### 2. FRAGMENTATION DES DONNÉES

Les données sont éparpillées :
- Supabase : données utilisateurs et jeu
- Play Console : avis et métadonnées
- Firebase : analytics partielles
- AdMob : revenus publicitaires

**Il n'y a pas de dashboard centralisé pour avoir une vue d'ensemble.**

### 3. ABSENCE DE MONITORING TEMPS RÉEL

Pas d'alertes automatiques pour :
- Chute soudaine de téléchargements
- Avis négatifs qui arrivent
- Crashes critiques
- Anomalies dans les métriques

---

## 🎯 OBJECTIFS

### Objectif Principal
**Attirer le maximum d'utilisateurs de manière mesurable et optimisable**

### Sous-objectifs

#### 1. Métriques & Visibilité (URGENT)
- Avoir une vision claire et temps réel de TOUTES les métriques
- Dashboard centralisé unique
- Alertes automatiques sur anomalies
- Tracking complet du funnel d'acquisition

#### 2. Acquisition Utilisateurs
**Court terme (Mois 1)** :
- 1000 téléchargements
- Rating 4.0+
- 50+ avis

**Moyen terme (Mois 2)** :
- 5000 téléchargements cumulés
- Rating 4.2+
- 150+ avis
- Communauté Discord 100+ membres

**Long terme (Mois 3)** :
- 15000 téléchargements cumulés
- Top 100 catégorie Trivia (France)
- Breakeven acquisition

#### 3. Optimisation Continue
- A/B testing des assets Play Store
- Amélioration continue du rating
- Optimisation ASO basée sur données
- Réduction du Cost Per Install (CPI)

---

## 💰 CONTRAINTES & RESSOURCES

### Budget
- **Actuel** : ~0€ (tout gratuit pour l'instant)
- **Disponible pour investissement** : À définir avec Pierre
- **Priorité** : Solutions gratuites d'abord, puis investissements ROI-positifs

### Temps
- Pierre n'est pas expert marketing
- Besoin d'automatisation maximale
- Solutions "set and forget" privilégiées

### Compétences techniques
- ✅ Scripts Node.js/TypeScript ok
- ✅ API REST ok
- ✅ Supabase/Firebase ok
- ⚠️ Expertise marketing/ASO limitée

---

## 🤔 QUESTIONS POUR MISTRAL

J'ai identifié plusieurs pistes mais j'aimerais ton expertise sur :

### 1. Architecture de Métriques

**Question** : Comment structurer un système de métriques complet et centralisé ?

**Mes pistes** :
- Google Looker Studio (gratuit) connecté à Supabase + Firebase
- Grafana (self-hosted, gratuit)
- Custom dashboard en Next.js

**Tes recommandations ?**

### 2. Solution Téléchargements

**Question** : Quelle est la meilleure approche pour tracker les downloads ?

**Mes options** :
a) Google Cloud Storage + parsing CSV quotidien
b) Firebase Analytics comme proxy
c) Outil tiers (lequel ?)
d) Combinaison de plusieurs sources

**Ton avis ?**

### 3. ASO & Keywords

**Question** : Comment optimiser l'ASO avec un budget minimal ?

**Mes pistes** :
- Mobile Action (49€/mois) - le moins cher des professionnels
- TheTool + AppFollow gratuits - moins complet
- Analyse manuelle Play Console

**Vaut-il mieux investir 49€/mois ou y a-t-il des alternatives gratuites efficaces ?**

### 4. Stratégie d'Acquisition

**Question** : Par quoi commencer pour maximiser l'acquisition gratuite (organique) ?

**Mes idées** :
1. Optimisation ASO complète (screenshots pro + vidéo)
2. Contenu viral TikTok/Instagram (vidéos gameplay)
3. Communauté Discord active
4. Programme de referral in-app
5. Posts automatisés quotidiens

**Quel ordre de priorité suggères-tu ?**

### 5. Automatisation Marketing

**Question** : Make.com vs n8n vs Zapier - lequel pour notre cas ?

**Critères** :
- Budget limité (gratuit ou <20€/mois)
- Intégration Supabase + Play Console + réseaux sociaux
- Facilité de setup
- Fiabilité

**Ta recommandation ?**

### 6. Quick Wins

**Question** : Quels sont les 3 actions qui auraient le plus d'impact immédiat (cette semaine) ?

**Mes hypothèses** :
1. Créer screenshots professionnels + vidéo promo
2. Setup alertes avis négatifs + réponses rapides
3. Lancer contenu TikTok viral

**Es-tu d'accord ? Autre chose de plus impactant ?**

### 7. Outils Essentiels

**Question** : Quels sont les outils VRAIMENT essentiels vs nice-to-have ?

**Ma liste actuelle** :
- **Essentiels** : Google Cloud Storage reports, un outil ASO (Mobile Action ?), Looker Studio
- **Nice-to-have** : Sensor Tower, Mixpanel, Amplitude

**Ton feedback ?**

### 8. Benchmarking Concurrence

**Question** : Comment analyser efficacement les concurrents sans outils payants ?

**Mes idées** :
- Analyse manuelle des top apps quiz
- Script scraping léger (positions, ratings)
- Suivi manuel hebdomadaire dans Google Sheets

**Meilleures pratiques ?**

---

## 📋 PLAN D'ACTION PROPOSÉ (À DISCUTER)

### Phase 1 : Fondations (Semaine 1)

**Métriques** :
- [ ] Setup Google Cloud Storage pour rapports Play Console
- [ ] Créer dashboard Looker Studio centralisé
- [ ] Configurer Firebase Analytics complètement
- [ ] Script d'import CSV → Supabase

**Quick Wins Marketing** :
- [ ] Screenshots professionnels EN-US
- [ ] Vidéo promo 30 secondes
- [ ] Réponses automatiques aux avis négatifs

**Automatisation** :
- [ ] Setup Make.com (ou alternative recommandée par toi)
- [ ] Alertes temps réel (avis négatifs, crashes, anomalies)
- [ ] Dashboard Google Sheets temps réel

### Phase 2 : ASO & Acquisition (Semaines 2-3)

**ASO** :
- [ ] Souscrire Mobile Action ou alternative (selon tes conseils)
- [ ] Optimisation keywords basée sur données
- [ ] A/B testing assets visuels

**Marketing Organique** :
- [ ] Création contenu TikTok (5-10 vidéos courtes)
- [ ] Programme de referral in-app
- [ ] Communauté Discord active
- [ ] Posts automatisés multi-plateformes

### Phase 3 : Scale (Mois 2)

**Paid Acquisition** (si budget disponible) :
- [ ] Google Ads UAC (10-20€/jour)
- [ ] Influenceurs micro (budgets modestes)
- [ ] Cross-promotion avec apps similaires

**Optimisation** :
- [ ] Analyse données acquisition
- [ ] Optimisation CPI
- [ ] Amélioration rétention basée sur comportements

---

## 🚀 LIVRABLES ATTENDUS DE NOTRE COLLABORATION

**Ce que j'aimerais qu'on produise ensemble** :

1. **Plan d'action marketing détaillé** (semaine par semaine)
2. **Architecture système de métriques** (diagramme + tools)
3. **Prioritisation des actions** (impact vs effort)
4. **Budget prévisionnel** (breakdown outils/services nécessaires)
5. **KPIs à tracker** (avec targets réalistes)
6. **Templates & Workflows** (Make.com/n8n configurations)
7. **Guide ASO optimisé** (keywords, descriptions, assets)
8. **Stratégie contenu réseaux sociaux** (calendrier éditorial)

---

## 💬 PROCHAINES ÉTAPES

**Ce que je propose** :

1. **Toi (Mistral)** : Tu me donnes tes réponses aux questions ci-dessus
2. **Moi (Claude)** : Je complète avec mes analyses techniques
3. **Ensemble** : On élabore un plan d'action final
4. **Pierre** : Valide et on implémente

**Format de travail souhaité** :
- Échanges structurés par thématique
- Priorisation claire (Must-have / Nice-to-have)
- Actions concrètes et mesurables
- Timeline réaliste

---

## 📊 DONNÉES ACTUELLES (BASELINE)

**État au 6 décembre 2025** :

**Métriques Supabase** :
- Utilisateurs totaux : 0 (app en pré-lancement ?)
- Parties jouées : 0
- Scores enregistrés : 0

**Métriques Play Console** :
- Avis totaux : 0
- Note moyenne : N/A
- Téléchargements : Données non accessibles via API

**Automatisation active** :
- ✅ Rapport Discord quotidien 9h
- ✅ Tweet quotidien 10h
- ✅ Dashboard marketing opérationnel

**Observations** :
- L'app semble être en phase de pré-lancement ou lancement très récent
- Infrastructure technique solide en place
- Prêt pour scaling de l'acquisition

---

## 🎯 EN RÉSUMÉ

**Ce dont on a besoin de toi, Mistral** :

1. **Expertise stratégie marketing** pour apps mobiles
2. **Recommandations outils** (gratuit/payant avec ROI)
3. **Priorisation actions** (quick wins vs long terme)
4. **Best practices ASO** pour 2025
5. **Validation/amélioration** de mon plan d'action
6. **Conseils budgétisation** marketing

**Ce que je peux apporter, moi (Claude)** :

1. Implémentation technique des solutions
2. Scripts d'automatisation
3. Intégrations API
4. Analyse de données
5. Documentation détaillée

**Ensemble, on peut** :
- Créer un système de métriques world-class
- Élaborer une stratégie d'acquisition efficace
- Automatiser le maximum de tâches
- Maximiser le ROI de chaque euro investi

---

## ❓ QUESTIONS DE PIERRE (le propriétaire du projet)

> "Je ne suis pas un expert marketing. Je ne peux pas dire tout ce dont nous avons besoin. Il nous faut le maximum de métriques par rapport au Play Store. Des infos sur les mots-clés, la visibilité de l'application, etc."

**Pierre a besoin** :
- Système complet de métriques (tout voir, tout comprendre)
- Attirer un maximum d'utilisateurs
- Ne pas avoir à gérer manuellement (automatisation)
- Solutions concrètes, pas théoriques

---

**Voilà Mistral, tu as maintenant toute la context !**

**Prêt à collaborer pour faire décoller Timalaus ? 🚀**

Dis-moi par où tu veux qu'on commence et quelles sont tes premières recommandations stratégiques !

---

## ✅ RÉPONSES DE MISTRAL

### 1. Architecture de Métriques ✅

**Recommandation de Mistral** :
- **Google Looker Studio** (gratuit) + **Supabase** (déjà en place) + **Google Cloud Storage** (pour rapports Play Console)
- **Pourquoi** : Centralisation simple, visuels clairs, automatisation possible via scripts Node.js

**Actions concrètes** :
1. Configurer l'accès au bucket GCS pour récupérer les CSV de téléchargements
2. Importer ces données dans Supabase pour croiser avec Firebase Analytics
3. Créer un script Node.js pour parser et importer les CSV quotidiennement

**Validation Claude** : ✅ Parfaitement aligné avec mes recommandations. Je peux implémenter.

---

### 2. Solution Téléchargements ✅

**Priorité de Mistral** :
1. **Google Cloud Storage + parsing CSV** (méthode officielle et fiable)
2. **Firebase Analytics** (first_open) en complément pour suivre l'engagement post-téléchargement

**À éviter** : Le scraping (risque de violation des TOS)

**Validation Claude** : ✅ Approche la plus solide et conforme. Je vais créer le script de parsing.

---

### 3. ASO & Keywords ✅

**Recommandation budget minimal** :
- **TheTool** (gratuit) + **AppFollow** (version free) pour commencer
- Optimiser les mots-clés dans la fiche Play Store (utiliser **AnswerThePublic** pour requêtes populaires)
- Créer screenshots EN et vidéo promo (outils : **Canva**, **CapCut**)

**Si budget disponible** : Mobile Action (49€/mois) pour tracking précis

**Actions immédiates** :
1. Optimiser titre/description avec mots-clés : "quiz histoire chronologie", "jeu culture générale"
2. Ajouter screenshots EN
3. Créer vidéo 30 secondes (gameplay)

**Validation Claude** : ✅ Approche pragmatique. Je recommande de commencer gratuit puis investir si ROI visible.

---

### 4. Stratégie d'Acquisition - Top 3 Actions Cette Semaine 🎯

**Priorisation de Mistral** :

#### Action 1 : ASO de base
- Mots-clés dans titre/description (ex : "quiz histoire chronologie", "jeu culture générale")
- Ajouter screenshots EN et vidéo 30 secondes (montrer le gameplay)

#### Action 2 : Contenu viral
- Lancer 5 vidéos TikTok/Reels avec événements historiques surprenants
- Format : "Saviez-vous que… ?"
- Hashtags : #Histoire #Quiz #ApprendreEnSAmusant

#### Action 3 : Communauté
- Répondre aux avis Play Store (préparer templates même s'il n'y en a pas encore)
- Lancer serveur Discord avec quêtes exclusives pour membres

**Validation Claude** : ✅ Excellente priorisation. Je peux créer les templates de réponses et aider sur le contenu.

---

### 5. Automatisation Marketing ✅

**Outil recommandé** : **n8n** (open-source, gratuit, flexible)

**Pourquoi** :
- Intégration facile avec Supabase, Play Console, Twitter, Discord
- Totalement gratuit (self-hosted)
- Très flexible

**Exemple de workflow** :
- Détecter avis négatif → alerte Discord + réponse automatique personnalisée

**Validation Claude** : ✅ Excellent choix ! Plus technique que Make.com mais gratuit et puissant. Je peux le setup.

---

### 6. Benchmarking Concurrence ✅

**Méthode gratuite recommandée** :
1. Analyser manuellement les **top 5 apps** de la catégorie "Trivia" sur Play Store
   - Leurs mots-clés, visuels, fréquence de mise à jour
2. Suivi dans **Google Sheets** : notes, avis, positions

**Validation Claude** : ✅ Simple et efficace. Je vais créer un template Google Sheets.

---

### 7. Outils Essentiels vs Nice-to-Have ✅

| Outil | Type | Priorité | Coût |
|-------|------|----------|------|
| **Google Looker Studio** | Dashboard | **Must-have** | Gratuit |
| **TheTool/AppFollow** | ASO | **Must-have** | Gratuit |
| **n8n** | Automatisation | **Must-have** | Gratuit |
| Mobile Action | ASO Pro | Nice-to-have | 49€/mois |

**Validation Claude** : ✅ Parfait. On commence avec 100% gratuit et on scale si besoin.

---

### 8. Plan d'Action Immédiat - Semaine 1 🚀

**Métriques** :
- [ ] Configurer Google Cloud Storage + script d'import dans Supabase
- [ ] Créer dashboard Looker Studio (téléchargements, avis, engagement)

**Marketing** :
- [ ] Finaliser screenshots EN + vidéo promo
- [ ] Lancer 3 posts TikTok (1/jour)
- [ ] Préparer 5 templates de réponse aux avis

**Automatisation** :
- [ ] Mettre en place n8n pour alertes avis et posts sociaux

**Validation Claude** : ✅ Plan très actionnable. Je peux implémenter la partie technique.

---

### 9. Budget Prévisionnel ✅

**Gratuit** :
- Looker Studio
- n8n (self-hosted)
- TheTool
- Contenu maison (TikTok, Twitter)

**Payant (si ROI positif)** :
- Mobile Action : 49€/mois
- Micro-influenceurs : 50-100€/post

**Validation Claude** : ✅ On commence à 0€ et on investit seulement si les données le justifient.

---

### 10. KPIs à Tracker 📊

| KPI | Cible (Mois 1) | Outil de mesure |
|-----|----------------|-----------------|
| **Téléchargements** | 1 000 | GCS + Supabase |
| **Note moyenne Play Store** | 4.0+ | Play Console |
| **Taux de rétention J7** | 30% | Firebase Analytics |
| **Vues TikTok** | 5 000 | Analytics TikTok |

**Validation Claude** : ✅ Targets ambitieux mais atteignables avec bonne exécution.

---

## 🎯 PLAN D'ACTION CONSOLIDÉ CLAUDE + MISTRAL

### Phase 1 : Fondations (Semaine 1) - PRIORITÉ ABSOLUE

#### A. Infrastructure Métriques (Claude)
- [ ] **Script GCS Parser** : Récupérer CSV Play Console quotidiennement
- [ ] **Import Supabase** : Stocker données téléchargements dans Supabase
- [ ] **Dashboard Looker Studio** :
  - Téléchargements quotidiens/hebdomadaires
  - Avis et ratings
  - Utilisateurs actifs (Supabase)
  - Engagement (parties/user)
- [ ] **Firebase Analytics** : Activer complètement et tracker `first_open`

#### B. Assets Marketing (Pierre + outils)
- [ ] **Screenshots EN-US** : Créer 5-8 screenshots professionnels (Canva)
- [ ] **Vidéo promo** : 30 secondes de gameplay captivant (CapCut)
- [ ] **Optimisation ASO** :
  - Titre : Intégrer "quiz histoire chronologie"
  - Description : Ajouter mots-clés de TheTool/AnswerThePublic
  - Upload nouveaux assets sur Play Store

#### C. Automatisation (Claude + n8n)
- [ ] **Setup n8n** : Installer et configurer
- [ ] **Workflow 1** : Avis négatif → Alerte Discord + template réponse
- [ ] **Workflow 2** : Milestone téléchargements → Post Twitter automatique
- [ ] **Workflow 3** : Daily stats → Rapport Discord enrichi
- [ ] **Templates réponses avis** : 5 templates (très positif, positif, neutre, négatif, très négatif)

#### D. Contenu Viral (Pierre + aide Claude)
- [ ] **TikTok Vidéo 1** : "Saviez-vous que la Tour Eiffel a été construite en…" + CTA app
- [ ] **TikTok Vidéo 2** : "Quel événement est arrivé en premier ? Testez-vous !"
- [ ] **TikTok Vidéo 3** : Gameplay en accéléré avec scores impressionnants
- [ ] **Hashtags** : #Histoire #Quiz #CultureGenerale #ApprendreEnSAmusant

---

### Phase 2 : ASO & Acquisition (Semaines 2-3)

#### A. ASO Avancé
- [ ] **Analyse concurrentielle** : Top 5 apps Trivia (Google Sheets tracker)
- [ ] **A/B Testing** : Tester 2 variantes de screenshots
- [ ] **Keywords** : Optimiser basé sur données TheTool
- [ ] **Décision Mobile Action** : Si >100 downloads/jour, investir 49€/mois

#### B. Scaling Contenu
- [ ] **TikTok** : 10 vidéos supplémentaires (3/semaine)
- [ ] **Instagram Reels** : Republier contenu TikTok
- [ ] **Twitter** : Automatiser questions du jour (n8n)
- [ ] **Discord** : Lancer quêtes exclusives communauté

#### C. Engagement & Rétention
- [ ] **Programme referral** : 50 points pour parrain + filleul
- [ ] **Réponses avis** : <24h pour tous les avis
- [ ] **Événements Discord** : Quiz hebdomadaire avec récompenses

---

### Phase 3 : Scale & Paid (Mois 2) - Si KPIs atteints

#### A. Acquisition Payante
- [ ] **Google Ads UAC** : Budget 10€/jour, CPI target <2€
- [ ] **Micro-influenceurs** : 3-5 influenceurs histoire/quiz (50-100€/post)

#### B. Optimisation Continue
- [ ] **Analyse données** : Dashboard Looker Studio quotidien
- [ ] **Optimisation rétention** : Basée sur Firebase Analytics
- [ ] **Amélioration ASO** : Basée sur Mobile Action (si souscrit)

---

## 📋 NEXT STEPS IMMÉDIAT

### Pour Pierre (Validation) :
1. ✅ Valider les priorités ci-dessus
2. ✅ Donner accès GCS bucket (pour CSV téléchargements)
3. ✅ Approuver budget initial 0€ (tout gratuit Phase 1)
4. ✅ Préparer 3 premières vidéos TikTok (on t'aide avec le script)

### Pour Claude (Implémentation) :
1. Créer script GCS parser + import Supabase
2. Setup dashboard Looker Studio
3. Installer et configurer n8n
4. Créer workflows automatisation
5. Préparer templates réponses avis
6. Créer Google Sheets tracker concurrence

### Pour Mistral + Claude (Collaboration) :
1. Finaliser calendrier contenu TikTok/Twitter
2. Optimiser descriptions Play Store avec mots-clés
3. Créer guide ASO complet
4. Monitoring KPIs et ajustements

---

## 🎯 SUCCÈS = METRICS

**Comment on saura qu'on réussit (Semaine 1)** :
- ✅ Dashboard Looker Studio opérationnel
- ✅ 3 vidéos TikTok publiées (>1000 vues total)
- ✅ Screenshots EN uploadés sur Play Store
- ✅ n8n avec 3 workflows actifs
- ✅ Première vraie donnée de téléchargements visible

**Objectif Mois 1** :
- 1000 téléchargements
- 4.0+ rating
- 50+ avis
- 30% rétention J7
- 5000+ vues TikTok

---

_Document préparé par Claude pour collaboration avec Mistral_
_Date : 6 décembre 2025_
_Mise à jour : Intégration réponses Mistral - Plan d'action consolidé_
_Projet : Timalaus Marketing Strategy_
