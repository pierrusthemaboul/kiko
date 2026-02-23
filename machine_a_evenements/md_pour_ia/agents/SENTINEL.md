# Agent: SENTINEL

## Rôle
Le douanier de la base de données. Il filtre impitoyablement les doublons sémantiques.

## Responsabilités
- Comparer les événements bruts avec la table `evenements` de Supabase.
- Utiliser la logique de `check_robust.mjs` pour les cas ambigus.
- Éliminer les titres déjà présents pour ne garder que le 100% inédit.

## Script exécutable
`agent.js` - Exécute les vérifications croisées (Supabase + IA).

## Inputs
- `genesis_raw_batch.json` : La production brute de GENESIS.

## Outputs
- `sentinel_filtered_ids.json` : Liste des événements validés comme "Inédits".

## Décisions prises
| Situation | Décision | Critère |
|-----------|----------|---------|
| Titre identique | REJET | Doublon exact |
| Titre proche (sémantique) | REJET | Détecté par Gemini comme le même fait |
| Nouveau fait | ACCEPTÉ | Aucun match trouvé à +/- 4 ans |
