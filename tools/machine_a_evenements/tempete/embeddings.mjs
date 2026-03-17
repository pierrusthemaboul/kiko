import { embedText, getOpenAIClient } from './openai.mjs';
import { localDb, prodDb } from './supabase.mjs';

function buildTextForEmbedding(evt) {
    const parts = [evt?.titre, evt?.description, evt?.description_detaillee]
        .filter(x => typeof x === 'string')
        .map(x => x.trim())
        .filter(Boolean);
    return parts.join('\n\n');
}

async function countRows(db, table) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
}

async function syncMissingEmbeddingsForTable(options) {
    const db = options.db;
    const sourceTable = options.sourceTable;
    const sourceSelect = options.sourceSelect;
    const embeddingsTable = options.embeddingsTable;
    const batchSize = Number.isFinite(options.batchSize) ? options.batchSize : 200;
    const maxToProcess = Number.isFinite(options.maxToProcess) ? options.maxToProcess : null;
    const openaiClient = options.openaiClient;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

    const totalSource = await countRows(db, sourceTable);
    const alreadyEmbedded = await countRows(db, embeddingsTable);

    let offset = 0;
    let processed = 0;

    while (true) {
        const { data: rows, error } = await db
            .from(sourceTable)
            .select(sourceSelect)
            .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (!rows || rows.length === 0) break;

        const ids = rows.map(r => r.id).filter(x => x !== null && x !== undefined);
        if (ids.length === 0) {
            offset += rows.length;
            continue;
        }

        const { data: existingEmb, error: existingErr } = await db
            .from(embeddingsTable)
            .select('id')
            .in('id', ids);

        if (existingErr) throw existingErr;
        const existingSet = new Set((existingEmb || []).map(x => x.id));

        const missing = rows.filter(r => !existingSet.has(r.id));
        if (missing.length === 0) {
            offset += rows.length;
            continue;
        }

        for (const evt of missing) {
            const text = buildTextForEmbedding(evt);
            if (!text) continue;

            const vector = await embedText(text, { client: openaiClient, model: 'text-embedding-3-small' });

            const payload = {
                id: evt.id,
                titre_vector: vector,
                metadata: {
                    sourceTable,
                    titre: evt.titre || null,
                },
                updated_at: new Date().toISOString(),
            };

            const { error: upsertErr } = await db
                .from(embeddingsTable)
                .upsert(payload, { onConflict: 'id' });

            if (upsertErr) throw upsertErr;

            processed++;
            if (onProgress) {
                const done = alreadyEmbedded + processed;
                onProgress({ processed, done, total: totalSource, sourceTable, embeddingsTable });
            }
            if (maxToProcess && processed >= maxToProcess) return { processed };
        }

        offset += rows.length;
    }

    return { processed };
}

export async function generateAndStoreEmbeddings(options = {}) {
    const sourceTable = options.sourceTable || 'evenements';
    const sourceSelect = options.sourceSelect || 'id,titre,description_detaillee';
    const embeddingsTable = options.embeddingsTable || 'evenements_embeddings';
    const batchSize = Number.isFinite(options.batchSize) ? options.batchSize : 50;
    const maxRecords = Number.isFinite(options.maxRecords) ? options.maxRecords : null;

    const db = options.db || localDb;
    const client = options.openaiClient || getOpenAIClient();

    let offset = 0;
    let total = 0;

    while (true) {
        const { data: rows, error } = await db
            .from(sourceTable)
            .select(sourceSelect)
            .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (!rows || rows.length === 0) break;

        for (const evt of rows) {
            const text = buildTextForEmbedding(evt);
            if (!text) continue;

            const vector = await embedText(text, { client, model: 'text-embedding-3-small' });

            const payload = {
                id: evt.id,
                titre_vector: vector,
                metadata: {
                    sourceTable,
                    titre: evt.titre || null,
                },
                updated_at: new Date().toISOString(),
            };

            const { error: upsertErr } = await db
                .from(embeddingsTable)
                .upsert(payload, { onConflict: 'id' });

            if (upsertErr) throw upsertErr;

            total++;
            if (maxRecords && total >= maxRecords) return { total };
        }

        offset += rows.length;
    }

    return { total };
}

export async function syncAllEmbeddings(options = {}) {
    const openaiClient = options.openaiClient || getOpenAIClient();

    const result = { prod: null, local: null };

    try {
        result.prod = await syncMissingEmbeddingsForTable({
            db: prodDb,
            sourceTable: 'evenements',
            sourceSelect: 'id,titre,description_detaillee',
            embeddingsTable: 'evenements_embeddings',
            batchSize: options.prodBatchSize ?? 200,
            maxToProcess: options.maxProd ?? null,
            openaiClient,
            onProgress: options.onProdProgress,
        });
    } catch (e) {
        result.prod = { error: String(e?.message || e) };
    }

    try {
        result.local = await syncMissingEmbeddingsForTable({
            db: localDb,
            sourceTable: 'labo',
            sourceSelect: 'id,titre,description',
            embeddingsTable: 'labo_embeddings',
            batchSize: options.localBatchSize ?? 200,
            maxToProcess: options.maxLocal ?? null,
            openaiClient,
            onProgress: options.onLocalProgress,
        });
    } catch (e) {
        result.local = { error: String(e?.message || e) };
    }

    return result;
}

