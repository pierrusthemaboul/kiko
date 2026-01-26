
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const NEW_QUESTS = [
    // ==========================================
    // TIER 1 : DEBUTANT (Page -> Chevalier)
    // ==========================================

    // Activity
    { quest_key: 't1_play_3', quest_type: 'daily', difficulty: 1, category: 'activity', title: '🎮 Apprenti', description: 'Jouer 3 parties', target_value: 3, xp_reward: 80 },

    // Score
    { quest_key: 't1_score_1000', quest_type: 'daily', difficulty: 1, category: 'score', title: '⭐ Premier Pas', description: 'Atteindre 1 000 points', target_value: 1000, xp_reward: 70 },
    { quest_key: 't1_score_2000', quest_type: 'daily', difficulty: 1, category: 'score', title: '⭐ Progrès', description: 'Atteindre 2 000 points', target_value: 2000, xp_reward: 100 },
    { quest_key: 't1_score_3500', quest_type: 'daily', difficulty: 1, category: 'score', title: '⭐ Espoir', description: 'Atteindre 3 500 points', target_value: 3500, xp_reward: 150 },

    // Streak
    { quest_key: 't1_streak_10', quest_type: 'daily', difficulty: 1, category: 'streak', title: '🔥 Petite Flamme', description: 'Série de 10 bonnes réponses', target_value: 10, xp_reward: 100 },
    { quest_key: 't1_streak_20', quest_type: 'daily', difficulty: 1, category: 'streak', title: '🔥 Échauffement', description: 'Série de 20 bonnes réponses', target_value: 20, xp_reward: 150 },

    // Skill
    { quest_key: 't1_both_modes', quest_type: 'daily', difficulty: 1, category: 'skill', title: '⚖️ Curieux', description: 'Essayer les 2 modes de jeu', target_value: 2, xp_reward: 120 },

    // ==========================================
    // TIER 2 : CONFIRMÉ (Baronnet -> Seigneur) -> C'est ton Tier !
    // ==========================================

    // Activity
    { quest_key: 't2_play_5', quest_type: 'daily', difficulty: 2, category: 'activity', title: '🎮 Marathonien', description: 'Jouer 5 parties', target_value: 5, xp_reward: 150 },

    // Score
    { quest_key: 't2_score_5000', quest_type: 'daily', difficulty: 2, category: 'score', title: '💎 Valeureux', description: 'Atteindre 5 000 points', target_value: 5000, xp_reward: 200 },
    { quest_key: 't2_score_7500', quest_type: 'daily', difficulty: 2, category: 'score', title: '💎 Noble Score', description: 'Atteindre 7 500 points', target_value: 7500, xp_reward: 250 },
    { quest_key: 't2_score_10000', quest_type: 'daily', difficulty: 2, category: 'score', title: '💎 Maître du 10k', description: 'Atteindre 10 000 points', target_value: 10000, xp_reward: 350 },

    // Streak
    { quest_key: 't2_streak_35', quest_type: 'daily', difficulty: 2, category: 'streak', title: '🔥 Brasier', description: 'Série de 35 bonnes réponses', target_value: 35, xp_reward: 200 },
    { quest_key: 't2_streak_50', quest_type: 'daily', difficulty: 2, category: 'streak', title: '🔥 Incontournable', description: 'Série de 50 bonnes réponses', target_value: 50, xp_reward: 300 },

    // Skill
    { quest_key: 't2_precision_perfect', quest_type: 'daily', difficulty: 2, category: 'skill', title: '🎯 OEil de Lynx', description: '5 dates à ±5 ans (Précision)', target_value: 5, xp_reward: 350 },

    // ==========================================
    // TIER 3 : MAÎTRE (Comte -> Margrave)
    // ==========================================

    // Activity
    { quest_key: 't3_play_8', quest_type: 'daily', difficulty: 3, category: 'activity', title: '🎮 Infatigable', description: 'Jouer 8 parties', target_value: 8, xp_reward: 300 },

    // Score
    { quest_key: 't3_score_20000', quest_type: 'daily', difficulty: 3, category: 'score', title: '🌟 Prestige', description: 'Atteindre 20 000 points', target_value: 20000, xp_reward: 500 },
    { quest_key: 't3_score_35000', quest_type: 'daily', difficulty: 3, category: 'score', title: '🌟 Grand Maître', description: 'Atteindre 35 000 points', target_value: 35000, xp_reward: 700 },
    { quest_key: 't3_score_50000', quest_type: 'daily', difficulty: 3, category: 'score', title: '🌟 Légende Vivante', description: 'Atteindre 50 000 points', target_value: 50000, xp_reward: 1000 },

    // Streak
    { quest_key: 't3_streak_75', quest_type: 'daily', difficulty: 3, category: 'streak', title: '🔥 Phénix', description: 'Série de 75 bonnes réponses', target_value: 75, xp_reward: 600 },
    { quest_key: 't3_streak_100', quest_type: 'daily', difficulty: 3, category: 'streak', title: '🔥 Invulnérable', description: 'Série de 100 bonnes réponses', target_value: 100, xp_reward: 800 },

    // Skill
    { quest_key: 't3_speed_25', quest_type: 'daily', difficulty: 3, category: 'skill', title: '⚡ Éclair Royal', description: '25 rép. en moins de 3s', target_value: 25, xp_reward: 500 },

    // ==========================================
    // TIER 4 : LÉGENDE (Duc -> Empereur)
    // ==========================================

    // Activity
    { quest_key: 't4_play_10', quest_type: 'daily', difficulty: 4, category: 'activity', title: '🎮 Dieu du Jeu', description: 'Jouer 10 parties', target_value: 10, xp_reward: 1000 },

    // Score
    { quest_key: 't4_score_75000', quest_type: 'daily', difficulty: 4, category: 'score', title: '👑 Souverain', description: 'Atteindre 75 000 points', target_value: 75000, xp_reward: 1500 },
    { quest_key: 't4_score_150000', quest_type: 'daily', difficulty: 4, category: 'score', title: '👑 Divinité', description: 'Atteindre 150 000 points', target_value: 150000, xp_reward: 2500 },
    { quest_key: 't4_score_300000', quest_type: 'daily', difficulty: 4, category: 'score', title: '👑 Empereur Eternel', description: 'Atteindre 300 000 points', target_value: 300000, xp_reward: 5000 },

    // Streak
    { quest_key: 't4_streak_150', quest_type: 'daily', difficulty: 4, category: 'streak', title: '🔥 Divin', description: 'Série de 150 bonnes réponses', target_value: 150, xp_reward: 2000 },
    { quest_key: 't4_streak_250', quest_type: 'daily', difficulty: 4, category: 'streak', title: '🔥 Absolu', description: 'Série de 250 bonnes réponses', target_value: 250, xp_reward: 4000 },

    // Skill
    { quest_key: 't4_no_mistake_20', quest_type: 'daily', difficulty: 4, category: 'skill', title: '🎯 Perfection Pure', description: '20 manches parfaites (Précision)', target_value: 20, xp_reward: 2000 },

    // ==========================================
    // WEEKLY QUESTS (Hebdomadaires)
    // ==========================================

    // Tier 1
    { quest_key: 'w1_play_15', quest_type: 'weekly', difficulty: 1, category: 'activity', title: '📅 Assidu', description: 'Jouer 15 parties cette semaine', target_value: 15, xp_reward: 500, parts_reward: 1 },
    { quest_key: 'w1_score_25k', quest_type: 'weekly', difficulty: 1, category: 'score', title: '📅 Scoreur de Semaine', description: 'Cumuler 25 000 points', target_value: 25000, xp_reward: 600 },

    // Tier 2
    { quest_key: 'w2_play_30', quest_type: 'weekly', difficulty: 2, category: 'activity', title: '📅 Grand Voyageur', description: 'Jouer 30 parties cette semaine', target_value: 30, xp_reward: 1000, parts_reward: 2 },
    { quest_key: 'w2_score_75k', quest_type: 'weekly', difficulty: 2, category: 'score', title: '📅 Pilier du Temps', description: 'Cumuler 75 000 points', target_value: 75000, xp_reward: 1200 },

    // Tier 3
    { quest_key: 'w3_play_50', quest_type: 'weekly', difficulty: 3, category: 'activity', title: '📅 Infatigable Hebdo', description: 'Jouer 50 parties cette semaine', target_value: 50, xp_reward: 2000, parts_reward: 5 },
    { quest_key: 'w3_score_200k', quest_type: 'weekly', difficulty: 3, category: 'score', title: '📅 Souverain Hebdo', description: 'Cumuler 200 000 points', target_value: 200000, xp_reward: 2500 },

    // Tier 4
    { quest_key: 'w4_play_80', quest_type: 'weekly', difficulty: 4, category: 'activity', title: '📅 Maître du Calendrier', description: 'Jouer 80 parties cette semaine', target_value: 80, xp_reward: 5000, parts_reward: 10 },
    { quest_key: 'w4_score_500k', quest_type: 'weekly', difficulty: 4, category: 'score', title: '📅 Légende du Score', description: 'Cumuler 500 000 points', target_value: 500000, xp_reward: 6000 },

    // ==========================================
    // MONTHLY QUESTS (Mensuelles)
    // ==========================================

    // Tier 1
    { quest_key: 'm1_play_50', quest_type: 'monthly', difficulty: 1, category: 'activity', title: '🏛️ Historien Junior', description: 'Jouer 50 parties ce mois', target_value: 50, xp_reward: 2000, parts_reward: 5 },
    { quest_key: 'm1_score_150k', quest_type: 'monthly', difficulty: 1, category: 'score', title: '🏛️ Collectionneur de Points', description: 'Cumuler 150 000 points', target_value: 150000, xp_reward: 2500 },

    // Tier 2
    { quest_key: 'm2_play_100', quest_type: 'monthly', difficulty: 2, category: 'activity', title: '🏛️ Gardien du Savoir', description: 'Jouer 100 parties ce mois', target_value: 100, xp_reward: 5000, parts_reward: 10 },
    { quest_key: 'm2_score_400k', quest_type: 'monthly', difficulty: 2, category: 'score', title: '🏛️ Archiviste Royal', description: 'Cumuler 400 000 points', target_value: 400000, xp_reward: 6000 },

    // Tier 3
    { quest_key: 'm3_play_200', quest_type: 'monthly', difficulty: 3, category: 'activity', title: '🏛️ Erudit Eternel', description: 'Jouer 200 parties ce mois', target_value: 200, xp_reward: 12000, parts_reward: 25 },
    { quest_key: 'm3_score_1M', quest_type: 'monthly', difficulty: 3, category: 'score', title: '🏛️ Collectionneur de Millénaires', description: 'Cumuler 1 000 000 de points', target_value: 1000000, xp_reward: 15000 },

    // Tier 4
    { quest_key: 'm4_play_400', quest_type: 'monthly', difficulty: 4, category: 'activity', title: '🏛️ Dieu de l\'Histoire', description: 'Jouer 400 parties ce mois', target_value: 400, xp_reward: 30000, parts_reward: 50 },
    { quest_key: 'm4_score_3M', quest_type: 'monthly', difficulty: 4, category: 'score', title: '🏛️ Omniscient', description: 'Cumuler 3 000 000 de points', target_value: 3000000, xp_reward: 40000 },
];

async function updateQuests() {
    console.log('🧹 Désactivation des anciennes quêtes quotidiennes...');
    const { error: deactivateError } = await supabase
        .from('daily_quests')
        .update({ is_active: false })
        .eq('quest_type', 'daily');

    if (deactivateError) {
        console.error('❌ Erreur désactivation:', deactivateError.message);
        return;
    }

    console.log('🚀 Insertion des nouvelles quêtes équilibrées...');
    let count = 0;
    for (const quest of NEW_QUESTS) {
        const { error } = await supabase
            .from('daily_quests')
            .upsert({ ...quest, is_active: true }, { onConflict: 'quest_key' });

        if (error) {
            console.error(`❌ Erreur sur ${quest.quest_key}:`, error.message);
        } else {
            console.log(`✅ Ajouté : ${quest.title} (Tier ${quest.difficulty})`);
            count++;
        }
    }

    console.log(`\n✨ Terminé ! ${count} quêtes mises à jour.`);
}

updateQuests();
