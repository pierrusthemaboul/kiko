import { getSupabase } from './AGENTS/shared_utils.mjs';

const supabase = getSupabase();

const { data, error } = await supabase
    .from('evenements')
    .select('titre, date')
    .ilike('titre', '%austerlitz%');

if (error) {
    console.error(error);
} else {
    console.log('Événements contenant "austerlitz":');
    console.log(JSON.stringify(data, null, 2));
}
