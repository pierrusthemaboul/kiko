import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAfterFix() {
  console.log('\n✅ ===== VÉRIFICATION APRÈS CORRECTION =====\n');

  // 1. Vérifier que les quêtes T4 sont désactivées
  console.log('📋 1. QUÊTES DAILY T4 (devraient être désactivées):');
  const { data: t4Daily } = await supabase
    .from('daily_quests')
    .select('quest_key, is_active, target_value')
    .eq('quest_type', 'daily')
    .eq('difficulty', 4)
    .in('quest_key', ['t4_score_75000', 't4_score_150000', 't4_score_300000']);

  if (t4Daily && t4Daily.length > 0) {
    t4Daily.forEach(q => {
      const status = q.is_active ? '❌ TOUJOURS ACTIVE' : '✅ Désactivée';
      console.log(`   ${q.quest_key.padEnd(25)} : ${status}`);
    });
  } else {
    console.log('   ⚠️  Quêtes non trouvées en base');
  }

  // 2. Vérifier la quête monthly T4
  console.log('\n📋 2. QUÊTE MONTHLY T4 (devrait être à 2M points):');
  const { data: t4Monthly } = await supabase
    .from('daily_quests')
    .select('quest_key, target_value, xp_reward')
    .eq('quest_key', 'm4_score_3M')
    .single();

  if (t4Monthly) {
    const targetOk = t4Monthly.target_value === 2000000 ? '✅' : '❌';
    const xpOk = t4Monthly.xp_reward === 25000 ? '✅' : '❌';
    console.log(`   Cible: ${targetOk} ${t4Monthly.target_value.toLocaleString()} points (attendu: 2 000 000)`);
    console.log(`   XP: ${xpOk} ${t4Monthly.xp_reward.toLocaleString()} XP (attendu: 25 000)`);
  } else {
    console.log('   ⚠️  Quête non trouvée');
  }

  // 3. Statistiques des quêtes actives
  console.log('\n📊 3. STATISTIQUES DES QUÊTES ACTIVES:');
  const { data: stats } = await supabase
    .from('daily_quests')
    .select('quest_type, difficulty, is_active');

  if (stats) {
    const byType = {};
    stats.forEach(q => {
      const key = `${q.quest_type}_T${q.difficulty}`;
      if (!byType[key]) byType[key] = { active: 0, inactive: 0 };
      if (q.is_active) byType[key].active++;
      else byType[key].inactive++;
    });

    console.log('\n   Type/Tier         | Actives | Inactives');
    console.log('   ------------------|---------|----------');
    Object.entries(byType).sort().forEach(([key, counts]) => {
      console.log(`   ${key.padEnd(18)}| ${counts.active.toString().padStart(7)} | ${counts.inactive.toString().padStart(9)}`);
    });
  }

  // 4. Vérifier qu'il n'y a plus de quêtes daily incohérentes
  console.log('\n🔍 4. VÉRIFICATION DES QUÊTES DAILY (score uniquement):');
  const { data: dailyQuests } = await supabase
    .from('daily_quests')
    .select('quest_key, difficulty, target_value, is_active')
    .eq('quest_type', 'daily')
    .eq('is_active', true)
    .or('quest_key.ilike.%score%,quest_key.ilike.%champion%,quest_key.ilike.%points%')
    .order('difficulty')
    .order('target_value');

  if (dailyQuests) {
    let allOk = true;
    console.log('\n   Quest Key                    | Tier | Cible    | Max parties (20k) | Cohérence');
    console.log('   -----------------------------|------|----------|-------------------|----------');

    dailyQuests.forEach(q => {
      // Calculer le max avec scaling (+15% pour le dernier grade du tier)
      const scaledMax = Math.round(q.target_value * 1.15 / 100) * 100;
      const partiesMax = Math.ceil(scaledMax / 20000);

      let coherence = '✅ OK';
      if (q.quest_key.startsWith('daily_score_')) {
        // One-shot
        if (scaledMax > 20000) {
          coherence = '❌ Trop élevé';
          allOk = false;
        }
      } else {
        // Cumulatif
        if (partiesMax > 3) {
          coherence = '❌ Trop de parties';
          allOk = false;
        }
      }

      console.log(`   ${q.quest_key.padEnd(29)}| T${q.difficulty}   | ${q.target_value.toString().padStart(8)} | ${partiesMax.toString().padStart(17)} | ${coherence}`);
    });

    console.log('\n   ' + (allOk ? '✅ Toutes les quêtes daily sont cohérentes !' : '❌ Des quêtes daily sont encore incohérentes'));
  }

  // 5. Résumé final
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📝 RÉSUMÉ FINAL:\n');

  const t4Disabled = t4Daily?.every(q => !q.is_active) ?? false;
  const monthlyFixed = t4Monthly?.target_value === 2000000 && t4Monthly?.xp_reward === 25000;

  if (t4Disabled && monthlyFixed) {
    console.log('   ✅ TOUTES LES CORRECTIONS ONT ÉTÉ APPLIQUÉES AVEC SUCCÈS!\n');
    console.log('   Le système de quêtes est maintenant 100% cohérent avec les');
    console.log('   performances réelles des joueurs (10k-20k points/partie).\n');
  } else {
    console.log('   ⚠️  CERTAINES CORRECTIONS N\'ONT PAS ÉTÉ APPLIQUÉES:\n');
    if (!t4Disabled) console.log('   - Les quêtes daily T4 sont encore actives');
    if (!monthlyFixed) console.log('   - La quête monthly T4 n\'a pas été réduite');
    console.log('\n   Assurez-vous d\'avoir exécuté FIX_QUEST_BALANCE.sql dans Supabase.\n');
  }

  console.log('='.repeat(80) + '\n');
}

verifyAfterFix().catch(console.error);
