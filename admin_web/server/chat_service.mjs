/**
 * chat_service.mjs — Agent Timalaus avec Gemini Function Calling
 *
 * Gemini reçoit la question de l'utilisateur et décide quels "outils"
 * appeler pour interroger la base de données. Il formate ensuite une
 * réponse en langage naturel + retourne les événements trouvés.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// --- Clients ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────
// OUTILS DISPONIBLES (exécution côté serveur)
// ─────────────────────────────────────────────────────────

/**
 * Recherche sémantique via OpenAI embedding + RPC pgvector
 */
async function tool_search_semantic({ query, limit = 20 }) {
    console.log(`  🔍 [tool_search_semantic] "${query}" (limit: ${limit})`);

    // 1. Générer l'embedding de la requête
    const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
    });
    const vector = res.data[0].embedding;

    // 2. Recherche par similarité cosinus via RPC Supabase (table sidecar evenements_embeddings, source_type='titre')
    const { data: matches, error } = await supabase.rpc('match_evenements_by_titre', {
        query_embedding: vector,
        match_count: limit,
    });
    if (error) throw new Error(`RPC error: ${error.message}`);
    if (!matches || matches.length === 0) return [];

    // 3. Récupérer les détails complets des événements trouvés
    const ids = matches.map(m => m.id);
    const { data: events } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, types_evenement, region, epoque, donnee_corrigee, description_detaillee, notoriete')
        .in('id', ids);

    // 4. Trier par similarité (ordre du RPC)
    const eventMap = new Map(events.map(e => [e.id, e]));
    return matches
        .map(m => ({ ...eventMap.get(m.id), similarity: m.similarity }))
        .filter(Boolean);
}

/**
 * Recherche structurée par filtres SQL
 */
async function tool_filter_events({
    titre_contains,
    region,
    epoque,
    types_evenement,
    donnee_corrigee,
    has_image,
    notoriete_min,
    notoriete_max,
    date_min,
    date_max,
    limit = 30,
}) {
    console.log(`  🗂️  [tool_filter_events]`, { titre_contains, region, epoque, types_evenement });

    let query = supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, types_evenement, region, epoque, donnee_corrigee, description_detaillee, notoriete')
        .order('date', { ascending: false })
        .limit(limit);

    if (titre_contains) query = query.ilike('titre', `%${titre_contains}%`);
    if (region) query = query.eq('region', region);
    if (epoque) query = query.eq('epoque', epoque);
    if (types_evenement) query = query.contains('types_evenement', [types_evenement]);
    if (donnee_corrigee !== undefined) query = query.eq('donnee_corrigee', donnee_corrigee);
    if (has_image === true) query = query.not('illustration_url', 'is', null);
    if (has_image === false) query = query.is('illustration_url', null);
    if (notoriete_min !== undefined) query = query.gte('notoriete', notoriete_min);
    if (notoriete_max !== undefined) query = query.lte('notoriete', notoriete_max);
    if (date_min) query = query.gte('date', date_min);
    if (date_max) query = query.lte('date', date_max);

    const { data, error } = await query;
    if (error) throw new Error(`Filter error: ${error.message}`);
    return data || [];
}

/**
 * Compte les événements selon des critères (retourne un chiffre)
 */
async function tool_count_events({ has_image, donnee_corrigee, region, epoque, types_evenement }) {
    console.log(`  📊 [tool_count_events]`, { has_image, donnee_corrigee, region });

    let query = supabase.from('evenements').select('id', { count: 'exact', head: true });

    if (region) query = query.eq('region', region);
    if (epoque) query = query.eq('epoque', epoque);
    if (types_evenement) query = query.contains('types_evenement', [types_evenement]);
    if (donnee_corrigee !== undefined) query = query.eq('donnee_corrigee', donnee_corrigee);
    if (has_image === true) query = query.not('illustration_url', 'is', null);
    if (has_image === false) query = query.is('illustration_url', null);

    const { count, error } = await query;
    if (error) throw new Error(`Count error: ${error.message}`);
    return { count };
}

/**
 * Récupère le détail complet d'un événement par son ID
 */
async function tool_get_event({ id }) {
    console.log(`  📋 [tool_get_event] ${id}`);
    const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw new Error(`Get event error: ${error.message}`);
    return data;
}

// ─────────────────────────────────────────────────────────
// DÉFINITIONS DES OUTILS POUR GEMINI (Function Calling)
// ─────────────────────────────────────────────────────────

