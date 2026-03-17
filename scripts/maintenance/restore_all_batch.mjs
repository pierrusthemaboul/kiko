import fs from 'fs';
import csv from 'papaparse';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';

console.log('🔄 Restauration complète par batchs...');

const data = fs.readFileSync('labo_rows.csv', 'utf8');
const parsed = csv.parse(data, { header: true, skipEmptyLines: true });

const batchSize = 50;
const totalEvents = parsed.data.length;

console.log(`📊 ${totalEvents} événements à restaurer par batchs de ${batchSize}`);

(async () => {
  let totalRestored = 0;
  let withImages = 0;
  
  for (let i = 0; i < totalEvents; i += batchSize) {
    const batch = parsed.data.slice(i, i + batchSize);
    
    try {
      // Préparer le batch
      const batchData = batch.map(row => ({
        id: parseInt(row.id),
        titre: row.titre,
        description: row.description,
        year: parseInt(row.year),
        type: row.type,
        region: row.region,
        status: row.status || 'pending',
        illustration_url: row.illustration_url,
        image_prompt: row.image_prompt
      }));
      
      // Insérer le batch
      const { data: result, error } = await localDb.from('labo').insert(batchData).select();
      
      if (error) {
        console.error(`❌ Erreur batch ${i}-${i+batchSize}:`, error.message);
      } else {
        totalRestored += batch.length;
        const imagesInBatch = batch.filter(row => row.illustration_url).length;
        withImages += imagesInBatch;
        
        console.log(`✅ Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(totalEvents/batchSize)}: ${batch.length} événements (${imagesInBatch} avec images)`);
      }
      
    } catch (e) {
      console.error(`⚠️  Exception batch ${i}:`, e.message);
    }
  }
  
  console.log(`🎉 RESTAURATION TERMINÉE !`);
  console.log(`   📊 ${totalRestored} événements restaurés`);
  console.log(`   🖼️  ${withImages} avec illustrations`);
  console.log(`   💰 Valeur estimée : ${withImages * 0.75}€ d'illustrations`);
  
  // Vérification finale
  const { count } = await localDb.from('labo').select('*', { count: 'exact', head: true });
  console.log(`   🔍 Vérification : ${count} événements dans la base`);
})();

