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

// Pool de quêtes quotidiennes (le joueur en verra 3/jour au hasard)
const DAILY_QUESTS_POOL = [
  // Volume (faciles)
  {
    quest_key: 'daily_play_3',
    quest_type: 'daily',
    category: 'volume',
    title: '🎮 Jouer 3 parties',
    description: 'Complétez 3 parties aujourd\'hui',
    target_value: 3,
    xp_reward: 100,
    parts_reward: 0,
    difficulty: 1,
  },
  {
    quest_key: 'daily_play_5',
    quest_type: 'daily',
    category: 'volume',
    title: '🎮 Marathon quotidien',
    description: 'Complétez 5 parties aujourd\'hui',
    target_value: 5,
    xp_reward: 200,
    parts_reward: 1,
    difficulty: 2,
  },

  // Streak (moyennes)
  {
    quest_key: 'daily_streak_5',
    quest_type: 'daily',
    category: 'streak',
    title: '🔥 Série de 5',
    description: 'Atteindre un streak de 5 réponses correctes',
    target_value: 5,
    xp_reward: 150,
    parts_reward: 0,
    difficulty: 2,
  },
  {
    quest_key: 'daily_streak_10',
    quest_type: 'daily',
    category: 'streak',
    title: '🔥 Série de 10',
    description: 'Atteindre un streak de 10 réponses correctes',
    target_value: 10,
    xp_reward: 300,
    parts_reward: 1,
    difficulty: 3,
  },

  // Score (moyennes)
  {
    quest_key: 'daily_score_500',
    quest_type: 'daily',
    category: 'score',
    title: '⭐ Score de 500',
    description: 'Marquer au moins 500 points en une partie',
    target_value: 500,
    xp_reward: 150,
    parts_reward: 0,
    difficulty: 2,
  },
  {
    quest_key: 'daily_score_1000',
    quest_type: 'daily',
    category: 'score',
    title: '⭐ Score de 1000',
    description: 'Marquer au moins 1000 points en une partie',
    target_value: 1000,
    xp_reward: 250,
    parts_reward: 1,
    difficulty: 3,
  },

  // Skill (difficiles)
  {
    quest_key: 'daily_perfect_round',
    quest_type: 'daily',
    category: 'skill',
    title: '💎 Niveau Parfait',
    description: 'Terminer un niveau sans perdre de vie',
    target_value: 1,
    xp_reward: 200,
    parts_reward: 1,
    difficulty: 3,
  },
  {
    quest_key: 'daily_speed_master',
    quest_type: 'daily',
    category: 'skill',
    title: '⚡ Vitesse Éclair',
    description: 'Répondre à 10 questions en moins de 5s chacune',
    target_value: 10,
    xp_reward: 180,
    parts_reward: 0,
    difficulty: 3,
  },
  {
    quest_key: 'daily_precision_perfect',
    quest_type: 'daily',
    category: 'precision',
    title: '🎯 Précision Parfaite',
    description: 'Deviner une date à ±10 ans (mode Précision)',
    target_value: 1,
    xp_reward: 250,
    parts_reward: 1,
    difficulty: 3,
  },

  // Nouvelles quêtes
  {
    quest_key: 'daily_no_mistake_5',
    quest_type: 'daily',
    category: 'skill',
    title: '✨ Sans Faute',
    description: 'Répondre correctement à 5 questions d\'affilée',
    target_value: 5,
    xp_reward: 120,
    parts_reward: 0,
    difficulty: 2,
  },
  {
    quest_key: 'daily_fast_win',
    quest_type: 'daily',
    category: 'skill',
    title: '🏃 Victoire Rapide',
    description: 'Gagner une partie en moins de 5 minutes',
    target_value: 1,
    xp_reward: 150,
    parts_reward: 0,
    difficulty: 2,
  },
  {
    quest_key: 'daily_both_modes',
    quest_type: 'daily',
    category: 'variety',
    title: '🎲 Diversité',
    description: 'Jouer une partie de chaque mode (Classique + Précision)',
    target_value: 2,
    xp_reward: 200,
    parts_reward: 1,
    difficulty: 2,
  },
];

