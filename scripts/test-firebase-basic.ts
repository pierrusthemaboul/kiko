import * as admin from 'firebase-admin';
import * as path from 'path';

/**
 * Test d'accès Firebase avec Admin SDK (sans Analytics Data API)
 */

async function testFirebaseBasic() {
  console.log('🔥 Test d\'accès Firebase Admin SDK\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const serviceAccountPath = path.join(__dirname, '..', 'kiko-chrono-firebase-adminsdk-fbsvc-1d73e8e206.json');

  try {
    // Initialiser Firebase Admin
    console.log('🔐 Initialisation Firebase Admin SDK...');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        projectId: 'kiko-chrono',
      });
    }

    console.log('   ✅ Firebase Admin initialisé\n');

    // Test 1: Accès Firestore
    console.log('📊 Test accès Firestore...');
    const db = admin.firestore();

    // Lister les collections (si elles existent)
    const collections = await db.listCollections();
    console.log(`   ✅ Firestore accessible - ${collections.length} collection(s) trouvée(s)`);
    if (collections.length > 0) {
      console.log('   Collections:');
      collections.forEach(col => console.log(`     • ${col.id}`));
    }
    console.log('');

    // Test 2: Accès Realtime Database (si configuré)
    console.log('💾 Test accès Realtime Database...');
    try {
      const dbRef = admin.database().ref('/');
      await dbRef.once('value');
      console.log('   ✅ Realtime Database accessible\n');
    } catch (dbError: any) {
      if (dbError.message.includes('not enabled')) {
        console.log('   ℹ️  Realtime Database non activé (normal si vous utilisez Firestore)\n');
      } else {
        console.log('   ⚠️  Erreur:', dbError.message, '\n');
      }
    }

    // Test 3: Info projet
    console.log('📱 Informations du projet Firebase:');
    const app = admin.app();
    console.log(`   Projet: ${app.options.projectId}`);
    console.log(`   Apps initialisées: ${admin.apps.length}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\n✅ FIREBASE ADMIN SDK FONCTIONNE !\n');

    console.log('📊 Ce que je peux faire maintenant:');
    console.log('  ✅ Accéder aux données Firestore');
    console.log('  ✅ Gérer les utilisateurs (si Firebase Auth est configuré)');
    console.log('  ✅ Envoyer des notifications push');
    console.log('  ✅ Lire/Écrire dans la base de données');

    console.log('\n💡 Pour les statistiques Analytics détaillées:');
    console.log('  Nous pouvons utiliser Supabase (déjà configuré) qui contient');
    console.log('  les données de jeu, scores, utilisateurs, etc.');

    console.log('\n🎯 ALTERNATIVE: Utiliser BigQuery Export');
    console.log('  Firebase peut exporter les données Analytics vers BigQuery');
    console.log('  pour des analyses plus poussées. Voulez-vous que je configure ça ?\n');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

testFirebaseBasic();
