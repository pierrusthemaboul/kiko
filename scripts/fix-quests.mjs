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

// TOUTES les quêtes corrigées (daily, weekly, monthly)
const ALL_QUESTS = [
  // === QUÊTES QUOTIDIENNES ===
  // Quêtes de base
  {
    quest_key: 'daily_play_3',
    quest_type: 'daily',
    title: '🎮 Jouer 3 parties',
    description: 'Complétez 3 parties aujourd\'hui',
    target_value: 3,
    xp_reward: 100,
    is_active: true,
  },
  {
    quest_key: 'daily_play_5',
    quest_type: 'daily',
    title: '🎮 Marathon quotidien',
    description: 'Complétez 5 parties aujourd\'hui',
    target_value: 5,
    xp_reward: 200,
    is_active: true,
  },

  // Quêtes de streak
  {
    quest_key: 'daily_streak_5',
    quest_type: 'daily',
    title: '🔥 Série de 5',
    description: 'Atteindre un streak de 5 réponses correctes',
    target_value: 5,
    xp_reward: 150,
    is_active: true,
  },
  {
    quest_key: 'daily_streak_10',
    quest_type: 'daily',
    title: '🔥 Série de 10',
    description: 'Atteindre un streak de 10 réponses correctes',
    target_value: 10,
    xp_reward: 300,
    is_active: true,
  },

  // Quêtes de score (AJUSTÉES x10)
  {
    quest_key: 'daily_score_5000',
    quest_type: 'daily',
    title: '⭐ Score de 5000',
    description: 'Marquer au moins 5000 points en une partie',
    target_value: 5000,
    xp_reward: 150,
    is_active: true,
  },
  {
    quest_key: 'daily_score_10000',
    quest_type: 'daily',
    title: '⭐ Score de 10000',
    description: 'Marquer au moins 10000 points en une partie',
    target_value: 10000,
    xp_reward: 250,
    is_active: true,
  },

  // Quêtes de skill
  {
    quest_key: 'daily_no_mistake_5',
    quest_type: 'daily',
    title: '✨ Sans Faute',
    description: 'Répondre correctement à 5 questions d\'affilée',
    target_value: 5,
    xp_reward: 120,
    is_active: true,
  },
  {
    quest_key: 'daily_speed_master',
    quest_type: 'daily',
    title: '⚡ Vitesse Éclair',
    description: 'Répondre à 10 questions en moins de 5s chacune',
    target_value: 10,
    xp_reward: 180,
    is_active: true,
  },
  {
    quest_key: 'daily_high_streak',
    quest_type: 'daily',
    title: '🌟 Série Impressionnante',
    description: 'Atteindre un streak de 15 réponses correctes',
    target_value: 15,
    xp_reward: 200,
    is_active: true,
  },

  // Quête mode Précision
  {
    quest_key: 'daily_precision_perfect',
    quest_type: 'daily',
    title: '🎯 Précision Parfaite',
    description: 'Deviner une date à ±10 ans (mode Précision)',
    target_value: 1,
    xp_reward: 250,
    is_active: true,
  },

  // Quête mixte
  {
    quest_key: 'daily_both_modes',
    quest_type: 'daily',
    title: '🎲 Diversité',
    description: 'Jouer une partie de chaque mode (Classique + Précision)',
    target_value: 2,
    xp_reward: 200,
    is_active: true,
  },

  // === QUÊTES HEBDOMADAIRES ===
  {
    quest_key: 'weekly_play_15',
    quest_type: 'weekly',
    title: '📅 Marathon Hebdo',
    description: 'Jouer 15 parties cette semaine',
    target_value: 15,
    xp_reward: 500,
    is_active: true,
  },
  {
    quest_key: 'weekly_score_50000',
    quest_type: 'weekly',
    title: '🌟 Champion de la Semaine',
    description: 'Marquer 50000 points au total cette semaine',
    target_value: 50000,
    xp_reward: 600,
    is_active: true,
  },
  {
    quest_key: 'weekly_streak_15',
    quest_type: 'weekly',
    title: '🔥 Série Légendaire',
    description: 'Atteindre un streak de 15',
    target_value: 15,
    xp_reward: 700,
    is_active: true,
  },
  {
    quest_key: 'weekly_precision_master',
    quest_type: 'weekly',
    title: '🎯 Maître de Précision',
    description: 'Deviner 5 dates à ±10 ans (mode Précision)',
    target_value: 5,
    xp_reward: 700,
    is_active: true,
  },
  {
    quest_key: 'weekly_daily_quests',
    quest_type: 'weekly',
    title: '✅ Assidu',
    description: 'Compléter 10 quêtes quotidiennes cette semaine',
    target_value: 10,
    xp_reward: 600,
    is_active: true,
  },
  {
    quest_key: 'weekly_long_streak',
    quest_type: 'weekly',
    title: '💫 Concentration Absolue',
    description: 'Atteindre un streak de 20 réponses correctes',
    target_value: 20,
    xp_reward: 800,
    is_active: true,
  },

  // === QUÊTES MENSUELLES ===
  {
    quest_key: 'monthly_play_50',
    quest_type: 'monthly',
    title: '🏆 Joueur du Mois',
    description: 'Jouer 50 parties ce mois-ci',
    target_value: 50,
    xp_reward: 2000,
    is_active: true,
  },
  {
    quest_key: 'monthly_score_200000',
    quest_type: 'monthly',
    title: '👑 Empereur du Score',
    description: 'Marquer 200000 points au total ce mois',
    target_value: 200000,
    xp_reward: 2500,
    is_active: true,
  },
  {
    quest_key: 'monthly_high_score',
    quest_type: 'monthly',
    title: '🌟 Record Personnel',
    description: 'Atteindre 30000 points en une seule partie',
    target_value: 30000,
    xp_reward: 4000,
    is_active: true,
  },
  {
    quest_key: 'monthly_daily_login',
    quest_type: 'monthly',
    title: '📆 Présence Assidue',
    description: 'Se connecter 20 jours ce mois',
    target_value: 20,
    xp_reward: 3000,
    is_active: true,
  },
  {
    quest_key: 'monthly_weekly_quests',
    quest_type: 'monthly',
    title: '⭐ Maître des Quêtes',
    description: 'Compléter 8 quêtes hebdomadaires ce mois',
    target_value: 8,
    xp_reward: 2500,
    is_active: true,
  },
  {
    quest_key: 'monthly_streak_master',
    quest_type: 'monthly',
    title: '💎 Maître des Séries',
    description: 'Atteindre un streak de 30 réponses correctes',
    target_value: 30,
    xp_reward: 3500,
    is_active: true,
  },
];

