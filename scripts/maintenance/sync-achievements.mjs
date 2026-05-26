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

// Achievements rééquilibrés (basé sur quests.ts mais avec ajustements)
const ACHIEVEMENTS = [
  // Achievements de rang (XP réduits car automatiques)
  {
    achievement_key: 'reach_baron',
    achievement_type: 'rank',
    title: 'Baron Accompli',
    description: 'Atteindre le rang de Baron',
    xp_bonus: 300,
    icon: '👑',
  },
  {
    achievement_key: 'reach_vicomte',
    achievement_type: 'rank',
    title: 'Vicomte Émérite',
    description: 'Atteindre le rang de Vicomte',
    xp_bonus: 500,
    icon: '👑',
  },
  {
    achievement_key: 'reach_comte',
    achievement_type: 'rank',
    title: 'Comte Prestigieux',
    description: 'Atteindre le rang de Comte',
    xp_bonus: 1000,
    icon: '👑',
  },
  {
    achievement_key: 'reach_marquis',
    achievement_type: 'rank',
    title: 'Marquis Illustre',
    description: 'Atteindre le rang de Marquis',
    xp_bonus: 2000,
    icon: '👑',
  },
  {
    achievement_key: 'reach_duc',
    achievement_type: 'rank',
    title: 'Duc Magnifique',
    description: 'Atteindre le rang de Duc',
    xp_bonus: 3000,
    icon: '👑',
  },

  // Achievements de streak (augmentés car difficiles)
  {
    achievement_key: 'streak_7',
    achievement_type: 'streak',
    title: 'Semaine Parfaite',
    description: 'Jouer 7 jours d\'affilée',
    xp_bonus: 2000,
    icon: '🔥',
  },
  {
    achievement_key: 'streak_30',
    achievement_type: 'streak',
    title: 'Mois Légendaire',
    description: 'Jouer 30 jours d\'affilée',
    xp_bonus: 8000,
    icon: '🔥',
  },

  // Achievements de parties (réduits)
  {
    achievement_key: 'games_50',
    achievement_type: 'games',
    title: 'Joueur Assidu',
    description: 'Jouer 50 parties',
    xp_bonus: 1000,
    icon: '🎮',
  },
  {
    achievement_key: 'games_100',
    achievement_type: 'games',
    title: 'Centurion',
    description: 'Jouer 100 parties',
    xp_bonus: 2000,
    icon: '🎮',
  },
  {
    achievement_key: 'games_500',
    achievement_type: 'games',
    title: 'Vétéran',
    description: 'Jouer 500 parties',
    xp_bonus: 5000,
    icon: '🎮',
  },

  // Achievements de score (ajustés pour le nouveau système)
  {
    achievement_key: 'high_score_5000',
    achievement_type: 'score',
    title: 'Première Étape',
    description: 'Atteindre 5000 points en une partie',
    xp_bonus: 300,
    icon: '⭐',
  },
  {
    achievement_key: 'high_score_10000',
    achievement_type: 'score',
    title: 'Expert',
    description: 'Atteindre 10000 points en une partie',
    xp_bonus: 800,
    icon: '⭐',
  },
  {
    achievement_key: 'high_score_20000',
    achievement_type: 'score',
    title: 'Virtuose',
    description: 'Atteindre 20000 points en une partie',
    xp_bonus: 2000,
    icon: '⭐',
  },
  {
    achievement_key: 'high_score_50000',
    achievement_type: 'score',
    title: 'Maître Absolu',
    description: 'Atteindre 50000 points en une partie',
    xp_bonus: 5000,
    icon: '⭐',
  },
];

async function syncAchievements() {
  console.log('🔄 Synchronisation des achievements...\n');

  // Supprimer tous les achievements existants
  const { error: deleteError } = await supabase
    .from('achievements')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return;
  }

  console.log('✅ Achievements existants supprimés\n');

  // Insérer les nouveaux achievements
  const { data, error: insertError } = await supabase
    .from('achievements')
    .insert(ACHIEVEMENTS)
    .select();

  if (insertError) {
    console.error('❌ Erreur lors de l\'insertion:', insertError);
    return;
  }

  console.log(`✅ ${data.length} achievements insérés\n`);

  // Afficher le résumé
  const byType = {};
  let totalXP = 0;

  ACHIEVEMENTS.forEach(a => {
    if (!byType[a.achievement_type]) {
      byType[a.achievement_type] = { count: 0, xp: 0 };
    }
    byType[a.achievement_type].count++;
    byType[a.achievement_type].xp += a.xp_bonus;
    totalXP += a.xp_bonus;
  });

  console.log('📊 RÉSUMÉ DES ACHIEVEMENTS:\n');
  Object.entries(byType).forEach(([type, stats]) => {
    console.log(`${type.toUpperCase()}: ${stats.count} achievements, ${stats.xp} XP total`);
  });
  console.log(`\n💰 XP TOTAL DISPONIBLE: ${totalXP} XP\n`);
}

syncAchievements()
  .then(() => {
    console.log('✅ Synchronisation terminée!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });

