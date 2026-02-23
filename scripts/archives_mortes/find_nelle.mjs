import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function findNelle() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', '%Nelle%');

    if (error) {
        console.error(error);
        return;
    }

    console.log("Profiles trouvés pour Nelle:", data);
}
findNelle();
