const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
const ids = ['e5735fb8-0ebf-4e22-ac4e-12fd5fdb20f2', 'c7bfd033-aacb-4856-9c1a-833c2215c139', '1a3745cc-918c-4e02-afcf-ca2c0bd1870f'];

async function getLinks() {
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .in('id', ids);

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(e => {
        console.log(`--- ${e.titre} ---`);
        console.log(e.illustration_url);
    });
}

getLinks();
