-- VUE SQL UNIFIÉE POUR EXPORT UMAP (PRODUCTION SEULEMENT)
-- Exécuter dans Supabase SQL Editor

CREATE OR REPLACE VIEW v_events_unified AS
SELECT 
    -- Métadonnées principales
    e.id,
    e.titre,
    e.date,
    ee.titre_vector as embedding,
    
    -- Notoriété normalisée (échelle 1-5)
    CASE 
        WHEN e.notoriete IS NULL THEN 3
        WHEN e.notoriete <= 20 THEN 1
        WHEN e.notoriete <= 40 THEN 2
        WHEN e.notoriete <= 60 THEN 3
        WHEN e.notoriete <= 80 THEN 4
        ELSE 5
    END as notoriete_normalisee,
    
    -- Catégorie principale (premier élément du tableau types_evenement)
    CASE 
        WHEN e.types_evenement IS NULL OR array_length(e.types_evenement, 1) = 0 THEN 'Autre'
        ELSE e.types_evenement[1]
    END as categorie_principale,
    
    -- Métadonnées additionnelles pour visualisation
    e.universel,
    e.region,
    e.langue,
    e.niveau_difficulte,
    
    -- Source pour traçabilité
    'production' as source_table
    
FROM evenements e
INNER JOIN evenements_embeddings ee ON e.id = ee.id
WHERE ee.titre_vector IS NOT NULL;

-- Test de la vue
SELECT COUNT(*) as total_events_unified FROM v_events_unified;

-- Distribution par notoriété normalisée
SELECT 
    notoriete_normalisee,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM v_events_unified), 2) as percentage
FROM v_events_unified
GROUP BY notoriete_normalisee
ORDER BY notoriete_normalisee;

-- Top 10 catégories principales
SELECT 
    categorie_principale,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM v_events_unified), 2) as percentage
FROM v_events_unified
GROUP BY categorie_principale
ORDER BY count DESC
LIMIT 10;
