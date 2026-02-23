# RÈGLES FONDAMENTALES - Architecture MD

**Ce document est la référence obligatoire pour toute IA qui crée ou modifie des agents dans une architecture MD.**

---

## RÈGLE #1 : Un agent DOIT être exécutable

Un agent n'est PAS une description. Un agent est un système qui **exécute** des actions.

### Structure obligatoire d'un agent

```
AGENT_NAME/
├── AGENT_NAME.md          # Description du rôle (pour les humains)
├── agent.js               # Script exécutable (l'agent réel)
├── config.json            # Configuration de l'agent
└── triggers.json          # Déclencheurs (quand l'agent s'active)
```

### Ce qui est INTERDIT

```markdown
❌ "Je suis Chloé, je vais lancer le script..."
❌ "L'agent Marc analyse les données et décide..."
❌ "Léa valide la qualité en vérifiant..."
```

Ces phrases sont du **théâtre**. L'IA simule un comportement sans rien exécuter.

### Ce qui est OBLIGATOIRE

```javascript
// agent.js - L'agent FAIT quelque chose
const result = execSync('node mia.js clip.mp4 --text "Hook"');
```

---

## RÈGLE #2 : Chaque agent a 4 composants

### 1. Description (AGENT.md)
- Qui est l'agent (nom, rôle)
- Quelles décisions il prend
- Avec qui il interagit
- **Référence au script exécutable**

### 2. Script exécutable (agent.js ou agent.py)
- Code qui fait le travail réel
- Entrées clairement définies
- Sorties clairement définies
- Logs de chaque décision prise

### 3. Configuration (config.json)
```json
{
  "agent_name": "CHLOE",
  "version": "1.0.0",
  "inputs": ["clip.mp4", "metadata.json"],
  "outputs": ["tiktok_video.mp4"],
  "dependencies": ["mia.js", "ffmpeg"],
  "thresholds": {
    "min_duration": 15,
    "max_duration": 60
  }
}
```

### 4. Déclencheurs (triggers.json)
```json
{
  "triggers": [
    {
      "type": "file_created",
      "path": "DATA_INBOX/FROM_REPORTERS/*.mp4",
      "action": "run"
    },
    {
      "type": "manual",
      "command": "node agent.js --input clip.mp4"
    },
    {
      "type": "scheduled",
      "cron": "0 9 * * *"
    }
  ]
}
```

---

## RÈGLE #3 : Traçabilité obligatoire

Chaque agent DOIT logger ses décisions dans un fichier JSON :

```json
{
  "timestamp": "2026-01-14T15:30:00Z",
  "agent": "CHLOE",
  "action": "CREATE_TIKTOK_VIDEO",
  "inputs": {
    "clip": "jeanne_arc.mp4",
    "duration": 23.5
  },
  "decision": "ACCEPTED",
  "reason": "Duration within bounds, VIP event detected",
  "outputs": {
    "file": "tiktok_jeanne_arc_1429.mp4"
  }
}
```

**Pourquoi ?** Pour comprendre ce que l'agent a fait et pourquoi.

---

## RÈGLE #4 : Nommage des fichiers produits

Les fichiers générés DOIVENT être lisibles par un humain.

### INTERDIT
```
trivia_1768400102934.mp4
session_1768386527201_1442_tour4_Victoire_de_Jeanne_d_Arc_au_si_ge_d_Orl_.mp4
```

### OBLIGATOIRE
```
tiktok_jeanne_arc_1429_v1.mp4
tiktok_reine_victoria_1837_v1.mp4
clip_raw_bataille_orleans.mp4
```

Format recommandé : `{type}_{sujet}_{date_ou_contexte}_{version}.{ext}`

---

## RÈGLE #5 : Validation avant publication

Aucun fichier ne sort du système sans validation :

```
1. Agent producteur crée le fichier
2. Agent validateur vérifie (critic.js ou équivalent)
3. Si OK → déplace vers PRET_A_PUBLIER/
4. Si KO → log l'erreur + raison du rejet
```

Le dossier `PRET_A_PUBLIER/` ne contient QUE des fichiers validés.

---

## RÈGLE #6 : Structure de dossiers standard

