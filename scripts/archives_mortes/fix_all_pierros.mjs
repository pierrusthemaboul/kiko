import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fixAll() {
    const ids = [
        '9d97c5fe-9051-4da5-881a-f4f380cbb6b0',
        '9d97c5fe-912f-4161-9c6f-3199c0993557',
        '6d6fbf81-0727-401a-b81a-f4f380cbb6b0',
        '1d170ffe-82b8-4180-a50e-b873f721516e'
    ];
    console.log("Mise à jour massive des comptes Pierre/Pierrot...");
    const { data, error } = await supabase.from('profiles').update({ is_admin: true, parties_per_day: 999 }).in('id', ids).select();
    if (error) console.error(error);
    else console.log(`Mis à jour ${data.length} comptes.`);
}
fixAll();
