# 🛠️ Reporters Corp - Catalogue des Outils Techniques

> **Zone de Production - Matière Première**
> Ce document liste les outils techniques disponibles pour produire des assets bruts du jeu Timalaus.

**Version** : 2.0.0
**Dernière mise à jour** : 2026-01-13
**🎉 NOUVEAU** : Système de métadonnées temporelles pour synchronisation automatique

---

## 📜 Philosophie des outils Reporters

**IMPORTANT :** Tous les outils de Reporters sont conçus pour produire de la **matière première BRUTE**.

✅ **Ce que font les outils Reporters :**
- Capturer le jeu tel quel
- Découper techniquement avec synchronisation parfaite
- Extraire des données factuelles et contextuelles
- Valider la qualité technique
- **🆕 Générer des métadonnées temporelles automatiques**

❌ **Ce que NE FONT PAS les outils Reporters :**
- Créer du contenu marketing
- Ajouter des overlays, textes, logos
- Faire du storytelling
- Optimiser pour les réseaux sociaux

➡️ La post-production créative est faite par **K-Hive** avec les assets bruts fournis.

---

## 🎬 NOUVEAU : Système de Métadonnées Temporelles

**Version** : 2.0.0

Le système de métadonnées temporelles permet une **synchronisation automatique** entre :
- Les vidéos de gameplay enregistrées
- Les événements historiques joués
- Les choix du joueur (AVANT/APRES)
- Les timecodes précis (centième de seconde)

**Avantages pour K-Hive** :
- ✅ Clips pré-découpés par événement historique
- ✅ Hooks marketing pré-générés
- ✅ Filtrage par thème/période possible
- ✅ Métadonnées complètes (titre, date, description)
- ✅ Storytelling optimisé (réponses correctes vs incorrectes)

**Voir** : [WORKFLOW_AVEC_METADATA.md](WORKFLOW_AVEC_METADATA.md) pour le guide complet

---

## 🎯 WORKFLOW - Orchestrateur (RECOMMANDÉ)

### `workflow_reporter.js` ⭐ NOUVEAU
**Agent** : Orchestrateur automatique
**Fonction** : Gère le workflow complet de production avec barres de progression visuelles

**Usage :**
```bash
node TOOLS/workflow_reporter.js [options]
```

**Options principales :**
- `--count <nombre>` : Nombre de sessions d'enregistrement (défaut: 1)
- `--duration <secondes>` : Durée par session (défaut: 120)
- `--clip <secondes>` : Durée des clips découpés (défaut: 15)
- `--validate <true|false>` : Activer validation QA (défaut: true)
- `--skip-frames` : Ne pas extraire de frames
- `--mode <manual|auto>` : Mode d'enregistrement

**Exemples :**
```bash
# Test rapide (1 session de 2 min)
node TOOLS/workflow_reporter.js

# Production standard (5 sessions de 3 min)
node TOOLS/workflow_reporter.js --count 5 --duration 180

# Production intensive (10 sessions, clips de 20s)
node TOOLS/workflow_reporter.js --count 10 --clip 20

# Aide complète
node TOOLS/workflow_reporter.js --help
```

**Ce que fait l'orchestrateur :**
1. ✅ Enregistre X sessions de gameplay (avec barre de progression)
2. ✅ Découpe automatiquement en clips
3. ✅ Extrait des frames clés
4. ✅ Valide la qualité (QA)
5. ✅ Prépare la livraison dans DATA_OUTBOX/TO_K_HIVE/

**Output :**
- Vidéos brutes → `ASSETS_RAW/`
- Clips découpés → `OUTPUTS/clips/`
- Frames extraites → `OUTPUTS/screenshots/`
- Rapport QA → `OUTPUTS/qa_report_XXX.json`
- Livraison → `DATA_OUTBOX/TO_K_HIVE/DELIVERY_XXX/`

**Temps estimé** : 5-50 min selon configuration

