import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

/**
 * Script pour vérifier les images actuelles sur le Play Store
 */

async function checkPlayImages() {
  console.log('🖼️  Vérification des images sur le Play Store\n');

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

    console.log('📱 Vérification des images pour chaque langue...\n');

    // Vérifier pour le français et l'anglais
    for (const language of ['fr-FR', 'en-US', '0']) {
      try {
        console.log(`\n🌍 Langue: ${language}`);
        console.log('─'.repeat(50));

        // Vérifier les images
        const images = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language,
          imageType: 'featureGraphic',
        });

        console.log('\n📊 Feature Graphic (bannière 1024x500):');
        if (images.data.images && images.data.images.length > 0) {
          console.log(`  ✅ ${images.data.images.length} image(s) présente(s)`);
          images.data.images.forEach((img, i) => {
            console.log(`     ${i + 1}. ${img.id}`);
          });
        } else {
          console.log('  ❌ Aucune feature graphic');
        }

        // Screenshots phone
        const phoneScreenshots = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language,
          imageType: 'phoneScreenshots',
        });

        console.log('\n📱 Screenshots téléphone:');
        if (phoneScreenshots.data.images && phoneScreenshots.data.images.length > 0) {
          console.log(`  ✅ ${phoneScreenshots.data.images.length} screenshot(s)`);
          phoneScreenshots.data.images.forEach((img, i) => {
            console.log(`     ${i + 1}. ${img.id}`);
          });
        } else {
          console.log('  ❌ Aucun screenshot');
        }

        // Screenshots tablet
        const tabletScreenshots = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language,
          imageType: 'sevenInchScreenshots',
        });

        console.log('\n📱 Screenshots tablette 7":');
        if (tabletScreenshots.data.images && tabletScreenshots.data.images.length > 0) {
          console.log(`  ✅ ${tabletScreenshots.data.images.length} screenshot(s)`);
        } else {
          console.log('  ⚠️  Aucun screenshot (optionnel)');
        }

        // Icon
        const icon = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language,
          imageType: 'icon',
        });

        console.log('\n🎯 Icône:');
        if (icon.data.images && icon.data.images.length > 0) {
          console.log(`  ✅ ${icon.data.images.length} icône(s)`);
        } else {
          console.log('  ⚠️  Définie dans l\'APK/AAB');
        }

        // Promo graphic
        const promoGraphic = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language,
          imageType: 'promoGraphic',
        });

        console.log('\n🎨 Promo Graphic (180x120):');
        if (promoGraphic.data.images && promoGraphic.data.images.length > 0) {
          console.log(`  ✅ ${promoGraphic.data.images.length} image(s)`);
        } else {
          console.log('  ⚠️  Aucune (optionnel)');
        }

      } catch (error: any) {
        if (language === '0') {
          console.log(`  ℹ️  Langue par défaut non configurée`);
        } else {
          console.log(`  ⚠️  Erreur pour ${language}:`, error.message);
        }
      }
    }

    // Nettoyer
    await androidPublisher.edits.delete({
      packageName,
      editId,
    });

    console.log('\n\n📋 RÉSUMÉ\n');
    console.log('Pour améliorer la visibilité de votre app, je recommande:');
    console.log('  1. ✨ Feature Graphic obligatoire (1024x500px)');
    console.log('  2. 📱 Au moins 2-8 screenshots téléphone');
    console.log('  3. 🎯 Icône bien visible et reconnaissable');
    console.log('  4. 🎨 (Optionnel) Promo Graphic pour promotions');
    console.log('\nJe peux vous aider à créer ces images si vous avez:');
    console.log('  - Le logo de Timalaus');
    console.log('  - Des captures d\'écran de l\'app');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkPlayImages();
