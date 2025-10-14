import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testQuestResetLogic() {
  console.log('🔍 Test de la logique de reset des quêtes\n');

  // 1. Vérifier les dates de reset des quêtes existantes
  const { data: questProgress, error } = await supabase
    .from('quest_progress')
    .select('quest_key, reset_at, completed, current_value, user_id')
    .order('reset_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log('📊 Échantillon de quest_progress:');
  console.log('─'.repeat(80));

  const now = new Date();
  let expiredCount = 0;

  for (const q of questProgress || []) {
    const resetDate = new Date(q.reset_at);
    const isExpired = resetDate < now;

    if (isExpired) expiredCount++;

    console.log(`${isExpired ? '🔴' : '🟢'} ${q.quest_key.padEnd(30)} | Reset: ${resetDate.toISOString()} | ${isExpired ? 'EXPIRÉ' : 'Actif'}`);
  }

  console.log('─'.repeat(80));
  console.log(`\n📈 Résumé: ${expiredCount} quêtes expirées trouvées sur ${questProgress?.length || 0}\n`);

  // 2. Vérifier la structure des dates de reset par type
  const { data: allProgress } = await supabase
    .from('quest_progress')
    .select('quest_key, reset_at')
    .order('reset_at');

  if (allProgress) {
    const resetDates = new Map<string, number>();

    for (const p of allProgress) {
      const date = p.reset_at.split('T')[0]; // YYYY-MM-DD
      resetDates.set(date, (resetDates.get(date) || 0) + 1);
    }

    console.log('📅 Distribution des dates de reset:');
    console.log('─'.repeat(80));

    const sortedDates = Array.from(resetDates.entries()).sort();
    for (const [date, count] of sortedDates.slice(0, 10)) {
      console.log(`${date}: ${count} quêtes`);
    }
    console.log('─'.repeat(80));
  }

  // 3. Récupérer les informations de la table daily_quests
  const { data: dailyQuests } = await supabase
    .from('daily_quests')
    .select('quest_key, quest_type, is_active')
    .eq('is_active', true);

  if (dailyQuests) {
    const byType = {
      daily: 0,
      weekly: 0,
      monthly: 0,
    };

    for (const q of dailyQuests) {
      byType[q.quest_type as keyof typeof byType]++;
    }

    console.log('\n📋 Quêtes actives dans daily_quests:');
    console.log('─'.repeat(80));
    console.log(`Daily:   ${byType.daily} quêtes`);
    console.log(`Weekly:  ${byType.weekly} quêtes`);
    console.log(`Monthly: ${byType.monthly} quêtes`);
    console.log('─'.repeat(80));
  }

  // 4. Vérifier si des triggers ou fonctions SQL existent
  console.log('\n🔧 Vérification des mécanismes de reset automatique:');
  console.log('─'.repeat(80));

  const { data: functions } = await supabase.rpc('pg_get_functiondef', {
    funcoid: 'reset_expired_quests'
  }).then(
    () => ({ data: true }),
    () => ({ data: false })
  );

  console.log(`Fonction SQL 'reset_expired_quests': ${functions ? '✅ Existe' : '❌ N\'existe pas'}`);

  // 5. Simuler les dates de reset attendues
  console.log('\n🎯 Dates de reset attendues (calculées):');
  console.log('─'.repeat(80));

  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  console.log(`Daily (demain):   ${tomorrow.toISOString()}`);

  const nextMonday = new Date(now);
  const dayOfWeek = nextMonday.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);
  console.log(`Weekly (lundi):   ${nextMonday.toISOString()}`);

  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  console.log(`Monthly (1er):    ${nextMonth.toISOString()}`);
  console.log('─'.repeat(80));

  console.log('\n✅ Test terminé\n');
}

testQuestResetLogic().catch(console.error);
