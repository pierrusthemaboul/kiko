import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuration
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-service-role-key'; // Utiliser la clé service role pour accès complet

const supabase = createClient(supabaseUrl, supabaseKey);

async function backupStorage() {
  console.log('🔄 Backup des illustrations Supabase Storage...');
  
  const backupDir = 'backups/storage';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  
  try {
    // Lister tous les fichiers dans le bucket illustrations
    const { data: files, error } = await supabase.storage
      .from('illustrations')
      .list('', { limit: 1000 });
    
    if (error) throw error;
    
    console.log(`📁 ${files.length} fichiers trouvés`);
    
    for (const file of files) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('illustrations')
        .download(file.name);
      
      if (downloadError) {
        console.warn(`⚠️  Erreur téléchargement ${file.name}: ${downloadError.message}`);
        continue;
      }
      
      // Sauvegarder localement
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const filePath = path.join(backupDir, file.name);
      
      // Créer les sous-dossiers si nécessaire
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.writeFileSync(filePath, buffer);
      console.log(`✅ ${file.name}`);
    }
    
    console.log('🎉 Backup illustrations terminé !');
    
  } catch (error) {
    console.error('❌ Erreur backup storage:', error.message);
  }
}

backupStorage();

