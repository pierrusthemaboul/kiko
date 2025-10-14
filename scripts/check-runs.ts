import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function checkRuns() {
  console.log('\n🔍 === VÉRIFICATION DES RUNS ===\n');

  // Compter les runs
  const { count: totalCount } = await supabase
    .from('runs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  console.log(`Total runs pour cet user: ${totalCount}`);

  // Compter par mode
  const modes = ['classic', 'date', 'precision'];
  for (const mode of modes) {
    const { count } = await supabase
      .from('runs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', mode);

    console.log(`  Mode ${mode}: ${count} runs`);
  }

  // Dernières 10 runs tous modes confondus
  console.log('\n📊 Dernières 10 runs (tous modes):');
  const { data: runs } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  runs?.forEach((run, i) => {
    const date = new Date(run.created_at).toLocaleString('fr-FR');
    const eco = run.economy_applied_at ? '✅' : '❌';
    console.log(`  ${i + 1}. [${run.mode}] ${run.points} pts - ${date} - Eco: ${eco}`);
  });
}

checkRuns().catch(console.error);
