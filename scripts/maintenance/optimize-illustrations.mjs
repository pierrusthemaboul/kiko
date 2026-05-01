import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import sharp from 'sharp';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables manquantes: SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_WIDTH = 1024;
const QUALITY = 80;
const THRESHOLD_KB = 300; // On optimise tout ce qui dépasse 300 KB

async function optimizeImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const buffer = await response.arrayBuffer();
    
    const optimizedBuffer = await sharp(Buffer.from(buffer))
      .resize({
        width: MAX_WIDTH,
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: QUALITY })
      .toBuffer();
    
    return optimizedBuffer;
  } catch (error) {
    console.error(`   ❌ Erreur d'optimisation pour ${imageUrl}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Démarrage de l\'optimisation des illustrations...');
  
  // 1. Lister les événements avec des illustrations potentiellement lourdes
  // On va d'abord lister tous les événements et vérifier leur taille via storage.objects
  // car c'est plus précis que de faire des HEAD requests sur des milliers d'images.
  
  const { data: heavyImages, error: queryError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        e.id, 
        e.titre, 
        e.illustration_url,
        (o.metadata->>'size')::bigint as size_bytes
      FROM evenements e
      JOIN storage.objects o ON o.name = substring(e.illustration_url from 'evenements-image/(.*)')
      WHERE e.illustration_url IS NOT NULL
        AND o.bucket_id = 'evenements-image'
        AND (o.metadata->>'size')::bigint > ${THRESHOLD_KB * 1024}
      ORDER BY (o.metadata->>'size')::bigint DESC
    `
  });

  let itemsToProcess = [];
  if (queryError || !heavyImages || heavyImages.error) {
    console.log('⚠️ Erreur RPC:', queryError || heavyImages?.error);
    console.log('🔄 Repli sur le scan de la table...');
    const { data, error: tableError } = await supabase.from('evenements').select('id, titre, illustration_url').not('illustration_url', 'is', null);
    if (tableError) {
        console.error('❌ Erreur scan table:', tableError.message);
        process.exit(1);
    }
    console.log(`📦 ${data?.length || 0} événements trouvés au total.`);
    // Dans ce cas on devra filtrer par taille en faisant des HEAD requests ou en récupérant les métadonnées storage séparément
    itemsToProcess = data || [];
  } else {
    itemsToProcess = heavyImages;
  }

  console.log(`📦 ${itemsToProcess.length} images à analyser (> ${THRESHOLD_KB} KB)`);

  for (const item of itemsToProcess) {
    console.log(`\nProcessing: ${item.titre} (${item.id})`);
    
    // Si on n'a pas déjà la taille, on peut la skipper ou la vérifier ici.
    // Mais ici on fait confiance à la liste.
    
    const optimizedBuffer = await optimizeImage(item.illustration_url);
    if (!optimizedBuffer) continue;

    const oldSize = item.size_bytes ? (item.size_bytes / 1024).toFixed(1) : '?';
    const newSize = (optimizedBuffer.length / 1024).toFixed(1);
    
    console.log(`   📉 Compression: ${oldSize} KB -> ${newSize} KB`);

    if (optimizedBuffer.length >= (item.size_bytes || Infinity)) {
      console.log('   ⏩ Gain nul ou négatif, on ignore.');
      continue;
    }

    const fileName = `optimized_${item.id}_${Date.now()}.webp`;
    
    // 2. Upload vers Storage
    const { error: uploadError } = await supabase.storage
      .from('evenements-image')
      .upload(fileName, optimizedBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true
      });

    if (uploadError) {
      console.error('   ❌ Erreur upload:', uploadError.message);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('evenements-image')
      .getPublicUrl(fileName);

    // 3. Update DB
    const { error: updateError } = await supabase
      .from('evenements')
      .update({ illustration_url: publicUrl })
      .eq('id', item.id);

    if (updateError) {
      console.error('   ❌ Erreur DB update:', updateError.message);
    } else {
      console.log(`   ✅ Terminé! Nouvelle URL: ${publicUrl}`);
    }
  }

  console.log('\n✨ Mission terminée!');
}

main().catch(console.error);
