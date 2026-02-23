# 🎯 ORCHESTRATEUR - Guide d'utilisation

## Commandes depuis PS C:\Users\Pierre\kiko>

### Pour obtenir 10 événements validés
```powershell
npm run ideation 10
```

### Pour obtenir 100 événements validés
```powershell
npm run ideation 100
```

### Pour obtenir 1000 événements validés
```powershell
npm run ideation 1000
```

### Sans argument (par défaut: 10)
```powershell
npm run ideation
```

---

## Comment ça marche

L'orchestrateur effectue des cycles automatiques:

1. **GENESIS** génère un batch d'événements (taille adaptative)
2. **SENTINEL** filtre les doublons
3. Accumule les événements validés
4. Répète jusqu'à obtenir le nombre demandé

### Paramètres automatiques

- **Taille de batch**: Calculée automatiquement (minimum 50, ou 1.5× votre objectif)
- **Max cycles**: 100 tentatives maximum pour éviter les boucles infinies
- **Accumulation**: Les événements validés s'accumulent entre les cycles

### Exemple de sortie

```
🎯 ORCHESTRATEUR - Objectif: 100 événements validés

Taille de batch: 150 événements par cycle

🔄 CYCLE 1 - Progression: 0/100 validés

📝 [GENESIS] Génération de 150 événements...
🛡️  [SENTINEL] Filtrage des doublons...

✅ 12 nouveaux événements validés
📊 Total accumulé: 12/100
📉 Taux de succès du cycle: 8.0%

🔄 CYCLE 2 - Progression: 12/100 validés
...
```

---

## Fichiers générés

### `orchestrator_result.json`
Résultat final avec:
- Nombre d'événements obtenus
- Statistiques complètes
- Liste de tous les événements validés

### `SENTINEL/STORAGE/OUTPUT/sentinel_filtered_ids.json`
Derniers événements validés du dernier cycle

---

## Stratégie recommandée

### 1er test: 10 événements
```powershell
npm run ideation 10
```
→ Vérifier que tout fonctionne (~1-2 minutes)

### 2e test: 100 événements
```powershell
npm run ideation 100
```
→ Test de charge moyen (~10-20 minutes)

### Production: 1000 événements
```powershell
npm run ideation 1000
```
→ Peut prendre 1-3 heures selon le taux de succès

---

## Taux de succès attendus

Avec 2071 événements dans votre base:

- **Cycles initiaux**: 8-12% de succès
- **Après 500 nouveaux**: 5-8% de succès
- **Après 1000 nouveaux**: 3-5% de succès
- **Au-delà**: Le taux baisse progressivement

**Note**: Plus votre base est riche, plus il devient difficile de trouver des événements uniques.

---

## Après l'orchestrateur

Une fois les événements validés, lancez:

1. **ARTISAN** pour enrichir les événements
2. **REXP** pour les insérer dans Supabase

```powershell
cd machine_a_evenements\AGENTS\ARTISAN
node agent.js

cd ..\REXP
node agent.js
```

---

## Dépannage

### Aucun événement validé après 3 cycles
→ La base est saturée d'événements similaires
→ Utilisez `generateur_cible.mjs` pour des événements ultra-connus spécifiques

### L'orchestrateur plante
→ Vérifiez que GENESIS et SENTINEL fonctionnent individuellement
→ Vérifiez votre connexion Supabase local

### Taux de succès < 1%
→ Normal si vous avez déjà 3000+ événements
→ Considérez d'autres périodes historiques ou catégories

---

## Variables d'environnement requises

Fichier `.env` à la racine:
```
GEMINI_API_KEY=votre_clé_gemini
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=votre_clé_supabase_local
```
