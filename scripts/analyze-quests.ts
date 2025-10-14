import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeQuests() {
  // Récupérer toutes les quêtes
  const { data: quests } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('target_value', { ascending: true });

  console.log('📋 QUÊTES ACTIVES PAR TYPE:\n');

  const byType: Record<string, any[]> = { daily: [], weekly: [], monthly: [] };
  quests?.forEach(q => byType[q.quest_type]?.push(q));

  for (const [type, list] of Object.entries(byType)) {
    console.log(`\n🎯 ${type.toUpperCase()}:`);
    list.forEach((q: any) => {
      console.log(`  - ${q.quest_key}: ${q.title}`);
      console.log(`    Objectif: ${q.target_value} | Récompense: ${q.xp_reward} XP`);
    });
  }

  // Stats sur les scores récents
  console.log('\n\n📊 STATISTIQUES DE SCORES (30 derniers jours):');
  const { data: scores } = await supabase
    .from('game_scores')
    .select('score')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('score', { ascending: false });

  if (scores && scores.length > 0) {
    const sortedScores = scores.map(s => s.score).sort((a, b) => b - a);
    console.log(`  Total parties: ${sortedScores.length}`);
    console.log(`  Top 1: ${sortedScores[0]}`);
    console.log(`  Top 10: ${sortedScores[9] || 'N/A'}`);
    console.log(`  Médiane: ${sortedScores[Math.floor(sortedScores.length / 2)]}`);
    console.log(`  Moyenne: ${Math.round(sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length)}`);

    const above10k = sortedScores.filter(s => s >= 10000).length;
    const above15k = sortedScores.filter(s => s >= 15000).length;
    const above50k = sortedScores.filter(s => s >= 50000).length;

    console.log(`\n  Scores >= 10k: ${above10k} (${Math.round(above10k / sortedScores.length * 100)}%)`);
    console.log(`  Scores >= 15k: ${above15k} (${Math.round(above15k / sortedScores.length * 100)}%)`);
    console.log(`  Scores >= 50k: ${above50k} (${Math.round(above50k / sortedScores.length * 100)}%)`);
  }

  // XP par score
  console.log('\n\n💰 CONVERSION POINTS -> XP (mode classic):');
  const samples = [1000, 5000, 10000, 15000, 20000, 30000, 50000];

  // Simule la fonction pointsToXP
  const pointsToXP = (points: number) => {
    const x = Math.max(points, 0);
    const xpBase = 50;
    const k = 0.8;
    const alpha = 0.72;

    let xpRaw = xpBase + k * Math.pow(x, alpha);

    if (x > 1000) {
      const surplus = x - 1000;
      xpRaw += k * (0.6 * Math.pow(surplus, 0.5));
    }

    return Math.min(Math.max(Math.round(xpRaw), 20), 600);
  };

  samples.forEach(pts => {
    console.log(`  ${pts.toLocaleString()} pts -> ${pointsToXP(pts)} XP`);
  });
}

analyzeQuests().catch(console.error);
