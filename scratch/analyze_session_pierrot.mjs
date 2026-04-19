import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeSession() {
  const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0'; // Pierrot

  // 1. Get usage from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    .gte('last_seen_at', today.toISOString())
    .order('last_seen_at', { ascending: true }); // Chronological order

  if (uError) {
    console.error('Error:', uError);
    return;
  }

  // 2. Identify levels based on eventsPerLevel (3, 4, 5, 6...)
  const events = usage.map(u => ({
    titre: u.evenements.titre,
    notoriete: u.evenements.notoriete_fr,
    last_seen: u.last_seen_at
  }));

  const levels = [];
  let currentPos = 0;
  const eventsPerLevel = [3, 4, 5, 6, 7];

  for (let i = 0; i < eventsPerLevel.length; i++) {
    const count = eventsPerLevel[i];
    const levelEvents = events.slice(currentPos, currentPos + count);
    if (levelEvents.length === 0) break;
    
    const avgNotoriete = levelEvents.reduce((acc, e) => acc + (e.notoriete || 0), 0) / levelEvents.length;
    const obscureCount = levelEvents.filter(e => (e.notoriete || 0) < 20).length;
    
    levels.push({
      level: i + 1,
      avgNotoriete,
      obscureCount,
      events: levelEvents
    });
    
    currentPos += count;
  }

  console.log(JSON.stringify(levels, null, 2));
}

analyzeSession();
