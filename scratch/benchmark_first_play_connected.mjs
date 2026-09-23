/**
 * Benchmark du temps de chargement pour un premier joueur CONNECTÉ
 * Simule ce qui se passe quand un joueur connecté lance sa première partie en mode classique sans tuto
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
);

async function benchmarkFirstPlayConnected() {
  console.log('🚀 BENCHMARK: Premier joueur CONNECTÉ - Mode classique sans tuto');
  console.log('='.repeat(60));

  const timings = {};
  const totalStart = Date.now();

  try {
    // 1. Auth check
    const authStart = Date.now();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    timings.auth = Date.now() - authStart;
    console.log(`✅ Auth check: ${timings.auth}ms`);

    if (authError || !authUser) {
      console.log('❌ Pas d\'utilisateur connecté - ce benchmark nécessite un user connecté');
      return;
    }

    console.log(`👤 Utilisateur: ${authUser.id}`);

    // 2. Profile fetch
    const profileStart = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, high_score, parties_per_day')
      .eq('id', authUser.id)
      .maybeSingle();
    timings.profile = Date.now() - profileStart;
    console.log(`✅ Profile fetch: ${timings.profile}ms`);

    // 3. Refresh plays info (équivalent à usePlays)
    const playsStart = Date.now();
    const window = getTodayWindow();
    const { count: runsToday } = await supabase
      .from('runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .gte('created_at', window.startISO)
      .lt('created_at', window.endISO);
    timings.plays_check = Date.now() - playsStart;
    console.log(`✅ Plays check: ${timings.plays_check}ms (${runsToday} runs today)`);

    // 4. Run creation (insert)
    const insertStart = Date.now();
    const { data: inserted, error: insertError } = await supabase
      .from('runs')
      .insert({ user_id: authUser.id, mode: 'classic', points: 0 })
      .select('id, created_at')
      .single();
    timings.run_insert = Date.now() - insertStart;
    console.log(`✅ Run insert: ${timings.run_insert}ms (ID: ${inserted?.id})`);

    // 5. Events fetch (cache miss scenario - premier lancement)
    const eventsStart = Date.now();
    const { data: events, error: eventsError } = await supabase
      .from('evenements')
      .select('id, titre, date, date_formatee, types_evenement, illustration_url, frequency_score, notoriete, notoriete_fr, description_detaillee, last_used')
      .gte('notoriete_fr', 70)
      .gte('date', '0001-01-01')
      .order('notoriete_fr', { ascending: false })
      .limit(800);
    timings.events_fetch = Date.now() - eventsStart;
    console.log(`✅ Events fetch: ${timings.events_fetch}ms (${events?.length} events)`);

    // 6. Image prefetch simulation (juste le temps de préparation des URLs)
    const prefetchStart = Date.now();
    const imageUrls = events?.slice(0, 2).map(e => e.illustration_url).filter(Boolean) || [];
    timings.prefetch_prep = Date.now() - prefetchStart;
    console.log(`✅ Image prefetch prep: ${timings.prefetch_prep}ms (${imageUrls.length} URLs)`);

    const total = Date.now() - totalStart;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DES TIMINGS');
    console.log('='.repeat(60));
    Object.entries(timings).forEach(([step, time]) => {
      const pct = ((time / total) * 100).toFixed(1);
      console.log(`${step.padEnd(20)}: ${String(time).padStart(5)}ms (${pct}%)`);
    });
    console.log('='.repeat(60));
    console.log(`TOTAL: ${total}ms`);
    console.log('='.repeat(60));

    // Analyse
    console.log('\n🔍 ANALYSE:');
    if (timings.events_fetch > 1000) {
      console.log('⚠️ Le fetch des événements est lent (>1s)');
    }
    if (timings.run_insert > 500) {
      console.log('⚠️ L\'insert du run est lent (>500ms)');
    }
    const dbTime = timings.profile + timings.plays_check + timings.run_insert + timings.events_fetch;
    console.log(`⏱️ Temps total DB: ${dbTime}ms (${((dbTime/total)*100).toFixed(1)}%)`);

    // Simulation avec cache HIT
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCÉNARIO CACHE HIT (2ème lancement)');
    console.log('='.repeat(60));
    const cacheHitTime = timings.auth + timings.profile + timings.plays_check + timings.run_insert + 50; // 50ms pour lire AsyncStorage
    console.log(`Temps estimé avec cache: ${cacheHitTime}ms (économie de ${timings.events_fetch}ms)`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

function getTodayWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString()
  };
}

benchmarkFirstPlayConnected();
