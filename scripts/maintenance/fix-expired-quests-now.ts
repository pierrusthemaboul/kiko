import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * Calcule la date de reset en fonction du type de quête
 */
function getResetDate(questType: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();

  if (questType === 'daily') {
    // Reset demain à minuit
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.toISOString();
  } else if (questType === 'weekly') {
    // Reset lundi prochain à minuit
    const nextMonday = new Date(now);
    const dayOfWeek = nextMonday.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.toISOString();
  } else {
    // Reset le 1er du mois prochain à minuit
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }
}

async function fixExpiredQuests() {
  console.log('🔧 CORRECTION DES QUÊTES EXPIRÉES\n');
  console.log('─'.repeat(80));

  const now = new Date();

  // 1. Identifier les quêtes expirées
  console.log('📊 Étape 1: Identification des quêtes expirées...\n');

  const { data: expiredQuests, error: fetchError } = await supabase
    .from('quest_progress')
    .select('id, user_id, quest_key, reset_at')
    .lt('reset_at', now.toISOString());

  if (fetchError) {
    console.error('❌ Erreur:', fetchError);
    return;
  }

  console.log(`   Trouvé ${expiredQuests?.length || 0} entrées expirées\n`);

  if (!expiredQuests || expiredQuests.length === 0) {
    console.log('✅ Aucune quête expirée à corriger');
    return;
  }

  // 2. Supprimer les quêtes expirées
  console.log('🗑️  Étape 2: Suppression des quêtes expirées...\n');

  const { error: deleteError } = await supabase
    .from('quest_progress')
    .delete()
    .lt('reset_at', now.toISOString());

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return;
  }

  console.log(`   ✅ ${expiredQuests.length} quêtes expirées supprimées\n`);

  // 3. Identifier les utilisateurs affectés
  const affectedUsers = Array.from(new Set(expiredQuests.map(q => q.user_id)));
  console.log(`👥 Étape 3: ${affectedUsers.length} utilisateurs affectés\n`);

  // 4. Récupérer toutes les quêtes actives
  console.log('📋 Étape 4: Récupération des quêtes actives...\n');

  const { data: activeQuests, error: questsError } = await supabase
    .from('daily_quests')
    .select('quest_key, quest_type')
    .eq('is_active', true);

  if (questsError || !activeQuests) {
    console.error('❌ Erreur:', questsError);
    return;
  }

  console.log(`   ✅ ${activeQuests.length} quêtes actives trouvées\n`);

  // 5. Réinitialiser les quêtes pour chaque utilisateur
  console.log('🔄 Étape 5: Réinitialisation des quêtes...\n');

  let totalCreated = 0;

  for (const userId of affectedUsers) {
    const progressEntries = activeQuests.map(quest => ({
      user_id: userId,
      quest_key: quest.quest_key,
      current_value: 0,
      completed: false,
      reset_at: getResetDate(quest.quest_type as 'daily' | 'weekly' | 'monthly'),
    }));

    const { data, error: insertError } = await supabase
      .from('quest_progress')
      .insert(progressEntries)
      .select();

    if (insertError) {
      console.error(`   ❌ Erreur pour user ${userId.substring(0, 8)}:`, insertError.message);
    } else {
      totalCreated += data?.length || 0;
      console.log(`   ✅ User ${userId.substring(0, 8)}: ${data?.length || 0} quêtes créées`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  console.log('\n📊 RÉSUMÉ FINAL:');
  console.log(`   - Quêtes expirées supprimées: ${expiredQuests.length}`);
  console.log(`   - Utilisateurs affectés: ${affectedUsers.length}`);
  console.log(`   - Nouvelles quêtes créées: ${totalCreated}`);
  console.log('\n✅ Correction terminée avec succès!\n');

  // 6. Vérifier le résultat
  console.log('🔍 Vérification finale...\n');

  const { data: remainingExpired } = await supabase
    .from('quest_progress')
    .select('id')
    .lt('reset_at', now.toISOString());

  console.log(`   Quêtes expirées restantes: ${remainingExpired?.length || 0}`);

  if (remainingExpired && remainingExpired.length > 0) {
    console.log('   ⚠️  Il reste des quêtes expirées!');
  } else {
    console.log('   ✅ Toutes les quêtes expirées ont été corrigées');
  }

  console.log('\n' + '─'.repeat(80));
}

fixExpiredQuests().catch(console.error);

