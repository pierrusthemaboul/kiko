import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction de conversion points -> XP (copie de lib/economy/convert.ts)
function pointsToXP(points, mode = 'date') {
  const cfg = {
    basePerMode: { classic: 25, date: 30, precision: 35 },
    kPerMode: { classic: 0.45, date: 0.50, precision: 0.55 },
    alphaPerMode: { classic: 0.68, date: 0.66, precision: 0.70 },
    softcap: { threshold: 20000, slope: 0.45 },
    clamp: { min: 15, max: 800 },
  };

  const x = Math.max(points, 0);
  const xpBase = cfg.basePerMode[mode];
  const k = cfg.kPerMode[mode];
  const alpha = cfg.alphaPerMode[mode];

  let xpRaw = xpBase + k * Math.pow(x, alpha);

  if (x > cfg.softcap.threshold) {
    const surplus = x - cfg.softcap.threshold;
    xpRaw += k * (cfg.softcap.slope * Math.sqrt(surplus));
  }

  const xpRounded = Math.round(xpRaw);
  return Math.min(Math.max(xpRounded, cfg.clamp.min), cfg.clamp.max);
}

// Fonction courbe XP pour grades (copie de lib/economy/ranks.ts)
function xpCurve(index) {
  return Math.round(1125 * index * index + 750 * index + 1000);
}

async function verifyQuestBalance() {
  console.log('\n📊 ===== VÉRIFICATION DE L\'ÉQUILIBRAGE DES QUÊTES =====\n');

  // 1. Afficher la conversion points -> XP pour des scores typiques
  console.log('💰 1. CONVERSION POINTS → XP (mode Date):');
  const typicalScores = [5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000];
  console.log('   Score      | XP gagné  | Parties pour 1000 XP');
  console.log('   -----------|-----------|---------------------');

  typicalScores.forEach(score => {
    const xp = pointsToXP(score, 'date');
    const partiesFor1000XP = Math.ceil(1000 / xp);
    console.log(`   ${score.toString().padStart(10)} | ${xp.toString().padStart(9)} | ${partiesFor1000XP.toString().padStart(19)}`);
  });

  // 2. Afficher les grades et XP requis
  console.log('\n\n🏆 2. GRADES ET XP REQUIS:');
  const ranks = [
    { index: 0, label: 'Page' },
    { index: 1, label: 'Écuyer' },
    { index: 2, label: 'Chevalier Bachelier' },
    { index: 3, label: 'Chevalier Banneret' },
    { index: 4, label: 'Baronnet' },
    { index: 5, label: 'Baron' },
    { index: 6, label: 'Vicomte' },
    { index: 7, label: 'Seigneur' },
    { index: 8, label: 'Comte' },
    { index: 10, label: 'Marquis' },
    { index: 12, label: 'Duc' },
    { index: 15, label: 'Prince Électeur' },
    { index: 20, label: 'Grand Roi' },
    { index: 25, label: 'Empereur des Empereurs' },
  ];

  console.log('   Grade                      | XP requis | Parties (12.5k/partie)');
  console.log('   ---------------------------|-----------|----------------------');

  const xpPer12500 = pointsToXP(12500, 'date');
  ranks.forEach(rank => {
    const xpRequired = xpCurve(rank.index);
    const partiesNeeded = Math.ceil(xpRequired / xpPer12500);
    console.log(`   ${rank.label.padEnd(26)} | ${xpRequired.toString().padStart(9)} | ${partiesNeeded.toString().padStart(20)}`);
  });

  // 3. Vérifier les quêtes de score
  console.log('\n\n🎯 3. QUÊTES DE SCORE (actives):');
  const { data: scoreQuests, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .or('quest_key.ilike.%score%,quest_key.ilike.%champion%,quest_key.ilike.%points%')
    .order('quest_type')
    .order('target_value');

  if (error) {
    console.error('   ❌ Erreur:', error);
    return;
  }

  const groupedQuests = {
    daily: [],
    weekly: [],
    monthly: []
  };

  scoreQuests?.forEach(q => {
    if (groupedQuests[q.quest_type]) {
      groupedQuests[q.quest_type].push(q);
    }
  });

  console.log('\n   📅 QUÊTES QUOTIDIENNES:');
  if (groupedQuests.daily.length === 0) {
    console.log('      Aucune quête de score quotidienne');
  } else {
    groupedQuests.daily.forEach(q => {
      const isOneShot = q.quest_key.startsWith('daily_score_') || q.quest_key.includes('high_score');
      const partiesNeeded = isOneShot ? '1 partie' : `${Math.ceil(q.target_value / 12500)} parties (12.5k/partie)`;
      console.log(`      - ${q.quest_key.padEnd(30)} : ${q.target_value.toString().padStart(6)} points (${partiesNeeded}) - ${q.xp_reward} XP`);
    });
  }

  console.log('\n   📆 QUÊTES HEBDOMADAIRES:');
  if (groupedQuests.weekly.length === 0) {
    console.log('      Aucune quête de score hebdomadaire');
  } else {
    groupedQuests.weekly.forEach(q => {
      const partiesNeeded = Math.ceil(q.target_value / 12500);
      console.log(`      - ${q.quest_key.padEnd(30)} : ${q.target_value.toString().padStart(6)} points (${partiesNeeded} parties) - ${q.xp_reward} XP`);
    });
  }

  console.log('\n   📅 QUÊTES MENSUELLES:');
  if (groupedQuests.monthly.length === 0) {
    console.log('      Aucune quête de score mensuelle');
  } else {
    groupedQuests.monthly.forEach(q => {
      const partiesNeeded = Math.ceil(q.target_value / 12500);
      console.log(`      - ${q.quest_key.padEnd(30)} : ${q.target_value.toString().padStart(6)} points (${partiesNeeded} parties) - ${q.xp_reward} XP`);
    });
  }

  // 4. Recommandations
  console.log('\n\n💡 4. RECOMMANDATIONS:');
  console.log('   Pour un joueur moyen (10-15k points/partie):');
  console.log('   - Gagne environ 260-350 XP par partie');
  console.log('   - Quêtes quotidiennes ONE-SHOT devraient cibler: 5k, 7.5k, 10k, 12.5k, 15k');
  console.log('   - Quêtes hebdomadaires CUMULATIVES devraient cibler: 50k-150k (4-12 parties)');
  console.log('   - Quêtes mensuelles CUMULATIVES devraient cibler: 200k-500k (16-40 parties)');

  console.log('\n✅ ===== FIN DE LA VÉRIFICATION =====\n');
}

verifyQuestBalance().catch(console.error);
