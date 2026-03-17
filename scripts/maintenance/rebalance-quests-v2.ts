import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Rééquilibrage basé sur la vraie difficulté :
 * - 10k pts = facile (joueur moyen)
 * - 15k pts = faisable (joueur correct)
 * - 50k pts = bon joueur avec entraînement
 */

async function rebalanceQuests() {
  console.log('🎯 RÉÉQUILIBRAGE V2 - Basé sur la vraie difficulté\n');

  // ========== QUÊTES QUOTIDIENNES ==========
  console.log('📅 Quêtes quotidiennes...');

  const dailyUpdates = [
    // Garder les petits scores pour débutants
    { key: 'daily_score_500', updates: { xp_reward: 40 } },
    { key: 'daily_score_1000', updates: { xp_reward: 60 } },
    { key: 'daily_score_3000', updates: { xp_reward: 120 } },

    // Ajuster les scores moyens/faciles
    { key: 'daily_score_5000', updates: { xp_reward: 180 } },
    { key: 'daily_score_10000', updates: { xp_reward: 300, title: '⭐ Score de 10000 (Facile)' } },

    // Ajouter des paliers pour joueurs confirmés
    { key: 'daily_play_3', updates: { xp_reward: 80 } },
    { key: 'daily_play_5', updates: { xp_reward: 150 } },
    { key: 'daily_streak_5', updates: { xp_reward: 100 } },
    { key: 'daily_streak_10', updates: { xp_reward: 200 } },
    { key: 'daily_high_streak', updates: { xp_reward: 300 } },
  ];

  // ========== QUÊTES HEBDOMADAIRES ==========
  console.log('📆 Quêtes hebdomadaires...');

  const weeklyUpdates = [
    // Scores adaptés à la difficulté réelle
    { key: 'weekly_score_5000', updates: { target_value: 10000, xp_reward: 500, title: '💎 Score de 10000' } },
    { key: 'weekly_champion_50000', updates: { is_active: true, xp_reward: 1500, title: '🏆 Champion 50k' } },
    { key: 'weekly_score_50000', updates: { is_active: true, xp_reward: 1500, title: '🌟 Score de 50000' } },

    // Ajuster volume de jeu
    { key: 'weekly_play_15', updates: { target_value: 25, xp_reward: 500, title: '📅 25 Parties' } },
    { key: 'weekly_streak_15', updates: { xp_reward: 400 } },
    { key: 'weekly_long_streak', updates: { target_value: 25, xp_reward: 600, title: '💫 Série de 25' } },
    { key: 'weekly_precision_master', updates: { xp_reward: 500 } },
    { key: 'weekly_daily_quests', updates: { target_value: 12, xp_reward: 400, title: '✅ 12 Quêtes Quotidiennes' } },
  ];

  // ========== QUÊTES MENSUELLES ==========
  console.log('🗓️  Quêtes mensuelles...');

  const monthlyUpdates = [
    // Réactiver et ajuster pour bons joueurs
    { key: 'monthly_score_20000', updates: { target_value: 15000, xp_reward: 600, title: '💎 Score de 15000' } },
    { key: 'monthly_high_score', updates: { target_value: 30000, xp_reward: 1200, title: '🌟 Score de 30000' } },
    { key: 'monthly_score_100000', updates: { is_active: true, target_value: 50000, xp_reward: 2000, title: '💰 Score de 50000' } },
    { key: 'monthly_score_200000', updates: { is_active: true, target_value: 100000, xp_reward: 4000, title: '👑 Score de 100000 cumulé' } },

    // Volume de jeu mensuel
    { key: 'monthly_play_50', updates: { target_value: 80, xp_reward: 1500, title: '🏆 80 Parties' } },
    { key: 'monthly_streak_master', updates: { target_value: 50, xp_reward: 6000, title: '💎 50 Jours de Série' } },
    { key: 'monthly_daily_login', updates: { xp_reward: 800 } },
    { key: 'monthly_weekly_quests', updates: { xp_reward: 1000 } },
  ];

  // Appliquer toutes les mises à jour
  const allUpdates = [...dailyUpdates, ...weeklyUpdates, ...monthlyUpdates];

  for (const { key, updates } of allUpdates) {
    const { error } = await supabase
      .from('daily_quests')
      .update(updates)
      .eq('quest_key', key);

    if (error) {
      console.error(`❌ Erreur pour ${key}:`, error.message);
    } else {
      console.log(`✅ ${key}`);
    }
  }

  console.log('\n✨ Rééquilibrage V2 terminé !');

  // Simuler la nouvelle conversion XP
  const pointsToXP = (points: number) => {
    const x = Math.max(points, 0);
    const xpBase = 40;
    const k = 0.6;
    const alpha = 0.70;

    let xpRaw = xpBase + k * Math.pow(x, alpha);

    if (x > 15000) {
      const surplus = x - 15000;
      xpRaw += k * (0.5 * Math.pow(surplus, 0.5));
    }

    return Math.min(Math.max(Math.round(xpRaw), 20), 1200);
  };

  console.log('\n📊 Nouvelles conversions XP :');
  [5000, 10000, 15000, 20000, 30000, 50000, 100000].forEach(pts => {
    console.log(`  ${pts.toLocaleString().padStart(7)} pts → ${pointsToXP(pts).toString().padStart(4)} XP`);
  });
}

rebalanceQuests().catch(console.error);

