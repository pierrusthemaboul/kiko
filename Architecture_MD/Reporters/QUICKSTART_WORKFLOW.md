# 🚀 Quick Start - Workflow Reporters avec Progression Visuelle

Guide pour tester le workflow complet de production avec indicateurs de progression.

---

## ⚡ Installation (une seule fois)

### 1. Vérifier les dépendances

```bash
# ADB et Scrcpy doivent être installés
adb --version
scrcpy --version

# ffmpeg pour découpage
ffmpeg -version
```

Si manquants :
```bash
# Ubuntu/Debian
sudo apt install adb scrcpy ffmpeg

# Mac
brew install android-platform-tools scrcpy ffmpeg
```

### 2. Connecter le téléphone

```bash
# Brancher le téléphone en USB
# Activer "Débogage USB" dans les options développeur

# Vérifier la connexion
adb devices
# Devrait afficher votre appareil
```

---

## 🎬 Option 1 : Workflow Orchestré Complet (RECOMMANDÉ)

Utilisez le script `workflow_reporter.js` qui gère tout automatiquement avec barres de progression.

### Utilisation basique (1 session de 2 minutes)

```bash
cd Architecture_MD/Reporters/TOOLS/
node workflow_reporter.js
```

**Ce qui se passe** :
1. Affiche le plan complet du workflow
2. Demande confirmation
3. Enregistre 2 minutes de gameplay avec barre de progression
4. Découpe automatiquement en clips de 15s
5. Extrait 3 frames par clip
6. Validation QA automatique
7. Prépare la livraison dans DATA_OUTBOX/TO_K_HIVE/

**Durée totale** : ~5 minutes

---

### Utilisation avancée (production complète)

```bash
# 5 sessions de 3 minutes avec clips de 20s
node workflow_reporter.js --count 5 --duration 180 --clip 20
```

**Ce qui se passe** :
1. 5 enregistrements de 3 minutes (15 min total)
2. Découpage de toutes les vidéos en clips de 20s
3. Extraction frames de tous les clips
4. Validation QA complète
5. Livraison prête

**Durée totale** : ~20-25 minutes

**Output** :
- 5 vidéos brutes (15 minutes total)
- ~45 clips de 20s
- ~135 screenshots (3 par clip)
- Rapport QA
- Manifest de livraison

---

### Options disponibles

```bash
# Aide complète
node workflow_reporter.js --help

# Options principales
--count <nombre>        # Nombre de sessions (défaut: 1)
--duration <secondes>   # Durée par session (défaut: 120)
--clip <secondes>       # Durée des clips (défaut: 15)
--validate <true|false> # Activer validation QA (défaut: true)
--skip-frames           # Ne pas extraire de frames
--mode <manual|auto>    # Mode enregistrement (défaut: manual)
```

### Exemples pratiques

```bash
# Test rapide (1 minute, clips courts)
node workflow_reporter.js --duration 60 --clip 10

# Production intensive (10 sessions de 2 min)
node workflow_reporter.js --count 10

# Sans validation (plus rapide)
node workflow_reporter.js --validate false --skip-frames
```

---

## 🎯 Option 2 : Outils Individuels (contrôle manuel)

Si vous préférez contrôler chaque étape manuellement.

### Étape 1 : Enregistrement (Tom v2 avec progression)

```bash
# Enregistrer 2 minutes
node tom_simulator_v2.js 120

# Enregistrer 5 minutes
node tom_simulator_v2.js 300
```

**Affichage** :
```
🎮 TOM (SIMULATOR) : "Démarrage de la simulation gameplay"
   📂 Fichier : raw_gameplay_1736789123456.mp4
   ⏱️  Durée : 120s

🎥 Enregistrement en cours [████████████████░░░░░░░░] 60% | Écoulé: 1m 12s | Restant: 48s
```

### Étape 2 : Découpage (Derush)

```bash
# Découper en clips de 15s
node derush_clipper.js --duration 15 --input ../ASSETS_RAW/raw_gameplay_*.mp4

# Découper en clips de 30s
node derush_clipper.js --duration 30 --input ../ASSETS_RAW/raw_gameplay_*.mp4
```

### Étape 3 : Extraction frames (Derush)

```bash
# Extraire 1 frame par seconde
node derush_frames.js --interval 1 --input ../ASSETS_RAW/raw_gameplay_*.mp4

# Extraire frames clés (début/milieu/fin)
node derush_frames.js --keyframes --input ../OUTPUTS/clips/*.mp4
```

### Étape 4 : Validation (Lucas)

```bash
# Valider tous les clips
node lucas_validator.js ../OUTPUTS/clips/*.mp4
```

---

## 📊 Indicateurs de Progression

### Ce que vous verrez

**Pendant l'enregistrement** :
```
🎥 Enregistrement en cours [██████████████████░░░░░░] 75% | Écoulé: 1m 30s | Restant: 30s
```

**Workflow global** :
```
📋 WORKFLOW REPORTERS

✅ Étape 1/5: Enregistrement gameplay (~120s)
⏳ Étape 2/5: Découpage vidéo (~10s)
⏸️  Étape 3/5: Extraction frames (~15s)
⏸️  Étape 4/5: Validation QA (~5s)
⏸️  Étape 5/5: Préparation livraison (~2s)
```

