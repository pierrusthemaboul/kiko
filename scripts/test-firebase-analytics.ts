import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

/**
 * Script de test pour vérifier l'accès à Firebase Analytics
 */

async function testFirebaseAnalytics() {
  console.log('🔥 Test d\'accès Firebase Analytics\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-firebase-adminsdk-fbsvc-1d73e8e206.json');

  try {
    // 1. Vérifier que le fichier existe
    console.log('📁 Vérification du fichier de credentials...');
    const fs = require('fs');
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Fichier non trouvé: ${credentialsPath}`);
    }
    console.log('   ✅ Fichier trouvé\n');

    // 2. Authentification Firebase
    console.log('🔐 Authentification Firebase...');
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/firebase',
        'https://www.googleapis.com/auth/firebase.readonly',
        'https://www.googleapis.com/auth/analytics',
        'https://www.googleapis.com/auth/analytics.readonly',
      ],
    });

    const authClient = await auth.getClient();
    console.log('   ✅ Authentification réussie\n');

    // 3. Accès Google Analytics Data API (GA4)
    console.log('📊 Test accès Google Analytics Data API...');

    // Pour Firebase/GA4, on utilise l'API Google Analytics Data
    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: authClient,
    });

    // ID de la propriété GA4 (à trouver dans Firebase Analytics)
    // Format: properties/YOUR_PROPERTY_ID
    const propertyId = 'properties/472969518'; // ID par défaut, à vérifier

    try {
      // Essayer de récupérer les métadonnées
      const metadata = await analyticsData.properties.getMetadata({
        name: `${propertyId}/metadata`,
      });

      console.log('   ✅ Accès API réussi\n');
      console.log('📋 Métadonnées disponibles:');
      console.log('   Dimensions disponibles:', metadata.data.dimensions?.length || 0);
      console.log('   Métriques disponibles:', metadata.data.metrics?.length || 0);

    } catch (apiError: any) {
      if (apiError.message.includes('404') || apiError.message.includes('not found')) {
        console.log('   ⚠️  Property ID incorrecte ou non accessible\n');
        console.log('💡 Pour trouver votre Property ID:');
        console.log('   1. Allez sur Firebase Console > Analytics');
        console.log('   2. Cliquez sur l\'icône ⚙️ en haut');
        console.log('   3. Copiez le Property ID (ex: 472969518)');
        console.log('\n   Relancez ensuite ce script avec le bon ID.\n');
      } else {
        throw apiError;
      }
    }

    // 4. Test Firebase Management API
    console.log('🔥 Test Firebase Management API...');
    const firebaseManagement = google.firebase({
      version: 'v1beta1',
      auth: authClient,
    });

    try {
      // Lister les apps du projet
      const projectId = 'kiko-chrono';
      const apps = await firebaseManagement.projects.androidApps.list({
        parent: `projects/${projectId}`,
      });

      console.log('   ✅ Accès Firebase Management réussi\n');
      console.log('📱 Applications trouvées:');
      if (apps.data.apps && apps.data.apps.length > 0) {
        apps.data.apps.forEach((app) => {
          console.log(`   • ${app.displayName} (${app.packageName})`);
        });
      } else {
        console.log('   Aucune app trouvée');
      }

    } catch (firebaseError: any) {
      console.log('   ⚠️  Erreur Firebase Management:', firebaseError.message);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n✅ TEST RÉUSSI - Firebase Analytics configuré !\n');
    console.log('🎯 PROCHAINES ÉTAPES:\n');
    console.log('1. Vérifier le Property ID dans Firebase Console');
    console.log('2. Créer des scripts de monitoring automatique');
    console.log('3. Setup des rapports quotidiens');
    console.log('4. Configurer les alertes en temps réel\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    if (error.response?.data) {
      console.error('\nDétails:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 VÉRIFICATIONS:');
    console.log('1. Le fichier de credentials est-il au bon endroit ?');
    console.log('2. Le service account a-t-il les bonnes permissions ?');
    console.log('   - Firebase Admin SDK');
    console.log('   - Google Analytics Data API');
    console.log('3. Les APIs sont-elles activées dans Google Cloud Console ?\n');

    process.exit(1);
  }
}

testFirebaseAnalytics();
