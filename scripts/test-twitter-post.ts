import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

async function testPost() {
  console.log('🐦 Test de posting Twitter...\n');

  const credentialsPath = path.join(process.cwd(), 'twitter-credentials.json');
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessTokenSecret,
  });

  try {
    console.log('📤 Tentative de poster un tweet de test...');

    const tweet = await client.v2.tweet({
      text: '🎮 Premier tweet automatique de Timalaus Quiz ! Le bot marketing est opérationnel 🚀\n\n#QuizGame #Timalaus'
    });

    console.log('\n✅ SUCCÈS ! Tweet posté !\n');
    console.log(`🔗 Voir le tweet: https://twitter.com/timalaus/status/${tweet.data.id}`);
    console.log('\n🎉 Les permissions "Read and Write" sont actives !');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);

    if (error.code === 403) {
      console.error('\n⚠️  Permissions insuffisantes !');
      console.error('   Les permissions "Read and Write" ne sont pas activées.');
      console.error('   Il faut configurer l\'authentification sur Twitter Developer Portal.\n');
    } else if (error.code === 429) {
      console.error('\n⏱️  Rate limit atteint. Attendez 2-3 minutes et réessayez.\n');
    } else {
      console.error('\n💡 Erreur inattendue. Code:', error.code);
    }

    process.exit(1);
  }
}

testPost();
