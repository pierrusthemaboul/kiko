import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', 'admin_web', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 
// VITE_SUPABASE_URL est l'URL de Prod. On doit donc utiliser la clé Service Role Prod
const serviceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey; 
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !serviceKey || !geminiApiKey || !openaiApiKey) {
    console.error("❌ Erreur : Variables d'environnement manquantes (Supabase, Gemini ou OpenAI)");
    process.exit(1);
}

function normalizeTitleForDuplicateCheck(titre) {
    return String(titre || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getYearFromDateLike(value) {
    if (!value) return null;
    const year = String(value).split('-')[0];
    return /^\d{4}$/.test(year) ? parseInt(year, 10) : null;
}

function tokenSimilarity(a, b) {
    const stop = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'en', 'au', 'aux', 'pour', 'par']);
    const toSet = (txt) => new Set(
        txt.split(' ').map(s => s.trim()).filter(s => s.length > 2 && !stop.has(s))
    );
    const sa = toSet(a);
    const sb = toSet(b);
    if (sa.size === 0 || sb.size === 0) return 0;
    let inter = 0;
    for (const t of sa) if (sb.has(t)) inter++;
    const union = sa.size + sb.size - inter;
    return union > 0 ? inter / union : 0;
}

function detectLexicalDuplicate(event, candidate) {
    const eventNorm = normalizeTitleForDuplicateCheck(event.titre);
    const candidateNorm = normalizeTitleForDuplicateCheck(candidate.titre);
    const eventYear = getYearFromDateLike(event.date);
    const candidateYear = getYearFromDateLike(candidate.date);
    const yearDiff = (eventYear && candidateYear) ? Math.abs(eventYear - candidateYear) : 99;

    if (eventNorm && candidateNorm && eventNorm === candidateNorm && yearDiff <= 1) {
        return { isDuplicate: true, reason: 'Titre identique normalisé + année proche', strategy: 'LEXICAL_EXACT' };
    }

    const similarity = tokenSimilarity(eventNorm, candidateNorm);
    if (similarity >= 0.92 && yearDiff <= 1) {
        return { isDuplicate: true, reason: `Titre très proche (token similarity ${similarity.toFixed(2)}) + année proche`, strategy: 'LEXICAL_TOKEN' };
    }

    return { isDuplicate: false };
}

async function findDuplicateInEvenements(event) {
    const eventYear = getYearFromDateLike(event.date);
    const start = eventYear ? `${eventYear - 2}-01-01` : '0001-01-01';
    const end = eventYear ? `${eventYear + 2}-12-31` : '9999-12-31';

    const { data: lexicalCandidates, error: lexicalErr } = await supabase
        .from('evenements')
        .select('id, titre, date')
        .gte('date', start)
        .lte('date', end)
        .limit(300);

    if (!lexicalErr && Array.isArray(lexicalCandidates)) {
        for (const candidate of lexicalCandidates) {
            const check = detectLexicalDuplicate(event, candidate);
            if (check.isDuplicate) {
                return {
                    isDuplicate: true,
                    reason: `${check.reason} (match: "${candidate.titre}" ${candidate.date})`,
                    strategy: check.strategy,
                    matchedId: candidate.id,
                    matchedTitle: candidate.titre
                };
            }
        }
    }

    const eventVector = event.embedding_vocal;
    if (!vectorDuplicateSearchAvailable || !eventVector) {
        return { isDuplicate: false };
    }

    try {
        const { data: matches, error: vectorErr } = await supabase.rpc('search_similar_events', {
            query_vector: eventVector,
            match_threshold: 0.965,
            match_count: 3
        });

        if (vectorErr) {
            const msg = String(vectorErr.message || '');
            if (/function .*search_similar_events|column .*embedding/i.test(msg)) {
                vectorDuplicateSearchAvailable = false;
                console.log('    ⚠️  Anti-doublon vectoriel désactivé (RPC/colonne indisponible).');
            }
            return { isDuplicate: false };
        }

        if (Array.isArray(matches) && matches.length > 0) {
            const top = matches[0];
            const topYear = getYearFromDateLike(top.date);
            const yearDiff = (eventYear && topYear) ? Math.abs(eventYear - topYear) : 99;

            if (Number(top.similarity) >= 0.97 && yearDiff <= 2) {
                return {
                    isDuplicate: true,
                    reason: `Similarité vectorielle élevée (${Number(top.similarity).toFixed(3)}) avec "${top.titre}" (${top.date})`,
                    strategy: 'VECTOR_SIMILARITY',
                    matchedId: top.id,
                    matchedTitle: top.titre
                };
            }
        }
    } catch {
        return { isDuplicate: false };
    }

    return { isDuplicate: false };
}

