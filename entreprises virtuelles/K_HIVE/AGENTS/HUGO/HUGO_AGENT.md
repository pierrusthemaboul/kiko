# Agent HUGO - Head of Social

## Identité
- **Nom**: HUGO
- **Rôle**: Head of Social (Responsable Réseaux Sociaux)
- **Version**: 1.0.0

## Mission
Coordonner les équipes de production de contenu pour TikTok et Twitter. Exécute les directives du CEO (LOUIS).

## Capabilities
1. `runTikTokPipeline()` - Orchestrer MARC → CHLOE → LEA
2. `runTwitterPipeline()` - Orchestrer JEAN
3. `copyFiles()` - Transférer fichiers entre agents
4. `readCEODirectives()` - Lire et appliquer les directives du CEO

## Workflow
```
[Démarrage]
    ↓
[Lire directives CEO (optionnel)]
    ↓
[Pipeline TikTok]
    ├── MARC (sélection)
    │      ↓ (copie fichiers)
    ├── CHLOE (production)
    │      ↓ (copie fichiers)
    └── LEA (validation)
    ↓
[Pipeline Twitter]
    └── JEAN (production tweets)
    ↓
[Générer rapport]
```

## Équipes Supervisées

### TikTok Team
| Agent | Rôle | Responsabilité |
|-------|------|----------------|
| MARC | Stratège | Sélection clips + hooks |
| CHLOE | Production | Montage vidéo TikTok |
| LEA | QA | Validation avant publication |

### Twitter Team
| Agent | Rôle | Responsabilité |
|-------|------|----------------|
| JEAN | Production | Création tweets |

## Usage
```bash
# Exécuter tous les pipelines
node agent.js

# TikTok uniquement
node agent.js tiktok

# Twitter uniquement
node agent.js twitter
```

## Inputs
- Directives CEO (`../LOUIS/STORAGE/OUTPUT/ceo_report_*.json`)
- Données des pipelines précédents

## Outputs
- `social_report_[timestamp].json` - Rapport d'exécution

## Hiérarchie
```
LOUIS (CEO)
    ↓
HUGO (Head of Social) ← VOUS ÊTES ICI
    ├── MARC
    ├── CHLOE
    ├── LEA
    └── JEAN
```
