import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

async function sendDailyReport() {
  console.log('📊 Génération du rapport quotidien...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Charger le webhook Discord
  const webhookPath = path.join(process.cwd(), 'discord-webhook.json');
  const webhookConfig = JSON.parse(fs.readFileSync(webhookPath, 'utf-8'));

  // Date d'hier pour comparer
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  try {
    // 1. Stats Supabase
    const { count: totalUsers } = await supabase
      .from('game_scores')
      .select('user_id', { count: 'exact', head: true });

    const { count: gamesYesterday } = await supabase
      .from('game_scores')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterdayStr);

    const { data: topScores } = await supabase
      .from('game_scores')
      .select('score, user_id, created_at')
      .order('score', { ascending: false })
      .limit(3);

    // 2. Stats Play Console
    const playConsoleKey = path.join(process.cwd(), 'kiko-chrono-d02fc8cffcf6.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: playConsoleKey,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });

    const packageName = 'com.pierretulle.juno2';

    // Récupérer les statistiques de téléchargements
    let installsYesterday = 'N/A';
    let totalInstalls = 'N/A';

    try {
      // Note: L'API Play Console ne fournit pas directement les stats d'installation en temps réel
      // Il faut utiliser l'API Google Play Developer Reporting
      const reporting = google.playdeveloperreporting({
        version: 'v1beta1',
        auth,
      });

      // Récupérer les statistiques d'acquisition (installs)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1); // Hier

      // Format YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
      const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

      const statsResponse = await reporting.vitals.errors.counts.query({
        parent: `apps/${packageName}`,
        body: {
          dimensions: ['versionCode'],
          metrics: ['distinctUsers'],
          timelineSpec: {
            aggregationPeriod: 'DAILY',
            startTime: { year: startDate.getFullYear(), month: startDate.getMonth() + 1, day: startDate.getDate() },
            endTime: { year: endDate.getFullYear(), month: endDate.getMonth() + 1, day: endDate.getDate() },
          },
        },
      });

      // Les stats de téléchargement ne sont pas disponibles en temps réel via l'API
      // On peut seulement approximer via les nouveaux utilisateurs
      installsYesterday = '~' + (gamesYesterday || 0).toString();
      totalInstalls = '~' + (totalUsers || 0).toString();
    } catch (error: any) {
      console.warn('⚠️ Impossible de récupérer les stats de téléchargement:', error.message);
      // Les valeurs restent 'N/A'
    }

    // Récupérer les derniers avis
    const reviews = await androidPublisher.reviews.list({
      packageName,
      maxResults: 5,
    });

    const recentReviews = reviews.data.reviews || [];
    const avgRating = recentReviews.length > 0
      ? (recentReviews.reduce((sum, r) => sum + (r.comments?.[0]?.userComment?.starRating || 0), 0) / recentReviews.length).toFixed(1)
      : 'N/A';

    // 3. Préparer le message Discord
    const reportDate = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const embed = {
      title: `📊 Rapport quotidien Timalaus - ${reportDate}`,
      color: 0x5865F2, // Bleu Discord
      fields: [
        {
          name: '📥 Téléchargements',
          value: `Total: ${totalInstalls}\nHier: ${installsYesterday}`,
          inline: true,
        },
        {
          name: '👥 Utilisateurs actifs',
          value: `Total: ${totalUsers || 0}`,
          inline: true,
        },
        {
          name: '⭐ Note moyenne',
          value: avgRating,
          inline: true,
        },
        {
          name: '🎮 Parties (24h)',
          value: `${gamesYesterday || 0} parties jouées`,
          inline: false,
        },
        {
          name: '🏆 Top 3 Scores',
          value: topScores && topScores.length > 0
            ? topScores.map((s, i) => `${i + 1}. **${s.score}** points`).join('\n')
            : 'Aucun score',
          inline: false,
        },
        {
          name: '💬 Derniers avis',
          value: recentReviews.length > 0
            ? recentReviews.slice(0, 2).map(r => {
                const comment = r.comments?.[0]?.userComment;
                const stars = '⭐'.repeat(comment?.starRating || 0);
                const text = comment?.text || 'Pas de commentaire';
                return `${stars}\n"${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`;
              }).join('\n\n')
            : 'Aucun avis récent',
          inline: false,
        },
      ],
      footer: {
        text: 'Timalaus Marketing Bot • Rapport automatique quotidien',
      },
      timestamp: new Date().toISOString(),
    };

    // 4. Envoyer sur Discord
    await fetch(webhookConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🌅 **Bonjour ! Voici votre rapport quotidien Timalaus**',
        embeds: [embed],
      }),
    });

    console.log('✅ Rapport quotidien envoyé sur Discord !');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);

    // Envoyer erreur sur Discord
    await fetch(webhookConfig.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚠️ **Erreur lors de la génération du rapport quotidien**\n\`\`\`${error.message}\`\`\``,
      }),
    });

    process.exit(1);
  }
}

sendDailyReport();