async function fixQuests() {
  console.log('🔧 CORRECTION DES QUÊTES\n');
  console.log('Problèmes à corriger:');
  console.log('- ❌ Suppression de "daily_fast_win" (gagner une partie)');
  console.log('- ❌ Suppression de "weekly_perfect_runs" (impossible)');
  console.log('- ❌ Suppression de "monthly_perfect_runs" (impossible)');
  console.log('- ❌ Suppression de "daily_perfect_round" (impossible)');
  console.log('- 📈 Ajustement des scores x10');
  console.log('- ➕ Ajout de nouvelles quêtes viables\n');

  // Supprimer toutes les quêtes existantes
  const { error: deleteError } = await supabase
    .from('daily_quests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return;
  }

  console.log('✅ Anciennes quêtes supprimées\n');

  // Insérer les nouvelles quêtes corrigées
  const { data, error: insertError } = await supabase
    .from('daily_quests')
    .insert(ALL_QUESTS)
    .select();

  if (insertError) {
    console.error('❌ Erreur lors de l\'insertion:', insertError);
    return;
  }

  console.log(`✅ ${data.length} quêtes corrigées insérées\n`);

  // Afficher le résumé par type
  const byType = {};
  let totalXP = 0;

  ALL_QUESTS.forEach(q => {
    if (!byType[q.quest_type]) {
      byType[q.quest_type] = { count: 0, xp: 0 };
    }
    byType[q.quest_type].count++;
    byType[q.quest_type].xp += q.xp_reward;
    totalXP += q.xp_reward;
  });

  console.log('📊 RÉSUMÉ PAR TYPE:\n');
  Object.entries(byType).forEach(([type, stats]) => {
    console.log(`${type.toUpperCase()}: ${stats.count} quêtes, ${stats.xp} XP max`);
  });
  console.log(`\n💰 XP TOTAL POSSIBLE: ${totalXP} XP\n`);

  // Afficher les quêtes par catégorie
  console.log('📋 DÉTAIL DES QUÊTES CORRIGÉES:\n');

  console.log('=== QUOTIDIENNES (11) ===');
  ALL_QUESTS.filter(q => q.quest_type === 'daily').forEach(q => {
    console.log(`✓ ${q.title} - ${q.target_value} (${q.xp_reward} XP)`);
  });

  console.log('\n=== HEBDOMADAIRES (6) ===');
  ALL_QUESTS.filter(q => q.quest_type === 'weekly').forEach(q => {
    console.log(`✓ ${q.title} - ${q.target_value} (${q.xp_reward} XP)`);
  });

  console.log('\n=== MENSUELLES (6) ===');
  ALL_QUESTS.filter(q => q.quest_type === 'monthly').forEach(q => {
    console.log(`✓ ${q.title} - ${q.target_value} (${q.xp_reward} XP)`);
  });
}

fixQuests()
  .then(() => {
    console.log('\n✅ Correction terminée!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
