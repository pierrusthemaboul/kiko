const { google } = require('googleapis');
const fs = require('fs');

async function testAdMobWithPublisherId() {
  try {
    // Votre Publisher ID depuis AdMob
    const publisherId = 'pub-7809209690404525';
    const accountName = `accounts/${publisherId}`;

    console.log('📊 Test d\'accès AdMob avec Publisher ID');
    console.log('Publisher ID:', publisherId);
    console.log('Account Name:', accountName);
    console.log('');

    // Charger les credentials du compte de service
    const credentials = JSON.parse(
      fs.readFileSync('./kiko-chrono-e34241a84e41.json', 'utf8')
    );

    // Créer un client d'authentification
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/admob.readonly',
        'https://www.googleapis.com/auth/admob.report'
      ],
    });

    const authClient = await auth.getClient();
    console.log('✅ Client authentifié:', credentials.client_email);

    const admob = google.admob({ version: 'v1', auth: authClient });

    // Test 1: Récupérer les informations du compte
    console.log('\n📋 Test 1: Récupération des informations du compte...');
    try {
      const accountInfo = await admob.accounts.get({
        name: accountName
      });
      console.log('✅ Compte trouvé!');
      console.log('Nom:', accountInfo.data.name);
      console.log('Publisher ID:', accountInfo.data.publisherId);
      console.log('Devise:', accountInfo.data.currencyCode);
      console.log('Fuseau horaire:', accountInfo.data.reportingTimeZone);
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    // Test 2: Lister les applications
    console.log('\n📱 Test 2: Liste des applications AdMob...');
    try {
      const apps = await admob.accounts.apps.list({
        parent: accountName
      });

      if (apps.data.apps && apps.data.apps.length > 0) {
        console.log(`✅ ${apps.data.apps.length} application(s) trouvée(s):`);
        apps.data.apps.forEach((app, index) => {
          console.log(`\n${index + 1}. ${app.name}`);
          console.log(`   Platform: ${app.platform}`);
          console.log(`   App Store ID: ${app.appStoreId || 'N/A'}`);
          console.log(`   Linked: ${app.linkedAppInfo ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('⚠️  Aucune application trouvée');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
      if (error.code) console.log('Code:', error.code);
    }

    // Test 3: Lister les unités publicitaires
    console.log('\n📢 Test 3: Liste des unités publicitaires...');
    try {
      const adUnits = await admob.accounts.adUnits.list({
        parent: accountName
      });

      if (adUnits.data.adUnits && adUnits.data.adUnits.length > 0) {
        console.log(`✅ ${adUnits.data.adUnits.length} unité(s) publicitaire(s) trouvée(s):`);
        adUnits.data.adUnits.forEach((unit, index) => {
          console.log(`\n${index + 1}. ${unit.displayName}`);
          console.log(`   ID: ${unit.adUnitId}`);
          console.log(`   Format: ${unit.adFormat}`);
        });
      } else {
        console.log('⚠️  Aucune unité publicitaire trouvée');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests terminés!');

  } catch (error) {
    console.error('\n❌ Erreur globale:', error.message);
    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAdMobWithPublisherId();
