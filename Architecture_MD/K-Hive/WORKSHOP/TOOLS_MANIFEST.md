# 🛠️ Atelier de Production - Catalogue des Outils

> **Zone Technique K-Hive**
> Ce document liste les capacités techniques (`Capabilities`) disponibles pour les agents.
> Chaque outil doit être invoqué via une commande spécifique ou un script wrapper.

## 👥 L'Équipe Technique (Bots)

### 🎥 Lucas (Le Cadreur) - `lucas.js`
*   **Fonction** : Enregistre 30s de gameplay simulé (Monkey Test) via ADB/Scrcpy.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/lucas.js`
*   **Utilisateur** : Hugo (Social), Serge (Test technique).

### 🎬 Mia (La Monteuse) - `mia.js`
*   **Fonction** : Ajoute le logo Timalaus en filigrane sur une vidéo MP4. (Bientôt : Musique et Cuts).
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/mia.js "chemin/video.mp4"`
*   **Utilisateur** : Léa (Montage).

### 🎨 Enzo (L'Assistant Graphiste) - `enzo.js`
*   **Fonction** : Formate une image en 9:16 pour TikTok + Ajoute Logo.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/enzo.js "chemin/image.jpg"`
*   **Utilisateur** : Léa (Créa).

### 💬 Chloé (CM Junior) - `chloe.js`
*   **Fonction** : Génère une réponse type selon les mots-clés de l'avis.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/chloe.js "Texte avis" [Etoiles]`
*   **Utilisateur** : Tom (Support), Hugo (Social).

## 📊 Centre de Données (Géré par Jade)

### 1. Connecteur Live Supabase (`get_kpi_stats.js`)
*   **Fonction** : Génère un rapport Markdown quotidien (Joueurs, Parties).
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/get_kpi_stats.js`
*   **Output** : `Architecture_MD/K-Hive/DATA_INBOX/DAILY_REPORT.md`

### 2. Catalogue du Jeu (`get_game_events.js`)
*   **Fonction** : Cherche des événements réels dans la BDD Supabase.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/get_game_events.js --search "MotClé"`
*   **Utilisateur** : Marc (Stratégie), Léa (Créa).

### 3. L'Œil de Léa (QA) - `critic.js`
*   **Fonction** : Analyse une IMAGE ou VIDÉO via Gemini et donne une note /10.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/critic.js "chemin/fichier"`
*   **Utilisateur** : Léa (Validation).

### 4. Rapports Automatisés - `automated_reporting.js`
*   **Fonction** : Génère un PDF (simulé) pour Louis chaque matin.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/automated_reporting.js`
*   **Utilisateur** : Paul (PM) / Louis.

### 5. Analyseur de Tendances - `trend_analyzer.js`
*   **Fonction** : Scrape Google Trends pour des mots-clés.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/trend_analyzer.js "MotClé"`
*   **Utilisateur** : Vigie (Assistant Marc).

### 6. Système d'Alerte - `alert_system.js`
*   **Fonction** : Envoie des notifs Slack/Firebase si crash.
*   **Commande** : `node Architecture_MD/K-Hive/WORKSHOP/SCRIPTS/alert_system.js --level CRITICAL`
*   **Utilisateur** : Igor (Data Eng).

---
*Note : Pour demander l'ajout d'un nouvel outil, contactez Serge (CTO).*
