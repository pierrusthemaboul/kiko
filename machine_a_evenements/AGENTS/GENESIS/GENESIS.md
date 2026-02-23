# Agent: GENESIS

## Rôle
Générer massivement des idées d'événements historiques (Titre + Année) sans se soucier des doublons à ce stade. Son but est la créativité et la vitesse.

## Responsabilités
- Produire des listes de 100 à 1000 événements par thématique.
- Respecter le format minimal : `{ "titre": "...", "year": 1234 }`.
- S'inspirer de "graines" (fichiers sources ou thèmes fournis).

## Script exécutable
`agent.js` - Appelle l'IA pour générer les listes brutes.

## Inputs
- `seed_theme.txt` : Thème ou consigne spécifique.
- `seed_list.csv` (Optionnel) : Liste existante à prolonger.

## Outputs
- `genesis_raw_batch.json` : Liste brute des événements.

## Décisions prises
| Situation | Décision | Critère |
|-----------|----------|---------|
| Thème trop large | Découpe en siècles | Pour éviter les hallucinations de masse |
| Liste fournie | Analyse le style | Pour rester cohérent avec la "graine" |
