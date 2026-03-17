import fs from 'fs';
import csv from 'papaparse';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';

const data = fs.readFileSync('scripts/archives_mortes/25_nouveaux_evenements.csv', 'utf8');
const parsed = csv.parse(data, { header: true, skipEmptyLines: true });

console.log(`Restauration de ${parsed.data.length} événements...`);

(async () => {
  for (const row of parsed.data) {
    await localDb.from('labo').upsert({
      titre: row.titre,
      description: row.description_detaillee,
      year: parseInt(row.date.split('-')[0]),
      type: row.types_evenement,
      region: row.region,
      status: 'pending'
    });
  }
  console.log('✅ Restauration terminée !');
  
  // Vérification
  const { count } = await localDb.from('labo').select('*', { count: 'exact', head: true });
  console.log(`📊 ${count} événements restaurés dans labo`);
})();

