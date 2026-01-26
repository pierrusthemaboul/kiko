# 🤖 Configuration Claude Code pour Kiko

Ce dossier contient la configuration pour que Claude Code ait toujours accès au contexte du projet et à Supabase.

## 📁 Structure

```
.claudecode/
├── README.md       # Ce fichier
└── context.md      # Contexte automatiquement chargé dans chaque conversation
```

## 🔌 Accès Supabase

Claude Code a maintenant un accès permanent à Supabase via le helper :

### Utilisation rapide

Dans n'importe quelle nouvelle conversation, vous pouvez simplement dire :
- "Montre-moi les quêtes actuelles"
- "Affiche les statistiques Supabase"
- "Combien d'utilisateurs dans la base ?"

Et Claude utilisera automatiquement :
```bash
node scripts/supabase-helper.mjs
```

### Utilisation avancée

Demandez à Claude de créer un script qui importe le helper :

```javascript
import { supabase, viewQuests, viewAchievements } from './scripts/supabase-helper.mjs';

// Accès direct
const { data, error } = await supabase.from('profiles').select('*');

// Ou fonctions prédéfinies
await viewQuests();
await viewAchievements();
```

## 📚 Contexte disponible

Le fichier `context.md` contient :
- 🔌 Accès Supabase et fonctions utiles
- 📊 Description du système de progression
- 🎮 Modes de jeu
- 📝 Historique du rééquilibrage
- 🔧 Variables d'environnement
- 🚀 Commandes rapides

Ce contexte est **automatiquement chargé** dans chaque nouvelle conversation.

## 🛠️ Scripts disponibles

Claude Code a accès à ces scripts :

### Gestion Supabase
- `scripts/supabase-helper.mjs` - Helper principal (accès permanent)
- `scripts/view-quests.mjs` - Vue détaillée quêtes/achievements
- `scripts/sync-achievements.mjs` - Synchroniser achievements
- `scripts/sync-quests.mjs` - Synchroniser quêtes
- `scripts/rapport-reequilibrage.mjs` - Rapport comparatif

### Commandes rapides

```bash
# Vue d'ensemble Supabase
node scripts/supabase-helper.mjs

# Rapport détaillé
node scripts/view-quests.mjs

# Rapport de rééquilibrage
node scripts/rapport-reequilibrage.mjs
```

## 🎯 Exemples d'usage

### Dans une nouvelle conversation

**Vous** : "Combien de quêtes quotidiennes on a ?"

**Claude** : *Exécute automatiquement `node scripts/supabase-helper.mjs`*
"Vous avez 9 quêtes quotidiennes réparties en 5 types..."

---

**Vous** : "Ajoute une nouvelle quête qui récompense 300 XP"

**Claude** : *Crée un script qui importe le helper et insère la quête*

---

**Vous** : "Liste les 10 meilleurs joueurs"

**Claude** :
```javascript
import { getTopPlayers } from './scripts/supabase-helper.mjs';
const top = await getTopPlayers(10);
console.log(top);
```

## 🔄 Mise à jour du contexte

Pour modifier le contexte chargé automatiquement, éditez :
```
.claudecode/context.md
```

Le nouveau contexte sera disponible dans la **prochaine conversation**.

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Ouvrez une **nouvelle conversation** Claude Code
2. Demandez : "Affiche les statistiques Supabase"
3. Claude devrait exécuter `node scripts/supabase-helper.mjs` automatiquement

Si ça ne fonctionne pas, vérifiez que :
- Le fichier `.claudecode/context.md` existe
- Les variables d'environnement sont configurées dans `.env`
- Le dossier `scripts/` contient `supabase-helper.mjs`

---

*Configuration créée le 2025-10-04*
