import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function fixProfileAndQuests() {
  console.log('\n🔧 === CORRECTION DU PROFIL ET DES QUÊTES ===\n');

  // 1. Vérifier le profil
  console.log('1️⃣ Vérification du profil...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('❌ Erreur:', profileError);
    return;
  }

  console.log('Profil actuel:');
  console.log(`  - xp_total: ${profile.xp_total}`);
  console.log(`  - games_played: ${profile.games_played}`);
  console.log(`  - current_streak: ${profile.current_streak}`);
  console.log(`  - last_play_date: ${profile.last_play_date}`);

  // 2. Corriger xp_total si NULL
  if (profile.xp_total === null) {
    console.log('\n⚠️  xp_total est NULL, correction en cours...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ xp_total: 49843 }) // Utiliser la valeur du dump que tu as fourni
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Erreur lors de la mise à jour:', updateError);
    } else {
      console.log('✅ xp_total corrigé à 49843');
    }
  } else {
    console.log('✅ xp_total est OK:', profile.xp_total);
  }

  // 3. Vérifier quest_progress
  console.log('\n2️⃣ Vérification des quest_progress...');
  const { data: questProgress, error: progressError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId);

  if (progressError) {
    console.error('❌ Erreur:', progressError);
    return;
  }

  console.log(`Nombre de quest_progress: ${questProgress?.length || 0}`);

  // 4. Initialiser les quêtes si nécessaire
  if (!questProgress || questProgress.length === 0) {
    console.log('\n⚠️  Aucune quest_progress, initialisation...');

    // Récupérer toutes les quêtes actives
    const { data: allActiveQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('is_active', true);

    if (questsError) {
      console.error('❌ Erreur:', questsError);
      return;
    }

    console.log(`Trouvé ${allActiveQuests?.length || 0} quêtes actives`);

    if (allActiveQuests && allActiveQuests.length > 0) {
      // Fonction pour calculer reset_at selon le type
      function getResetDate(questType: string): string {
        const now = new Date();

        if (questType === 'daily') {
          const tomorrow = new Date(now);
          tomorrow.setHours(24, 0, 0, 0);
          return tomorrow.toISOString();
        } else if (questType === 'weekly') {
          const nextMonday = new Date(now);
          const dayOfWeek = nextMonday.getDay();
          const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
          nextMonday.setHours(0, 0, 0, 0);
          return nextMonday.toISOString();
        } else {
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(1);
          nextMonth.setHours(0, 0, 0, 0);
          return nextMonth.toISOString();
        }
      }

      const progressToCreate = allActiveQuests.map(quest => ({
        user_id: userId,
        quest_key: quest.quest_key,
        current_value: 0,
        completed: false,
        reset_at: getResetDate(quest.quest_type),
      }));

      const { data: created, error: createError } = await supabase
        .from('quest_progress')
        .insert(progressToCreate)
        .select();

      if (createError) {
        console.error('❌ Erreur lors de la création:', createError);
      } else {
        console.log(`✅ ${created?.length || 0} quest_progress créées`);
      }
    }
  } else {
    console.log('✅ quest_progress déjà initialisées');

    // Afficher quelques exemples
    const playQuests = questProgress.filter(q => q.quest_key.includes('_play_'));
    if (playQuests.length > 0) {
      console.log('\nExemples de quêtes "play":');
      playQuests.slice(0, 3).forEach(q => {
        console.log(`  - ${q.quest_key}: ${q.current_value} (completed: ${q.completed})`);
      });
    }
  }

  console.log('\n✅ Vérification terminée!\n');
}

fixProfileAndQuests().catch(console.error);

