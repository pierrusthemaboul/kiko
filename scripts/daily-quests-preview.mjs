import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

function getDailySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function shuffleWithSeed(array, seed) {
  const shuffled = [...array];
  const random = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function preview() {
  console.log('🎯 QUÊTES DU JOUR\n');

  const { data } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('quest_type', 'daily')
    .eq('is_active', true);

  const seed = getDailySeed();
  const selected = shuffleWithSeed(data || [], seed).slice(0, 3);

  selected.forEach((q, i) => {
    console.log(`${i + 1}. ${q.title}`);
    console.log(`   ${q.xp_reward} XP${q.parts_reward > 0 ? ` + ${q.parts_reward} partie(s)` : ''}\n`);
  });
}

preview().then(() => process.exit(0));
