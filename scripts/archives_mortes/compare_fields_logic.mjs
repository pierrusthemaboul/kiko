import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function compare() {
    const { data: oldEvents } = await supabase.from('evenements').select('*').eq('titre', 'La chute du mur de Berlin').limit(1);
    const { data: newEvents } = await supabase.from('evenements').select('*').not('source_goju2_id', 'is', null).order('created_at', { ascending: false }).limit(1);

    const oldEvent = oldEvents[0];
    const newEvent = newEvents[0];
    const keys = ['langue', 'universel', 'important', 'notoriete', 'region', 'epoque', 'types_evenement'];

    keys.forEach(k => {
        console.log(`${k.toUpperCase()}: Old=${JSON.stringify(oldEvent[k])}, New=${JSON.stringify(newEvent[k])}`);
    });
}
compare();
