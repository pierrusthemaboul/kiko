import { createClient } from '@supabase/supabase-js';
import { rankFromXP, RANKS } from '../lib/economy/ranks';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
);

/**
 * CORRECTION DES QUÊTES ET AJOUT DE SCALING PAR GRADE
 *
 * 1. Correction des textes (atteindre vs cumuler)
 * 2. Ajout de difficulté progressive basée sur le grade du joueur
 */

async function fixQuestsAndAddScaling() {
  console.log('🔧 CORRECTION DES QUÊTES ET SCALING PAR GRADE\n');

  // ========== ÉTAPE 1: CORRECTIONS DE TEXTE ==========
  console.log('📝 Correction des textes des quêtes...\n');

  const textFixes = [
    // Les quêtes de score unique utilisent "Atteindre"
    {
      key: 'daily_score_500',
      updates: {
        title: '⭐ Score de 500',
        description: 'Atteindre 500 points en une partie'
      }
    },
    {
      key: 'daily_score_1000',
      updates: {
        title: '⭐ Score de 1000',
        description: 'Atteindre 1000 points en une partie'
      }
    },
    {
      key: 'daily_score_3000',
      updates: {
        title: '⭐ Score de 3000',
        description: 'Atteindre 3000 points en une partie'
      }
    },
    {
      key: 'daily_score_5000',
      updates: {
        title: '⭐ Score de 5000',
        description: 'Atteindre 5000 points en une partie'
      }
    },
    {
      key: 'daily_score_10000',
      updates: {
        title: '⭐ Score de 15000',
        description: 'Atteindre 15 000 points en une partie'
      }
    },
    {
      key: 'weekly_score_5000',
      updates: {
        title: '💎 Score de 30 000',
        description: 'Atteindre 30 000 points en une partie'
      }
    },
    {
      key: 'weekly_champion_50000',
      updates: {
        title: '🏆 Champion 50k',
        description: 'Atteindre 50 000 points en une partie'
      }
    },
    {
      key: 'weekly_score_50000',
      updates: {
        title: '🌟 Maître du Score',
        description: 'Atteindre 50 000 points en une partie'
      }
    },
    {
      key: 'monthly_score_20000',
      updates: {
        title: '💎 Score de 25 000',
        description: 'Atteindre 25 000 points en une partie'
      }
    },
    {
      key: 'monthly_high_score',
      updates: {
        title: '🌟 Score de 40 000',
        description: 'Atteindre 40 000 points en une partie'
      }
    },
    // Les quêtes cumulatives utilisent "Cumuler"
    {
      key: 'monthly_score_100000',
      updates: {
        title: '💰 150 000 points cumulés',
        description: 'Cumuler 150 000 points dans le mois'
      }
    },
    {
      key: 'monthly_score_200000',
      updates: {
        title: '👑 300 000 points cumulés',
        description: 'Cumuler 300 000 points dans le mois'
      }
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const { key, updates } of textFixes) {
    const { error } = await supabase
      .from('daily_quests')
      .update(updates)
      .eq('quest_key', key);

    if (error) {
      console.error(`❌ ${key}: ${error.message}`);
      errorCount++;
    } else {
      console.log(`✅ ${key}: "${updates.description}"`);
      successCount++;
    }
  }

  console.log(`\n📊 Corrections de texte : ${successCount} succès, ${errorCount} erreurs\n`);

  // ========== ÉTAPE 2: AJOUTER SCALING PAR GRADE ==========
  console.log('🎯 Ajout de scaling par grade...\n');

  // Définir les tiers de grades
  const gradeToTier = (rankIndex: number): 'debutant' | 'intermediaire' | 'avance' | 'expert' => {
    if (rankIndex <= 3) return 'debutant'; // Page -> Chevalier Banneret
    if (rankIndex <= 7) return 'intermediaire'; // Baronnet -> Seigneur
    if (rankIndex <= 11) return 'avance'; // Comte -> Margrave
    return 'expert'; // Duc et au-delà
  };

  // Créer des variantes de quêtes pour chaque tier
  const scaledQuests = [
    // Quêtes quotidiennes - score en une partie
    {
      baseKey: 'daily_score_easy',
      variants: {
        debutant: {
          quest_key: 'daily_score_easy_tier1',
          title: '⭐ Score débutant',
          description: 'Atteindre 1000 points en une partie',
          target_value: 1000,
          xp_reward: 50,
          quest_type: 'daily',
          is_active: true,
          min_rank_index: 0,
          max_rank_index: 3
        },
        intermediaire: {
          quest_key: 'daily_score_easy_tier2',
          title: '⭐ Score intermédiaire',
          description: 'Atteindre 5000 points en une partie',
          target_value: 5000,
          xp_reward: 120,
          quest_type: 'daily',
          is_active: true,
          min_rank_index: 4,
          max_rank_index: 7
        },
        avance: {
          quest_key: 'daily_score_easy_tier3',
          title: '⭐ Score avancé',
          description: 'Atteindre 10000 points en une partie',
          target_value: 10000,
          xp_reward: 200,
          quest_type: 'daily',
          is_active: true,
          min_rank_index: 8,
          max_rank_index: 11
        },
        expert: {
          quest_key: 'daily_score_easy_tier4',
          title: '⭐ Score expert',
          description: 'Atteindre 15000 points en une partie',
          target_value: 15000,
          xp_reward: 300,
          quest_type: 'daily',
          is_active: true,
          min_rank_index: 12,
          max_rank_index: 99
        }
      }
    },
    // Quêtes hebdomadaires - gros score
    {
      baseKey: 'weekly_score_challenge',
      variants: {
        debutant: {
          quest_key: 'weekly_score_challenge_tier1',
          title: '💎 Défi hebdo débutant',
          description: 'Atteindre 10000 points en une partie',
          target_value: 10000,
          xp_reward: 400,
          quest_type: 'weekly',
          is_active: true,
          min_rank_index: 0,
          max_rank_index: 3
        },
        intermediaire: {
          quest_key: 'weekly_score_challenge_tier2',
          title: '💎 Défi hebdo intermédiaire',
          description: 'Atteindre 20000 points en une partie',
          target_value: 20000,
          xp_reward: 600,
          quest_type: 'weekly',
          is_active: true,
          min_rank_index: 4,
          max_rank_index: 7
        },
        avance: {
          quest_key: 'weekly_score_challenge_tier3',
          title: '💎 Défi hebdo avancé',
          description: 'Atteindre 35000 points en une partie',
          target_value: 35000,
          xp_reward: 900,
          quest_type: 'weekly',
          is_active: true,
          min_rank_index: 8,
          max_rank_index: 11
        },
        expert: {
          quest_key: 'weekly_score_challenge_tier4',
          title: '💎 Défi hebdo expert',
          description: 'Atteindre 50000 points en une partie',
          target_value: 50000,
          xp_reward: 1500,
          quest_type: 'weekly',
          is_active: true,
          min_rank_index: 12,
          max_rank_index: 99
        }
      }
    },
    // Quêtes mensuelles - score cumulé
    {
      baseKey: 'monthly_cumulative',
      variants: {
        debutant: {
          quest_key: 'monthly_cumulative_tier1',
          title: '💰 Points cumulés débutant',
          description: 'Cumuler 50 000 points dans le mois',
          target_value: 50000,
          xp_reward: 800,
          quest_type: 'monthly',
          is_active: true,
          min_rank_index: 0,
          max_rank_index: 3
        },
        intermediaire: {
          quest_key: 'monthly_cumulative_tier2',
          title: '💰 Points cumulés intermédiaire',
          description: 'Cumuler 150 000 points dans le mois',
          target_value: 150000,
          xp_reward: 2000,
          quest_type: 'monthly',
          is_active: true,
          min_rank_index: 4,
          max_rank_index: 7
        },
        avance: {
          quest_key: 'monthly_cumulative_tier3',
          title: '💰 Points cumulés avancé',
          description: 'Cumuler 300 000 points dans le mois',
          target_value: 300000,
          xp_reward: 4000,
          quest_type: 'monthly',
          is_active: true,
          min_rank_index: 8,
          max_rank_index: 11
        },
        expert: {
          quest_key: 'monthly_cumulative_tier4',
          title: '💰 Points cumulés expert',
          description: 'Cumuler 500 000 points dans le mois',
          target_value: 500000,
          xp_reward: 6000,
          quest_type: 'monthly',
          is_active: true,
          min_rank_index: 12,
          max_rank_index: 99
        }
      }
    }
  ];

  // Vérifier d'abord si la colonne existe
  console.log('🔍 Vérification de la structure de la table...\n');

  const { data: existingQuests, error: fetchError } = await supabase
    .from('daily_quests')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('❌ Erreur lors de la vérification:', fetchError);
    return;
  }

  const hasRankColumns = existingQuests && existingQuests.length > 0 &&
    'min_rank_index' in existingQuests[0];

  if (!hasRankColumns) {
    console.log('⚠️  Les colonnes min_rank_index et max_rank_index n\'existent pas encore.');
    console.log('📝 Création des colonnes via SQL...\n');

    // Note: Il faudra exécuter ceci manuellement dans Supabase
    console.log('-- SQL à exécuter dans Supabase:');
    console.log('ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS min_rank_index INTEGER DEFAULT 0;');
    console.log('ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS max_rank_index INTEGER DEFAULT 99;');
    console.log('\n⏭️  Exécutez ce SQL, puis relancez ce script.\n');
    return;
  }

  // Insérer les nouvelles quêtes avec scaling
  console.log('📥 Insertion des quêtes avec scaling...\n');

  for (const quest of scaledQuests) {
    for (const [tier, data] of Object.entries(quest.variants)) {
      // Vérifier si la quête existe déjà
      const { data: existing } = await supabase
        .from('daily_quests')
        .select('quest_key')
        .eq('quest_key', data.quest_key)
        .single();

      if (existing) {
        // Mise à jour
        const { error } = await supabase
          .from('daily_quests')
          .update(data)
          .eq('quest_key', data.quest_key);

        if (error) {
          console.error(`❌ ${data.quest_key}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`🔄 ${data.quest_key} (${tier}): mis à jour`);
          successCount++;
        }
      } else {
        // Insertion
        const { error } = await supabase
          .from('daily_quests')
          .insert([data]);

        if (error) {
          console.error(`❌ ${data.quest_key}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ ${data.quest_key} (${tier}): créé`);
          successCount++;
        }
      }
    }
  }

  console.log(`\n📊 Quêtes avec scaling : ${successCount} succès, ${errorCount} erreurs\n`);

  // ========== AFFICHER LE SYSTÈME DE GRADES ==========
  console.log('📈 SYSTÈME DE GRADES:\n');

  const tierRanges = [
    { tier: 'Débutant', range: '0-3', ranks: RANKS.slice(0, 4).map(r => r.label).join(', ') },
    { tier: 'Intermédiaire', range: '4-7', ranks: RANKS.slice(4, 8).map(r => r.label).join(', ') },
    { tier: 'Avancé', range: '8-11', ranks: RANKS.slice(8, 12).map(r => r.label).join(', ') },
    { tier: 'Expert', range: '12+', ranks: RANKS.slice(12, 16).map(r => r.label).join(', ') + '...' },
  ];

  tierRanges.forEach(({ tier, range, ranks }) => {
    console.log(`${tier.padEnd(15)} (index ${range.padEnd(5)}): ${ranks}`);
  });

  console.log('\n✨ Correction et scaling terminés !');
}

fixQuestsAndAddScaling().catch(console.error);

