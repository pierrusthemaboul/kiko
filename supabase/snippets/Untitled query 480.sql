-- Sécurité: vérifier avant
select id, titre, year from ratoire where id = 160;
select id from ratoire_embeddings where id = 160;

-- Suppression embedding puis event
delete from ratoire_embeddings where id = 160;
delete from ratoire where id = 160;