**Voir** : [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md) pour guide complet

---

## 📊 PROGRESS BAR - Module de Progression

### `progress_bar.js` ⭐ NOUVEAU
**Fonction** : Module réutilisable pour afficher des barres de progression

**Classes disponibles :**
- `ProgressBar` : Barre standard avec compteur
- `TimerProgress` : Barre temporelle avec temps restant
- `WorkflowProgress` : Affichage multi-étapes

**Utilisation dans vos scripts :**
```javascript
const { TimerProgress } = require('./progress_bar');

const timer = new TimerProgress(120, 'Enregistrement');
timer.start();
// ... votre code ...
timer.stop();
```

**Affichage exemple :**
```
🎥 Enregistrement [████████████░░░░░░] 60% | Écoulé: 1m 12s | Restant: 48s
```

---

## 🎮 TOM - Simulator (Capture Gameplay)

### `tom_simulator_v2.js` ⭐ NOUVEAU (avec progression)
**Agent** : Tom (Lead Simulator)
**Fonction** : Enregistre des sessions de gameplay avec barre de progression visuelle

**Usage :**
```bash
node TOOLS/tom_simulator_v2.js [durée_secondes] [mode]
```

**Modes disponibles :**
- `manual` (défaut) : Vous jouez, Tom enregistre
- `auto` : Simulation automatique avec Monkey Test (aléatoire)
- `scenario` : Suit un scénario prédéfini (voir SCENARIOS/)

**Exemples :**
```bash
# Enregistrer 2 minutes avec progression
node TOOLS/tom_simulator_v2.js 120 manual

# Enregistrer 5 minutes
node TOOLS/tom_simulator_v2.js 300 manual
```

**Affichage :**
```
🎥 Enregistrement en cours [██████████████░░░░░░] 70% | Écoulé: 1m 24s | Restant: 36s
```

**Output :** `ASSETS_RAW/raw_gameplay_[timestamp].mp4`

---

### `tom_simulator.js` (version classique)
**Agent** : Tom (Lead Simulator)
**Fonction** : Enregistre des sessions de gameplay Timalaus en vidéo MP4 brute (SANS progression)

**Usage :**
```bash
node TOOLS/tom_simulator.js [durée_secondes] [mode]
```

**Exemples :**
```bash
# Enregistrer 30s de gameplay manuel
node TOOLS/tom_simulator.js 30 manual

# Enregistrer 60s de gameplay automatique
node TOOLS/tom_simulator.js 60 auto
```

**Output :** `ASSETS_RAW/raw_gameplay_[timestamp].mp4`

**Prérequis (pour tous les outils Tom) :**
- Téléphone branché en USB
- Débogage USB activé
- Scrcpy installé (`sudo apt install scrcpy`)
- ADB fonctionnel (`adb devices`)

---

### `tom_screenshot.js`
**Agent** : Tom (Lead Simulator)
**Fonction** : Capture des screenshots du jeu en cours

**Usage :**
```bash
node TOOLS/tom_screenshot.js [mode] [params]
```

**Modes :**
- `instant` : Capture après 3s
- `series <count> <interval>` : Série de captures espacées
- `timed <delay>` : Capture après X secondes

**Exemples :**
```bash
# Une capture dans 3s
node TOOLS/tom_screenshot.js instant

# 10 captures espacées de 2s
node TOOLS/tom_screenshot.js series 10 2

# Une capture dans 5s
node TOOLS/tom_screenshot.js timed 5
```

**Output :** `ASSETS_RAW/screenshot_[timestamp].png`

---

## 📱 METADATA - Récupération des Métadonnées

### `fetch_metadata.js` 🆕 **NOUVEAU**
**Fonction** : Récupère les métadonnées temporelles depuis le téléphone via ADB

**Usage :**
```bash
node TOOLS/fetch_metadata.js [option]
```

