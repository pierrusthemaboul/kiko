# 🚀 PLAN D'ACTION MARKETING - TIMALAUS

**Objectif** : Maximiser l'acquisition d'utilisateurs

**Dernière mise à jour** : 2025-11-16 (Ajout section Automatisation Marketing)

---

## ✅ ÉTAPES COMPLÉTÉES

### Configuration initiale
- ✅ **Google Play Console** - Accès complet configuré
- ✅ **Supabase** - Accès complet et testé (quêtes, achievements, stats)
- ✅ **Optimisation SEO Play Store** :
  - Titre optimisé avec "Timalaus" comme mot-clé principal
  - Description courte et longue avec mots-clés SEO
  - Version française (fr-FR) complète
  - Version anglaise (en-US) avec métadonnées
  - Indexation Google en cours (24-48h)

---

## 📊 ACCÈS & OUTILS À CONFIGURER

### Priorité HAUTE 🔴

#### 1. ~~Firebase Analytics~~ (OPTIONNEL - NON CRITIQUE)
**Statut** : 🟢 Non prioritaire
**Raison** : Les données essentielles sont déjà disponibles via Supabase + Play Console

**Alternative recommandée** :
- ✅ **Supabase** - Toutes les données de jeu, scores, utilisateurs, rétention
- ✅ **Play Console** - Downloads, avis, crashes, performance app
- ✅ **Dashboard marketing-dashboard.ts** - Combine Supabase + Play Console

**Note** : Firebase Analytics peut être configuré plus tard si besoin de données supplémentaires, mais n'est pas critique pour le lancement marketing initial.

---

#### 2. Google Play Console - Permissions élargies
**Statut** : ⚠️ À vérifier
**Permissions à activer** :
- ✅ Metadata (déjà ok)
- ⚠️ Statistics & Reports
- ⚠️ User Reviews (pour répondre automatiquement)
- ⚠️ Release Management

---

#### 3. AdMob Analytics
**Statut** : ⚠️ À configurer
**Actions** :
- Service Account avec accès AdMob Reporting API
- Configuration pour analyser performance des pubs et revenus

---

#### 4. Assets visuels Play Store
**Statut** : 🟡 Partiellement fait (FR ok, EN manquant)
**À créer/optimiser** :
- Screenshots professionnels pour version anglaise
- Vidéo promotionnelle (< 30 secondes)
- Feature Graphic optimisé pour EN-US
- A/B testing des visuels

---

#### 5. Automatisation Marketing (Zapier/Make/n8n)
**Statut** : ⚠️ À configurer
**Plateforme recommandée** : Make.com (1000 opérations/mois gratuites)

**Workflows prioritaires** :
1. 🔔 **Alertes avis négatifs** → Notification Discord/Slack + draft réponse auto
2. 📊 **Daily stats report** → Email quotidien avec KPIs (downloads, avis, crashes)
3. 🎉 **Célébration milestones** → Auto-post sur réseaux sociaux (1000, 5000, 10000 downloads)
4. 💬 **Content automation** → Posts quotidiens Twitter/Instagram (question du jour)
5. 🚨 **Crash alerts** → Notification immédiate depuis Firebase Crashlytics
6. 👤 **Nouveau user** → Trigger séquence d'onboarding email
7. 📈 **Anomaly detection** → Alerte si chute downloads/rétention > 20%
8. ⭐ **High score battu** → Post automatique Discord + Twitter avec screenshot
9. 📧 **User inactif 7j** → Email réengagement automatique
10. 📱 **Nouvelle release** → Annonce automatique tous canaux

**Intégrations clés** :
- ✅ Supabase (événements, stats, users)
- ✅ Google Play Console (downloads, avis, crashes)
- ⚠️ Firebase Analytics (événements utilisateurs)
- ⚠️ Discord/Slack (notifications équipe)
- ⚠️ Twitter/Facebook/Instagram (posts auto)
- ⚠️ Gmail/SendGrid (emails marketing)
- ⚠️ Google Sheets (dashboards temps réel)

**Setup recommandé** :
1. Créer compte Make.com (gratuit)
2. Connecter Supabase via Webhooks
3. Connecter Play Console API
4. Setup 3-5 workflows critiques
5. Tester et monitorer

**ROI attendu** :
- ⏱️ Économie : 5-10h/semaine de tâches manuelles
- 📈 Impact : +15-25% rétention (réponses rapides aux avis)
- 🎯 Engagement : +30% reach social media (posts réguliers)

