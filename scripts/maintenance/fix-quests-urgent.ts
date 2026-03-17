import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * CORRECTION URGENTE DES QUÊTES
 *
 * Problèmes identifiés:
 * 1. Incohérences titre/description (ex: "Série de 20" mais description dit "15")
 * 2. Difficulté beaucoup trop faible
 * 3. Confusion atteindre/cumuler
 *
 * Solution: Multiplier par 7 les valeurs et corriger les textes
 */

async function fixQuestsUrgent() {
  console.log('🚨 CORRECTION URGENTE DES QUÊTES\n');

  // ========== CORRECTIONS AVEC VALEURS x7 ==========
  const fixes = [
    // QUÊTES QUOTIDIENNES - Scores
    {
      key: 'daily_score_500',
      updates: {
        title: '⭐ Score de 3 500',
        description: 'Atteindre 3 500 points en une partie',
        target_value: 3500,
        xp_reward: 70
      }
    },
    {
      key: 'daily_score_1000',
      updates: {
        title: '⭐ Score de 7 000',
        description: 'Atteindre 7 000 points en une partie',
        target_value: 7000,
        xp_reward: 100
      }
    },
    {
      key: 'daily_score_3000',
      updates: {
        title: '⭐ Score de 21 000',
        description: 'Atteindre 21 000 points en une partie',
        target_value: 21000,
        xp_reward: 180
      }
    },
    {
      key: 'daily_score_5000',
      updates: {
        title: '⭐ Score de 35 000',
        description: 'Atteindre 35 000 points en une partie',
        target_value: 35000,
        xp_reward: 300
      }
    },
    {
      key: 'daily_score_10000',
      updates: {
        title: '⭐ Score de 105 000',
        description: 'Atteindre 105 000 points en une partie',
        target_value: 105000,
        xp_reward: 800
      }
    },

    // QUÊTES QUOTIDIENNES - Streaks (x7)
    {
      key: 'daily_streak_5',
      updates: {
        title: '🔥 Série de 35',
        description: 'Faire une série de 35 bonnes réponses d\'affilée',
        target_value: 35,
        xp_reward: 200
      }
    },
    {
      key: 'daily_streak_10',
      updates: {
        title: '🔥 Série de 70',
        description: 'Faire une série de 70 bonnes réponses d\'affilée',
        target_value: 70,
        xp_reward: 400
      }
    },
    {
      key: 'daily_high_streak',
      updates: {
        title: '🌟 Série de 140',
        description: 'Faire une série de 140 bonnes réponses d\'affilée',
        target_value: 140,
        xp_reward: 800
      }
    },

    // QUÊTES QUOTIDIENNES - Volume
    {
      key: 'daily_play_3',
      updates: {
        title: '🎮 Jouer 3 parties',
        description: 'Jouer 3 parties (n\'importe quel mode)',
        target_value: 3,
        xp_reward: 80
      }
    },
    {
      key: 'daily_play_5',
      updates: {
        title: '🎮 Jouer 5 parties',
        description: 'Jouer 5 parties (n\'importe quel mode)',
        target_value: 5,
        xp_reward: 150
      }
    },

    // QUÊTES QUOTIDIENNES - Skill
    {
      key: 'daily_no_mistake_5',
      updates: {
        title: '🎯 5 Réponses parfaites',
        description: 'Répondre parfaitement à 5 questions d\'affilée',
        target_value: 5,
        xp_reward: 250
      }
    },
    {
      key: 'daily_speed_master',
      updates: {
        title: '⚡ Vitesse éclair',
        description: 'Répondre à 20 questions en moins de 3s chacune',
        target_value: 20,
        xp_reward: 300
      }
    },
    {
      key: 'daily_precision_perfect',
      updates: {
        title: '🎯 Précision absolue',
        description: 'Deviner 5 dates à ±5 ans (mode Précision)',
        target_value: 5,
        xp_reward: 350
      }
    },
    {
      key: 'daily_both_modes',
      updates: {
        title: '⚖️ Polyvalence',
        description: 'Jouer au moins 1 partie de chaque mode',
        target_value: 2,
        xp_reward: 200
      }
    },

    // QUÊTES HEBDOMADAIRES - Scores (x7)
    {
      key: 'weekly_score_5000',
      updates: {
        title: '💎 Score de 210 000',
        description: 'Atteindre 210 000 points en une partie',
        target_value: 210000,
        xp_reward: 1500
      }
    },
    {
      key: 'weekly_champion_50000',
      updates: {
        title: '🏆 Champion 350k',
        description: 'Atteindre 350 000 points en une partie',
        target_value: 350000,
        xp_reward: 3500
      }
    },
    {
      key: 'weekly_score_50000',
      updates: {
        title: '🌟 Maître du Score',
        description: 'Atteindre 350 000 points en une partie',
        target_value: 350000,
        xp_reward: 3500
      }
    },

    // QUÊTES HEBDOMADAIRES - Volume (x7)
    {
      key: 'weekly_play_15',
      updates: {
        title: '📅 210 Parties',
        description: 'Jouer 210 parties dans la semaine',
        target_value: 210,
        xp_reward: 1500
      }
    },

    // QUÊTES HEBDOMADAIRES - Streaks (x7)
    {
      key: 'weekly_streak_15',
      updates: {
        title: '🔥 Série de 175',
        description: 'Faire une série de 175 bonnes réponses d\'affilée',
        target_value: 175,
        xp_reward: 1200
      }
    },
    {
      key: 'weekly_long_streak',
      updates: {
        title: '💫 Série de 245',
        description: 'Faire une série de 245 bonnes réponses d\'affilée',
        target_value: 245,
        xp_reward: 2000
      }
    },

    // QUÊTES HEBDOMADAIRES - Autres
    {
      key: 'weekly_precision_master',
      updates: {
        title: '🎯 70 Parties Précision',
        description: 'Jouer 70 parties en mode Précision',
        target_value: 70,
        xp_reward: 1500
      }
    },
    {
      key: 'weekly_daily_quests',
      updates: {
        title: '✅ 105 Quêtes Quotidiennes',
        description: 'Compléter 105 quêtes quotidiennes dans la semaine',
        target_value: 105,
        xp_reward: 1200
      }
    },

    // QUÊTES MENSUELLES - Scores uniques (x7)
    {
      key: 'monthly_score_20000',
      updates: {
        title: '💎 Score de 175 000',
        description: 'Atteindre 175 000 points en une partie',
        target_value: 175000,
        xp_reward: 2000
      }
    },
    {
      key: 'monthly_high_score',
      updates: {
        title: '🌟 Score de 280 000',
        description: 'Atteindre 280 000 points en une partie',
        target_value: 280000,
        xp_reward: 3500
      }
    },

    // QUÊTES MENSUELLES - Scores CUMULÉS (x7)
    {
      key: 'monthly_score_100000',
      updates: {
        title: '💰 1 050 000 points cumulés',
        description: 'Cumuler 1 050 000 points dans le mois',
        target_value: 1050000,
        xp_reward: 5000
      }
    },
    {
      key: 'monthly_score_200000',
      updates: {
        title: '👑 2 100 000 points cumulés',
        description: 'Cumuler 2 100 000 points dans le mois',
        target_value: 2100000,
        xp_reward: 10000
      }
    },

    // QUÊTES MENSUELLES - Volume (x7)
    {
      key: 'monthly_play_50',
      updates: {
        title: '🏆 700 Parties',
        description: 'Jouer 700 parties dans le mois',
        target_value: 700,
        xp_reward: 5000
      }
    },

    // QUÊTES MENSUELLES - Streaks
    {
      key: 'monthly_streak_master',
      updates: {
        title: '💎 350 Jours Consécutifs',
        description: 'Jouer 350 jours d\'affilée',
        target_value: 350,
        xp_reward: 20000
      }
    },

    // QUÊTES MENSUELLES - Autres
    {
      key: 'monthly_daily_login',
      updates: {
        title: '📆 30 Jours de Connexion',
        description: 'Se connecter 30 jours dans le mois',
        target_value: 30,
        xp_reward: 2500
      }
    },
    {
      key: 'monthly_weekly_quests',
      updates: {
        title: '⭐ 70 Quêtes Hebdo',
        description: 'Compléter 70 quêtes hebdomadaires dans le mois',
        target_value: 70,
        xp_reward: 3500
      }
    },
  ];

  console.log(`📝 Application de ${fixes.length} corrections...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const { key, updates } of fixes) {
    const { error } = await supabase
      .from('daily_quests')
      .update(updates)
      .eq('quest_key', key);

    if (error) {
      console.error(`❌ ${key}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${key}: ${updates.title} (${updates.target_value})`);
      successCount++;
    }
  }

  console.log(`\n📊 Résultat: ${successCount} succès, ${errorCount} erreurs\n`);

  if (successCount > 0) {
    console.log('✨ Corrections appliquées avec succès !');
    console.log('\n🎯 Nouvelles difficultés (exemples):');
    console.log('   - Débutant: Série de 35 bonnes réponses');
    console.log('   - Intermédiaire: Série de 70 bonnes réponses');
    console.log('   - Seigneur: Série de 140+ bonnes réponses');
    console.log('   - Score quotidien facile: 35 000 points');
    console.log('   - Score hebdo challenge: 210 000 points');
  }
}

fixQuestsUrgent().catch(console.error);

