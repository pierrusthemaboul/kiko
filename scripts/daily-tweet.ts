import { createClient } from '@supabase/supabase-js';
import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

async function postDailyTweet() {
  console.log('🐦 Préparation du tweet quotidien...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Charger credentials Twitter
  const twitterPath = path.join(process.cwd(), 'twitter-credentials.json');
  const credentials = JSON.parse(fs.readFileSync(twitterPath, 'utf-8'));

  const client = new TwitterApi({
    appKey: credentials.apiKey,
    appSecret: credentials.apiSecret,
    accessToken: credentials.accessToken,
    accessSecret: credentials.accessTokenSecret,
  });

  try {
    // 1. Récupérer un événement aléatoire depuis Supabase
    const { data: randomEvents } = await supabase
      .from('evenements')
      .select('*')
      .gte('notoriete', 30) // Events assez connus pour être intéressants
      .limit(20);

    if (!randomEvents || randomEvents.length === 0) {
      throw new Error('Aucun événement trouvé dans la base de données');
    }

    const randomEvent = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    const eventYear = new Date(randomEvent.date).getFullYear();

    // 2. Récupérer les statistiques du jour
    const today = new Date().toISOString().split('T')[0];

    // Top score classique
    const { data: topClassicScore } = await supabase
      .from('game_scores')
      .select('score, game_mode')
      .eq('game_mode', 'classique')
      .gte('created_at', today)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    // Top score précision
    const { data: topPrecisionScore } = await supabase
      .from('game_scores')
      .select('score, game_mode, max_level')
      .eq('game_mode', 'precision')
      .gte('created_at', today)
      .order('score', { ascending: false })
      .limit(1)
      .single();

    // 3. Préparer le tweet
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today_name = dayNames[new Date().getDay()];

    // Créer des tweets toujours pertinents
    const tweetTexts = [];

    // Format 1: Mode Classique - Avant/Après Challenge (toujours pertinent)
    tweetTexts.push(`🎯 Challenge ${today_name} - Mode Classique

"${randomEvent.titre}"

C'était AVANT ou APRÈS ${eventYear > 0 ? eventYear - 50 : Math.abs(eventYear) + 50} ?

⚡ 20 secondes pour répondre
❤️ 3 vies pour survivre

#Timalaus
📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);

    // Format 2: Mode Précision - Devinez l'année (toujours pertinent)
    tweetTexts.push(`🎖️ Défi Précision du ${today_name}

"${randomEvent.titre}"

Devinez l'année exacte ! 📅

🎯 Système de tolérance intelligent
💚 Barre de HP dynamique
⭐ Scoring jusqu'à 800 points

#Timalaus
📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);

    // Format 3: Le saviez-vous avec réponse (toujours pertinent)
    const yearDisplay = eventYear > 0 ? `${eventYear}` : `${Math.abs(eventYear)} av. J.-C.`;
    tweetTexts.push(`💡 Le saviez-vous ?

${randomEvent.titre}

📅 C'était en ${yearDisplay} !

${randomEvent.description_detaillee ? randomEvent.description_detaillee.substring(0, 120) + '...' : 'Découvrez des milliers d\'événements historiques !'}

#Timalaus
📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);

    // Format 4: Focus sur les 2 modes (toujours pertinent)
    tweetTexts.push(`🎮 Deux Modes de Jeu sur #Timalaus

🎯 CLASSIQUE
Avant/Après • 20s • 3 vies

🎖️ PRÉCISION
Devinez l'année exacte • HP dynamique • Jusqu'à 800 pts

Des milliers d'événements historiques !

📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);

    // Ajouter stats seulement si on a des scores réels
    if (topClassicScore && topClassicScore.score > 0) {
      tweetTexts.push(`🔥 Record ${today_name} - Mode Classique

🏆 Meilleur score aujourd'hui: ${topClassicScore.score} points !

Pouvez-vous faire mieux ?

🎮 Avant ou Après ?
⏱️ 20 secondes max
❤️❤️❤️ 3 vies

#Timalaus
📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);
    }

    if (topPrecisionScore && topPrecisionScore.score > 0) {
      tweetTexts.push(`🎖️ Record ${today_name} - Mode Précision

🏆 Meilleur score: ${topPrecisionScore.score} pts
📈 Niveau max atteint: ${topPrecisionScore.max_level}

Testez votre précision historique !
Devinez l'année exacte des événements 📅

#Timalaus
📱 https://play.google.com/store/apps/details?id=com.pierretulle.juno2`);
    }

    // Choisir un tweet aléatoire parmi les tweets pertinents
    const tweetText = tweetTexts[Math.floor(Math.random() * tweetTexts.length)];

    // 4. Poster le tweet
    const tweet = await client.v2.tweet({ text: tweetText });

    console.log('✅ Tweet quotidien posté avec succès !');
    console.log(`🔗 URL: https://twitter.com/timalaus/status/${tweet.data.id}\n`);
    console.log(`📝 Contenu:\n${tweetText}\n`);

    // 5. Notifier sur Discord
    const webhookPath = path.join(process.cwd(), 'discord-webhook.json');
    if (fs.existsSync(webhookPath)) {
      const webhookConfig = JSON.parse(fs.readFileSync(webhookPath, 'utf-8'));
      await fetch(webhookConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🐦 **Tweet quotidien posté !**\n\nhttps://twitter.com/timalaus/status/${tweet.data.id}`,
        }),
      });
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

postDailyTweet();