const supabase = createClient(supabaseUrl, serviceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const openai = new OpenAI({ apiKey: openaiApiKey });
const geminiGenerationConfig = { temperature: 0 };
const verboseAiLogs = process.env.VIDEUR_DEBUG_AI !== '0';
let vectorDuplicateSearchAvailable = true;

function logAiExchange(stage, provider, prompt, response) {
    if (!verboseAiLogs) return;
    console.log(`\n[AI-LOG][${stage}][${provider}] PROMPT >>>`);
    console.log(prompt);
    console.log(`[AI-LOG][${stage}][${provider}] RESPONSE <<<`);
    console.log(String(response || '').trim());
}

function parseYesNoAnswer(rawText) {
    const text = String(rawText || '').trim().toUpperCase();
    if (/^OUI\b/.test(text)) return true;
    if (/^NON\b/.test(text)) return false;

    const hasOui = /\bOUI\b/.test(text);
    const hasNon = /\bNON\b/.test(text);
    if (hasOui && !hasNon) return true;
    if (hasNon && !hasOui) return false;
    return null;
}

function extractYearFromAnswer(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return null;

    const cleaned = text.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, '').trim()).trim();
    const firstLine = cleaned.split(/\r?\n/)[0]?.trim() || '';

    if (/^INCONNU$/i.test(firstLine)) return null;
    if (/^\d{4}$/.test(firstLine)) return firstLine;

    const jsonYearMatch = cleaned.match(/"year"\s*:\s*"?(\d{4}|INCONNU)"?/i);
    if (jsonYearMatch) {
        const value = jsonYearMatch[1].toUpperCase();
        return value === 'INCONNU' ? null : value;
    }

    const yearMatches = cleaned.match(/\b(1\d{3}|20\d{2})\b/g) || [];
    const uniqueYears = [...new Set(yearMatches)];
    return uniqueYears.length === 1 ? uniqueYears[0] : null;
}

async function validateYearWithJudges(event, candidateYear) {
    const prompt = `Événement : "${event.titre}"
Année candidate : ${candidateYear}
Cette année correspond-elle bien à l'année de début ou de survenue de cet événement ?
Réponds UNIQUEMENT par OUI ou NON.`;

    try {
        if (verboseAiLogs) {
            console.log(`\n[AI-LOG][validateYearWithJudges] Candidate year = ${candidateYear}`);
            console.log(`[AI-LOG][validateYearWithJudges][Gemini] PROMPT >>>`);
            console.log(prompt);
            console.log(`[AI-LOG][validateYearWithJudges][OpenAI] PROMPT >>>`);
            console.log(prompt);
        }

        const [geminiRes, openaiRes] = await Promise.all([
            geminiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: geminiGenerationConfig
            }),
            openai.chat.completions.create({
                model: "gpt-4o-mini",
                temperature: 0,
                messages: [{ role: "user", content: prompt }]
            })
        ]);

        const geminiText = geminiRes.response.text();
        const openaiText = openaiRes.choices[0].message.content;
        logAiExchange('validateYearWithJudges', 'Gemini', prompt, geminiText);
        logAiExchange('validateYearWithJudges', 'OpenAI', prompt, openaiText);

        const geminiVote = parseYesNoAnswer(geminiText);
        const openaiVote = parseYesNoAnswer(openaiText);
        return geminiVote === true && openaiVote === true;
    } catch {
        return false;
    }
}

async function validateYearWithPerplexity(event, candidateYear) {
    if (!perplexity) return null;

    const prompt = `Question factuelle historique.
Événement : "${event.titre}"
Année candidate : ${candidateYear}

Cette année correspond-elle bien à l'année de début/survenue de cet événement précis ?
Important : ne pas confondre avec un événement connexe ou le sujet général.

Réponds UNIQUEMENT par OUI, NON, ou INCONNU.`;

    try {
        if (verboseAiLogs) {
            console.log(`\n[AI-LOG][validateYearWithPerplexity] Candidate year = ${candidateYear}`);
            console.log(`[AI-LOG][validateYearWithPerplexity][Perplexity] PROMPT >>>`);
            console.log(prompt);
        }

        const response = await perplexity.chat.completions.create({
            model: "sonar",
            temperature: 0,
            max_tokens: 12,
            messages: [{ role: "user", content: prompt }]
        });

        const text = response.choices[0].message.content?.trim() || '';
        logAiExchange('validateYearWithPerplexity', 'Perplexity', prompt, text);
        if (/^INCONNU\b/i.test(text)) return null;
        return parseYesNoAnswer(text);
    } catch {
        return null;
    }
}

// === Agent Chronos (Vérification de Date) ===
async function checkDate(event) {
    const year = event.date ? event.date.split('-')[0] : event.date;
    if (!/^\d{4}$/.test(String(year || ''))) return false;

    const perplexityVote = await validateYearWithPerplexity(event, year);
    if (perplexityVote === true) return true;

    const judgesVote = await validateYearWithJudges(event, year);
    if (perplexityVote === false) return judgesVote;
    return judgesVote;
}

// === API Perplexity (Compatible avec le SDK OpenAI) ===
const perplexityApiKey = process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_TOKEN;
const perplexity = perplexityApiKey ? new OpenAI({ 
    apiKey: perplexityApiKey,
    baseURL: 'https://api.perplexity.ai'
}) : null;

// === Agent Réparateur (Correction de Date : Perplexity + Gemini) ===
async function fixDate(event) {
    if (!perplexity) {
        console.log(`    ⚠️  Clé API Perplexity manquante. Impossible de faire la double-correction.`);
        return null;
    }

    const prompt = `Tu es un vérificateur de dates historiques.
Événement : "${event.titre}".

Règles strictes :
1) Donne uniquement l'année de début ou de survenue de cet événement.
2) Ne confonds jamais avec une année liée au sujet global (origine, création, première édition, etc.) si ce n'est pas exactement l'événement demandé.
3) Si l'information n'est pas assez fiable, réponds INCONNU.
4) Format de sortie obligatoire : YYYY ou INCONNU.
5) N'ajoute aucun autre texte.`;

    try {
        if (verboseAiLogs) {
            console.log(`\n[AI-LOG][fixDate][Gemini] PROMPT >>>`);
            console.log(prompt);
            console.log(`[AI-LOG][fixDate][Perplexity] PROMPT >>>`);
            console.log(prompt);
        }

        const [geminiRes, perpRes] = await Promise.all([
            geminiModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: geminiGenerationConfig
            }),
            perplexity.chat.completions.create({
                model: "sonar", // Modèle natif de Perplexity avec recherche web
                temperature: 0,
                max_tokens: 20,
                messages: [{ role: "user", content: prompt }]
            })
        ]);

        const textG = geminiRes.response.text().trim();
        const textP = perpRes.choices[0].message.content.trim();
        logAiExchange('fixDate', 'Gemini', prompt, textG);
        logAiExchange('fixDate', 'Perplexity', prompt, textP);

        const yearG = extractYearFromAnswer(textG);
        const yearP = extractYearFromAnswer(textP);
        console.log(`    🛠️  Correction proposée -> Gemini: ${yearG || 'INCONNU'} | Perplexity: ${yearP || 'INCONNU'}`);

        if (yearG && yearP && yearG === yearP) {
            return yearG;
        }

        if (yearP) {
            const perplexityConfirmsPerplexityYear = await validateYearWithPerplexity(event, yearP);
            if (perplexityConfirmsPerplexityYear === true) {
                return yearP;
            }
        }

        const candidates = [...new Set([yearG, yearP].filter(Boolean))];
        if (candidates.length === 0) return null;

        const validations = await Promise.all(
            candidates.map(async (candidate) => ({
                candidate,
                valid: await validateYearWithJudges(event, candidate)
            }))
        );

        const validCandidates = validations.filter((entry) => entry.valid).map((entry) => entry.candidate);
        if (validCandidates.length === 0) return null;
        if (validCandidates.length === 1) return validCandidates[0];

        if (yearP && validCandidates.includes(yearP)) return yearP;
        return validCandidates[0];
    } catch (err) {
        console.error("    ⚠️ Erreur durant la réparation de date :", err.message);
        return null;
    }
}

// === Agent Juge (Notoriété Double IA : Gemini + GPT-4o-Mini) ===
async function checkNotoriety(event) {
    const prompt = `Agis comme un historien expert de la culture générale francophone.
Évalue l'importance culturelle, historique ou mémorable de CET ÉVÉNEMENT SPÉCIFIQUE (pas du sujet général) du point de vue d'un citoyen européen francophone.
Titre : "${event.titre}"
Échelle :
100 = Événement mondial incontournable (ex: Fin WW2, 1er pas sur la lune, Armistice)
80 = Grand événement très connu (ex: Sortie de GTA 5, Coupe du monde 98)
50 = Fait marquant connu des amateurs du domaine ou fait divers historique franco-européen célèbre
30 = Anecdote intéressante mais de niche
10 = Détail infime

Note de 1 à 100 ? Réponds UNIQUEMENT par le nombre (ex: 45).`;

    try {
        // Lancer les deux appels en parallèle
        const [geminiRes, openaiRes] = await Promise.all([
            geminiModel.generateContent(prompt),
            openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        ]);

        const geminiText = geminiRes.response.text().trim();
        const openaiText = openaiRes.choices[0].message.content.trim();

        const matchG = geminiText.match(/\d+/);
        const matchO = openaiText.match(/\d+/);
        
        const scoreG = matchG ? parseInt(matchG[0], 10) : 50;
        const scoreO = matchO ? parseInt(matchO[0], 10) : 50;
        
        console.log(`    🤖 Gemini: ${scoreG}/100 | GPT-4o-Mini: ${scoreO}/100`);

        // Moyenne des deux juges aveugles
        return Math.round((scoreG + scoreO) / 2);
    } catch (err) {
        console.error("Erreur durant la double vérification :", err);
        return 50; // Fallback
    }
}

