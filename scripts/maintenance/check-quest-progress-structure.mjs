/**
 * Vérifie la structure de quest_progress
 */
import { supabase } from './supabase-helper.mjs';

async function checkStructure() {
  const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'; // Pierrot

  console.log('🔍 VÉRIFICATION STRUCTURE quest_progress\n');

  // 1. Essayer de récupérer toutes les colonnes
  const { data, error } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .limit(1);

  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('Résultat select * :', data);
    console.log('Nombre de résultats:', data?.length || 0);
  }

  // 2. Compter sans filtre user_id
  const { count } = await supabase
    .from('quest_progress')
    .select('*', { count: 'exact', head: true });

  console.log('\nTotal quest_progress (tous users):', count);

  // 3. Essayer d'insérer avec les colonnes minimales
  console.log('\n💾 Tentative d\'insertion avec colonnes minimales...');

  const { data: inserted, error: insertError } = await supabase
    .from('quest_progress')
    .insert({
      user_id: userId,
      quest_key: 'daily_score_5000',
      current_value: 0,
      completed: false,
    })
    .select();

  if (insertError) {
    console.error('❌ Erreur insertion:', insertError);
  } else {
    console.log('✅ Insertion réussie:', inserted);
  }

  // 4. Vérifier à nouveau
  const { data: afterInsert } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId);

  console.log('\n📊 Quêtes après insertion:', afterInsert?.length || 0);
  if (afterInsert && afterInsert.length > 0) {
    console.log('Exemple:', afterInsert[0]);
  }
}

checkStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

