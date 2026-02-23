
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase.from('evenements').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample event from evenements:', JSON.stringify(data[0], null, 2));
    }

    const { data: goju, error: gojuError } = await supabase.from('goju2').select('*').eq('transferred', false).limit(1);
    if (gojuError) {
        console.error('Error goju2:', gojuError);
    } else {
        console.log('Sample event from goju2:', JSON.stringify(goju[0], null, 2));
    }
}

inspect();
