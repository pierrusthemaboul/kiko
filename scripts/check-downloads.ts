import { google } from 'googleapis';
import * as path from 'path';

async function checkDownloads() {
  console.log('📥 Vérification des téléchargements...\n');

  try {
    // Authentification Google Play Console
    const playConsoleKey = path.join(process.cwd(), 'kiko-chrono-d02fc8cffcf6.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: playConsoleKey,
      scopes: [
        'https://www.googleapis.com/auth/androidpublisher',
        'https://www.googleapis.com/auth/play.developer.reporting'
      ],
    });

    const packageName = 'com.pierretulle.juno2';

    // 1. Essayer avec l'API Android Publisher (stats basiques)
    console.log('📊 Méthode 1: Android Publisher API\n');

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    // Cette API ne donne pas les stats de téléchargement directement
    // On peut seulement voir les reviews et ratings
    const reviews = await androidPublisher.reviews.list({
      packageName,
      maxResults: 100,
    });

    console.log(`💬 Nombre total d'avis: ${reviews.data.reviews?.length || 0}`);

    // 2. Essayer avec l'API Play Developer Reporting
    console.log('\n📊 Méthode 2: Play Developer Reporting API\n');

    const reporting = google.playdeveloperreporting({
      version: 'v1beta1',
      auth,
    });

    const now = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Essayer de récupérer les métriques d'erreurs (comme proxy pour l'activité)
    try {
      const errorMetrics = await reporting.vitals.errors.counts.query({
        parent: `apps/${packageName}`,
        body: {
          dimensions: ['errorIssueType'],
          metrics: ['errorReportCount', 'distinctUsers'],
          timelineSpec: {
            aggregationPeriod: 'DAILY',
            startTime: {
              year: twoDaysAgo.getFullYear(),
              month: twoDaysAgo.getMonth() + 1,
              day: twoDaysAgo.getDate(),
            },
            endTime: {
              year: now.getFullYear(),
              month: now.getMonth() + 1,
              day: now.getDate(),
            },
          },
        },
      });

      console.log('📈 Métriques d\'erreurs (48h):');
      console.log(JSON.stringify(errorMetrics.data, null, 2));
    } catch (error: any) {
      console.log('⚠️ API Play Developer Reporting non accessible:', error.message);
      console.log('   Cette API nécessite une activation spécifique dans Google Cloud Console');
    }

    // 3. Informations disponibles via les reviews (estimation)
    console.log('\n📊 Estimation via les avis:\n');

    if (reviews.data.reviews && reviews.data.reviews.length > 0) {
      const last48h = reviews.data.reviews.filter(r => {
        const reviewDate = new Date(r.comments?.[0]?.userComment?.lastModified?.seconds || 0);
        return reviewDate >= twoDaysAgo;
      });

      console.log(`💬 Avis des dernières 48h: ${last48h.length}`);
      console.log(`📊 Total des avis: ${reviews.data.reviews.length}`);

      // Calculer la note moyenne
      const avgRating = reviews.data.reviews.reduce(
        (sum, r) => sum + (r.comments?.[0]?.userComment?.starRating || 0),
        0
      ) / reviews.data.reviews.length;

      console.log(`⭐ Note moyenne: ${avgRating.toFixed(2)}/5`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('ℹ️  NOTE IMPORTANTE:');
    console.log('='.repeat(60));
    console.log('Google Play Console ne fournit PAS les statistiques de');
    console.log('téléchargement en temps réel via l\'API.');
    console.log('');
    console.log('Pour obtenir ces données:');
    console.log('1. Connectez-vous à https://play.google.com/console');
    console.log('2. Allez dans "Statistiques" > "Acquisition des utilisateurs"');
    console.log('3. Consultez les téléchargements des dernières 48h');
    console.log('');
    console.log('Alternatives:');
    console.log('- Firebase Analytics (si intégré dans l\'app)');
    console.log('- Google Analytics for Firebase');
    console.log('- Statistiques Supabase (utilisateurs actifs)');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    if (error.response) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

checkDownloads();
