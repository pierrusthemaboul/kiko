/**
 * Helper Supabase - Accès rapide à la base de données
 *
 * Utilisation dans Claude Code:
 * 1. Importer ce module dans vos scripts
 * 2. Utiliser les fonctions prédéfinies
 *
 * Exemple:
 *   import { supabase, viewQuests, viewAchievements, viewStats } from './supabase-helper.mjs';
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes: EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Affiche toutes les quêtes quotidiennes
 */
export async function viewQuests() {
  const { data, error } = await supabase
    .from('daily_quests')
    .select('*')
    .order('quest_type', { ascending: true });

  if (error) {
    console.error('❌ Erreur:', error);
    return null;
  }

  console.log(`\n📋 ${data.length} quête(s) quotidienne(s):\n`);

  const byType = {};
  data.forEach(q => {
    if (!byType[q.quest_type]) byType[q.quest_type] = [];
    byType[q.quest_type].push(q);
  });

  Object.entries(byType).forEach(([type, quests]) => {
    console.log(`  ${type.toUpperCase()}:`);
    quests.forEach(q => {
      console.log(`    • ${q.title} (${q.target_value}) → ${q.xp_reward} XP`);
    });
    console.log('');
  });

  return data;
}

/**
 * Affiche tous les achievements
 */
export async function viewAchievements() {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('achievement_type', { ascending: true });

  if (error) {
    console.error('❌ Erreur:', error);
    return null;
  }

  console.log(`\n🏆 ${data.length} achievement(s):\n`);

  const byType = {};
  let totalXP = 0;

  data.forEach(a => {
    if (!byType[a.achievement_type]) byType[a.achievement_type] = [];
    byType[a.achievement_type].push(a);
    totalXP += a.xp_bonus;
  });

  Object.entries(byType).forEach(([type, achievements]) => {
    console.log(`  ${type.toUpperCase()}:`);
    achievements.forEach(a => {
      console.log(`    • ${a.title} → ${a.xp_bonus} XP`);
    });
    console.log('');
  });

  console.log(`  💰 Total XP disponible: ${totalXP} XP\n`);

  return data;
}

/**
 * Affiche les statistiques générales
 */
export async function viewStats() {
  const { count: userCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  const { count: runsCount } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true });

  const { data: questProgress } = await supabase
    .from('quest_progress')
    .select('quest_key, completed');

  console.log('\n📊 STATISTIQUES:\n');
  console.log(`  👥 Utilisateurs: ${userCount || 0}`);
  console.log(`  🎮 Parties jouées: ${runsCount || 0}`);

  if (questProgress && questProgress.length > 0) {
    const completed = questProgress.filter(q => q.completed).length;
    const total = questProgress.length;
    const rate = ((completed / total) * 100).toFixed(1);
    console.log(`  📋 Quêtes complétées: ${completed}/${total} (${rate}%)`);
  }

  console.log('');

  return {
    users: userCount || 0,
    runs: runsCount || 0,
    questProgress: questProgress || [],
  };
}

/**
 * Récupère les top joueurs
 */
export async function getTopPlayers(limit = 10) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, xp_total, title_key, games_played, high_score')
    .order('xp_total', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Erreur:', error);
    return null;
  }

  return data;
}

/**
 * Récupère un profil utilisateur par ID
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Erreur:', error);
    return null;
  }

  return data;
}

/**
 * Récupère les quêtes d'un utilisateur
 */
export async function getUserQuests(userId) {
  const { data: progress, error: progressError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId);

  if (progressError) {
    console.error('❌ Erreur:', progressError);
    return null;
  }

  const { data: quests, error: questsError } = await supabase
    .from('daily_quests')
    .select('*');

  if (questsError) {
    console.error('❌ Erreur:', questsError);
    return null;
  }

  return quests.map(quest => ({
    ...quest,
    progress: progress.find(p => p.quest_key === quest.quest_key) || null,
  }));
}

/**
 * Vue d'ensemble complète
 */
export async function overview() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📊 VUE D\'ENSEMBLE SUPABASE - KIKO');
  console.log('═══════════════════════════════════════════════════════════════');

  await viewQuests();
  await viewAchievements();
  await viewStats();

  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Si exécuté directement, afficher la vue d'ensemble
if (import.meta.url === `file://${process.argv[1]}`) {
  overview()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Erreur fatale:', err);
      process.exit(1);
    });
}
