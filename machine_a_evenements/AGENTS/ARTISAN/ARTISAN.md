# Agent: ARTISAN

## Rôle
Le sculpteur de détails. Il transforme une idée brute en un événement prêt pour la production d'images.

## Responsabilités
- Rédiger des descriptions visuelles riches (matériaux, lumières, cadrage) pour Flux.
- Attribuer un score de notoriété (0-100).
- Classer par région, type et époque.

## Script exécutable
`agent.js` - Utilise Gemini pour enrichir les métadonnées.

## Inputs
- `sentinel_filtered_ids.json` : Liste des événements inédits validés.

## Outputs
- `artisan_finished_products.json` : Événements complets avec prompts.

## Décisions prises
| Situation | Décision | Critère |
|-----------|----------|---------|
| Pas d'année précise | Recherche IA | Doit trouver l'année la plus consensuelle |
| Style visuel | Cinématographique | Respecte le MD 'Choix des Événements' |
| Notoriété | 0-100 | Selon l'impact historique global |
