import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProdDb, assertSupabaseConfig } from './tempete/supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    assertSupabaseConfig();
    const db = getProdDb();

    const { data, count, error } = await db
        .from('evenements')
        .select('id', { count: 'exact', head: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`\n==========================================`);
    console.log(`🚀 TOTAL ÉVÉNEMENTS EN PRODUCTION : ${count}`);
    console.log(`==========================================\n`);
}

main();

