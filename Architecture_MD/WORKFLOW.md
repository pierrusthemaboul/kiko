# WORKFLOW - Production TikTok

Ce document décrit le flux complet de production d'une vidéo TikTok, de l'enregistrement à la publication.

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        REPORTERS                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [1. TOM]                    [2. DERUSH]                       │
│   Enregistrement              Découpage                          │
│   ─────────────               ─────────                          │
│   scrcpy capture       →      Clips par événement               │
│   raw_gameplay.mp4            + DELIVERY_MANIFEST.json          │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         K-HIVE                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [3. MARC]           [4. CHLOE]           [5. LEA]             │
│   Sélection           Production           Validation            │
│   ─────────           ──────────           ──────────            │
│   Analyse manifest →  Format TikTok    →   Gate keeper          │
│   Choix VIP           + Hook texte         Qualité OK?          │
│   selection.json      tiktok_*.mp4                               │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PRET_A_PUBLIER                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   TIKTOK/VIDEOS/                                                 │
│   └── tiktok_jeanne_arc_1429_v1.mp4                             │
│   └── tiktok_reine_victoria_1837_v1.mp4                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Étapes détaillées

### Étape 1: TOM - Enregistrement

**Agent**: `Reporters/AGENTS/TOM/agent.js`

**Action**: Capture le gameplay du téléphone via scrcpy

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/AGENTS/TOM
node agent.js --duration 120
```

**Input**: Téléphone connecté en USB
**Output**: `Reporters/ASSETS_RAW/raw_gameplay_[timestamp].mp4`

**Important**:
- Lancer l'enregistrement AVANT de commencer la partie
- L'app génère automatiquement `session_*_metadata.json`

---

### Étape 2: DERUSH - Découpage

**Agent**: `Reporters/AGENTS/DERUSH/agent.js`

**Action**: Découpe la vidéo brute en clips individuels

```bash
cd /home/pierre/kiko/Architecture_MD/Reporters/AGENTS/DERUSH
node agent.js --video ../ASSETS_RAW/raw_gameplay_XXX.mp4 --metadata ../ASSETS_RAW/session_XXX_metadata.json
```

**Input**:
- Vidéo brute de TOM
- Métadonnées de session

**Output**:
- `Reporters/OUTPUTS/clips/*.mp4` (clips par événement)
- `Reporters/OUTPUTS/clips/VIP_HIGHLIGHTS/*.mp4` (événements notoriété > 90)
- `Reporters/OUTPUTS/clips/*_DELIVERY_MANIFEST.json`

---

### Étape 3: MARC - Sélection

**Agent**: `K-Hive/AGENTS/MARC/agent.js`

**Action**: Analyse le manifest et sélectionne les meilleurs clips

```bash
cd /home/pierre/kiko/Architecture_MD/K-Hive/AGENTS/MARC
node agent.js --manifest ../../Reporters/OUTPUTS/clips/session_XXX_DELIVERY_MANIFEST.json
```

**Input**: DELIVERY_MANIFEST.json de DERUSH
**Output**: `K-Hive/DATA_INBOX/SELECTIONS/selection_[timestamp].json`

**Décisions**:
- Événements VIP (notoriété > 90) prioritaires
- Sinon top 3 par notoriété
- Génère les hooks texte adaptés au jeu ("Avant ou après ?")

---

### Étape 4: CHLOE - Production

**Agent**: `K-Hive/AGENTS/CHLOE/agent.js`

**Action**: Transforme les clips en vidéos TikTok

```bash
cd /home/pierre/kiko/Architecture_MD/K-Hive/AGENTS/CHLOE
node agent.js --selection ../DATA_INBOX/SELECTIONS/selection_XXX.json --clips ../../Reporters/OUTPUTS/clips/
```

**Input**:
- selection.json de MARC
- Clips de DERUSH

**Output**: `K-Hive/DATA_INBOX/A_VALIDER/tiktok_[sujet]_[annee]_v1.mp4`

**Transformations**:
- Format 9:16 (1080x1920)
- Fond flou esthétique
- Logo en haut à gauche
- Hook texte (6 premières secondes)

---

### Étape 5: LEA - Validation

**Agent**: `K-Hive/AGENTS/LEA/agent.js`

**Action**: Valide la qualité et déplace vers PRET_A_PUBLIER

```bash
cd /home/pierre/kiko/Architecture_MD/K-Hive/AGENTS/LEA
node agent.js
```

**Input**: Vidéos dans `K-Hive/DATA_INBOX/A_VALIDER/`
**Output**:
- Si OK: `PRET_A_PUBLIER/TIKTOK/VIDEOS/`
- Si KO: `K-Hive/DATA_INBOX/REJETES/`

**Critères**:
- Durée: 10-60 secondes
- Taille: > 500KB
- Format: MP4 valide

---

## Commande complète (Pipeline)

Pour exécuter tout le pipeline manuellement:

```bash
# 1. Enregistrer (connecter le téléphone d'abord)
cd /home/pierre/kiko/Architecture_MD/Reporters/AGENTS/TOM
node agent.js --duration 120
# → Jouer une partie sur le téléphone

# 2. Découper
cd ../DERUSH
node agent.js --video ../../ASSETS_RAW/raw_gameplay_XXXX.mp4 --metadata ../../ASSETS_RAW/session_XXXX_metadata.json

# 3. Sélectionner
cd ../../../K-Hive/AGENTS/MARC
node agent.js --manifest ../../../Reporters/OUTPUTS/clips/session_XXXX_DELIVERY_MANIFEST.json

# 4. Produire
cd ../CHLOE
node agent.js --selection ../../DATA_INBOX/SELECTIONS/selection_XXXX.json --clips ../../../Reporters/OUTPUTS/clips/

# 5. Valider
cd ../LEA
node agent.js
```

---

## Tests des agents

Chaque agent peut être testé individuellement:

```bash
node agent.js --test
```

Résultat attendu:
- ✅ Config chargée
- ✅ Dépendances trouvées
- ✅ Dossiers accessibles

---

## Logs

Tous les agents loggent leurs décisions dans `K-Hive/LOGS/`:

```
LOGS/
├── tom_1768400000000.json
├── derush_1768400000001.json
├── marc_1768400000002.json
├── chloe_1768400000003.json
└── lea_1768400000004.json
```

Chaque log contient:
- `timestamp`: Quand
- `agent`: Qui
- `action`: Quoi
- `decision`: Résultat
- `reason`: Pourquoi

---

*Document de référence - Architecture MD Timalaus*