// Quêtes hebdomadaires (3 actives en même temps)
const WEEKLY_QUESTS = [
  {
    quest_key: 'weekly_play_15',
    quest_type: 'weekly',
    category: 'volume',
    title: '📅 Marathon Hebdo',
    description: 'Jouer 15 parties cette semaine',
    target_value: 15,
    xp_reward: 500,
    parts_reward: 2,
    difficulty: 2,
  },
  {
    quest_key: 'weekly_score_5000',
    quest_type: 'weekly',
    category: 'score',
    title: '🌟 Champion de la Semaine',
    description: 'Marquer 5000 points au total cette semaine',
    target_value: 5000,
    xp_reward: 600,
    parts_reward: 2,
    difficulty: 2,
  },
  {
    quest_key: 'weekly_streak_15',
    quest_type: 'weekly',
    category: 'streak',
    title: '🔥 Série Légendaire',
    description: 'Atteindre un streak de 15',
    target_value: 15,
    xp_reward: 700,
    parts_reward: 3,
    difficulty: 3,
  },
  {
    quest_key: 'weekly_daily_quests',
    quest_type: 'weekly',
    category: 'meta',
    title: '✅ Assidu',
    description: 'Compléter 10 quêtes quotidiennes cette semaine',
    target_value: 10,
    xp_reward: 600,
    parts_reward: 2,
    difficulty: 2,
  },
  {
    quest_key: 'weekly_perfect_runs',
    quest_type: 'weekly',
    category: 'skill',
    title: '💎 Perfection Continue',
    description: 'Réussir 3 parties sans perdre de vie',
    target_value: 3,
    xp_reward: 800,
    parts_reward: 3,
    difficulty: 3,
  },
  {
    quest_key: 'weekly_precision_master',
    quest_type: 'weekly',
    category: 'precision',
    title: '🎯 Maître de Précision',
    description: 'Deviner 5 dates à ±10 ans (mode Précision)',
    target_value: 5,
    xp_reward: 700,
    parts_reward: 3,
    difficulty: 3,
  },
];

// Quêtes mensuelles (3 actives en même temps)
const MONTHLY_QUESTS = [
  {
    quest_key: 'monthly_play_50',
    quest_type: 'monthly',
    category: 'volume',
    title: '🏆 Joueur du Mois',
    description: 'Jouer 50 parties ce mois-ci',
    target_value: 50,
    xp_reward: 2000,
    parts_reward: 5,
    difficulty: 2,
  },
  {
    quest_key: 'monthly_score_20000',
    quest_type: 'monthly',
    category: 'score',
    title: '👑 Empereur du Score',
    description: 'Marquer 20000 points au total ce mois',
    target_value: 20000,
    xp_reward: 2500,
    parts_reward: 5,
    difficulty: 3,
  },
  {
    quest_key: 'monthly_daily_login',
    quest_type: 'monthly',
    category: 'meta',
    title: '📆 Présence Assidue',
    description: 'Se connecter 20 jours ce mois',
    target_value: 20,
    xp_reward: 3000,
    parts_reward: 7,
    difficulty: 2,
  },
  {
    quest_key: 'monthly_weekly_quests',
    quest_type: 'monthly',
    category: 'meta',
    title: '⭐ Maître des Quêtes',
    description: 'Compléter 8 quêtes hebdomadaires ce mois',
    target_value: 8,
    xp_reward: 2500,
    parts_reward: 5,
    difficulty: 3,
  },
  {
    quest_key: 'monthly_perfect_runs',
    quest_type: 'monthly',
    category: 'skill',
    title: '💎 Perfectionniste',
    description: 'Réussir 10 parties sans perdre de vie',
    target_value: 10,
    xp_reward: 3500,
    parts_reward: 8,
    difficulty: 4,
  },
  {
    quest_key: 'monthly_high_score',
    quest_type: 'monthly',
    category: 'score',
    title: '🌟 Record Personnel',
    description: 'Atteindre 3000 points en une seule partie',
    target_value: 3000,
    xp_reward: 4000,
    parts_reward: 10,
    difficulty: 4,
  },
];

async function setupNewQuestSystem() {
  console.log('🔄 MISE EN PLACE DU NOUVEAU SYSTÈME DE QUÊTES\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Supprimer l'ancienne table et en créer une nouvelle
  console.log('1️⃣  Préparation de la table des quêtes...\n');

  const { error: deleteError } = await supabase
    .from('daily_quests')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('❌ Erreur suppression:', deleteError);
  } else {
    console.log('   ✅ Anciennes quêtes supprimées\n');
  }

  // 2. Insérer toutes les quêtes
  console.log('2️⃣  Insertion des nouvelles quêtes...\n');

  const allQuests = [
    ...DAILY_QUESTS_POOL,
    ...WEEKLY_QUESTS,
    ...MONTHLY_QUESTS,
  ];

  const { data, error: insertError } = await supabase
    .from('daily_quests')
    .insert(allQuests)
    .select();

  if (insertError) {
    console.error('❌ Erreur insertion:', insertError);
    return;
  }

  console.log(`   ✅ ${data.length} quêtes insérées\n`);

  // 3. Afficher le résumé
  console.log('3️⃣  RÉSUMÉ DU NOUVEAU SYSTÈME\n');

  console.log('   📋 QUÊTES QUOTIDIENNES (pool):');
  console.log(`      • ${DAILY_QUESTS_POOL.length} quêtes disponibles`);
  console.log(`      • 3 tirées au sort chaque jour\n`);

  console.log('   📅 QUÊTES HEBDOMADAIRES:');
  console.log(`      • ${WEEKLY_QUESTS.length} quêtes disponibles`);
  console.log(`      • 3 actives en permanence\n`);

  console.log('   🗓️  QUÊTES MENSUELLES:');
  console.log(`      • ${MONTHLY_QUESTS.length} quêtes disponibles`);
  console.log(`      • 3 actives en permanence\n`);

  // Calculer les récompenses
  const totalDailyXP = DAILY_QUESTS_POOL.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalDailyParts = DAILY_QUESTS_POOL.reduce((sum, q) => sum + q.parts_reward, 0);

  const avgDailyXP = Math.round(totalDailyXP / DAILY_QUESTS_POOL.length * 3);
  const avgDailyParts = Math.round(totalDailyParts / DAILY_QUESTS_POOL.length * 3);

  const totalWeeklyXP = WEEKLY_QUESTS.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalWeeklyParts = WEEKLY_QUESTS.reduce((sum, q) => sum + q.parts_reward, 0);

  const totalMonthlyXP = MONTHLY_QUESTS.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalMonthlyParts = MONTHLY_QUESTS.reduce((sum, q) => sum + q.parts_reward, 0);

  console.log('4️⃣  RÉCOMPENSES POTENTIELLES\n');

  console.log('   Par jour (moyenne 3 quêtes):');
  console.log(`      • ~${avgDailyXP} XP`);
  console.log(`      • ~${avgDailyParts} parties\n`);

  console.log('   Par semaine (3 quêtes hebdo):');
  console.log(`      • ${totalWeeklyXP} XP max`);
  console.log(`      • ${totalWeeklyParts} parties max\n`);

  console.log('   Par mois (3 quêtes mensuelles):');
  console.log(`      • ${totalMonthlyXP} XP max`);
  console.log(`      • ${totalMonthlyParts} parties max\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ NOUVEAU SYSTÈME DE QUÊTES INSTALLÉ !\n');

  console.log('📝 PROCHAINES ÉTAPES:\n');
  console.log('   1. Implémenter la logique de sélection aléatoire (3 quêtes/jour)');
  console.log('   2. Créer le composant de rotation dans vue1.tsx');
  console.log('   3. Mettre à jour la logique de récompenses (XP + parties)');
  console.log('   4. Tester le système avec des utilisateurs\n');
}

setupNewQuestSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });

