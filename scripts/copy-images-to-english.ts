import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Script pour copier les images du français vers l'anglais
 * Les images sont universelles (pas besoin de traduction)
 */

async function copyImagesToEnglish() {
  console.log('🎨 Copie des images FR → EN-US\n');

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');
  const packageName = 'com.pierretulle.juno2';

  try {
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    const edit = await androidPublisher.edits.insert({
      packageName: packageName,
    });
    const editId = edit.data.id!;

    console.log('📥 Téléchargement des images françaises...\n');

    // 1. Copier le Feature Graphic
    console.log('1️⃣  Feature Graphic (bannière principale)');
    const frFeatureGraphic = await androidPublisher.edits.images.list({
      packageName,
      editId,
      language: 'fr-FR',
      imageType: 'featureGraphic',
    });

    if (frFeatureGraphic.data.images && frFeatureGraphic.data.images.length > 0) {
      const imageUrl = frFeatureGraphic.data.images[0].url;
      console.log('   Téléchargement depuis:', imageUrl);

      const response = await axios.get(imageUrl!, { responseType: 'arraybuffer' });
      const tempPath = path.join(os.tmpdir(), 'feature_graphic.png');
      fs.writeFileSync(tempPath, response.data);

      console.log('   Upload vers en-US...');
      await androidPublisher.edits.images.upload({
        packageName,
        editId,
        language: 'en-US',
        imageType: 'featureGraphic',
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(tempPath),
        },
      });

      fs.unlinkSync(tempPath);
      console.log('   ✅ Feature Graphic copié\n');
    }

    // 2. Copier les screenshots téléphone
    console.log('2️⃣  Screenshots téléphone');
    const frPhoneScreenshots = await androidPublisher.edits.images.list({
      packageName,
      editId,
      language: 'fr-FR',
      imageType: 'phoneScreenshots',
    });

    if (frPhoneScreenshots.data.images && frPhoneScreenshots.data.images.length > 0) {
      console.log(`   ${frPhoneScreenshots.data.images.length} screenshots à copier...`);

      for (let i = 0; i < frPhoneScreenshots.data.images.length; i++) {
        const image = frPhoneScreenshots.data.images[i];
        console.log(`   ${i + 1}/${frPhoneScreenshots.data.images.length} Téléchargement...`);

        const response = await axios.get(image.url!, { responseType: 'arraybuffer' });
        const tempPath = path.join(os.tmpdir(), `screenshot_${i}.png`);
        fs.writeFileSync(tempPath, response.data);

        console.log(`   ${i + 1}/${frPhoneScreenshots.data.images.length} Upload vers en-US...`);
        await androidPublisher.edits.images.upload({
          packageName,
          editId,
          language: 'en-US',
          imageType: 'phoneScreenshots',
          media: {
            mimeType: 'image/png',
            body: fs.createReadStream(tempPath),
          },
        });

        fs.unlinkSync(tempPath);
        console.log(`   ✅ Screenshot ${i + 1} copié`);
      }
      console.log('\n');
    }

    // 3. Copier l'icône si disponible
    console.log('3️⃣  Icône');
    const frIcon = await androidPublisher.edits.images.list({
      packageName,
      editId,
      language: 'fr-FR',
      imageType: 'icon',
    });

    if (frIcon.data.images && frIcon.data.images.length > 0) {
      const imageUrl = frIcon.data.images[0].url;
      console.log('   Téléchargement depuis:', imageUrl);

      const response = await axios.get(imageUrl!, { responseType: 'arraybuffer' });
      const tempPath = path.join(os.tmpdir(), 'icon.png');
      fs.writeFileSync(tempPath, response.data);

      console.log('   Upload vers en-US...');
      await androidPublisher.edits.images.upload({
        packageName,
        editId,
        language: 'en-US',
        imageType: 'icon',
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(tempPath),
        },
      });

      fs.unlinkSync(tempPath);
      console.log('   ✅ Icône copiée\n');
    } else {
      console.log('   ℹ️  Icône définie dans l\'APK/AAB (pas besoin de copier)\n');
    }

    // Valider les changements
    console.log('💾 Validation des changements...');
    await androidPublisher.edits.commit({
      packageName,
      editId,
    });

    console.log('✅ Tous les changements sont validés !\n');

    console.log('🎉 COPIE TERMINÉE !\n');
    console.log('📊 Résumé:');
    console.log('  ✅ Feature Graphic copié pour en-US');
    console.log('  ✅ Screenshots téléphone copiés pour en-US');
    console.log('  ✅ Icône copiée (si applicable)');
    console.log('\n🌍 Votre app est maintenant optimisée pour:');
    console.log('  • Français (fr-FR) - texte + images');
    console.log('  • Anglais (en-US) - texte + images');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

copyImagesToEnglish();
