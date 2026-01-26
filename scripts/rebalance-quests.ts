import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Rééquilibrage des quêtes basé sur les stats réelles :
 * - Médiane: 437 pts
 * - Moyenne: 1659 pts
 * - 1% seulement atteignent 10k+
 * - 0% atteignent 15k+ ou 50k+
 */

async function rebalanceQuests() {
  console.log('🎯 RÉÉQUILIBRAGE DES QUÊTES\n');

  // ========== QUÊTES QUOTIDIENNES ==========
  console.log('📅 Mise à jour des quêtes quotidiennes...');

  const dailyUpdates = [
    // Supprimer les quêtes trop faciles
    { key: 'daily_score_500', updates: { is_active: false } },
    { key: 'daily_score_1000', updates: { is_active: false } },

    // Augmenter les objectifs et récompenses
    { key: 'daily_score_3000', updates: { target_value: 5000, xp_reward: 250, title: '⭐ Score de 5000' } },
    { key: 'daily_score_5000', updates: { target_value: 8000, xp_reward: 350, title: '⭐ Score de 8000' } },
    { key: 'daily_score_10000', updates: { target_value: 12000, xp_reward: 500, title: '⭐ Score de 12000' } },

    // Ajuster les quêtes de jeu
    { key: 'daily_play_3', updates: { xp_reward: 80 } }, // Réduit de 100 → 80
    { key: 'daily_play_5', updates: { xp_reward: 150 } }, // Réduit de 200 → 150

    // Ajuster les streaks
    { key: 'daily_streak_5', updates: { xp_reward: 120 } },
    { key: 'daily_streak_10', updates: { xp_reward: 250 } },
    { key: 'daily_high_streak', updates: { target_value: 20, xp_reward: 350, title: '🌟 Série de 20' } },

    // Quêtes skill plus valorisées
    { key: 'daily_no_mistake_5', updates: { xp_reward: 200 } },
    { key: 'daily_speed_master', updates: { xp_reward: 200 } },
    { key: 'daily_precision_perfect', updates: { xp_reward: 300 } },
    { key: 'daily_both_modes', updates: { xp_reward: 200 } },
  ];

  // ========== QUÊTES HEBDOMADAIRES ==========
  console.log('📆 Mise à jour des quêtes hebdomadaires...');

  const weeklyUpdates = [
    // Désactiver les quêtes impossibles
    { key: 'weekly_champion_50000', updates: { is_active: false } },
    { key: 'weekly_score_50000', updates: { is_active: false } },

    // Ajuster les objectifs réalistes
    { key: 'weekly_score_5000', updates: { target_value: 8000, xp_reward: 400, title: '💎 Score de 8000' } },
    { key: 'weekly_play_15', updates: { target_value: 20, xp_reward: 400, title: '📅 20 Parties' } },
    { key: 'weekly_streak_15', updates: { target_value: 25, xp_reward: 500, title: '🔥 Série de 25' } },
    { key: 'weekly_long_streak', updates: { target_value: 30, xp_reward: 1000, title: '💫 Série de 30' } },
    { key: 'weekly_precision_master', updates: { target_value: 8, xp_reward: 600 } },
    { key: 'weekly_daily_quests', updates: { target_value: 15, xp_reward: 500, title: '✅ 15 Quêtes Quotidiennes' } },
  ];

  // ========== QUÊTES MENSUELLES ==========
  console.log('🗓️  Mise à jour des quêtes mensuelles...');

  const monthlyUpdates = [
    // Désactiver les quêtes irréalistes
    { key: 'monthly_score_100000', updates: { is_active: false } },
    { key: 'monthly_score_200000', updates: { is_active: false } },

    // Ajuster les objectifs
    { key: 'monthly_score_20000', updates: { target_value: 15000, xp_reward: 600, title: '💎 Score de 15000' } },
    { key: 'monthly_high_score', updates: { target_value: 25000, xp_reward: 1500, title: '🌟 Score de 25000' } },
    { key: 'monthly_play_50', updates: { target_value: 60, xp_reward: 1200 } },
    { key: 'monthly_streak_master', updates: { target_value: 40, xp_reward: 5000, title: '💎 40 Jours de Série' } },
    { key: 'monthly_daily_login', updates: { target_value: 25, xp_reward: 800 } },
    { key: 'monthly_weekly_quests', updates: { target_value: 12, xp_reward: 1000, title: '⭐ 12 Quêtes Hebdo' } },
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
      const status = updates.is_active === false ? '🔴 DÉSACTIVÉ' : '✅';
      console.log(`${status} ${key}`);
    }
  }

  console.log('\n✨ Rééquilibrage terminé !');
  console.log('\n📊 Nouvelles conversions XP estimées :');
  console.log('  5k pts  → ~200 XP (au lieu de 449)');
  console.log('  10k pts → ~280 XP (au lieu de 600)');
  console.log('  15k pts → ~340 XP (au lieu de 600)');
  console.log('  20k pts → ~380 XP (au lieu de 600)');

  console.log('\n📈 Nouveaux seuils de grades :');
  console.log('  Page (0)      → 400 XP (au lieu de 150)');
  console.log('  Écuyer (1)    → 1150 XP (au lieu de 450)');
  console.log('  Chevalier (2) → 2800 XP (au lieu de 1110)');
  console.log('  Baron (5)     → 13900 XP (au lieu de 5550)');
  console.log('  Duc (12)      → 69000 XP (au lieu de 27510)');
}

rebalanceQuests().catch(console.error);
