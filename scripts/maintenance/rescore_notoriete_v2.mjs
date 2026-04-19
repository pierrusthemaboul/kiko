/**
 * rescore_notoriete_v2.mjs
 * Script de maintenance : Recalcul global de notoriete_fr sur la table evenements
 * Utilise le Double Check V2 (Perplexity + Gemini 2.0 — GPT-4o-mini débranché)
 *
 * Usage :
 *   node scripts/maintenance/rescore_notoriete_v2.mjs              (tous les événements)
 *   node scripts/maintenance/rescore_notoriete_v2.mjs --only-null  (uniquement notoriete_fr IS NULL)
 *   node scripts/maintenance/rescore_notoriete_v2.mjs --limit 100  (limiter à N événements)
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

// --- Clients ---
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants dans .env");
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Gemini remplacé par GPT-4o-mini (quota Gemini dépassé)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const perplexityApiKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_TOKEN;
const perplexity = perplexityApiKey
    ? new OpenAI({ apiKey: perplexityApiKey, baseURL: 'https://api.perplexity.ai' })
    : null;

// --- Config ---
const BATCH_SIZE = 50;
const DELAY_MS = 1000;
const BACKOFF_DELAYS = [5000, 10000, 20000];
const STATE_FILE = path.join(__dirname, 'rescore_v2_state.json');

const args = process.argv.slice(2);
const ONLY_NULL = args.includes('--only-null');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- Prompts identiques au Videur V2 ---
const NOTORIETE_PROMPT = (titre) => `Tu es concepteur du jeu de culture générale "Timalaus" (jeu de chronologie à la française).
Ta mission : évaluer si CET ÉVÉNEMENT SPÉCIFIQUE sera reconnu par un Français moyen de 25-55 ans.

Événement : "${titre}"

Critères (cumul) :
- Est-ce qu'un élève de collège/lycée français l'a vu en cours ? (+30 pts)
- Est-ce qu'un film, une série ou un documentaire grand public en parle ? (+25 pts)
- Est-ce que ça a une place dans l'imaginaire collectif français (expression, date symbolique, monument) ? (+25 pts)
- Est-ce un événement mondial incontournable même hors France ? (+20 pts)

Exemples calibrés :
100 = Prise de la Bastille, Armistice 1918, Alunissage Apollo 11
85 = Sacre de Napoléon, Coupe du Monde 1998, Chute du Mur de Berlin
65 = Édit de Nantes, Assassinat de JFK, Traité de Versailles
45 = Bataille de Lépante, Invention de l'imprimerie, Première traversée de l'Atlantique
25 = Décret de Villers-Cotterêts, Fondation de l'Académie française
10 = Détail technique, événement local obscur

Note finale de 1 à 100 ? Réponds UNIQUEMENT par le nombre entier (ex: 67).`;

const NOTORIETE_RECONCILIATION_PROMPT = (titre, perplexityScore, geminiScore) =>
    `Tu es concepteur du jeu "Timalaus". Tu dois ré-évaluer la notoriété de cet événement.

Événement : "${titre}"

Première évaluation Gemini : ${geminiScore}/100
Indice de présence Perplexity (sources francophones réelles) : ${perplexityScore}/100

Ces deux scores sont en désaccord important (écart > 40 pts). Ré-évalue en tenant compte des deux informations : ton jugement culturel ET la fréquence factuelle trouvée par Perplexity.

Note finale réconciliée de 1 à 100 ? Réponds UNIQUEMENT par le nombre entier (ex: 67).`;

async function getPerplexityPresenceScore(titre) {
    if (!perplexity) return null;
    const prompt = `Recherche factuelle : l'événement "${titre}" est-il présent et notable dans les sources francophones (Wikipedia FR, programmes scolaires français, médias grand public) ?
Donne un score de 0 à 100 représentant sa fréquence/importance dans ces sources (0 = introuvable, 100 = omniprésent).
Réponds UNIQUEMENT par le nombre entier (ex: 72).`;
    try {
        const res = await perplexity.chat.completions.create({
            model: "sonar", temperature: 0, max_tokens: 10,
            messages: [{ role: "user", content: prompt }]
        });
        const text = res.choices[0].message.content?.trim() || '';
        const match = text.match(/\d+/);
        if (!match) return null;
        return Math.max(0, Math.min(100, parseInt(match[0], 10)));
    } catch (err) {
        const status = err?.status || err?.response?.status || '?';
        const msg = err?.message || String(err);
        process.stdout.write(` [Perplexity ERR ${status}: ${msg.substring(0, 80)}]`);
        return null;
    }
}

async function getGptScore(prompt, label = 'G4o') {
    for (let attempt = 0; attempt <= BACKOFF_DELAYS.length; attempt++) {
        try {
            const res = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                temperature: 0,
                max_tokens: 10,
                messages: [{ role: 'user', content: prompt }]
            });
            const text = res.choices[0].message.content?.trim() || '';
            const match = text.match(/\d+/);
            return match ? Math.max(0, Math.min(100, parseInt(match[0], 10))) : 50;
        } catch (err) {
            const status = err?.status || err?.response?.status || 0;
            const msg = err?.message || String(err);
            const is429 = status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate');
            if (is429 && attempt < BACKOFF_DELAYS.length) {
                const wait = BACKOFF_DELAYS[attempt];
                process.stdout.write(` [${label} 429 → retry ${attempt + 1} in ${wait / 1000}s]`);
                await sleep(wait);
                continue;
            }
            throw new Error(`[${label} ERR ${status}] ${msg.substring(0, 120)}`);
        }
    }
}

async function computeScore(titre) {
    const [scoreGpt, perplexityScore] = await Promise.all([
        getGptScore(NOTORIETE_PROMPT(titre)),
        getPerplexityPresenceScore(titre)
    ]);

    if (perplexityScore === null) {
        process.stdout.write(` [P:N/A | G4o:${scoreGpt}] → ${scoreGpt}`);
        return Math.max(1, Math.min(100, scoreGpt));
    }

    const gap = Math.abs(scoreGpt - perplexityScore);
    let finalGptScore = scoreGpt;

    if (gap > 40) {
        process.stdout.write(` [RECONCIL gap=${gap}]`);
        finalGptScore = await getGptScore(
            NOTORIETE_RECONCILIATION_PROMPT(titre, perplexityScore, scoreGpt),
            'G4o-reconcil'
        );
    }

    const finalScore = Math.round(perplexityScore * 0.30 + finalGptScore * 0.70);
    process.stdout.write(` [P:${perplexityScore} | G4o:${finalGptScore}] → Final:${finalScore}`);
    return Math.max(1, Math.min(100, finalScore));
}

async function run() {
    console.log(`\n🚀 RESCORE NOTORIÉTÉ V2`);
    console.log(`   Mode : ${ONLY_NULL ? 'uniquement notoriete_fr IS NULL' : 'tous les événements'}`);
    console.log(`   Limit : ${LIMIT ?? 'aucune'}`);
    console.log(`   Moteur jugement : GPT-4o-mini`);
    console.log(`   Perplexity : ${perplexity ? '✅ actif' : '⚠️  absent (GPT-4o-mini seul)'}\n`);

    // Charger l'état de reprise
    let processedIds = {};
    if (fs.existsSync(STATE_FILE)) {
        processedIds = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        console.log(`📂 [REPRISE] ${Object.keys(processedIds).length} événements déjà traités.`);
    }

    // Récupérer tous les événements avec pagination
    let allEvents = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    console.log('📡 Téléchargement de la liste des événements...');
    while (true) {
        let query = supabase.from('evenements').select('id, titre, notoriete_fr').range(offset, offset + PAGE_SIZE - 1);
        if (ONLY_NULL) query = query.is('notoriete_fr', null);
        const { data, error } = await query;
        if (error) { console.error("❌ Fetch error:", error.message); return; }
        if (!data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) break;
    }

    const toProcess = allEvents
        .filter(e => !processedIds[e.id])
        .slice(0, LIMIT ?? allEvents.length);

    console.log(`✅ ${allEvents.length} événements en base | ${toProcess.length} à traiter\n`);

    if (toProcess.length === 0) {
        console.log("✅ Rien à faire. Fin.");
        return;
    }

    let updated = 0;
    let errors = 0;

    for (let i = 0; i < toProcess.length; i++) {
        const evt = toProcess[i];
        process.stdout.write(`[${i + 1}/${toProcess.length}] "${evt.titre.substring(0, 45)}"...`);

        try {
            const newScore = await computeScore(evt.titre);
            if (newScore === null) {
                process.stdout.write(' ⚠️ Score nul retourné, skip (sera repris)\n');
                errors++;
                await sleep(3000);
                continue;
                // NE PAS marquer dans processedIds → sera repris au prochain lancement
            }

            const { error: updateError } = await supabase
                .from('evenements')
                .update({
                    notoriete_prev: evt.notoriete_fr ?? null,
                    notoriete_fr: newScore,
                    notoriete_source: 'VIDEUR_V2_DOUBLE_CHECK_PERPLEXITY_GPT4O_MINI',
                    notoriete_updated_at: new Date().toISOString()
                })
                .eq('id', evt.id);

            if (updateError) {
                process.stdout.write(` ❌ ${updateError.message}\n`);
                errors++;
            } else {
                process.stdout.write(` ✅\n`);
                updated++;
                processedIds[evt.id] = true;
            }
        } catch (err) {
            const detail = err?.message || String(err);
            process.stdout.write(` 💥 ${detail}\n`);
            errors++;
            // Les événements en erreur NE sont PAS marqués dans l'état → ils seront repris
        }

        // Sauvegarde de l'état tous les 10 événements
        if ((i + 1) % 10 === 0) {
            fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
        }

        await sleep(DELAY_MS);
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(processedIds, null, 2));
    console.log(`\n🏁 Terminé ! ${updated} mis à jour | ${errors} erreurs`);
    if (errors === 0) {
        fs.unlinkSync(STATE_FILE);
        console.log('🗑️  Fichier d\'état supprimé (traitement complet).');
    }
}

run();
