import fs from 'fs';
import csv from 'papaparse';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';

console.log('🔄 Restauration complète depuis labo_rows.csv...');

const data = fs.readFileSync('labo_rows.csv', 'utf8');
const parsed = csv.parse(data, { header: true, skipEmptyLines: true });

console.log(`📊 ${parsed.data.length} événements à restaurer`);

(async () => {
  let restored = 0;
  let withImages = 0;
  
  for (const row of parsed.data) {
    try {
      const eventData = {
        id: parseInt(row.id),
        titre: row.titre,
        year: parseInt(row.year),
        is_universal: row.is_universal === 'true',
        notoriete: row.notoriete ? parseInt(row.notoriete) : null,
        description: row.description,
        type: row.type,
        region: row.region,
        status: row.status || 'pending',
        image_prompt: row.image_prompt,
        illustration_url: row.illustration_url,
        illustration_url_rejected: row.illustration_url_rejected,
        created_at: row.created_at,
        processed_at: row.processed_at,
        error_log: row.error_log,
        validation_notes: row.validation_notes
      };
      
      await localDb.from('labo').upsert(eventData);
      restored++;
      
      if (row.illustration_url) withImages++;
      
      if (restored % 100 === 0) {
        console.log(`✅ ${restored}/${parsed.data.length} événements restaurés...`);
      }
    } catch (error) {
      console.warn(`⚠️  Erreur événement ${row.id}: ${error.message}`);
    }
  }
  
  console.log(`🎉 RESTAURATION TERMINÉE !`);
  console.log(`   📊 ${restored} événements restaurés`);
  console.log(`   🖼️  ${withImages} avec illustrations`);
  console.log(`   💰 Valeur estimée : ${withImages * 0.75}€ d'illustrations`);
  
  // Vérification finale
  const { count } = await localDb.from('labo').select('*', { count: 'exact', head: true });
  console.log(`   🔍 Vérification : ${count} événements dans la base`);
})();

