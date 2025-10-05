#!/usr/bin/env node
/**
 * Quick check - Vérification rapide de l'état du système
 * Usage: node scripts/quick-check.mjs
 */

import { supabase } from './supabase-helper.mjs';

async function quickCheck() {
  console.log('⚡ QUICK CHECK\n');

  try {
    // Compter les quêtes
    const { count: questCount } = await supabase
      .from('daily_quests')
      .select('*', { count: 'exact', head: true });

    // Compter les achievements
    const { count: achCount } = await supabase
      .from('achievements')
      .select('*', { count: 'exact', head: true });

    // Compter les utilisateurs
    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    console.log('✅ Connexion Supabase OK\n');
    console.log(`📋 Quêtes quotidiennes: ${questCount || 0}`);
    console.log(`🏆 Achievements: ${achCount || 0}`);
    console.log(`👥 Utilisateurs: ${userCount || 0}\n`);

    if (questCount === 9 && achCount === 17) {
      console.log('🎉 Système rééquilibré et opérationnel !\n');
    }
  } catch (err) {
    console.error('❌ Erreur:', err.message, '\n');
    process.exit(1);
  }
}

quickCheck().then(() => process.exit(0));
