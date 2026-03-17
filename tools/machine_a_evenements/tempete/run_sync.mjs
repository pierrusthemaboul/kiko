import { syncAllEmbeddings } from './embeddings.mjs';
import { assertSupabaseConfig } from './supabase.mjs';

function now() {
    return new Date().toISOString();
}

async function run() {
    console.log(`[${now()}] tempête/run_sync.mjs — Démarrage`);

    try {
        assertSupabaseConfig();
    } catch (e) {
        console.error(`[${now()}] Config Supabase incomplète: ${e.message}`);
    }

    let lastProdLogged = 0;
    let lastLocalLogged = 0;

    console.log(`[${now()}] Lancement syncAllEmbeddings()...`);

    const result = await syncAllEmbeddings({
        prodBatchSize: 200,
        localBatchSize: 200,
        onProdProgress: ({ done, total }) => {
            if (done - lastProdLogged >= 50 || done === total) {
                lastProdLogged = done;
                console.log(`[${now()}] Indexation Prod : ${done}/${total} terminés...`);
            }
        },
        onLocalProgress: ({ done, total }) => {
            if (done - lastLocalLogged >= 50 || done === total) {
                lastLocalLogged = done;
                console.log(`[${now()}] Indexation Local : ${done}/${total} terminés...`);
            }
        },
    });

    if (result.prod?.error) {
        console.error(`[${now()}] Prod : échec : ${result.prod.error}`);
    }
    if (result.local?.error) {
        console.error(`[${now()}] Local : échec : ${result.local.error}`);
    }

    console.log(`[${now()}] Terminé. Résultats sync: ${JSON.stringify(result)}`);
}

run().catch((e) => {
    console.error(`[${now()}] FATAL: ${e?.stack || e?.message || e}`);
    process.exit(1);
});

