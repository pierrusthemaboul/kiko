import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeSession() {
  // 1. Trouver l'utilisateur
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .or('display_name.ilike.%Pierrot%,display_name.ilike.%Pierre%');

  if (pError) {
    console.error('Erreur profiles:', pError);
    return;
  }

  console.log('Profils trouvés:', profiles);

  if (profiles.length === 0) {
    console.log('Aucun profil trouvé.');
    return;
  }

  const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'; // Pierrot

  // 2. Trouver les derniers scores (game_scores)
  const { data: scores, error: sError } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (sError) {
    console.error('Erreur game_scores:', sError);
  } else {
    console.log('Derniers scores (game_scores):', scores.map(s => ({ level: s.level, score: s.points, created_at: s.created_at })));
  }

  // 3. Trouver les événements joués
  // Si user_event_usage est vide, peut-être qu'il y a une autre table
  const { data: usage, error: uError } = await supabase
    .from('user_event_usage')
    .select(`
      event_id,
      last_seen_at,
      evenements (
        titre,
        date,
        notoriete_fr,
        niveau_difficulte
      )
    `)
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(50);

  if (uError) {
    console.error('Erreur usage:', uError);
  } else if (usage.length === 0) {
    console.log('Aucun événement trouvé dans user_event_usage.');
  } else {
    console.log(`Trouvé ${usage.length} événements dans user_event_usage.`);
  }

  console.log('Événements récents rencontrés:');
  const sessionEvents = usage
    .filter(u => u.evenements && new Date(u.evenements.date).getFullYear() >= 1)
    .map(u => ({
      titre: u.evenements.titre,
      date: u.evenements.date,
      notoriete: u.evenements.notoriete_fr,
      difficulte: u.evenements.niveau_difficulte,
      last_seen: u.last_seen_at
    }));

  console.log(JSON.stringify(sessionEvents, null, 2));
}

analyzeSession();