```
Architecture_MD/
├── AGENTS/                    # Tous les agents
│   ├── AGENT_NAME/
│   │   ├── AGENT_NAME.md
│   │   ├── agent.js
│   │   ├── config.json
│   │   └── triggers.json
│   └── ...
├── DATA_INBOX/                # Données entrantes
├── DATA_OUTBOX/               # Données sortantes
├── LOGS/                      # Logs de tous les agents
├── PRET_A_PUBLIER/            # Fichiers validés
│   └── {PLATFORM}/            # Par plateforme (TIKTOK, YOUTUBE, etc.)
│       └── VIDEOS/
├── SHARED/                    # Ressources partagées
│   ├── CONTRACTS/             # SLA, règles métier
│   └── KNOWLEDGE/             # Base de connaissances
└── WORKSHOP/                  # Scripts utilitaires
    └── SCRIPTS/
```

---

## RÈGLE #7 : Commande de test obligatoire

Chaque agent DOIT pouvoir être testé en isolation :

```bash
# Test de l'agent avec des données de test
node AGENTS/CHLOE/agent.js --test

# Résultat attendu :
# ✅ Config loaded
# ✅ Dependencies found (mia.js, ffmpeg)
# ✅ Test input processed
# ✅ Output generated: test_output.mp4
# ✅ Logs written to LOGS/
```

---

## RÈGLE #8 : Documentation du flux

Chaque architecture DOIT avoir un fichier `WORKFLOW.md` qui montre :

```markdown
## Flux de production

1. [TRIGGER] Nouveau fichier dans DATA_INBOX/
   ↓
2. [AGENT: MARC] Analyse et sélection
   - Input: metadata.json
   - Output: selection.json (clips choisis)
   ↓
3. [AGENT: CHLOE] Production TikTok
   - Input: clip.mp4 + selection.json
   - Output: tiktok_*.mp4
   ↓
4. [AGENT: LEA] Validation qualité
   - Input: tiktok_*.mp4
   - Output: ACCEPTED/REJECTED + reason
   ↓
5. [DESTINATION] PRET_A_PUBLIER/TIKTOK/VIDEOS/
```

---

## TEMPLATE : Créer un nouvel agent

Quand une IA crée un agent, elle DOIT générer ces 4 fichiers :

### 1. AGENT_NAME.md
```markdown
# Agent: {NOM}

## Rôle
{Description en 2-3 phrases}

## Responsabilités
- {Responsabilité 1}
- {Responsabilité 2}

## Script exécutable
`agent.js` - {Description de ce que fait le script}

## Inputs
- {Input 1}: {Description}
- {Input 2}: {Description}

## Outputs
- {Output 1}: {Description}

## Décisions prises
| Situation | Décision | Critère |
|-----------|----------|---------|
| {Cas 1} | {Action} | {Règle} |

## Commandes
```bash
# Exécution normale
node agent.js --input fichier.mp4

# Mode test
node agent.js --test
```
```

### 2. agent.js
```javascript
#!/usr/bin/env node
/**
 * Agent: {NOM}
 * Rôle: {Description courte}
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Charger la config
const config = require('./config.json');

// Logger une décision
function logDecision(action, inputs, decision, reason, outputs = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: config.agent_name,
        action,
        inputs,
        decision,
        reason,
        outputs
    };

    const logDir = path.join(__dirname, '../../LOGS');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(logDir, `${config.agent_name.toLowerCase()}_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    console.log(`[${config.agent_name}] ${action}: ${decision} - ${reason}`);
    return entry;
}

// Main
async function main() {
    // TODO: Implémenter la logique de l'agent

    logDecision(
        'PROCESS',
        { /* inputs */ },
        'SUCCESS',
        'Raison du succès',
        { /* outputs */ }
    );
}

main().catch(console.error);
```

### 3. config.json
```json
{
  "agent_name": "{NOM}",
  "version": "1.0.0",
  "description": "{Description}",
  "inputs": [],
  "outputs": [],
  "dependencies": [],
  "thresholds": {}
}
```

### 4. triggers.json
```json
{
  "triggers": [
    {
      "type": "manual",
      "command": "node agent.js"
    }
  ]
}
```

---

## CHECKLIST avant de valider un agent

- [ ] Le script `agent.js` existe et est exécutable
- [ ] `node agent.js --test` fonctionne sans erreur
- [ ] Les logs sont écrits dans `LOGS/`
- [ ] Les fichiers produits ont des noms lisibles
- [ ] La documentation décrit les inputs/outputs
- [ ] Les déclencheurs sont définis

---

**Ce document est la LOI. Aucun agent ne doit être créé sans respecter ces règles.**