**Options :**
- `<session_id>` : Récupérer une session spécifique
- `--list` : Lister toutes les sessions disponibles sur le téléphone
- `--latest` : Récupérer la session la plus récente
- `--all` : Récupérer toutes les sessions disponibles

**Exemples :**
```bash
# Lister les sessions disponibles
node TOOLS/fetch_metadata.js --list

# Récupérer la session la plus récente
node TOOLS/fetch_metadata.js --latest

# Récupérer une session spécifique
node TOOLS/fetch_metadata.js session_1768314915411

# Tout récupérer
node TOOLS/fetch_metadata.js --all
```

**Output :**
- `ASSETS_RAW/session_XXX_metadata.json` (métadonnées complètes)
- `ASSETS_RAW/session_XXX_metadata.txt` (version lisible)

**Prérequis :**
- Téléphone branché en USB
- Débogage USB activé
- ADB fonctionnel

**Workflow typique :**
```bash
# 1. Jouer une partie sur le téléphone
# 2. Noter le session_id dans les logs de l'app
# 3. Récupérer les métadonnées
node TOOLS/fetch_metadata.js session_XXX

# 4. Découper la vidéo avec les métadonnées
node TOOLS/derush_clipper_v2.js \
  ../ASSETS_RAW/raw_gameplay_session_XXX.mp4 \
  ../ASSETS_RAW/session_XXX_metadata.json
```

---

## 🎬 DERUSH - Video Editor (Post-Production Technique)

### `derush_clipper_v2.js` 🆕 **RECOMMANDÉ**
**Agent** : Derush (Video Editor)
**Fonction** : Découpage intelligent avec synchronisation automatique événements ↔ vidéo

**Usage :**
```bash
node TOOLS/derush_clipper_v2.js <video.mp4> <metadata.json>
```

**Fonctionnalités :**
- ✅ **Découpage automatique par événement historique**
- ✅ **Synchronisation parfaite avec les timecodes**
- ✅ **Génération de manifest de delivery pour K-Hive**
- ✅ **Hooks marketing pré-générés**
- ✅ **Métadonnées complètes par clip**

**Exemple :**
```bash
# Découpage automatique synchronisé
node TOOLS/derush_clipper_v2.js \
  ../ASSETS_RAW/raw_gameplay_session_XXX.mp4 \
  ../ASSETS_RAW/session_XXX_metadata.json
```

**Output :**
- `OUTPUTS/clips/session_XXX_tour1_Loi_separation.mp4`
- `OUTPUTS/clips/session_XXX_tour2_Occupation_zone.mp4`
- `OUTPUTS/clips/session_XXX_DELIVERY_MANIFEST.json` ← **Pour K-Hive**

**Avantages :**
- Chaque clip = 1 événement historique précis
- K-Hive sait exactement ce qu'il y a dans chaque clip
- Filtrage par thème/période possible
- Hooks marketing automatiques

**Voir** : [WORKFLOW_AVEC_METADATA.md](WORKFLOW_AVEC_METADATA.md)

---

### `derush_clipper.js` (version classique)
**Agent** : Derush (Video Editor)
**Fonction** : Découpe manuelle d'une vidéo brute en segments utilisables

**Usage :**
```bash
node TOOLS/derush_clipper.js <video.mp4> [option]
```

**Options :**
- `--clips "0-10,15-25,30-40"` : Découper aux timestamps précis
- `--duration 15` : Découper en segments de X secondes
- `--auto` : Découpage intelligent (à venir)

**Exemples :**
```bash
# Extraire 3 segments spécifiques
node TOOLS/derush_clipper.js ../ASSETS_RAW/raw_gameplay.mp4 --clips "5-15,20-35,45-60"

# Découper en segments de 15s
node TOOLS/derush_clipper.js ../ASSETS_RAW/raw_gameplay.mp4 --duration 15
```

**Output :** `OUTPUTS/clips/clip_[n]_[timestamps].mp4`

