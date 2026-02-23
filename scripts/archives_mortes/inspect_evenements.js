
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectTable() {
    const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching sample row:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('--- Sample Row Keys ---');
        console.log(Object.keys(data[0]).join(', '));
        console.log('--- Sample Data ---');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found in evenements table.');
    }
}

inspectTable();
