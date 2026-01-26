import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';
import axios from 'axios';
import * as fs from 'fs';

/**
 * Script pour télécharger les images actuelles du Play Store
 */

async function downloadPlayImages() {
  console.log('📥 Téléchargement des images du Play Store\n');

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');
  const packageName = 'com.pierretulle.juno2';
  const outputDir = path.join(__dirname, '..', 'play-store-images');

  // Créer le dossier de sortie
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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

    console.log('📸 Téléchargement des images françaises...\n');

    // 1. Feature Graphic
    console.log('1️⃣  Feature Graphic');
    const frFeatureGraphic = await androidPublisher.edits.images.list({
      packageName,
      editId,
      language: 'fr-FR',
      imageType: 'featureGraphic',
    });

    if (frFeatureGraphic.data.images && frFeatureGraphic.data.images.length > 0) {
      const imageUrl = frFeatureGraphic.data.images[0].url;
      console.log('   URL:', imageUrl);

      const response = await axios.get(imageUrl!, { responseType: 'arraybuffer' });
      const filePath = path.join(outputDir, 'feature-graphic.png');
      fs.writeFileSync(filePath, response.data);

      console.log('   ✅ Sauvegardé:', filePath);
    }

    // 2. Screenshots téléphone
    console.log('\n2️⃣  Screenshots téléphone');
    const frPhoneScreenshots = await androidPublisher.edits.images.list({
      packageName,
      editId,
      language: 'fr-FR',
      imageType: 'phoneScreenshots',
    });

    if (frPhoneScreenshots.data.images && frPhoneScreenshots.data.images.length > 0) {
      console.log(`   ${frPhoneScreenshots.data.images.length} screenshots trouvés\n`);

      for (let i = 0; i < frPhoneScreenshots.data.images.length; i++) {
        const image = frPhoneScreenshots.data.images[i];
        console.log(`   Screenshot ${i + 1}/${frPhoneScreenshots.data.images.length}`);
        console.log('   URL:', image.url);

        const response = await axios.get(image.url!, { responseType: 'arraybuffer' });
        const filePath = path.join(outputDir, `screenshot-${i + 1}.png`);
        fs.writeFileSync(filePath, response.data);

        console.log('   ✅ Sauvegardé:', filePath, '\n');
      }
    }

    // 3. Icône
    console.log('3️⃣  Icône');
    try {
      const frIcon = await androidPublisher.edits.images.list({
        packageName,
        editId,
        language: 'fr-FR',
        imageType: 'icon',
      });

      if (frIcon.data.images && frIcon.data.images.length > 0) {
        const imageUrl = frIcon.data.images[0].url;
        console.log('   URL:', imageUrl);

        const response = await axios.get(imageUrl!, { responseType: 'arraybuffer' });
        const filePath = path.join(outputDir, 'icon.png');
        fs.writeFileSync(filePath, response.data);

        console.log('   ✅ Sauvegardé:', filePath);
      }
    } catch (error: any) {
      console.log('   ℹ️  Icône définie dans l\'APK/AAB');
    }

    // Nettoyer
    await androidPublisher.edits.delete({
      packageName,
      editId,
    });

    console.log('\n✅ TÉLÉCHARGEMENT TERMINÉ !\n');
    console.log('📁 Images sauvegardées dans:', outputDir);
    console.log('\n💡 Ces images sont déjà sur le Play Store en français.');
    console.log('   Elles sont universelles et peuvent être utilisées pour l\'anglais aussi.');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

downloadPlayImages();