**Note :** Utilisez `derush_clipper_v2.js` si vous avez des métadonnées. Sinon, utilisez cette version classique.

---

### `derush_frames.js`
**Agent** : Derush (Video Editor)
**Fonction** : Extrait des frames (screenshots) depuis une vidéo

**Usage :**
```bash
node TOOLS/derush_frames.js <video.mp4> [option]
```

**Options :**
- `--interval 2` : Une frame toutes les X secondes
- `--timestamps "5,10,15,20"` : Frames aux timestamps précis
- `--count 10` : X frames espacées uniformément

**Exemples :**
```bash
# Une frame toutes les 5s
node TOOLS/derush_frames.js ../ASSETS_RAW/raw_gameplay.mp4 --interval 5

# 10 frames espacées uniformément
node TOOLS/derush_frames.js ../ASSETS_RAW/raw_gameplay.mp4 --count 10

# Frames aux moments clés
node TOOLS/derush_frames.js ../ASSETS_RAW/raw_gameplay.mp4 --timestamps "3,8,15,22,30"
```

**Output :** `OUTPUTS/screenshots/frame_[timestamp]s.png`

---

## 🔍 LUCAS - Validator (Quality Assurance)

### `lucas_validator.js`
**Agent** : Lucas (Chief Reporter)
**Fonction** : Valide la qualité technique d'un asset avant livraison

**Usage :**
```bash
node TOOLS/lucas_validator.js <fichier> [--auto-approve]
```

**Critères de validation :**
- ✅ Taille de fichier acceptable
- ✅ Fichier non corrompu
- ✅ Résolution suffisante (≥720p pour mobile)
- ✅ Frame rate acceptable (≥24fps pour vidéos)
- ✅ Contenu reflète bien le jeu (checklist manuelle)

**Exemples :**
```bash
# Valider une vidéo
node TOOLS/lucas_validator.js ../ASSETS_RAW/raw_gameplay.mp4

# Valider un screenshot
node TOOLS/lucas_validator.js ../OUTPUTS/screenshots/frame_10s.png

# Auto-approuver (skip validation manuelle)
node TOOLS/lucas_validator.js ../ASSETS_RAW/raw_gameplay.mp4 --auto-approve
```

**Score :**
- 75-100 : ✅ Approuvé
- 50-74 : 🟡 Acceptable avec réserves
- 0-49 : ❌ Refusé (refaire)

---

## 📊 DATA EXTRACTION

### `extract_game_data.js`
**Fonction** : Extrait les données techniques visibles dans une capture

**Usage :**
```bash
node TOOLS/extract_game_data.js <screenshot.png> [--output data.json]
```

**Données extraites :**
- Score affiché
- Événements historiques visibles
- Dates
- Statut (victoire/défaite)
- Mode de jeu

**Méthodes :**
- Tesseract OCR (local, gratuit)
- Google Vision API (cloud, à configurer)
- Saisie manuelle (fallback)

**Exemple :**
```bash
node TOOLS/extract_game_data.js ../OUTPUTS/screenshots/victoire.png --output game_stats.json
```

**Output exemple :**
```json
{
  "mode": "Classique",
  "score": 15420,
  "events": [
    { "name": "Van Gogh - La Nuit étoilée", "year": 1889 },
    { "name": "Première greffe cardiaque", "year": 1967 }
  ],
  "result": "victory",
  "timestamp": "2026-01-13T14:30:00Z"
}
```

---

## 🎭 SCENARIOS (Automatisation Gameplay)

### `scenario_winner.js`
**Fonction** : Simule une partie GAGNANTE (6/6 événements réussis)

**Usage :**
```bash
# Lancer Tom simulator AVANT
node TOOLS/tom_simulator.js 120 manual

# Puis dans un autre terminal
node SCENARIOS/scenario_winner.js
```

**Note :** Les coordonnées des boutons doivent être calibrées selon votre écran.

