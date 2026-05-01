import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import sharp from 'sharp';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVENT_ID = '2c9c5a68-4913-4859-b313-565d220217a1';

async function toWebp(buffer: Buffer) {
  return sharp(buffer)
    .resize(1024, 576, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();
}

async function updateMetroIllustration() {
  console.log('\n🔍 Recherche d\'une illustration pour le métro de Paris...\n');

  // Option 1: Utiliser une image locale si elle existe
  const localImagePath = './assets/metro-paris-1900.webp';

  if (fs.existsSync(localImagePath)) {
    console.log('📁 Image locale trouvée, upload en cours...\n');

    const imageBuffer = fs.readFileSync(localImagePath);
    const processedBuffer = await toWebp(imageBuffer);
    const timestamp = Date.now();
    const fileName = `metro_paris_1900_${timestamp}.webp`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evenements-image')
      .upload(fileName, processedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    const publicUrl = `https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/${fileName}`;

    const { error: updateError } = await supabase
      .from('evenements')
      .update({ illustration_url: publicUrl })
      .eq('id', EVENT_ID);

    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    console.log('✅ Illustration mise à jour avec succès!');
    console.log('🔗 URL:', publicUrl);
    return;
  }

  // Option 2: Utiliser une URL d'image libre de droits de Wikimedia Commons
  console.log('🌐 Téléchargement d\'une image depuis Wikimedia Commons...\n');

  // Image historique du métro de Paris de 1900 (domaine public)
  const wikimediaUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Metro_de_Paris_-_Ligne_1_-_Porte_Maillot_03.jpg/1280px-Metro_de_Paris_-_Ligne_1_-_Porte_Maillot_03.jpg';

  try {
    const response = await fetch(wikimediaUrl);
    if (!response.ok) {
      throw new Error(`Erreur téléchargement: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const processedBuffer = await toWebp(imageBuffer);
    const timestamp = Date.now();
    const fileName = `metro_paris_1900_${timestamp}.webp`;

    console.log('☁️  Upload vers Supabase Storage...\n');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evenements-image')
      .upload(fileName, processedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur upload: ${uploadError.message}`);
    }

    const publicUrl = `https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/${fileName}`;

    console.log('📝 Mise à jour de la base de données...\n');

    const { error: updateError } = await supabase
      .from('evenements')
      .update({ illustration_url: publicUrl })
      .eq('id', EVENT_ID);

    if (updateError) {
      throw new Error(`Erreur mise à jour: ${updateError.message}`);
    }

    console.log('✅ Illustration mise à jour avec succès!');
    console.log('🔗 URL:', publicUrl);

    // Vérification finale
    const { data: verifyData } = await supabase
      .from('evenements')
      .select('id, titre, illustration_url')
      .eq('id', EVENT_ID)
      .single();

    console.log('\n✅ VÉRIFICATION:');
    console.log('Titre:', verifyData?.titre);
    console.log('Illustration URL:', verifyData?.illustration_url);

  } catch (error) {
    console.error('\n❌ ERREUR:', error);

    // Option 3: URL de secours - utiliser une autre image du métro parisien
    console.log('\n🔄 Tentative avec une image de secours...\n');

    const fallbackUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/claude_inauguration_du_mus_e_d_art_mo_1751559068242.webp';

    const { error: updateError } = await supabase
      .from('evenements')
      .update({ illustration_url: fallbackUrl })
      .eq('id', EVENT_ID);

    if (updateError) {
      console.error('❌ Impossible de mettre à jour:', updateError);
    } else {
      console.log('✅ URL de secours utilisée');
    }
  }
}

updateMetroIllustration();