export async function runVideur(eventIds = []) {
    if (!eventIds || eventIds.length === 0) {
        console.log("📥 [VIDEUR] Aucun événement sélectionné. Fin.");
        return;
    }

    console.log(`🛡️ [VIDEUR] Lancement sur ${eventIds.length} événement(s)...`);

    const { data: candidates, error: fetchError } = await supabase
        .from('antichambre')
        .select('*')
        .in('id', eventIds);

    if (fetchError || !candidates || candidates.length === 0) {
        console.error("❌ [VIDEUR] Erreur récupération :", fetchError?.message);
        return;
    }

    const { data: biaisRules } = await supabase.from('regles_notoriete').select('*').limit(10); // Simulation si tu as une table, sinon on hardcode le malus Pop Culture.

    for (const event of candidates) {
        console.log(`\n🔍 Analyse : "${event.titre}"`);

        try {
            // 0. Anti-doublon contre evenements (léger, sans IA)
            const duplicateCheck = await findDuplicateInEvenements(event);
            if (duplicateCheck.isDuplicate) {
                const reason = `Doublon probable détecté (${duplicateCheck.strategy}) : ${duplicateCheck.reason}`;
                console.log(`  ❌ [REFUS] ${reason}`);
                await supabase.from('antichambre').update({
                    statut_validation: 'REFUSE',
                    motif_refus: reason
                }).eq('id', event.id);
                continue;
            }

            // 1. Date Check
            const isDateValid = await checkDate(event);
            if (!isDateValid) {
                console.log(`  ❌ [REFUS] Date ${event.date} contestée par IA.`);
                
                // Tentative de réparation
                const correctedYear = await fixDate(event);
                if (correctedYear) {
                    const newDate = `${correctedYear}-01-01`; // Format par défaut Kiko
                    await supabase.from('antichambre').update({ 
                        date: newDate,
                        statut_validation: 'CORRIGE', 
                        motif_refus: `Date corrigée par l'IA (${event.date} -> ${correctedYear}). En attente de revalidation.`
                    }).eq('id', event.id);
                    console.log(`  ✨ [CORRIGE] Date modifiée en ${correctedYear} ! L'événement reste en Antichambre pour revalidation.`);
                } else {
                    await supabase.from('antichambre').update({ 
                        statut_validation: 'REFUSE', 
                        motif_refus: 'L\'IA conteste la date et n\'a pas pu trouver de consensus pour la corriger.' 
                    }).eq('id', event.id);
                }
                
                // Quoi qu'il arrive (Refusé ou Corrigé), on ne l'envoie pas en PROD ce coup-ci.
                continue;
            }

            // 2. Notoriety Check (Uniquement via l'IA pour éviter le piège de Wikipédia)
            let baseScore = await checkNotoriety(event);
            console.log(`  ⚖️ Score AI Brut : ${baseScore}`);

            // 3. Application d'un Malus Pop-Culture (Séries, Cinéma...)
            const types = event.types_evenement || [];
            if (types.includes('Cinéma') || types.includes('Musique') || types.includes('Télévision')) {
                baseScore = Math.max(1, baseScore - 15);
                console.log(`  📉 Malus Pop-Culture appliqué. Nouveau score : ${baseScore}`);
            }

            // 4. (Supprimé à ta demande : On ne bloque plus les événements sous 35. On les envoie en Prod avec leur faible score).

            // 5. Transfert en Prod
            const { id, statut_validation, motif_refus, ...eventData } = event;
            eventData.notoriete_fr = baseScore;
            eventData.donnee_corrigee = true;

            const { error: insertErr } = await supabase.from('evenements').insert([eventData]);
            if (insertErr) throw insertErr;

            await supabase.from('antichambre').delete().eq('id', event.id);
            console.log(`  ✅ [PROD] Transféré avec succès ! (Score Notoriété: ${baseScore})`);

        } catch (err) {
            console.error(`  💥 [ERREUR] ${err.message}`);
        }
    }
}

// Détection propre si c'est le script principal (compatible Windows/Mac)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const ids = process.argv.slice(2);
    runVideur(ids);
} else if (process.argv[1] && process.argv[1].endsWith('agent.mjs') || process.argv[1].endsWith('agent')) {
    // Fallback de sécurité brut
    const ids = process.argv.slice(2);
    runVideur(ids);
}


