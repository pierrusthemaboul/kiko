import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

async function testTwitterConnection() {
  console.log('🐦 Test de connexion Twitter API...\n');

  // Charger les credentials
  const credentialsPath = path.join(process.cwd(), 'twitter-credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Fichier twitter-credentials.json introuvable !');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

  // Initialiser le client Twitter
  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessTokenSecret,
  });

  try {
    // 1. Vérifier l'identité du compte
    console.log('1️⃣ Vérification du compte...');
    const user = await client.v2.me();
    console.log(`✅ Connecté en tant que: @${user.data.username}`);
    console.log(`   Nom: ${user.data.name}`);
    console.log(`   ID: ${user.data.id}\n`);

    // 2. Récupérer les stats du compte
    console.log('2️⃣ Statistiques du compte...');
    const userDetails = await client.v2.user(user.data.id, {
      'user.fields': ['public_metrics', 'created_at']
    });

    if (userDetails.data.public_metrics) {
      console.log(`   Followers: ${userDetails.data.public_metrics.followers_count}`);
      console.log(`   Following: ${userDetails.data.public_metrics.following_count}`);
      console.log(`   Tweets: ${userDetails.data.public_metrics.tweet_count}`);
    }

    if (userDetails.data.created_at) {
      console.log(`   Compte créé: ${new Date(userDetails.data.created_at).toLocaleDateString('fr-FR')}\n`);
    }

    // 3. Vérifier les permissions (read & write)
    console.log('3️⃣ Test des permissions d\'écriture...');
    console.log('   Tentative de poster un tweet de test...\n');

    // Test de posting
    const testTweet = await client.v2.tweet({
      text: '🎮 Premier tweet automatique de Timalaus Quiz ! Test réussi 🚀 #QuizGame'
    });
    console.log(`✅ Tweet de test posté avec succès !`);
    console.log(`   URL: https://twitter.com/${user.data.username}/status/${testTweet.data.id}\n`);

    console.log('✅ Tous les tests passés avec succès ! 🎉');
    console.log('\n📊 Résumé:');
    console.log('   ✅ Authentification OK');
    console.log('   ✅ Lecture des données OK');
    console.log('   ⚠️  Écriture (poster tweets) - À tester en décommentant le code\n');

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);

    if (error.code === 403) {
      console.error('\n💡 Vérifiez que votre app a les permissions "Read and Write"');
      console.error('   Allez sur: https://developer.twitter.com/en/portal/projects-and-apps');
      console.error('   Settings → User authentication settings → App permissions → Read and Write');
    }

    process.exit(1);
  }
}

testTwitterConnection();
