import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data: runs, error } = await supabase
        .from('runs')
        .select('*')
        .eq('points', 13581);

    console.log("Runs with score 13581:", runs);

    const { data: scores } = await supabase
        .from('game_scores')
        .select('*')
        .eq('score', 13581);

    console.log("Scores with 13581:", scores);
}
check();
