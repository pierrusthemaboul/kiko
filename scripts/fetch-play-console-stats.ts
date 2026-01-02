import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script pour récupérer les statistiques Google Play Console
 * et les stocker dans Supabase
 *
 * Utilise le service account: play-console-api-60@kiko-chrono.iam.gserviceaccount.com
 */

// Configuration
const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PACKAGE_NAME = 'com.pierretulle.juno2';
const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, '..', 'kiko-chrono-c28384984e64.json');

// Initialiser Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Authentifier avec Google Play Console API
 */
async function authenticateGooglePlay() {
  const keyFile = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: [
      'https://www.googleapis.com/auth/androidpublisher',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
  });

  return await auth.getClient();
}

/**
 * Récupérer les statistiques de l'app
 */
async function fetchPlayConsoleStats() {
  console.log('🔐 Authentification avec Google Play Console...');
  const authClient = await authenticateGooglePlay();

  const androidpublisher = google.androidpublisher({
    version: 'v3',
    auth: authClient as any,
  });

  console.log(`📱 Récupération des données pour ${PACKAGE_NAME}...`);

  try {
    // Récupérer les reviews
    const reviews = await androidpublisher.reviews.list({
      packageName: PACKAGE_NAME,
      maxResults: 100,
    });

    console.log(`✅ ${reviews.data.reviews?.length || 0} avis récupérés`);

    // Calculer les statistiques
    const stats = {
      package_name: PACKAGE_NAME,
      total_reviews: reviews.data.reviews?.length || 0,
      average_rating: calculateAverageRating(reviews.data.reviews || []),
      fetched_at: new Date().toISOString(),
      reviews_data: reviews.data.reviews || [],
    };

    return stats;
  } catch (error: any) {
    console.error('❌ Erreur lors de la récupération des données:', error.message);

    if (error.code === 401) {
      console.error('⚠️  Service account non autorisé. Tu dois:');
      console.error('   1. Aller sur https://play.google.com/console');
      console.error('   2. Paramètres > API access');
      console.error('   3. Lier le service account: play-console-api-60@kiko-chrono.iam.gserviceaccount.com');
      console.error('   4. Donner les permissions "View app information and download bulk reports"');
    }

    throw error;
  }
}

/**
 * Calculer la note moyenne
 */
function calculateAverageRating(reviews: any[]): number {
  if (reviews.length === 0) return 0;

  const sum = reviews.reduce((acc, review) => {
    return acc + (review.comments?.[0]?.userComment?.starRating || 0);
  }, 0);

  return Math.round((sum / reviews.length) * 100) / 100;
}

/**
 * Sauvegarder les stats dans Supabase
 */
async function saveToSupabase(stats: any) {
  console.log('💾 Sauvegarde dans Supabase...');

  // Créer une table si elle n'existe pas (à faire manuellement dans Supabase UI)
  const { data, error } = await supabase
    .from('play_console_stats')
    .insert([{
      package_name: stats.package_name,
      total_reviews: stats.total_reviews,
      average_rating: stats.average_rating,
      fetched_at: stats.fetched_at,
      reviews_data: stats.reviews_data,
    }]);

  if (error) {
    console.error('❌ Erreur Supabase:', error.message);

    if (error.code === '42P01') {
      console.error('⚠️  La table "play_console_stats" n\'existe pas.');
      console.error('   Crée-la dans Supabase avec:');
      console.error('   CREATE TABLE play_console_stats (');
      console.error('     id BIGSERIAL PRIMARY KEY,');
      console.error('     package_name TEXT,');
      console.error('     total_reviews INTEGER,');
      console.error('     average_rating NUMERIC,');
      console.error('     fetched_at TIMESTAMP,');
      console.error('     reviews_data JSONB');
      console.error('   );');
    }

    throw error;
  }

  console.log('✅ Données sauvegardées dans Supabase!');
  return data;
}

/**
 * Script principal
 */
async function main() {
  console.log('🚀 Démarrage du script Play Console Stats...\n');

  try {
    const stats = await fetchPlayConsoleStats();
    console.log('\n📊 Statistiques récupérées:');
    console.log(`   - Total avis: ${stats.total_reviews}`);
    console.log(`   - Note moyenne: ${stats.average_rating}/5`);

    await saveToSupabase(stats);

    console.log('\n🎉 Script terminé avec succès!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Erreur fatale:', error.message);
    process.exit(1);
  }
}

// Lancer le script
if (require.main === module) {
  main();
}

export { fetchPlayConsoleStats, saveToSupabase };
