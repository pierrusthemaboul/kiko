# 📖 README FIRST - Reporters Corporation

**Guide de démarrage rapide pour reproduire le workflow de production**

---

## 🎯 Mission de Reporters

Produire de la **matière première brute** à partir du jeu Timalaus :
- ✅ Vidéos de gameplay réelles
- ✅ Clips découpés exploitables
- ❌ PAS de créativité, PAS de marketing

**La post-production créative = métier de K-Hive**

---

## ⚡ Test rapide (5 minutes)

### Prérequis (installation une seule fois)

```bash
# Installer les dépendances
sudo apt install adb scrcpy ffmpeg vlc -y
```

---

### Workflow complet

#### 1. Brancher le téléphone

```bash
# Vérifier la connexion
adb devices

# Résultat attendu : "device" (pas "unauthorized")
# Si "unauthorized" → Autoriser le débogage USB sur le téléphone
```

---

#### 2. Lancer la production

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/

# Test rapide (2 minutes de jeu)
node workflow_reporter.js --duration 120
```

---

#### 3. Confirmer et jouer

1. Le script affiche un résumé
2. Tapez **O** puis **Entrée**
3. **Prenez votre téléphone et jouez à Timalaus pendant 2 minutes**
4. Après 2 minutes, tout est automatique

---

#### 4. Vérifier les résultats

```bash
# Voir les clips générés
ls -lh ../OUTPUTS/clips/

# Lire un clip
vlc ../OUTPUTS/clips/clip_000.mp4
```

**Résultat attendu** : ~8 clips de 15 secondes

---

## 📊 Productions plus importantes

### Contenu pour 1 semaine (15 minutes)

```bash
node workflow_reporter.js --count 5 --duration 180 --clip 20
```

**Résultat** : ~45 clips de 20s

---

### Contenu pour 1 mois (60 minutes)

```bash
node workflow_reporter.js --count 15 --duration 180 --clip 15
```

**Résultat** : ~135 clips de 15s

---

## 🛠️ Options du workflow

```bash
# Aide complète
node workflow_reporter.js --help

# Options principales
--count <nombre>        # Nombre de sessions (défaut: 1)
--duration <secondes>   # Durée par session (défaut: 120)
--clip <secondes>       # Durée des clips (défaut: 15)
--validate <true|false> # Validation QA (défaut: true)
--skip-frames           # Ne pas extraire de frames
```

---

## 📁 Structure des fichiers générés

```
Reporters/
├── ASSETS_RAW/                    # Vidéos brutes originales
│   └── raw_gameplay_XXX.mp4
├── OUTPUTS/
│   ├── clips/                     # Clips découpés (exploitables)
│   │   ├── clip_000.mp4
│   │   ├── clip_001.mp4
│   │   └── ...
│   └── screenshots/               # Frames extraites
│       └── *.png
└── DATA_OUTBOX/
    └── TO_K_HIVE/                 # Livraison pour K-Hive
        └── DELIVERY_XXX/
```

---

## ✅ Checklist avant de commencer

- [ ] ADB installé (`adb --version`)
- [ ] Scrcpy installé (`scrcpy --version`)
- [ ] ffmpeg installé (`ffmpeg -version`)
- [ ] Téléphone chargé (>50%)
- [ ] Jeu Timalaus installé sur le téléphone
- [ ] Débogage USB activé sur le téléphone

**Vérification rapide** :
```bash
adb --version && scrcpy --version && ffmpeg -version && echo "✅ Tout est prêt"
```

---

## 🔧 Problèmes courants

### Erreur : "unauthorized"

**Solution** : Sur le téléphone, autoriser le débogage USB (popup qui s'affiche)

---

### Erreur : "no devices found"

**Solution** :
```bash
# Débrancher/rebrancher le téléphone
# Vérifier que le débogage USB est activé
adb devices
```

---

### Erreur : "ffmpeg not found"

**Solution** :
```bash
sudo apt install ffmpeg -y
```

---

### Erreur : "scrcpy not found"

**Solution** :
```bash
sudo apt install scrcpy -y
```

---

## 📚 Documentation complète

| Fichier | Description |
|---------|-------------|
| [README_FIRST.md](README_FIRST.md) | **Ce fichier** - Guide rapide |
| [QUICKSTART_WORKFLOW.md](QUICKSTART_WORKFLOW.md) | Guide détaillé avec tous les exemples |
| [TOOLS_MANIFEST.md](TOOLS_MANIFEST.md) | Catalogue complet des outils |
| [REPONSE_TEST_TELEPHONE.md](REPONSE_TEST_TELEPHONE.md) | FAQ détaillée |
| [MANIFEST.md](MANIFEST.md) | Identité de l'entreprise Reporters |

---

## 🎯 Workflow recommandé quotidien

### Lundi : Production (30 minutes)

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/

# Produire contenu pour la semaine
node workflow_reporter.js --count 8 --duration 180 --clip 20
```

**Résultat** : ~72 clips de 20s

---

### Mardi-Dimanche : K-Hive

K-Hive récupère les clips et ajoute :
- Overlay texte
- Logo Timalaus
- CTA
- Publication progressive (10 clips/jour)

---

## 🚀 Commande rapide à retenir

**Pour reproduire le test en une seule commande** :

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/ && node workflow_reporter.js --duration 120
```

---

## 💡 Différence avec l'API (sans téléphone)

### Avec téléphone (ce guide)
- ✅ Vraies vidéos MP4
- ✅ Visuels authentiques du jeu
- ❌ Nécessite de jouer manuellement

### Avec API (voir API_SETUP_COMPLETE.md)
- ✅ Génération instantanée
- ✅ Données JSON parfaites
- ❌ Pas de vidéos MP4 réelles

**Recommandation** : Utiliser les deux selon le besoin

---

## 🎉 Vous êtes prêt !

**Commande pour démarrer** :

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/TOOLS/
node workflow_reporter.js
```

**Temps total** : 5 minutes
**Résultat** : 8 clips exploitables

---

**Support** : Voir documentation complète dans les fichiers MD ci-dessus

**Version** : 1.0.0
**Date** : 2026-01-13
