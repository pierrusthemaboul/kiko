import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Dashboard Marketing complet - Supabase + Play Console
 *
 * Affiche toutes les métriques clés pour le marketing de Timalaus
 */

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getSupabaseStats() {
  console.log('📊 STATISTIQUES SUPABASE\n');

  // Total utilisateurs
  const { count: totalUsers } = await supabase
    .from('game_scores')
    .select('user_id', { count: 'exact', head: true });

  // Parties jouées aujourd'hui
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: gamesToday } = await supabase
    .from('game_scores')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  // Parties totales
  const { count: totalGames } = await supabase
    .from('game_scores')
    .select('*', { count: 'exact', head: true });

  // Top 10 scores
  const { data: topScores } = await supabase
    .from('game_scores')
    .select('score, user_id, created_at')
    .order('score', { ascending: false })
    .limit(10);

  // Utilisateurs actifs (7 derniers jours)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: activeUsers } = await supabase
    .from('game_scores')
    .select('user_id')
    .gte('created_at', sevenDaysAgo.toISOString());

  const uniqueActiveUsers = new Set(activeUsers?.map(u => u.user_id)).size;

  console.log('👥 Utilisateurs:');
  console.log(`   Total: ${totalUsers || 0}`);
  console.log(`   Actifs (7j): ${uniqueActiveUsers}`);

  console.log('\n🎮 Parties:');
  console.log(`   Total: ${totalGames || 0}`);
  console.log(`   Aujourd'hui: ${gamesToday || 0}`);
  console.log(`   Moyenne/jour: ${totalGames && totalUsers ? Math.round(totalGames / Math.max(totalUsers, 1)) : 0}`);

  console.log('\n🏆 Top 10 Scores:');
  topScores?.slice(0, 5).forEach((score, i) => {
    const date = new Date(score.created_at).toLocaleDateString('fr-FR');
    console.log(`   ${i + 1}. ${score.score.toLocaleString()} pts - ${date}`);
  });

  return {
    totalUsers: totalUsers || 0,
    activeUsers: uniqueActiveUsers,
    totalGames: totalGames || 0,
    gamesToday: gamesToday || 0,
    topScore: topScores?.[0]?.score || 0,
  };
}

async function getPlayConsoleStats() {
  console.log('\n📱 STATISTIQUES PLAY CONSOLE\n');

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');
  const packageName = 'com.pierretulle.juno2';

  try {
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    // Récupérer les avis récents
    const reviews = await androidPublisher.reviews.list({
      packageName,
      maxResults: 100,
    });

    const totalReviews = reviews.data.reviews?.length || 0;
    const ratings = reviews.data.reviews?.map(r => r.comments?.[0]?.userComment?.starRating || 0) || [];
    const avgRating = ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : '0.00';

    // Avis récents (7 derniers jours)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentReviews = reviews.data.reviews?.filter(r => {
      const timestamp = r.comments?.[0]?.userComment?.lastModified?.seconds;
      return timestamp && parseInt(timestamp) * 1000 > sevenDaysAgo;
    }) || [];

    console.log('⭐ Avis:');
    console.log(`   Total: ${totalReviews}`);
    console.log(`   Derniers 7j: ${recentReviews.length}`);
    console.log(`   Note moyenne: ${avgRating}/5`);

    // Derniers avis
    console.log('\n💬 Derniers avis:');
    reviews.data.reviews?.slice(0, 3).forEach(review => {
      const comment = review.comments?.[0]?.userComment;
      const rating = comment?.starRating || 0;
      const text = comment?.text?.substring(0, 60) || '';
      console.log(`   ${'⭐'.repeat(rating)} - ${text}...`);
    });

    return {
      totalReviews,
      recentReviews: recentReviews.length,
      avgRating: parseFloat(avgRating),
    };

  } catch (error: any) {
    console.log('   ⚠️  Erreur accès Play Console:', error.message);
    return {
      totalReviews: 0,
      recentReviews: 0,
      avgRating: 0,
    };
  }
}

async function generateDailyReport() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          📊 DASHBOARD MARKETING - TIMALAUS                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  console.log(`📅 ${date}\n`);
  console.log('═'.repeat(64));

  // Récupérer les stats
  const supabaseStats = await getSupabaseStats();
  const playConsoleStats = await getPlayConsoleStats();

  console.log('\n═'.repeat(64));
  console.log('\n📈 MÉTRIQUES CLÉS\n');

  // Calculs
  const retentionRate = supabaseStats.totalUsers > 0
    ? ((supabaseStats.activeUsers / supabaseStats.totalUsers) * 100).toFixed(1)
    : '0.0';

  const engagementRate = supabaseStats.totalUsers > 0
    ? (supabaseStats.totalGames / supabaseStats.totalUsers).toFixed(1)
    : '0.0';

  console.log('🎯 Acquisition:');
  console.log(`   Utilisateurs totaux: ${supabaseStats.totalUsers}`);
  console.log(`   Avis Play Store: ${playConsoleStats.totalReviews}`);
  console.log(`   Note moyenne: ${playConsoleStats.avgRating}/5 ⭐`);

  console.log('\n📊 Engagement:');
  console.log(`   Parties/utilisateur: ${engagementRate}`);
  console.log(`   Parties aujourd'hui: ${supabaseStats.gamesToday}`);
  console.log(`   Record du jour: ${supabaseStats.topScore.toLocaleString()} pts`);

  console.log('\n🔄 Rétention:');
  console.log(`   Utilisateurs actifs (7j): ${supabaseStats.activeUsers}`);
  console.log(`   Taux de rétention: ${retentionRate}%`);
  console.log(`   Nouveaux avis (7j): ${playConsoleStats.recentReviews}`);

  // Recommandations
  console.log('\n═'.repeat(64));
  console.log('\n💡 RECOMMANDATIONS\n');

  if (playConsoleStats.avgRating < 4.0) {
    console.log('⚠️  Note Play Store < 4.0 → Répondre aux avis négatifs rapidement');
  }

  if (parseFloat(retentionRate) < 20) {
    console.log('⚠️  Rétention < 20% → Améliorer onboarding et notifications push');
  }

  if (supabaseStats.gamesToday === 0) {
    console.log('⚠️  Aucune partie aujourd\'hui → Vérifier si l\'app fonctionne');
  }

  if (playConsoleStats.recentReviews === 0) {
    console.log('💡 Aucun avis récent → Encourager les utilisateurs à laisser un avis');
  }

  if (parseFloat(engagementRate) > 5) {
    console.log('✅ Excellent engagement ! → Moment idéal pour campagne acquisition');
  }

  console.log('\n═'.repeat(64));
  console.log('\n🎯 PROCHAINES ACTIONS\n');
  console.log('1. Consulter marketing1.md pour le plan d\'action complet');
  console.log('2. Vérifier l\'indexation Play Store (recherche "Timalaus")');
  console.log('3. Créer compte Make.com pour automatiser les alertes');
  console.log('4. Setup réseaux sociaux pour partage des high scores\n');

  console.log('═'.repeat(64));
}

// Exécuter le dashboard
generateDailyReport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Erreur:', err);
    process.exit(1);
  });

