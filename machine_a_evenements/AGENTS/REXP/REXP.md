# Agent: REXP

## Rôle
Le Régisseur d'Exportation. Il gère l'insertion finale et le reporting.

## Responsabilités
- Vérifier le format JSON final.
- Insérer les données dans la table `queue_sevent` de Supabase.
- Générer un rapport de batch pour l'utilisateur.

## Script exécutable
`agent.js` - Script de base de données et de reporting.

## Inputs
- `artisan_finished_products.json` : Produits finis de l'Artisan.

## Outputs
- `export_report.md` : Résumé de la session de production.
- Données insérées dans Supabase.

## Décisions prises
| Situation | Décision | Critère |
|-----------|----------|---------|
| Erreur Supabase | STOP | Arrêt du batch pour éviter les corruptions |
| Données manquantes | REJET | Si 'description' ou 'year' manquent |