---

#### 6. Google Ads API
**Statut** : ⚠️ À configurer
**But** : Lancer des campagnes Universal App Campaigns (UAC)
**Actions** :
- Créer compte Google Ads si pas encore fait
- Configurer API access
- Budget recommandé : 10-20€/jour pour commencer

---

### Priorité MOYENNE 🟡

#### 7. Google Search Console
**Statut** : ⚠️ À configurer
**But** : Voir comment les gens trouvent votre app sur Google
**Bénéfices** : Optimiser les mots-clés de recherche

---

#### 8. Réseaux sociaux
**Statut** : ✅ Twitter opérationnel | ✅ Discord opérationnel | ❌ Autres à créer
**Plateformes prioritaires** :
- ✅ **Twitter/X (@timalaus)** - OPÉRATIONNEL
  - API configurée, permissions Read & Write actives
  - Premier tweet automatique posté avec succès
  - Scripts: test-twitter.ts, test-twitter-post.ts
  - Prêt pour automation posts quotidiens
- ✅ **Discord (Serveur Timalaus)** - OPÉRATIONNEL
  - Webhook créé et testé avec succès
  - Message de test reçu dans #général
  - Script: test-discord.ts
  - Prêt pour alertes automatiques (avis, milestones, erreurs)
- ❌ Facebook/Instagram (visuels et vidéos courtes) - À créer
- ❌ TikTok (vidéos de gameplay 15-30s) - À créer
- ❌ Reddit (r/AndroidGaming, r/QuizGames, r/French) - À créer

**Actions** :
- ✅ Compte Twitter créé et API configurée
- ✅ Webhook Discord créé et testé
- ❌ Créer autres comptes réseaux sociaux

---

#### 9. Firebase Remote Config
**Statut** : ⚠️ À configurer
**But** : A/B testing de features in-app
**Use cases** :
- Tester différentes difficultés de questions
- Optimiser le timing des récompenses
- Tester différents call-to-action

---

#### 10. Firebase Crashlytics
**Statut** : 🟡 Configuré dans l'app mais pas d'accès API
**But** : Stabilité = rétention
**Action** : Même service account que Firebase Analytics

---

#### 11. Réponse automatique aux avis Play Store
**Statut** : ⚠️ À développer
**But** : Engagement et amélioration du rating
**Fonctionnalités** :
- Réponse automatique aux avis 1-2 étoiles
- Remerciements pour avis 4-5 étoiles
- Alertes pour avis critiques

---

### Priorité BASSE 🟢

#### 12. OpenAI/Claude API
**But** : Génération automatique de contenu
**Use cases** :
- Génération de nouvelles questions de quiz
- Création de posts social media
- Rédaction de descriptions pour mises à jour

---

#### 13. Email Marketing
**Plateformes** : Mailchimp, SendGrid
**But** : Newsletter pour utilisateurs engagés

---

#### 14. Discord/Communauté
**But** : Créer une base de fans engagés
**Features** :
- Bot Discord avec leaderboard
- Événements communautaires
- Beta testing de nouvelles features

---

#### 15. ASO Tools
**Outils** : Sensor Tower, App Annie
**But** : Suivi du ranking et analyse concurrence

---

## 🎯 PLAN D'ACTION PAR PHASES

### 📅 PHASE 1 - Quick Wins (Semaine 1)

**Objectif** : Bases solides pour tracker et optimiser

1. **Dashboard Marketing** (Jour 1) ✅ FAIT
   - [x] Script marketing-dashboard.ts créé
   - [x] Connexion Supabase + Play Console
   - [ ] Tester et valider les métriques
   - [ ] Automatiser via cron ou Make.com

2. **Améliorer visuels Play Store** (Jour 2-3)
   - [ ] Créer screenshots professionnels EN-US
   - [ ] Produire vidéo promo 30 secondes
   - [ ] Upload sur Play Store
   - [ ] A/B test avec anciens visuels

3. **Réponse automatique avis** (Jour 3-4)
   - [ ] Script de monitoring des nouveaux avis
   - [ ] Templates de réponses (positif/négatif/neutre)
   - [ ] Automation avec Play Console API

