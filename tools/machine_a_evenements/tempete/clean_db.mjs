import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { localDb } from './supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

function now() {
    return new Date().toISOString();
}

async function main() {
    console.log(`[${now()}] clean_db — start`);

    const { data: keepRow, error: keepErr } = await localDb
        .from('ratoire')
        .select('id')
        .eq('id', 1)
        .maybeSingle();

    if (keepErr) {
        console.error(`[${now()}] ERREUR: lecture ratoire(id=1) impossible: ${keepErr.message}`);
        process.exit(1);
    }

    if (!keepRow) {
        console.log(`[${now()}] INFO: ratoire(id=1) introuvable — suppression totale.`);
    } else {
        console.log(`[${now()}] INFO: ratoire(id=1) présent — il sera conservé.`);
    }

    const { error: delErr } = await localDb
        .from('ratoire')
        .delete()
        .neq('id', 1);

    if (delErr) {
        console.error(`[${now()}] ERREUR: suppression ratoire (sauf id=1) a échoué: ${delErr.message}`);
        process.exit(1);
    }

    const { count, error: countErr } = await localDb
        .from('ratoire')
        .select('*', { count: 'exact', head: true });

    if (countErr) {
        console.error(`[${now()}] ERREUR: count(*) ratoire a échoué: ${countErr.message}`);
        process.exit(1);
    }

    console.log(`[${now()}] clean_db — OK. ratoire count(*) = ${count || 0}`);
}

main().catch((e) => {
    console.error(`[${now()}] FATAL: ${e?.stack || e?.message || e}`);
    process.exit(1);
});

