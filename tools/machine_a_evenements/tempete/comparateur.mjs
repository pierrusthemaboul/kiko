import { getWikipediaEvents } from './wikipedia.mjs';
import { embedText, getOpenAIClient } from './openai.mjs';
import { prodDb, localDb } from './supabase.mjs';

async function bestSimilarityProd(queryVector) {
    const { data, error } = await prodDb.rpc('match_evenements_embeddings', {
        query_embedding: queryVector,
        match_count: 1,
    });
    if (error) throw error;
    const sim = data?.[0]?.similarity;
    return Number.isFinite(sim) ? sim : 0;
}

async function bestSimilarityLocal(queryVector) {
    const { data, error } = await localDb.rpc('match_labo_embeddings', {
        query_embedding: queryVector,
        match_count: 1,
    });
    if (error) throw error;
    const sim = data?.[0]?.similarity;
    return Number.isFinite(sim) ? sim : 0;
}

async function bestSimilarityRatoire(queryVector) {
    const { data, error } = await localDb.rpc('match_ratoire_embeddings', {
        query_embedding: queryVector,
        match_count: 1,
    });
    if (error) throw error;
    const sim = data?.[0]?.similarity;
    return Number.isFinite(sim) ? sim : 0;
}

export async function trouverNouveauxEvenements(year, options = {}) {
    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.85;
    const lang = options.lang || 'en';
    const limit = Number.isFinite(options.limit) ? options.limit : 50;

    const onExploration = typeof options.onExploration === 'function' ? options.onExploration : null;
    const onCompare = typeof options.onCompare === 'function' ? options.onCompare : null;

    const openaiClient = options.openaiClient || getOpenAIClient();

    const titles = await getWikipediaEvents(year, {
        lang,
        limit,
        debugRaw: options.wikipediaDebugRaw === true,
        onRaw: typeof options.onWikipediaRaw === 'function' ? options.onWikipediaRaw : null,
    });

    if (onExploration) {
        onExploration({ year, titlesCount: titles.length, lang, limit });
    }

    const holes = [];

    for (let i = 0; i < titles.length; i++) {
        const titre = titles[i];
        if (typeof titre !== 'string' || titre.trim().length === 0) continue;

        const vec = await embedText(titre, { client: openaiClient, model: 'text-embedding-3-small' });

        let simProd = 0;
        let simLocal = 0;
        let simRatoire = 0;

        try {
            simProd = await bestSimilarityProd(vec);
        } catch {
            simProd = 0;
        }

        try {
            simLocal = await bestSimilarityLocal(vec);
        } catch {
            simLocal = 0;
        }

        try {
            simRatoire = await bestSimilarityRatoire(vec);
        } catch {
            simRatoire = 0;
        }

        const maxSim = Math.max(simProd, simLocal, simRatoire);

        if (onCompare) {
            onCompare({
                titre,
                similarity: maxSim,
                similarityProd: simProd,
                similarityLocal: simLocal,
                similarityRatoire: simRatoire,
                threshold,
            });
        }

        if (maxSim < threshold) {
            holes.push({
                titre,
                maxSimilarity: maxSim,
                similarityProd: simProd,
                similarityLocal: simLocal,
                similarityRatoire: simRatoire,
            });
        }
    }

    return holes;
}

