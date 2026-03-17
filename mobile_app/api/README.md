# 🎮 Timalaus Game API - Documentation

API interne pour simuler des parties de Timalaus sans interface utilisateur.

**Version** : 1.0.0
**Date** : 2026-01-13
**Utilisation** : Reporters Corp (production de matière première)

---

## 📋 Table des matières

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage rapide](#usage-rapide)
- [API Reference](#api-reference)
- [Exemples](#exemples)
- [Intégration Reporters](#intégration-reporters)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Installation

### Prérequis

- Node.js v14+
- Accès à Supabase (variables d'environnement configurées)

### Installation des dépendances

```bash
cd /home/pierre/kiko
npm install @supabase/supabase-js
```

### Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
```

**Important** : Ces variables doivent correspondre à celles utilisées dans votre app React Native.

---

## ⚙️ Configuration

L'API utilise la même base de données Supabase que votre jeu React Native.

### Structure de table attendue

```sql
-- Table: evenements
CREATE TABLE evenements (
  id UUID PRIMARY KEY,
  nom TEXT NOT NULL,
  date INTEGER NOT NULL,  -- Année (ex: 1889)
  description TEXT,
  categorie TEXT,
  -- Optionnel : pour filtrage thématique
  tags TEXT[]
);
```

### Ajouter des tags (optionnel mais recommandé)

```sql
-- Ajouter une colonne tags si elle n'existe pas
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Exemple : taguer des événements Napoléon
UPDATE evenements
SET tags = ARRAY['napoleon', 'france', 'guerre', '1800s']
WHERE nom ILIKE '%Napoléon%' OR nom ILIKE '%Austerlitz%' OR nom ILIKE '%Waterloo%';

-- Exemple : Renaissance
UPDATE evenements
SET tags = ARRAY['renaissance', 'italie', 'art', '1400s']
WHERE date BETWEEN 1400 AND 1600;
```

---

## 🎯 Usage rapide

### Simuler une partie simple

```javascript
const { GameAPI } = require('./api/core/GameAPI');

async function test() {
  const partie = await GameAPI.simulerPartie('Classique', {
    type: 'gagnante',
    evenementsCount: 6,
  });

  console.log('Score:', partie.score);
  console.log('Résultat:', partie.resultat);
}

test();
```

### Simuler une partie thématique

```javascript
const partie = await GameAPI.simulerPartie('Classique', {
  type: 'gagnante',
  filtre: {
    tags: ['napoleon'],
    periode: '1789-1821',
  },
});
```

### Trouver la meilleure partie sur un thème

```javascript
const meilleure = await GameAPI.trouverMeilleurePartie(
  'Classique',
  {
    type: 'gagnante',
    filtre: { tags: ['renaissance'] },
  },
  20  // 20 tentatives
);
```

---

## 📚 API Reference

### `GameAPI.chargerEvenements(filters)`

Charge les événements depuis Supabase avec filtres optionnels.

**Paramètres** :
- `filters` (Object, optionnel)
  - `tags` (Array<string>) : Tags à filtrer (ex: `['napoleon', 'france']`)
  - `periode` (string) : Période format "DEBUT-FIN" (ex: `'1789-1821'`)

**Retourne** : `Promise<Array<Event>>`

**Exemple** :
```javascript
const evenements = await GameAPI.chargerEvenements({
  tags: ['napoleon'],
  periode: '1800-1815',
});
```

---

### `GameAPI.simulerPartie(mode, options)`

Simule une partie complète.

**Paramètres** :
- `mode` (string) : `'Classique'`, `'Precision'`, ou `'Survie'`
- `options` (Object, optionnel)
  - `type` (string) : `'gagnante'` ou `'perdante'` (défaut: `'gagnante'`)
  - `filtre` (Object) : Filtres pour les événements (voir `chargerEvenements`)
  - `evenementsCount` (number) : Nombre d'événements (défaut: `6`)
  - `difficulte` (number) : 0-1 (défaut: `0.5`)
  - `tourErreur` (number) : Tour où faire l'erreur si type='perdante' (défaut: `4`)

**Retourne** : `Promise<Partie>`

**Partie (Object)** :
```javascript
{
  mode: 'Classique',
  type: 'gagnante',
  evenements: [/* Array<Event> */],
  choix: [/* Array<Choix> */],
  score: 15420,
  erreurs: 0,
  dureeSecondes: 142,
  resultat: 'victoire',
  timestamp: '2026-01-13T14:30:00Z'
}
```

**Exemple** :
```javascript
const partie = await GameAPI.simulerPartie('Classique', {
  type: 'perdante',
  tourErreur: 3,  // Erreur au 3ème tour
  filtre: {
    tags: ['guerre'],
    periode: '1914-1945',
  },
});
```

---

### `GameAPI.trouverMeilleurePartie(mode, options, tentatives, critere)`

Simule plusieurs parties et retourne la meilleure selon un critère.

**Paramètres** :
- `mode` (string) : Mode de jeu
- `options` (Object) : Options de simulation (voir `simulerPartie`)
- `tentatives` (number) : Nombre de parties à simuler (défaut: `10`)
- `critere` (Function, optionnel) : Fonction de sélection custom

**Retourne** : `Promise<Partie>`

**Exemple avec critère custom** :
```javascript
const meilleure = await GameAPI.trouverMeilleurePartie(
  'Classique',
  { type: 'gagnante', filtre: { tags: ['napoleon'] } },
  20,
  // Critère : maximiser le nombre d'événements avec "Napoléon" dans le nom
  (parties) => {
    return parties.reduce((best, current) => {
      const nbNapoleon = current.evenements.filter(e =>
        e.nom.toLowerCase().includes('napoléon')
      ).length;

      const bestNbNapoleon = best.evenements.filter(e =>
        e.nom.toLowerCase().includes('napoléon')
      ).length;

      return nbNapoleon > bestNbNapoleon ? current : best;
    });
  }
);
```

---

### `GameAPI.getStats(partie)`

Obtient les statistiques d'une partie.

**Paramètres** :
- `partie` (Object) : Résultat de `simulerPartie()`

**Retourne** : `Object`

**Exemple** :
```javascript
const stats = GameAPI.getStats(partie);
// {
//   mode: 'Classique',
//   score: 15420,
//   duree: 142,
//   evenementsJoues: 6,
//   erreurs: 0,
//   precision: '100.0',
//   resultat: 'victoire',
//   timestamp: '2026-01-13T14:30:00Z'
// }
```

---

## 💡 Exemples

### Exemple 1 : Partie gagnante simple

```javascript
const { GameAPI } = require('./api/core/GameAPI');

async function partieSimple() {
  const partie = await GameAPI.simulerPartie('Classique', {
    type: 'gagnante',
  });

  console.log('Score:', partie.score);
  console.log('Événements:');
  partie.evenements.forEach((evt, i) => {
    console.log(`  ${i + 1}. ${evt.nom} (${evt.date})`);
  });
}

partieSimple();
```

### Exemple 2 : Partie perdante avec erreur au 2ème tour

```javascript
const partie = await GameAPI.simulerPartie('Classique', {
  type: 'perdante',
  tourErreur: 2,
});

console.log('Erreur au tour:', partie.choix.findIndex(c => !c.correct) + 1);
```

### Exemple 3 : Trouver une partie sur la Renaissance

```javascript
const meilleure = await GameAPI.trouverMeilleurePartie(
  'Classique',
  {
    type: 'gagnante',
    filtre: {
      tags: ['renaissance'],
      periode: '1400-1600',
    },
  },
  15  // 15 tentatives
);

const evenementsRenaissance = meilleure.evenements.filter(e =>
  e.date >= 1400 && e.date <= 1600
);

console.log(`${evenementsRenaissance.length}/6 événements Renaissance`);
```

---

## 🔗 Intégration Reporters

### Utiliser via le client Reporters

```javascript
// Architecture_MD/Reporters/TOOLS/game_api_client.js
const { GameAPIClient } = require('./game_api_client');

// Simulation simple
const partie = await GameAPIClient.simulerPartie({
  mode: 'Classique',
  type: 'gagnante',
  theme: 'napoleon',
});

// Recherche thématique
const meilleure = await GameAPIClient.trouverPartieThematique('rome', {
  tentatives: 20,
});
```

### CLI Tom API Simulator

```bash
cd Architecture_MD/Reporters/TOOLS/

# Partie simple
node tom_api_simulator.js --type gagnante

# Partie thématique
node tom_api_simulator.js --theme napoleon --best

# Plusieurs parties
node tom_api_simulator.js --count 5 --theme renaissance
```

---

## 🔧 Troubleshooting

### Erreur : "Supabase URL not configured"

**Cause** : Variables d'environnement manquantes.

**Solution** :
```bash
# Vérifier les variables
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_SUPABASE_ANON_KEY

# Si vides, les définir
export EXPO_PUBLIC_SUPABASE_URL="https://..."
export EXPO_PUBLIC_SUPABASE_ANON_KEY="..."
```

### Erreur : "Aucun événement disponible"

**Cause** : Filtres trop restrictifs ou table vide.

**Solution** :
```javascript
// Tester sans filtres d'abord
const evenements = await GameAPI.chargerEvenements({});
console.log('Nombre d\'événements:', evenements.length);

// Si 0, vérifier Supabase
// Si > 0, assouplir les filtres
```

### Erreur : "Cannot find module '@supabase/supabase-js'"

**Cause** : Package manquant.

**Solution** :
```bash
npm install @supabase/supabase-js
```

### Les filtres par tags ne fonctionnent pas

**Cause** : Colonne `tags` n'existe pas ou est vide.

**Solution** :
```sql
-- Ajouter la colonne si nécessaire
ALTER TABLE evenements ADD COLUMN tags TEXT[];

-- Vérifier les tags existants
SELECT nom, tags FROM evenements WHERE tags IS NOT NULL LIMIT 10;

-- Si vide, taguer les événements
UPDATE evenements SET tags = ARRAY['votre_tag'] WHERE condition;
```

---

## 📊 Performance

- **Chargement événements** : ~200ms (500 événements)
- **Simulation 1 partie** : ~50-100ms
- **Simulation 20 parties** : ~1-2 secondes
- **Recherche meilleure partie (20 tentatives)** : ~2-3 secondes

**Optimisation** : Pour des simulations en masse, considérer :
- Mettre en cache les événements
- Paralléliser les simulations
- Réduire le nombre de requêtes Supabase

---

## 🛠️ Roadmap

### v1.1 (prochaine version)
- [ ] Génération de screenshots PNG réels
- [ ] Support mode Precision et Survie
- [ ] Cache des événements
- [ ] Filtres avancés (catégories, continents, etc.)

### v2.0 (futur)
- [ ] API REST (Express.js)
- [ ] Webhook pour notifications
- [ ] Dashboard de monitoring
- [ ] Génération de vidéos automatiques

---

## 📝 Changelog

### v1.0.0 (2026-01-13)
- ✅ API de simulation de base
- ✅ Filtrage par tags et période
- ✅ Recherche de meilleure partie
- ✅ Client Reporters
- ✅ CLI Tom API Simulator
- ✅ Générateur de screenshots (POC JSON)

---

**Maintenu par** : Pierre (CEO K-Hive & Architecture Lead)
**Support** : Reporters Corp
