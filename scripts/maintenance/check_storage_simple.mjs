import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Clés Supabase non trouvées');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  console.log('🔍 Vérification du storage Supabase...');
  console.log(`🌐 URL: ${supabaseUrl}`);
  
  try {
    // Lister tous les fichiers dans le bucket evenements-image
    const { data: files, error } = await supabase.storage
      .from('evenements-image')
      .list('', { limit: 3000 });
    
    if (error) throw error;
    
    console.log(`📁 ${files.length} fichiers trouvés dans evenements-image`);
    
    // Compter les fichiers .webp
    const webpFiles = files.filter(f => f.name.endsWith('.webp'));
    console.log(`🖼️  ${webpFiles.length} fichiers .webp (illustrations)`);
    
    // Estimer la valeur
    const estimatedValue = webpFiles.length * 0.75;
    console.log(`💰 Valeur estimée: ${webpFiles.length} × 0.75€ = ${estimatedValue.toFixed(2)}€`);
    
    // Afficher les 10 premiers
    console.log('\n📋 Exemples de fichiers:');
    webpFiles.slice(0, 10).forEach((file, index) => {
      const size = file.size ? `${(file.size / 1024).toFixed(1)}KB` : 'unknown';
      console.log(`   ${index + 1}. ${file.name} (${size})`);
    });
    
    // Vérifier les événements avec IMAGE_DONE dans le CSV
    const fs = await import('fs');
    const csvContent = fs.readFileSync('labo_rows.csv', 'utf8');
    const imageDoneLines = csvContent.split('\n').filter(line => line.includes('IMAGE_DONE'));
    
    console.log(`\n📊 Événements avec IMAGE_DONE dans CSV: ${imageDoneLines.length}`);
    
    // Extraire les URLs du CSV
    const urls = csvContent.match(/http:\/\/127\.0\.0\.1:54321\/storage\/v1\/object\/public\/evenements-image\/[^,\n]+/g) || [];
    const uniqueUrls = [...new Set(urls)];
    
    console.log(`🔗 URLs locales dans CSV: ${uniqueUrls.length}`);
    
    // Comparer avec les fichiers distants
    const csvFilenames = uniqueUrls.map(url => url.split('/').pop());
    const storageFilenames = webpFiles.map(f => f.name);
    
    const presentInBoth = csvFilenames.filter(name => storageFilenames.includes(name));
    
    console.log(`\n✅ Illustrations présentes dans storage ET CSV: ${presentInBoth.length}`);
    console.log(`❌ Illustrations manquantes (probablement dans storage): ${imageDoneLines.length - presentInBoth.length}`);
    
    if (presentInBoth.length > 0) {
      console.log('\n🎉 EXEMPLES D\'ILLUSTRATIONS RÉCUPÉRABLES:');
      presentInBoth.slice(0, 5).forEach(name => {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/evenements-image/${name}`;
        console.log(`   - ${name}`);
        console.log(`     URL: ${publicUrl}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkStorage();