4. **Automatisation Marketing - Make.com** (Jour 4-5)
   - [ ] Créer compte Make.com
   - [ ] Setup webhook Supabase
   - [ ] Connecter Play Console API
   - [ ] Workflow 1: Alertes avis négatifs → Discord
   - [ ] Workflow 2: Daily stats → Email
   - [ ] Workflow 3: Milestone celebration → Twitter

5. **Système d'alertes** (Jour 5)
   - [ ] Slack/Discord webhook
   - [ ] Alertes : nouveau download, avis négatif, crash
   - [ ] Dashboard temps réel Google Sheets

**KPIs Phase 1** :
- ✅ Dashboard marketing fonctionnel (Supabase + Play Console)
- Temps de réponse aux avis < 24h
- Augmentation rating de 0.1-0.3 étoiles
- 3-5 workflows Make.com actifs
- Économie 5h/semaine de tâches manuelles
- ✅ Optimisation ASO Play Store (FR + EN)

---

### 📅 PHASE 2 - Marketing Organique (Semaines 2-3)

**Objectif** : Acquisition gratuite et viralité

1. **Réseaux sociaux** (Semaine 2)
   - [ ] Créer comptes Twitter, Facebook, Instagram, TikTok
   - [ ] Poster contenu initial (présentation app)
   - [ ] Setup automation posts quotidiens via Make.com
   - [ ] Workflow Make: Question du jour auto-post
   - [ ] Workflow Make: High score celebration auto-post
   - [ ] Engagement communautaire (réponses, retweets)

2. **ASO Optimization** (Semaine 2)
   - [ ] A/B testing titres alternatifs
   - [ ] Test descriptions courtes
   - [ ] Optimisation mots-clés avec données Search Console

3. **Programme de Referral** (Semaine 3)
   - [ ] Développer système de parrainage in-app
   - [ ] Récompenses pour parrains/filleuls
   - [ ] Tracking dans Supabase

4. **Communauté Discord** (Semaine 3)
   - [ ] Créer serveur Discord Timalaus
   - [ ] Bot avec leaderboard temps réel
   - [ ] Événements hebdomadaires

**KPIs Phase 2** :
- 100+ followers sur réseaux sociaux
- Taux de conversion install +15%
- Taux de referral 5-10% des users actifs
- 10+ workflows Make.com actifs
- Engagement automatique 7j/7

---

### 📅 PHASE 3 - Growth Payant (Mois 2)

**Objectif** : Acquisition scalable et croissance exponentielle

1. **Google Ads UAC** (Semaine 5-6)
   - [ ] Setup campagne Universal App Campaign
   - [ ] Budget initial : 10-20€/jour
   - [ ] Targeting : France, quiz lovers, 18-45 ans
   - [ ] Optimisation CPI < 2€

2. **Influenceurs Micro** (Semaine 6-7)
   - [ ] Liste de 20-30 influenceurs quiz/éducation
   - [ ] Reach out avec codes promo exclusifs
   - [ ] Tracking avec UTM parameters

3. **Cross-Promotion** (Semaine 7-8)
   - [ ] Partenariats avec autres apps quiz/trivia
   - [ ] Échange de placements publicitaires
   - [ ] Bundle deals

4. **Retargeting** (Semaine 8)
   - [ ] Campagnes pour users qui ont désinstallé
   - [ ] Offres spéciales win-back
   - [ ] Notifications push intelligentes

**KPIs Phase 3** :
- CPI (Cost Per Install) < 2€
- ROAS (Return On Ad Spend) > 1.5x
- Downloads quotidiens > 50
- Rétention J7 > 25%

---

## 📈 MÉTRIQUES À SUIVRE

### Acquisition
- Downloads quotidiens/hebdomadaires/mensuels
- CPI (Cost Per Install)
- Conversion rate Play Store listing
- Sources d'acquisition (organique vs payant vs referral)

### Engagement
- DAU/MAU (Daily/Monthly Active Users)
- Session duration moyenne
- Sessions par utilisateur
- Taux de complétion des parties

### Rétention
- Rétention J1, J7, J30
- Churn rate
- Temps avant première désinstallation

### Monétisation
- ARPU (Average Revenue Per User)
- Ad revenue par utilisateur
- eCPM AdMob
- Taux de clic sur ads

### Qualité
- Rating Play Store
- Nombre d'avis (objectif: 100+ en 3 mois)
- Crash-free rate > 99.5%
- ANR rate < 0.1%

---

## 🎯 OBJECTIFS PAR JALONS

