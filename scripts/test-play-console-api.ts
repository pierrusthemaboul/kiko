import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de test pour vérifier l'accès à l'API Google Play Console
 *
 * Ce script vérifie que :
 * 1. Le fichier de credentials existe
 * 2. L'authentification fonctionne
 * 3. On peut accéder aux informations de l'app
 */

async function testPlayConsoleAPI() {
  console.log('🚀 Test de connexion à API Google Play Console\n');

  // 1. Vérifier que le fichier de credentials existe
  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');

  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Fichier de credentials introuvable:', credentialsPath);
    process.exit(1);
  }

  console.log('✅ Fichier de credentials trouvé');

  try {
    // 2. Authentification
    console.log('\n🔐 Authentification en cours...');

    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    console.log('✅ Authentification réussie');

    // 3. Créer le client API
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    console.log('\n📱 Récupération des informations de application...');

    // Package name de l'app (depuis app.json)
    const packageName = 'com.pierretulle.juno2';

    // Essayer de récupérer les informations de l'app
    const appDetails = await androidPublisher.edits.insert({
      packageName: packageName,
    });

    console.log('✅ Connexion à l\'API réussie !');
    console.log('\n📊 Informations:');
    console.log('- Package:', packageName);
    console.log('- Edit ID:', appDetails.data.id);
    console.log('- Expiration:', appDetails.data.expiryTimeSeconds);

    // Nettoyer l'edit
    await androidPublisher.edits.delete({
      packageName: packageName,
      editId: appDetails.data.id!,
    });

    console.log('\n🎉 Test réussi ! Accès complet à Play Console.');
    console.log('\n💡 Exemples de ce que je peux faire:');
    console.log('  - Modifier icône de app');
    console.log('  - Changer les screenshots');
    console.log('  - Mettre à jour les descriptions');
    console.log('  - Uploader des APK/AAB');
    console.log('  - Gérer les releases');
    console.log('  - Et bien plus encore !');

  } catch (error: any) {
    console.error('\n❌ Erreur lors du test:');
    console.error('Message:', error.message);

    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.message.includes('Permission')) {
      console.error('\n💡 Conseil: Vérifiez que le compte de service a bien les permissions dans la Play Console');
    }

    process.exit(1);
  }
}

// Exécuter le test
testPlayConsoleAPI();
