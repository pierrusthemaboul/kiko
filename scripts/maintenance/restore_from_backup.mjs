import fs from 'fs';
import csv from 'papaparse';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';

const backupDate = process.argv[2] || new Date().toISOString().split('T')[0];

async function restoreFromBackup() {
  const csvFile = `backups/labo_backup_${backupDate}.csv`;
  
  if (!fs.existsSync(csvFile)) {
    console.error(`❌ Fichier introuvable : ${csvFile}`);
    console.log('💡 Disponibles :');
    const files = fs.readdirSync('backups').filter(f => f.includes('labo_backup_'));
    files.forEach(f => console.log(`   - ${f}`));
    return;
  }
  
  console.log(`🔄 Restauration depuis ${csvFile}...`);
  
  const data = fs.readFileSync(csvFile, 'utf8');
  const parsed = csv.parse(data, { header: true, skipEmptyLines: true });
  
  for (const row of parsed.data) {
    await localDb.from('labo').upsert({
      id: row.id ? parseInt(row.id) : undefined,
      titre: row.titre,
      description: row.description,
      year: parseInt(row.year),
      type: row.type,
      region: row.region,
      status: row.status || 'pending'
    });
  }
  
  console.log(`✅ ${parsed.data.length} événements restaurés !`);
}

restoreFromBackup().catch(console.error);

