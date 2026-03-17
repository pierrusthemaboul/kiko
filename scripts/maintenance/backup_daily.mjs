import fs from 'fs';
import { localDb } from './machine_a_evenements/tempete/supabase.mjs';
import { execSync } from 'child_process';

const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

async function backupLabo() {
  console.log(`🔄 Backup du ${timestamp}...`);
  
  // 1. Exporter les données labo
  const { data: laboData, error } = await localDb.from('labo').select('*');
  if (error) throw error;
  
  // 2. Sauvegarder en JSON
  const jsonFile = `backups/labo_backup_${timestamp}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(laboData, null, 2));
  
  // 3. Sauvegarder en CSV
  const csvFile = `backups/labo_backup_${timestamp}.csv`;
  const csv = [
    'id,titre,description,year,type,region,status,created_at',
    ...laboData.map(row => 
      `${row.id},"${row.titre}","${row.description}",${row.year},"${row.type}","${row.region}","${row.status}","${row.created_at}"`
    )
  ].join('\n');
  fs.writeFileSync(csvFile, csv);
  
  // 4. Backup SQL complet
  const sqlFile = `backups/full_backup_${timestamp}.sql`;
  execSync(`supabase db dump --local --data-only -f ${sqlFile}`);
  
  console.log(`✅ Backup terminé :`);
  console.log(`   📄 ${jsonFile}`);
  console.log(`   📊 ${csvFile}`);
  console.log(`   💾 ${sqlFile}`);
  
  // 5. Nettoyer les vieux backups (garder 30 jours)
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  
  const files = fs.readdirSync(backupDir);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  files.forEach(file => {
    const filePath = `${backupDir}/${file}`;
    const stats = fs.statSync(filePath);
    if (stats.mtime < thirtyDaysAgo) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Supprimé : ${file}`);
    }
  });
}

backupLabo().catch(console.error);

