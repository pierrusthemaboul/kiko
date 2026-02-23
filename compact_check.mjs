import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient('http://127.0.0.1:54321', 'process.env.SUPABASE_SERVICE_ROLE_KEY');

async function analyze() {
    const { count: total } = await supabase.from('evenements').select('*', { count: 'exact', head: true });
    const { count: t1 } = await supabase.from('evenements').select('*', { count: 'exact', head: true }).gte('notoriete', 75);
    const { count: t2 } = await supabase.from('evenements').select('*', { count: 'exact', head: true }).gte('notoriete', 50).lt('notoriete', 75);
    const { count: t3 } = await supabase.from('evenements').select('*', { count: 'exact', head: true }).lt('notoriete', 50);

    console.log(`TOTAL DB: ${total}`);
    console.log(`T1 (>=75): ${t1}`);
    console.log(`T2 (50-74): ${t2}`);
    console.log(`T3 (<50): ${t3}`);
}
analyze();