---

### `scenario_loser.js`
**Fonction** : Simule une partie PERDANTE (erreur volontaire)

**Usage :**
```bash
node SCENARIOS/scenario_loser.js [tours_réussis] [type_erreur]
```

**Types d'erreur :**
- `hesitation` : Survole plusieurs boutons avant l'erreur
- `instant` : Erreur rapide sans réflexion
- `wrong-choice` : Erreur après réflexion

**Exemples :**
```bash
# 3 tours corrects + hésitation
node SCENARIOS/scenario_loser.js 3 hesitation

# 5 tours corrects + erreur rapide
node SCENARIOS/scenario_loser.js 5 instant
```

---

## 🔄 WORKFLOW TYPE

### Production d'un livrable complet

```bash
# 1. Tom enregistre une partie (60s)
cd TOOLS/
node tom_simulator.js 60 manual

# 2. Derush découpe en segments de 15s
node derush_clipper.js ../ASSETS_RAW/raw_gameplay_XXX.mp4 --duration 15

# 3. Derush extrait des frames clés
node derush_frames.js ../ASSETS_RAW/raw_gameplay_XXX.mp4 --count 10

# 4. Extraire les stats d'un screenshot
node extract_game_data.js ../OUTPUTS/screenshots/frame_5.png --output stats.json

# 5. Lucas valide chaque asset
node lucas_validator.js ../OUTPUTS/clips/clip_1_0s-15s.mp4
node lucas_validator.js ../OUTPUTS/screenshots/frame_5.png

# 6. Déplacer les assets validés vers DATA_OUTBOX/TO_K_HIVE/
```

---

## 🔧 Prérequis Système

### Obligatoires
- **Node.js** : v14+
- **ADB** : Android Debug Bridge (`adb devices` doit fonctionner)
- **Scrcpy** : Pour l'enregistrement écran (`scrcpy --version`)
- **ffmpeg** : Pour le traitement vidéo (`ffmpeg -version`)
- **ImageMagick** : Pour les images (`identify --version`)

### Optionnels
- **Tesseract OCR** : Pour extraction de texte (`tesseract --version`)
- **Google Cloud SDK** : Pour Google Vision API

### Installation rapide (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install nodejs npm adb scrcpy ffmpeg imagemagick tesseract-ocr
```

### Installation rapide (Mac)
```bash
brew install node android-platform-tools scrcpy ffmpeg imagemagick tesseract
```

---

## 📝 Standards de livraison

### Formats acceptés
- **Vidéos** : MP4 (H.264), minimum 720p, 24fps
- **Images** : PNG ou JPG, minimum 720x1280
- **Données** : JSON formaté

### Structure d'un livrable
```
DELIVERY_XXX/
├── assets/
│   ├── clip_moment_victoire.mp4     # Segment vidéo brut
│   ├── screenshot_score.png         # Screenshot brut
│   └── raw_full_gameplay.mp4        # Vidéo complète (optionnel)
├── data/
│   └── game_stats.json              # Stats extraites
└── METADATA.json                     # Infos techniques
```

---

## 🆘 Troubleshooting

### ADB ne détecte pas le téléphone
```bash
# Vérifier les devices
adb devices

# Redémarrer le serveur ADB
adb kill-server && adb start-server

# Linux : permissions USB
sudo usermod -aG plugdev $USER
```

### Scrcpy ne lance pas
```bash
# Vérifier la version
scrcpy --version

# Test simple
scrcpy --no-audio --max-fps 30
```

### ffmpeg erreur
```bash
# Tester ffmpeg
ffmpeg -version

# Tester un découpage simple
ffmpeg -i video.mp4 -ss 0 -t 10 test.mp4
```

---

**Maintenu par** : Tom (Lead Simulator), Derush (Video Editor), Lucas (Chief Reporter)
**Dernière mise à jour** : 2026-01-13
**Version** : 1.0
