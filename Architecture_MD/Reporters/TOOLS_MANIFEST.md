# 🛠️ Reporters Corp - Catalogue des Outils Techniques

> **Zone de Production - Matière Première**
> Ce document liste les outils techniques disponibles pour produire des assets bruts du jeu Timalaus.

---

## 📜 Philosophie des outils Reporters

**IMPORTANT :** Tous les outils de Reporters sont conçus pour produire de la **matière première BRUTE**.

✅ **Ce que font les outils Reporters :**
- Capturer le jeu tel quel
- Découper techniquement
- Extraire des données factuelles
- Valider la qualité technique

❌ **Ce que NE FONT PAS les outils Reporters :**
- Créer du contenu marketing
- Ajouter des overlays, textes, logos
- Faire du storytelling
- Optimiser pour les réseaux sociaux

➡️ La post-production créative est faite par **K-Hive** avec les assets bruts fournis.

---

## 🎮 TOM - Simulator (Capture Gameplay)

### `tom_simulator.js`
**Agent** : Tom (Lead Simulator)
**Fonction** : Enregistre des sessions de gameplay Timalaus en vidéo MP4 brute

**Usage :**
```bash
node TOOLS/tom_simulator.js [durée_secondes] [mode]
```

**Modes disponibles :**
- `manual` (défaut) : Vous jouez, Tom enregistre
- `auto` : Simulation automatique avec Monkey Test (aléatoire)
- `scenario` : Suit un scénario prédéfini (voir SCENARIOS/)

**Exemples :**
```bash
# Enregistrer 30s de gameplay manuel
node TOOLS/tom_simulator.js 30 manual

# Enregistrer 60s de gameplay automatique
node TOOLS/tom_simulator.js 60 auto
```

**Output :** `ASSETS_RAW/raw_gameplay_[timestamp].mp4`

**Prérequis :**
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

## 🎬 DERUSH - Video Editor (Post-Production Technique)

### `derush_clipper.js`
**Agent** : Derush (Video Editor)
**Fonction** : Découpe une vidéo brute en segments utilisables

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

**Note :** Derush fait du découpage TECHNIQUE uniquement. Pas de transitions, pas de musique, pas de texte.

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