**Progression en temps réel** :
- Pourcentage d'avancement (0-100%)
- Temps écoulé
- Temps restant estimé
- Étape actuelle

---

## 📦 Structure des Outputs

Après exécution, vous aurez :

```
Reporters/
├── ASSETS_RAW/                    # Vidéos brutes
│   ├── raw_gameplay_XXX_session1.mp4
│   ├── raw_gameplay_XXX_session2.mp4
│   └── ...
├── OUTPUTS/
│   ├── clips/                     # Clips découpés
│   │   ├── clip_XXX_1.mp4
│   │   ├── clip_XXX_2.mp4
│   │   └── ...
│   ├── screenshots/               # Frames extraites
│   │   ├── clip_XXX_1_start.png
│   │   ├── clip_XXX_1_mid.png
│   │   ├── clip_XXX_1_end.png
│   │   └── ...
│   └── qa_report_XXX.json        # Rapport validation
└── DATA_OUTBOX/
    └── TO_K_HIVE/
        └── DELIVERY_XXX/          # Livraison prête
            └── MANIFEST.json
```

---

## ✅ Workflow Recommandé pour Test Initial

### Test rapide (5 minutes)

```bash
cd Architecture_MD/Reporters/TOOLS/

# 1 session de 2 minutes
node workflow_reporter.js --duration 120
```

**Résultat attendu** :
- ✅ 1 vidéo brute de 2 minutes
- ✅ ~8 clips de 15s
- ✅ ~24 screenshots
- ✅ Rapport QA
- ✅ Livraison dans DATA_OUTBOX/TO_K_HIVE/

**Contenu publiable ?**
- ✅ OUI techniquement (clips bruts exploitables)
- ❌ K-Hive doit ajouter : texte, logo, overlay, CTA

---

### Production réaliste (30 minutes)

```bash
# 10 sessions de 2 minutes avec clips de 20s
node workflow_reporter.js --count 10 --duration 120 --clip 20
```

**Résultat attendu** :
- ✅ 10 vidéos brutes (20 minutes total)
- ✅ ~60 clips de 20s
- ✅ ~180 screenshots
- ✅ Matière première pour 1-2 semaines de posts

---

## 🔧 Troubleshooting

### Erreur : "Cannot find module './progress_bar'"

```bash
# Vérifier que progress_bar.js existe
ls Architecture_MD/Reporters/TOOLS/progress_bar.js

# Si absent, le fichier a été créé - relancer
```

### Erreur : "scrcpy: command not found"

```bash
# Installer scrcpy
sudo apt install scrcpy  # Ubuntu/Debian
brew install scrcpy      # Mac
```

### Erreur : "no devices/emulators found"

```bash
# Vérifier connexion USB
adb devices

# Débrancher/rebrancher le téléphone
# Autoriser le débogage USB sur le téléphone
```

### Erreur : "ffmpeg not found"

```bash
# Installer ffmpeg
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # Mac
```

---

## 💡 Conseils de Production

### Pour du contenu Instagram/TikTok

```bash
# Clips courts (15s) avec beaucoup de sessions
node workflow_reporter.js --count 10 --duration 120 --clip 15
```

**Résultat** : ~80 clips de 15s → contenu pour 2-3 semaines

---

### Pour du contenu YouTube Shorts

```bash
# Clips moyens (30s)
node workflow_reporter.js --count 5 --duration 180 --clip 30
```

**Résultat** : ~30 clips de 30s → contenu pour 1 mois

---

### Pour analyse et montage avancé

```bash
# Longues vidéos avec extraction intensive de frames
node workflow_reporter.js --count 3 --duration 300 --clip 60
```

**Résultat** : 15 minutes de matière + frames pour montage

---

## 📊 Temps Estimés

| Configuration | Enregistrement | Processing | Total | Output |
|--------------|----------------|------------|-------|--------|
| Test rapide | 2 min | 3 min | 5 min | 8 clips |
| Standard | 10 min | 10 min | 20 min | 40 clips |
| Production | 20 min | 15 min | 35 min | 80 clips |
| Intensive | 30 min | 20 min | 50 min | 120 clips |

---

## 🎯 Prochaines Étapes (après production)

Une fois la production terminée :

1. **Vérifier la livraison** :
   ```bash
   ls -lh DATA_OUTBOX/TO_K_HIVE/DELIVERY_*/
   ```

2. **Transférer à K-Hive** (ou autre workflow)

3. **K-Hive ajoute la créativité** :
   - Overlay texte accrocheur
   - Logo Timalaus
   - CTA ("Télécharge maintenant")
   - Musique/transitions

4. **Publication sur réseaux sociaux**

---

## 🎉 Vous êtes prêt !

Le workflow est maintenant configuré avec :
- ✅ Barres de progression visuelles
- ✅ Temps restant estimé
- ✅ Pourcentages d'avancement
- ✅ Indicateurs d'étapes

**Lancez votre premier test** :
```bash
cd Architecture_MD/Reporters/TOOLS/
node workflow_reporter.js
```

---

**Support** : Voir [TOOLS_MANIFEST.md](TOOLS_MANIFEST.md) pour liste complète des outils
