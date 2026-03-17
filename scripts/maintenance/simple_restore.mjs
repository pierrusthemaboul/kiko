import fs from 'fs';
import csv from 'papaparse';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';

console.log('🔄 Restauration simple...');

const data = fs.readFileSync('labo_rows.csv', 'utf8');
const parsed = csv.parse(data, { header: true, skipEmptyLines: true });

// Prendre seulement les 10 premiers pour tester
const sample = parsed.data.slice(0, 10);

console.log(`📊 Test avec ${sample.length} événements`);

(async () => {
  for (const [index, row] of sample.entries()) {
    try {
      const simpleData = {
        id: parseInt(row.id),
        titre: row.titre,
        description: row.description,
        year: parseInt(row.year),
        illustration_url: row.illustration_url
      };
      
      console.log(`${index + 1}. ${simpleData.id}: ${simpleData.titre}`);
      
      const { data: result, error } = await localDb.from('labo').insert(simpleData).select();
      
      if (error) {
        console.error(`❌ Erreur ${simpleData.id}:`, error.message);
      } else {
        console.log(`✅ ${simpleData.id} inséré`);
      }
      
    } catch (e) {
      console.error(`⚠️  Exception ${row.id}:`, e.message);
    }
  }
  
  // Vérification finale
  const { count } = await localDb.from('labo').select('*', { count: 'exact', head: true });
  console.log(`🔍 Total dans base: ${count}`);
})();

