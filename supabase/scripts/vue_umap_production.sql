-- Vue optimisée pour UMAP/t-SNE (PRODUCTION SEULEMENT)
-- Exécuter dans l'éditeur SQL Supabase

CREATE OR REPLACE VIEW v_events_umap AS
SELECT 
    e.id,
    e.titre,
    e.date,
    ee.embedding_1536 as embedding,
    
    -- Notoriété normalisée 1-5 pour coloration
    CASE 
        WHEN e.notoriete IS NULL THEN 3
        WHEN e.notoriete <= 20 THEN 1
        WHEN e.notoriete <= 40 THEN 2
        WHEN e.notoriete <= 60 THEN 3
        WHEN e.notoriete <= 80 THEN 4
        ELSE 5
    END as notoriete_level,
    
    -- Catégorie principale pour clustering
    CASE 
        WHEN e.types_evenement IS NULL OR array_length(e.types_evenement, 1) = 0 THEN 'Autre'
        ELSE e.types_evenement[1]
    END as main_category,
    
    -- Métadonnées utiles pour tooltip
    e.universel,
    e.region,
    e.langue,
    e.niveau_difficulte
    
FROM evenements e
INNER JOIN evenements_embeddings ee ON e.id = ee.id AND ee.source_type = 'titre'
WHERE ee.embedding_1536 IS NOT NULL;

-- Vérification rapide
SELECT COUNT(*) as total_events FROM v_events_umap;
