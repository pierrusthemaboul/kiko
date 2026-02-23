import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function addPlays() {
    try {
        const userId = '6d6fbf81-0727-401a-b81a-f4f380cbb6b0';
        const { data, error } = await supabase
            .from('profiles')
            .update({ is_admin: true, parties_per_day: 999 })
            .eq('id', userId)
            .select();

        if (error) throw error;
        console.log("SUCCESS", data);
    } catch (e) {
        console.error("FAILURE", e);
    }
}
addPlays();
