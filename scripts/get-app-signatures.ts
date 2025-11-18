#!/usr/bin/env npx tsx

import { google } from 'googleapis';
import * as path from 'path';

async function getAppSignatures() {
  try {
    // Authentification avec le service account
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'google-play-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    const packageName = 'com.pierretulle.juno2';

    console.log('📱 Récupération des informations de signature pour:', packageName);
    console.log('');

    // Récupérer les informations de l'app bundle
    const appDetails = await androidPublisher.edits.insert({
      packageName,
    });

    const editId = appDetails.data.id!;

    // Récupérer les informations de l'APK/Bundle
    const bundles = await androidPublisher.edits.bundles.list({
      packageName,
      editId,
    });

    console.log('📦 Bundles trouvés:', bundles.data.bundles?.length || 0);

    // Nettoyer l'edit
    await androidPublisher.edits.delete({
      packageName,
      editId,
    });

    console.log('');
    console.log('⚠️  Note: Pour obtenir les empreintes de certificat, vous devez :');
    console.log('');
    console.log('1. Aller sur https://play.google.com/console');
    console.log('2. Sélectionner votre application "Timalaus"');
    console.log('3. Aller dans "Configuration" > "Intégrité de l\'application"');
    console.log('4. Copier les empreintes suivantes :');
    console.log('   - Empreinte du certificat MD5');
    console.log('   - Empreinte du certificat SHA-256');
    console.log('');
    console.log('Alternative : utiliser jarsigner/keytool sur le fichier .aab ou .apk');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);

    console.log('');
    console.log('📋 Instructions pour récupérer manuellement les signatures :');
    console.log('');
    console.log('Option 1 - Via Google Play Console (RECOMMANDÉ) :');
    console.log('1. https://play.google.com/console/u/0/developers/[YOUR_DEV_ID]/app/[APP_ID]/keymanagement');
    console.log('2. Copiez l\'empreinte MD5 et SHA-256 du "Certificat de signature de l\'application"');
    console.log('');
    console.log('Option 2 - Via ligne de commande (si vous avez le .aab) :');
    console.log('   keytool -printcert -jarfile app-release.aab');

    process.exit(1);
  }
}

getAppSignatures();
