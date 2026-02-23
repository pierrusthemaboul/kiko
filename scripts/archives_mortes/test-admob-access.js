const { google } = require('googleapis');
const fs = require('fs');

async function testAdMobAccess() {
  try {
    // Charger les credentials
    const credentials = JSON.parse(
      fs.readFileSync('./kiko-chrono-e34241a84e41.json', 'utf8')
    );

    // Créer un client d'authentification avec le bon scope
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/admob.readonly',
        'https://www.googleapis.com/auth/admob.report'
      ],
    });

    const authClient = await auth.getClient();

    console.log('✅ Authentification réussie!');
    console.log('📊 Client authentifié:', authClient.email);
    console.log('📊 Tentative de récupération des comptes AdMob...\n');

    const admob = google.admob({ version: 'v1', auth: authClient });

    // Lister les comptes AdMob
    const accountsResponse = await admob.accounts.list();

    if (accountsResponse.data.account && accountsResponse.data.account.length > 0) {
      console.log('✅ ACCÈS ADMOB CONFIRMÉ!\n');
      console.log('Comptes AdMob accessibles:');
      accountsResponse.data.account.forEach((account, index) => {
        console.log(`\n${index + 1}. ${account.name}`);
        console.log(`   Publisher ID: ${account.publisherId}`);
        console.log(`   Devise: ${account.currencyCode}`);
        console.log(`   Fuseau: ${account.reportingTimeZone}`);
      });
    } else {
      console.log('⚠️  Aucun compte AdMob trouvé');
      console.log('Response:', JSON.stringify(accountsResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Erreur lors du test d\'accès AdMob:');
    console.error('Message:', error.message);
    if (error.code) console.error('Code:', error.code);
    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }

    console.log('\n💡 Solutions possibles:');
    console.log('1. Vérifiez que le compte de service a bien été ajouté dans AdMob');
    console.log('2. Allez sur https://apps.admob.com → Paramètres → Utilisateurs');
    console.log('3. Vérifiez que play-console-api@kiko-chrono.iam.gserviceaccount.com est présent');
    console.log('4. Attendez quelques minutes que les permissions se propagent');
  }
}

testAdMobAccess();
