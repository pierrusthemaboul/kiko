import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Quêtes quotidiennes rééquilibrées
const DAILY_QUESTS = [
  // Quêtes de base
  {
    quest_key: 'daily_play_3',
    quest_type: 'volume',
    title: '🎮 Jouer 3 parties',
    description: 'Complétez 3 parties aujourd\'hui',
    target_value: 3,
    xp_reward: 100,
    is_active: true,
  },
  {
    quest_key: 'daily_play_5',
    quest_type: 'volume',
    title: '🎮 Jouer 5 parties',
    description: 'Complétez 5 parties aujourd\'hui',
    target_value: 5,
    xp_reward: 200,
    is_active: true,
  },

  // Quêtes de streak
  {
    quest_key: 'daily_streak_5',
    quest_type: 'streak',
    title: '🔥 Série de 5',
    description: 'Atteindre un streak de 5 réponses correctes',
    target_value: 5,
    xp_reward: 150,
    is_active: true,
  },
  {
    quest_key: 'daily_streak_10',
    quest_type: 'streak',
    title: '🔥 Série de 10',
    description: 'Atteindre un streak de 10 réponses correctes',
    target_value: 10,
    xp_reward: 300,
    is_active: true,
  },

  // Quêtes de score
  {
    quest_key: 'daily_score_500',
    quest_type: 'score',
    title: '⭐ Score de 500',
    description: 'Marquer au moins 500 points en une partie',
    target_value: 500,
    xp_reward: 150,
    is_active: true,
  },
  {
    quest_key: 'daily_score_1000',
    quest_type: 'score',
    title: '⭐ Score de 1000',
    description: 'Marquer au moins 1000 points en une partie',
    target_value: 1000,
    xp_reward: 250,
    is_active: true,
  },

  // Quêtes de skill
  {
    quest_key: 'daily_perfect_round',
    quest_type: 'skill',
    title: '💎 Niveau Parfait',
    description: 'Terminer un niveau sans perdre de vie',
    target_value: 1,
    xp_reward: 200,
    is_active: true,
  },
  {
    quest_key: 'daily_speed_master',
    quest_type: 'skill',
    title: '⚡ Vitesse Éclair',
    description: 'Répondre à 10 questions en moins de 5s chacune',
    target_value: 10,
    xp_reward: 180,
    is_active: true,
  },

  // Quête mode Précision
  {
    quest_key: 'daily_precision_perfect',
    quest_type: 'precision',
    title: '🎯 Précision Parfaite',
    description: 'Deviner une date à ±10 ans (mode Précision)',
    target_value: 1,
    xp_reward: 250,
    is_active: true,
  },
];

async function syncDailyQuests() {
  console.log('🔄 Synchronisation des quêtes quotidiennes...\n');

  // Supprimer toutes les quêtes existantes
  const { error: deleteError } = await supabase
    .from('daily_quests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return;
  }

  console.log('✅ Quêtes existantes supprimées\n');

  // Insérer les nouvelles quêtes
  const { data, error: insertError } = await supabase
    .from('daily_quests')
    .insert(DAILY_QUESTS)
    .select();

  if (insertError) {
    console.error('❌ Erreur lors de l\'insertion:', insertError);
    return;
  }

  console.log(`✅ ${data.length} quêtes insérées\n`);

  // Afficher le résumé
  const byType = {};
  let totalXP = 0;

  DAILY_QUESTS.forEach(q => {
    if (!byType[q.quest_type]) {
      byType[q.quest_type] = { count: 0, xp: 0 };
    }
    byType[q.quest_type].count++;
    byType[q.quest_type].xp += q.xp_reward;
    totalXP += q.xp_reward;
  });

  console.log('📊 RÉSUMÉ DES QUÊTES QUOTIDIENNES:\n');
  Object.entries(byType).forEach(([type, stats]) => {
    console.log(`${type.toUpperCase()}: ${stats.count} quêtes, ${stats.xp} XP max`);
  });
  console.log(`\n💰 XP QUOTIDIEN TOTAL POSSIBLE: ${totalXP} XP\n`);
  console.log('ℹ️  Note: Toutes les quêtes ne peuvent pas être complétées en un jour\n');
}

syncDailyQuests()
  .then(() => {
    console.log('✅ Synchronisation terminée!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });

