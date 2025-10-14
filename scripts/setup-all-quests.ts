import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Charger les variables d'environnement
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Définition complète de toutes les quêtes
const ALL_QUESTS = [
  // ========== QUÊTES QUOTIDIENNES ==========
  {
    quest_key: 'daily_play_3',
    title: '🎮 Jouer 3 parties',
    description: 'Complétez 3 parties aujourd\'hui',
    quest_type: 'daily',
    target_value: 3,
    xp_reward: 100,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_play_5',
    title: '🎮 Marathon quotidien',
    description: 'Complétez 5 parties aujourd\'hui',
    quest_type: 'daily',
    target_value: 5,
    xp_reward: 200,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_score_500',
    title: '⭐ Premier Pas',
    description: 'Atteindre 500 points en une partie',
    quest_type: 'daily',
    target_value: 500,
    xp_reward: 50,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_score_1000',
    title: '⭐ Bon Début',
    description: 'Atteindre 1000 points en une partie',
    quest_type: 'daily',
    target_value: 1000,
    xp_reward: 100,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_score_3000',
    title: '⭐ Performance',
    description: 'Atteindre 3000 points en une partie',
    quest_type: 'daily',
    target_value: 3000,
    xp_reward: 200,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_streak_5',
    title: '🔥 Série de 5',
    description: 'Obtenir une série de 5 réponses correctes',
    quest_type: 'daily',
    target_value: 5,
    xp_reward: 100,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_streak_10',
    title: '🔥 Série de 10',
    description: 'Obtenir une série de 10 réponses correctes',
    quest_type: 'daily',
    target_value: 10,
    xp_reward: 200,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_no_mistake_5',
    title: '✨ Sans Faute',
    description: 'Répondre correctement 5 fois d\'affilée',
    quest_type: 'daily',
    target_value: 5,
    xp_reward: 150,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_both_modes',
    title: '🎲 Diversité',
    description: 'Jouer aux deux modes de jeu',
    quest_type: 'daily',
    target_value: 2,
    xp_reward: 150,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_precision_perfect',
    title: '🎯 Précision Parfaite',
    description: 'Réussir une manche parfaite en mode Précision',
    quest_type: 'daily',
    target_value: 1,
    xp_reward: 200,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'daily_speed_master',
    title: '⚡ Vitesse Éclair',
    description: 'Répondre à 10 questions en moins de 3s chacune',
    quest_type: 'daily',
    target_value: 10,
    xp_reward: 150,
    parts_reward: 0,
    is_active: true,
  },

  // ========== QUÊTES HEBDOMADAIRES ==========
  {
    quest_key: 'weekly_play_15',
    title: '📅 Marathon Hebdo',
    description: 'Jouer 15 parties cette semaine',
    quest_type: 'weekly',
    target_value: 15,
    xp_reward: 300,
    parts_reward: 1,
    is_active: true,
  },
  {
    quest_key: 'weekly_champion_50000',
    title: '🏆 Champion de la Semaine',
    description: 'Marquer 50 000 points cumulés cette semaine',
    quest_type: 'weekly',
    target_value: 50000,
    xp_reward: 500,
    parts_reward: 1,
    is_active: true,
  },
  {
    quest_key: 'weekly_score_5000',
    title: '💎 Grand Score',
    description: 'Atteindre 5000 points en une partie',
    quest_type: 'weekly',
    target_value: 5000,
    xp_reward: 300,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'weekly_streak_15',
    title: '🔥 Série Légendaire',
    description: 'Obtenir une série de 15 réponses correctes',
    quest_type: 'weekly',
    target_value: 15,
    xp_reward: 300,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'weekly_precision_master',
    title: '🎯 Maître de Précision',
    description: 'Réussir 5 manches parfaites en mode Précision',
    quest_type: 'weekly',
    target_value: 5,
    xp_reward: 400,
    parts_reward: 0,
    is_active: true,
  },
  {
    quest_key: 'weekly_daily_quests',
    title: '✅ Assidu',
    description: 'Compléter 10 quêtes quotidiennes',
    quest_type: 'weekly',
    target_value: 10,
    xp_reward: 300,
    parts_reward: 0,
    is_active: true,
  },

  // ========== QUÊTES MENSUELLES ==========
  {
    quest_key: 'monthly_play_50',
    title: '🏆 Joueur du Mois',
    description: 'Jouer 50 parties ce mois-ci',
    quest_type: 'monthly',
    target_value: 50,
    xp_reward: 1000,
    parts_reward: 2,
    is_active: true,
  },
  {
    quest_key: 'monthly_high_score',
    title: '🌟 Record Personnel',
    description: 'Atteindre 30 000 points en une partie',
    quest_type: 'monthly',
    target_value: 30000,
    xp_reward: 1000,
    parts_reward: 1,
    is_active: true,
  },
  {
    quest_key: 'monthly_score_100000',
    title: '💰 Collectionneur',
    description: 'Marquer 100 000 points cumulés ce mois',
    quest_type: 'monthly',
    target_value: 100000,
    xp_reward: 800,
    parts_reward: 1,
    is_active: true,
  },
  {
    quest_key: 'monthly_daily_login',
    title: '📆 Présence Assidue',
    description: 'Se connecter 20 jours différents ce mois',
    quest_type: 'monthly',
    target_value: 20,
    xp_reward: 500,
    parts_reward: 1,
    is_active: true,
  },
  {
    quest_key: 'monthly_weekly_quests',
    title: '⭐ Maître des Quêtes',
    description: 'Compléter 8 quêtes hebdomadaires',
    quest_type: 'monthly',
    target_value: 8,
    xp_reward: 600,
    parts_reward: 1,
    is_active: true,
  },
];

async function setupQuests() {
  console.log('🚀 Configuration des quêtes dans Supabase...\n');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const quest of ALL_QUESTS) {
    const { error } = await supabase
      .from('daily_quests')
      .upsert(quest, {
        onConflict: 'quest_key',
      });

    if (error) {
      console.error(`❌ ${quest.quest_key}:`, error.message);
      errors++;
    } else {
      console.log(`✅ ${quest.quest_key}: ${quest.title}`);
      created++;
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`  ✅ ${created} quêtes créées/mises à jour`);
  console.log(`  ❌ ${errors} erreurs`);

  // Vérifier le résultat
  const { data: allQuests, error: fetchError } = await supabase
    .from('daily_quests')
    .select('quest_type, is_active')
    .eq('is_active', true);

  if (!fetchError && allQuests) {
    const byType = allQuests.reduce((acc, q) => {
      acc[q.quest_type] = (acc[q.quest_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📋 Quêtes actives par type:`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
  }

  console.log('\n✨ Terminé !\n');
}

setupQuests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
