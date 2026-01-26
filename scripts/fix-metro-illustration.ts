import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVENT_ID = '2c9c5a68-4913-4859-b313-565d220217a1';
const EVENT_TITLE = 'Inauguration de la première ligne du métro de Paris';
const EVENT_DATE = '1900-07-19';

async function generateAndUploadIllustration() {
  console.log('\n🎨 Génération de l\'illustration pour le métro de Paris...\n');

  // Prompt pour DALL-E
  const prompt = `A historical illustration of the inauguration of the first Paris metro line in 1900.
Show an elegant Belle Époque scene with well-dressed Parisian citizens in period clothing (men in top hats and suits, women in long dresses with elaborate hats)
gathered at an ornate Art Nouveau metro station entrance with its characteristic wrought iron and glass canopy.
The scene should capture the excitement and modernity of this revolutionary moment in Paris history.
Style: vintage photograph with sepia tones, historical documentary feel, early 1900s photography aesthetic.`;

  console.log('📝 Prompt:', prompt);
  console.log('\n⏳ Génération de l\'image avec DALL-E 3...\n');

  // Utiliser l'API OpenAI pour générer l'image
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur API OpenAI: ${error}`);
    }

    const data = await response.json();
    const imageUrl = data.data[0].url;

    console.log('✅ Image générée avec succès!');
    console.log('📥 Téléchargement de l\'image...\n');

    // Télécharger l'image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Créer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `metro_paris_1900_${timestamp}.webp`;
    const tempPath = `/tmp/${fileName}`;

    // Sauvegarder temporairement
    fs.writeFileSync(tempPath, imageBuffer);

    console.log('💾 Image téléchargée, conversion en WebP...\n');

    // Convertir en WebP si nécessaire (l'image est déjà téléchargée)
    // Pour l'instant, on garde le format tel quel

    // Upload vers Supabase Storage
    console.log('☁️  Upload vers Supabase Storage...\n');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('evenements-image')
      .upload(fileName, imageBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur upload Supabase: ${uploadError.message}`);
    }

    // Construire l'URL publique
    const publicUrl = `https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/${fileName}`;

    console.log('✅ Upload réussi!');
    console.log('🔗 URL publique:', publicUrl);
    console.log('\n📝 Mise à jour de la base de données...\n');

    // Mettre à jour l'événement dans la base de données
    const { error: updateError } = await supabase
      .from('evenements')
      .update({ illustration_url: publicUrl })
      .eq('id', EVENT_ID);

    if (updateError) {
      throw new Error(`Erreur mise à jour BD: ${updateError.message}`);
    }

    console.log('✅ Base de données mise à jour avec succès!');
    console.log('\n🎉 L\'illustration pour le métro de Paris a été ajoutée!\n');

    // Nettoyer le fichier temporaire
    fs.unlinkSync(tempPath);

    // Vérification finale
    const { data: verifyData, error: verifyError } = await supabase
      .from('evenements')
      .select('id, titre, illustration_url')
      .eq('id', EVENT_ID)
      .single();

    if (verifyError) {
      console.error('⚠️  Erreur vérification:', verifyError);
    } else {
      console.log('\n✅ VÉRIFICATION FINALE:');
      console.log('Titre:', verifyData.titre);
      console.log('Illustration URL:', verifyData.illustration_url);
    }

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    throw error;
  }
}

// Vérifier que la clé API OpenAI est définie
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ La variable d\'environnement OPENAI_API_KEY n\'est pas définie!');
  console.log('\n💡 Définissez-la avec: export OPENAI_API_KEY="votre-clé-api"');
  process.exit(1);
}

generateAndUploadIllustration();