### Mois 1
- [ ] 1000 downloads
- [ ] Rating 4.0+
- [ ] 50+ avis
- [ ] Rétention J7 > 20%

### Mois 2
- [ ] 5000 downloads cumulés
- [ ] Rating 4.2+
- [ ] 150+ avis
- [ ] Rétention J7 > 25%
- [ ] Communauté Discord 100+ membres

### Mois 3
- [ ] 15000 downloads cumulés
- [ ] Rating 4.4+
- [ ] 500+ avis
- [ ] Top 100 dans catégorie Trivia (France)
- [ ] Breakeven sur coûts d'acquisition

---

## 💡 IDÉES CRÉATIVES

### Viralité
- [ ] Challenge hebdomadaire avec classement
- [ ] Partage de scores sur réseaux sociaux
- [ ] Easter eggs et questions surprises
- [ ] Thématiques événementielles (Noël, coupe du monde, etc.)

### Engagement
- [ ] Streak rewards (connexion quotidienne)
- [ ] Duels entre amis
- [ ] Tournois communautaires
- [ ] Système de saisons/leagues

### Content Marketing
- [ ] Blog "Le saviez-vous ?" (faits intéressants)
- [ ] Newsletter hebdomadaire avec quiz
- [ ] Vidéos YouTube "Top 10 questions les plus ratées"
- [ ] Stories Instagram quotidiennes

---

## 📞 CONTACTS & RESSOURCES

### APIs & Services
- **Play Console** : Service account configuré ✅
- **Supabase** : https://ppxmtnuewcixbbmhnzzc.supabase.co ✅
- **Firebase** : Project ID: kiko-chrono ⚠️
- **AdMob** : App ID: ca-app-pub-7809209690404525~1711130974 ⚠️
- **Make.com** : À créer ⚠️

### Liens utiles
- **Play Store** : https://play.google.com/store/apps/details?id=com.pierretulle.juno2
- **Firebase Console** : https://console.firebase.google.com/project/kiko-chrono
- **Supabase Dashboard** : À ajouter
- **Make.com Dashboard** : À créer

### Workflows Make.com recommandés
**Templates prêts à l'emploi** :
1. Supabase → Discord (alertes événements)
2. Play Console → Email (stats quotidiennes)
3. Supabase → Twitter (high scores)
4. Play Console Reviews → Discord (nouveaux avis)
5. Firebase Crashlytics → Slack (alertes crash)
6. Calendrier → Twitter (question du jour)
7. Supabase inactive users → SendGrid (réengagement)
8. Play Console milestones → Multi-post social (célébrations)
9. Google Sheets → Email (rapport hebdo)
10. Webhook custom → Actions multiples (scenarios complexes)

---

## 📝 NOTES

- **ASO optimisé** : Indexation Google en cours (vérifier dans 24-48h avec recherche "Timalaus")
- **Version actuelle** : 1.5.7 (versionCode: 10112)
- **Package name** : com.pierretulle.juno2
- **Email contact** : quandiappli@proton.me

---

**Prochaine étape prioritaire** :
1. ✅ ~~Créer compte Twitter et configurer API~~ - FAIT (@timalaus opérationnel)
2. ✅ ~~Configurer Discord webhook~~ - FAIT (Serveur Timalaus opérationnel)
3. ✅ ~~Automatisation marketing avec scripts cron~~ - FAIT (Rapport quotidien 9h + Tweet quotidien 10h)
4. **Attendre 24-48h pour vérifier l'indexation Play Store** (rechercher "Timalaus")
5. **Surveiller les métriques** et ajuster la stratégie selon les résultats

## 🤖 Automatisation Active

**Scripts configurés avec cron** :
- ✅ **daily-report.ts** - Rapport quotidien Discord (9h00)
  - Stats Supabase (utilisateurs, parties, scores)
  - Stats Play Console (avis, notes)
  - Envoyé automatiquement chaque matin

- ✅ **daily-tweet.ts** - Tweet automatique (10h00)
  - Question du jour culture générale
  - High score du jour
  - Lien vers Play Store
  - Posté automatiquement chaque jour

**Commandes utiles** :
```bash
# Voir les cron jobs actifs
crontab -l

# Tester manuellement
npx tsx scripts/daily-report.ts
npx tsx scripts/daily-tweet.ts

# Voir les logs
tail -f logs/daily-report.log
tail -f logs/daily-tweet.log
```
