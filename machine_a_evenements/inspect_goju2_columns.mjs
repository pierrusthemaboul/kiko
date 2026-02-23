
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectColumns() {
    const table = 'goju2';
    const possibleColumns = ['date', 'date_formatee', 'titre', 'illustration_url', 'types_evenement', 'description_detaillee', 'notoriete', 'style_info', 'style_name', 'prompt_flux', 'transferred'];

    console.log(`Inspection des colonnes de ${table}...`);
    const results = {};

    for (const col of possibleColumns) {
        const { error } = await supabase.from(table).select(col).limit(0);
        results[col] = !error;
        if (error) {
            console.log(`❌ Column ${col} missing: ${error.message}`);
        } else {
            console.log(`✅ Column ${col} exists`);
        }
    }
}

inspectColumns();