const TOOL_DECLARATIONS = [
    {
        name: 'search_semantic',
        description: `Recherche des événements par similarité sémantique (sens, concept, thème, émotion).
        Utilise-le pour : "catastrophe naturelle", "scandales", "événements marrants", "triste", "héroïque", 
        "inventions", "conflits", ou tout thème subjectif ou conceptuel.`,
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'La requête en langage naturel à chercher sémantiquement' },
                limit: { type: 'number', description: 'Nombre max de résultats (défaut: 20)' },
            },
            required: ['query'],
        },
    },
    {
        name: 'filter_events',
        description: `Filtre les événements par critères structurés. 
        Pour les siècles, convertis toujours en chiffres romains (ex: "11e siècle" -> XIe, "20e" -> XXe). 
        Époques types : XIe, XIIe... XXe, XXIe, Moderne, Contemporaine, Moyen Âge, Antiquité.`,
        parameters: {
            type: 'object',
            properties: {
                titre_contains: { type: 'string', description: 'Texte recherché dans le titre' },
                region: { type: 'string', description: 'Ex: FRANCE, EUROPE, ASIE, MONDE, AFRIQUE' },
                epoque: { type: 'string', description: 'Ex: XIe, XIXe, XXe, Moderne. Convertir 11e en XIe.' },
                types_evenement: { type: 'string', description: 'Ex: Politique, Science, Sport, Culture, Insolite' },
                donnee_corrigee: { type: 'boolean', description: 'true = corrigé, false = à corriger' },
                has_image: { type: 'boolean', description: 'true = avec image, false = sans image' },
                notoriete_min: { type: 'number', description: 'Notoriété minimum (0-100)' },
                date_min: { type: 'string', description: 'Format YYYY-MM-DD' },
                date_max: { type: 'string', description: 'Format YYYY-MM-DD' },
                limit: { type: 'number', description: 'Nombre max de résultats (défaut: 30)' },
            },
            required: [],
        },
    },
    {
        name: 'count_events',
        description: 'Compte le nombre d\'événements selon des critères. Utile pour répondre à "combien de..."',
        parameters: {
            type: 'object',
            properties: {
                has_image: { type: 'boolean' },
                donnee_corrigee: { type: 'boolean' },
                region: { type: 'string' },
                epoque: { type: 'string' },
                types_evenement: { type: 'string' },
            },
            required: [],
        },
    },
    {
        name: 'get_event',
        description: 'Récupère tous les détails d\'un événement spécifique par son ID UUID.',
        parameters: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'UUID de l\'événement' },
            },
            required: ['id'],
        },
    },
];

// Map pour exécuter les outils
const TOOL_EXECUTORS = {
    search_semantic: tool_search_semantic,
    filter_events: tool_filter_events,
    count_events: tool_count_events,
    get_event: tool_get_event,
};

// ─────────────────────────────────────────────────────────
// SYSTÈME D'AGENT PRINCIPAL
// ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es l'assistant IA de l'interface d'administration Timalaus.
Base de données d'événements historiques : titre, date, région, époque, catégories, notoriété.

TES CAPACITÉS :
- Recherche sémantique (concept, émotion, "vibe") via search_semantic. INDISPENSABLE pour les questions comme "événements marrants".
- Filtres structurés (siècles, régions) via filter_events.
- Siècles : Convertis systématiquement en chiffres romains pour les filtres (ex: 11ème -> XIe). 
- Comptage via count_events.

RÈGLES D'OPTIMISATION :
- ESSAIE DE LANCER TES APPELS D'OUTILS EN PARALLÈLE. Si la question demande des batailles en France au 20e siècle, lance un seul filter_events avec tous les paramètres, ou un search_semantic + un filter_events en même temps si besoin.
- Réponds toujours en français, sois concis.
- Pas de blabla inutile, va droit au but.`;

/**
 * Fonction principale exportée.
 * @param {Array} history - Historique Gemini [{ role, parts }]
 * @param {string} userMessage - Le nouveau message de l'utilisateur
 * @returns {{ text: string, events: Array, newHistory: Array }}
 */
export async function chat(history, userMessage) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    });

    // Reprendre la conversation avec l'historique
    const chatSession = model.startChat({ history });

    let response = await chatSession.sendMessage(userMessage);
    let allEvents = [];

    // Boucle d'agent : Gemini peut faire plusieurs appels d'outils en séquence
    let maxIterations = 5;
    while (maxIterations-- > 0) {
        const candidate = response.response.candidates[0];
        const parts = candidate.content.parts;

        // Vérifier s'il y a des appels de fonctions
        const functionCalls = parts.filter(p => p.functionCall);
        if (functionCalls.length === 0) break; // Plus d'appels → réponse finale

        // Exécuter tous les appels en parallèle
        const startTime = Date.now();
        const toolResults = await Promise.all(
            functionCalls.map(async (part) => {
                const { name, args } = part.functionCall;
                const toolStart = Date.now();
                console.log(`🔧 Gemini appelle : ${name}(${JSON.stringify(args)})`);
                try {
                    const result = await TOOL_EXECUTORS[name](args);
                    console.log(`   ✅ ${name} terminé en ${Date.now() - toolStart}ms`);

                    // Collecter les événements trouvés
                    if (Array.isArray(result) && result.length > 0 && result[0]?.titre) {
                        allEvents.push(...result);
                    }

                    return {
                        functionResponse: {
                            name,
                            response: { result: JSON.stringify(result) },
                        },
                    };
                } catch (err) {
                    console.error(`❌ Outil ${name} a échoué:`, err.message);
                    return {
                        functionResponse: {
                            name,
                            response: { error: err.message },
                        },
                    };
                }
            })
        );
        console.log(`⏱️ Total outils (parallèle) : ${Date.now() - startTime}ms`);

        // Renvoyer les résultats à Gemini pour qu'il formule sa réponse
        response = await chatSession.sendMessage(toolResults);
    }

    // Dédupliquer les événements par ID
    const seen = new Set();
    const uniqueEvents = allEvents.filter(e => {
        if (!e?.id || seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
    });

    // Récupérer le texte de la réponse finale
    const finalText = response.response.text();

    // Récupérer l'historique mis à jour pour la persistance
    const updatedHistory = await chatSession.getHistory();

    return {
        text: finalText,
        events: uniqueEvents,
        history: updatedHistory,
    };
}
