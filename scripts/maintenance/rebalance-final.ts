import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * RÉÉQUILIBRAGE FINAL v3
 *
 * Objectifs :
 * - Multiplier par 2.5x les XP requis pour les grades
 * - Rendre les quêtes plus exigeantes en points
 * - Récompenser davantage les gros scores (15k, 50k)
 */

async function rebalanceFinal() {
  console.log('🎯 RÉÉQUILIBRAGE FINAL v3\n');
  console.log('Objectif : Ralentir la progression et rendre les quêtes plus challengeantes\n');

  // ========== QUÊTES QUOTIDIENNES ==========
  console.log('📅 Mise à jour des quêtes quotidiennes...\n');

  const dailyUpdates = [
    // Garder les petites quêtes pour débutants (réduire récompenses)
    { key: 'daily_score_500', updates: { xp_reward: 30 } },
    { key: 'daily_score_1000', updates: { xp_reward: 50 } },
    { key: 'daily_score_3000', updates: { xp_reward: 80 } },
    { key: 'daily_score_5000', updates: { xp_reward: 120 } },

    // Augmenter l'exigence de la quête "facile"
    { key: 'daily_score_10000', updates: {
      target_value: 15000,
      xp_reward: 300,
      title: '⭐ Score de 15000',
      description: 'Atteindre 15 000 points en une partie'
    }},

    // Quêtes de volume
    { key: 'daily_play_3', updates: { xp_reward: 60 } },
    { key: 'daily_play_5', updates: { xp_reward: 120 } },

    // Quêtes de streak
    { key: 'daily_streak_5', updates: { xp_reward: 80 } },
    { key: 'daily_streak_10', updates: { xp_reward: 150 } },
    { key: 'daily_high_streak', updates: {
      target_value: 20,
      xp_reward: 250,
      title: '🌟 Série de 20',
      description: 'Faire une série de 20 bonnes réponses'
    }},

    // Quêtes skill (valoriser la qualité)
    { key: 'daily_no_mistake_5', updates: { xp_reward: 200 } },
    { key: 'daily_speed_master', updates: { xp_reward: 180 } },
    { key: 'daily_precision_perfect', updates: { xp_reward: 250 } },
    { key: 'daily_both_modes', updates: { xp_reward: 150 } },
  ];

  // ========== QUÊTES HEBDOMADAIRES ==========
  console.log('📆 Mise à jour des quêtes hebdomadaires...\n');

  const weeklyUpdates = [
    // Augmenter les exigences de score
    { key: 'weekly_score_5000', updates: {
      target_value: 30000,
      xp_reward: 600,
      title: '💎 Score de 30 000',
      description: 'Atteindre 30 000 points en une partie'
    }},

    // Garder les quêtes 50k (bon joueur avec entraînement)
    { key: 'weekly_champion_50000', updates: {
      xp_reward: 1500,
      title: '🏆 Champion 50k',
      description: 'Atteindre 50 000 points en une partie'
    }},
    { key: 'weekly_score_50000', updates: {
      xp_reward: 1500,
      title: '🌟 Maître du Score',
      description: 'Atteindre 50 000 points en une partie'
    }},

    // Augmenter volume de jeu
    { key: 'weekly_play_15', updates: {
      target_value: 30,
      xp_reward: 600,
      title: '📅 30 Parties',
      description: 'Jouer 30 parties dans la semaine'
    }},

    // Ajuster les streaks
    { key: 'weekly_streak_15', updates: {
      target_value: 25,
      xp_reward: 500,
      title: '🔥 Série de 25',
      description: 'Faire une série de 25 bonnes réponses'
    }},
    { key: 'weekly_long_streak', updates: {
      target_value: 35,
      xp_reward: 800,
      title: '💫 Série de 35',
      description: 'Faire une série de 35 bonnes réponses'
    }},

    // Quêtes diverses
    { key: 'weekly_precision_master', updates: {
      target_value: 10,
      xp_reward: 700,
      title: '🎯 10 Parties Précision',
      description: 'Jouer 10 parties en mode Précision'
    }},
    { key: 'weekly_daily_quests', updates: {
      target_value: 15,
      xp_reward: 500,
      title: '✅ 15 Quêtes Quotidiennes',
      description: 'Compléter 15 quêtes quotidiennes'
    }},
  ];

  // ========== QUÊTES MENSUELLES ==========
  console.log('🗓️  Mise à jour des quêtes mensuelles...\n');

  const monthlyUpdates = [
    // Ajuster les scores mensuels
    { key: 'monthly_score_20000', updates: {
      target_value: 25000,
      xp_reward: 800,
      title: '💎 Score de 25 000',
      description: 'Atteindre 25 000 points en une partie'
    }},
    { key: 'monthly_high_score', updates: {
      target_value: 40000,
      xp_reward: 1500,
      title: '🌟 Score de 40 000',
      description: 'Atteindre 40 000 points en une partie'
    }},

    // Score cumulé mensuel
    { key: 'monthly_score_100000', updates: {
      target_value: 150000,
      xp_reward: 2000,
      title: '💰 150 000 points cumulés',
      description: 'Cumuler 150 000 points dans le mois'
    }},
    { key: 'monthly_score_200000', updates: {
      target_value: 300000,
      xp_reward: 4000,
      title: '👑 300 000 points cumulés',
      description: 'Cumuler 300 000 points dans le mois'
    }},

    // Volume de jeu
    { key: 'monthly_play_50', updates: {
      target_value: 100,
      xp_reward: 2000,
      title: '🏆 100 Parties',
      description: 'Jouer 100 parties dans le mois'
    }},

    // Streaks
    { key: 'monthly_streak_master', updates: {
      target_value: 50,
      xp_reward: 8000,
      title: '💎 50 Jours Consécutifs',
      description: 'Jouer 50 jours d\'affilée'
    }},

    // Autres
    { key: 'monthly_daily_login', updates: {
      target_value: 25,
      xp_reward: 1000,
      title: '📆 25 Jours de Connexion',
      description: 'Se connecter 25 jours dans le mois'
    }},
    { key: 'monthly_weekly_quests', updates: {
      target_value: 10,
      xp_reward: 1500,
      title: '⭐ 10 Quêtes Hebdo',
      description: 'Compléter 10 quêtes hebdomadaires'
    }},
  ];

  // ========== APPLIQUER LES MISES À JOUR ==========
  const allUpdates = [...dailyUpdates, ...weeklyUpdates, ...monthlyUpdates];
  let successCount = 0;
  let errorCount = 0;

  for (const { key, updates } of allUpdates) {
    const { error } = await supabase
      .from('daily_quests')
      .update(updates)
      .eq('quest_key', key);

    if (error) {
      console.error(`❌ ${key}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${key}`);
      successCount++;
    }
  }

  console.log(`\n📊 Résultat : ${successCount} succès, ${errorCount} erreurs\n`);

  // ========== AFFICHER LES NOUVELLES CONVERSIONS ==========
  const pointsToXP = (points: number) => {
    const x = Math.max(points, 0);
    const xpBase = 25;
    const k = 0.45;
    const alpha = 0.68;

    let xpRaw = xpBase + k * Math.pow(x, alpha);

    if (x > 20000) {
      const surplus = x - 20000;
      xpRaw += k * (0.45 * Math.pow(surplus, 0.5));
    }

    return Math.min(Math.max(Math.round(xpRaw), 15), 800);
  };

  console.log('💰 NOUVELLES CONVERSIONS POINTS → XP:\n');
  [5000, 10000, 15000, 20000, 30000, 50000].forEach(pts => {
    console.log(`  ${pts.toLocaleString().padStart(6)} pts → ${pointsToXP(pts).toString().padStart(3)} XP`);
  });

  const xpCurve = (index: number) => Math.round(1125 * index * index + 750 * index + 1000);

  console.log('\n📈 NOUVEAUX SEUILS DE GRADES:\n');
  const ranks = [
    [0, 'Page'],
    [1, 'Écuyer'],
    [2, 'Chevalier Bachelier'],
    [5, 'Baron'],
    [8, 'Comte'],
    [12, 'Duc'],
    [16, 'Archiduc'],
    [19, 'Roi'],
    [22, 'Empereur']
  ];

  const xpPer10k = pointsToXP(10000);
  const xpPer15k = pointsToXP(15000);

  ranks.forEach(([idx, name]) => {
    const xpNeeded = xpCurve(idx);
    const partiesAt10k = Math.ceil(xpNeeded / xpPer10k);
    const partiesAt15k = Math.ceil(xpNeeded / xpPer15k);
    console.log(`  ${name.padEnd(22)}: ${xpNeeded.toLocaleString().padStart(7)} XP (~${partiesAt10k} parties à 10k, ~${partiesAt15k} à 15k)`);
  });

  console.log('\n✨ Rééquilibrage terminé !');
}

rebalanceFinal().catch(console.error);

