import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// --- BD LOCALE ---
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

// --- BD PRODUCTION (Lecture seule pour doublons) ---
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

// --- UTILITAIRES DE FETCH ---
async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.status === 429) {
                console.warn(`⏳ [Rate Limit] Attente de ${attempt * 5}s...`);
                await new Promise(r => setTimeout(r, 5000 * attempt));
                if (attempt === maxRetries) throw new Error("Rate limit dépassé");
                continue;
            }
            if (!res.ok) throw new Error(`HTTP Error: ${res.status} - ${res.statusText}`);
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt === maxRetries) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

function extractJsonFromText(rawText) {
    if (typeof rawText !== 'string') throw new Error('Réponse IA vide ou non textuelle');
    let text = rawText.trim();
    text = text.replace(/```json\s*/gi, '```');
    const fenced = text.match(/```([\s\S]*?)```/);
    if (fenced?.[1]) text = fenced[1].trim();

    try {
        return JSON.parse(text);
    } catch {
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');
        let start = -1;
        if (firstBrace === -1) start = firstBracket;
        else if (firstBracket === -1) start = firstBrace;
        else start = Math.min(firstBrace, firstBracket);

        if (start === -1) throw new Error('JSON introuvable dans la réponse IA');
        const candidate = text.slice(start);

        const objMatch = candidate.match(/\{[\s\S]*\}/);
        const arrMatch = candidate.match(/\[[\s\S]*\]/);
        const picked = arrMatch && objMatch
            ? (arrMatch[0].length >= objMatch[0].length ? arrMatch[0] : objMatch[0])
            : (arrMatch?.[0] || objMatch?.[0]);
        if (!picked) throw new Error('JSON introuvable dans la réponse IA');
        return JSON.parse(picked);
    }
}

function assertEnv(name, value) {
    if (!value || String(value).trim().length === 0) {
        throw new Error(`Configuration manquante: ${name}`);
    }
}

function assertStartupConfig() {
    assertEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    assertEnv('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
    assertEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    assertEnv('SUPABASE_PROD_SERVICE_ROLE_KEY', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
}

// --- MÉMOIRE DES THÈMES ---
const MEMORY_FILE = path.join(__dirname, 'denicheur_memoire.json');
function loadMemory() {
    if (fs.existsSync(MEMORY_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
        const anglesExplores = Array.isArray(parsed.anglesExplores) ? parsed.anglesExplores : [];
        const missionsExplorees = Array.isArray(parsed.missionsExplorees) ? parsed.missionsExplorees : [];
        let themesHistory = [];
        if (Array.isArray(parsed.themesHistory)) {
            themesHistory = parsed.themesHistory
                .filter(t => t && typeof t === 'object')
                .map(t => ({
                    titre: typeof t.titre === 'string' ? t.titre : '',
                    mots_cles: Array.isArray(t.mots_cles) ? t.mots_cles.filter(x => typeof x === 'string') : []
                }))
                .filter(t => t.titre.length > 0);
        } else if (Array.isArray(parsed.themesExplores)) {
            themesHistory = parsed.themesExplores
                .filter(x => typeof x === 'string')
                .map(titre => ({ titre, mots_cles: [] }));
        }
        return { ...parsed, anglesExplores, missionsExplorees, themesHistory };
    }
    return { anglesExplores: [], missionsExplorees: [], themesHistory: [] };
}
function saveMemory(state) {
    const next = { ...state };
    if (!Array.isArray(next.anglesExplores)) next.anglesExplores = [];
    if (!Array.isArray(next.missionsExplorees)) next.missionsExplorees = [];
    if (!Array.isArray(next.themesHistory)) next.themesHistory = [];
    next.anglesExplores = next.anglesExplores.slice(-50);
    next.missionsExplorees = Array.from(new Set(next.missionsExplorees));
    next.themesHistory = next.themesHistory
        .filter(t => t && typeof t === 'object' && typeof t.titre === 'string' && t.titre.trim().length > 0)
        .map(t => ({
            titre: String(t.titre),
            mots_cles: Array.isArray(t.mots_cles) ? t.mots_cles.filter(x => typeof x === 'string') : []
        }))
        .slice(-50);
    delete next.themesExplores;
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(next, null, 2));
}

// =========================================================================
// ÉTAGE 0 : LE CONSEIL DES SAGES (DOUBLE IA)
// =========================================================================

async function proposerMissions(memoire) {
    const apiKey = process.env.GEMINI_API_KEY;
    const pastMissions = memoire.missionsExplorees || [];

    const prompt = `
Tu es l'Architecte d'un jeu de chronologie.
Propose 3 thématiques riches en "POINTS D'ANCRAGE" historiques.

Privilégie des thèmes majeurs, célèbres et iconiques de l'histoire mondiale (événements que tout le monde a vus à l'école ou au cinéma).
L'objectif est de trouver des angles INÉDITS sur des sujets CONNUS. Par exemple, si la piraterie est déjà faite, cherche un autre thème célèbre comme la Rome Antique, la Révolution Française ou la conquête spatiale soviétique.
Évite les micro-événements trop obscurs qui n'évoquent rien au grand public, sauf s'ils ont un titre extrêmement évocateur.

Explore des zones géographiques et des époques variées (Asie, Afrique, Amériques précolombiennes, etc.). Évite l'Euro-centrisme et les thèmes classiques déjà épuisés.

CONSIGNES DE DIVERSITÉ TEMPORELLE (IMPÉRATIF) :
- On veut couvrir TOUTE la plage 1 à 2010.
- Propose obligatoirement un thème dans chacune de ces zones :
  1. ANTIQUITÉ TARDIVE ou MOYEN ÂGE (ex: Invasions barbares, Châteaux forts, Empire Byzantin).
  2. ÉPOQUE MODERNE/CLASSIQUE (1500-1850) (ex: Explorations, Lumières, Révolutions).
  3. ÉPOQUE CONTEMPORAINE (1850-2010) (ex: Aviation, Médias, Sciences).

RÈGLES D'OR :
- ÉVÉNEMENTS PONCTUELS : Faits datables au jour/mois près idéalement.
- IDENTIFIABILITÉ : Les thèmes doivent être universellement reconnus.
- Missions passées : [${pastMissions.slice(-10).join(', ')}].

Renvoie un tableau JSON :
[ { "mission": "Thème concret", "years": "800-1200", "pitch": "Pourquoi ce thème est riche en dates précises" } ]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.0, responseMimeType: "application/json" }
        })
    });
    const data = await res.json();
    return extractJsonFromText(data.candidates?.[0]?.content?.parts?.[0]?.text || "[]");
}

async function noterMissions(options) {
    const apiKey = process.env.OPENAI_API_KEY;
    const history = Array.isArray(globalThis.__themesHistoryForAudit) ? globalThis.__themesHistoryForAudit : [];
    const prompt = `
Tu es l'Auditeur de jouabilité. Tu reçois 3 propositions de thèmes.
Tu dois les noter de 0 à 10 sur deux critères :
1. "Iconicité" (est-ce que le Français moyen connaît bien ?)
2. "Voyage" (est-ce que c'est visuel et amusant ?)

Compare ces 3 nouvelles pistes avec l'historique suivant : ${JSON.stringify(history)}.
Si une piste est sémantiquement trop proche (même sujet, même zone géographique, même période), rejette-la impitoyablement en lui mettant un score de Fun (noteVoyage) de 0.

Options : ${JSON.stringify(options)}

Renvoie UNIQUEMENT un objet JSON : { "results": [ ... ] }.
Chaque élément doit reprendre les champs d'entrée et ajouter "noteIconicite" (0-10) et "noteVoyage" (0-10).`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" }
        })
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = extractJsonFromText(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.results)) return parsed.results;
    return [];
}

async function genererMotsClesTheme(titreTheme) {
    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `
Génère 3 mots-clés simples (1 à 2 mots max chacun) pour caractériser ce thème historique.
Thème: "${titreTheme}"
Renvoie UNIQUEMENT un tableau JSON de 3 strings.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
    });
    const data = await res.json();
    const parsed = extractJsonFromText(data.candidates?.[0]?.content?.parts?.[0]?.text || "[]");
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.filter(x => typeof x === 'string').slice(0, 3);
}

async function delibererMission(memoire, budget) {
    console.log(`🏛️  [ARCHITECTE] Planification de 3 pistes...`);
    const options = await proposerMissions(memoire);
    budget.ajouter('gemini');

    console.log(`⚖️  [AUDITEUR] Analyse de la jouabilité...`);
    globalThis.__themesHistoryForAudit = Array.isArray(memoire.themesHistory)
        ? memoire.themesHistory.slice(-30)
        : [];
    const notes = await noterMissions(options);
    budget.ajouter('openai');

    notes.forEach(o => {
        o.scoreTotal = (o.noteIconicite || 0) + (o.noteVoyage || 0);
        console.log(`      - "${o.mission}" : Icon:${o.noteIconicite}/10 | Fun:${o.noteVoyage}/10 -> TOTAL:${o.scoreTotal}`);
    });

    const gagnant = notes.sort((a, b) => b.scoreTotal - a.scoreTotal)[0];

    // Fix parsing années (ex: "1900-1920" ou "1900 - 1920")
    let start = 1, end = 2010;
    if (gagnant.years) {
        const parts = gagnant.years.match(/\d+/g);
        if (parts && parts.length >= 2) {
            start = Math.max(1, parseInt(parts[0]));
            end = Math.min(2010, parseInt(parts[1]));
        }
    }

    return { mission: gagnant.mission, startYear: start, endYear: end, explication: gagnant.pitch };
}

// =========================================================================
// ÉTAGE 1 : LE RÉDACTEUR D'ANGLES (GEMINI)
// =========================================================================
async function genererNouveauxAngles(mission, themesPrecedents) {
    const apiKey = process.env.GEMINI_API_KEY;
    const pastThemes = themesPrecedents.length > 30 ? themesPrecedents.slice(-30).join(', ') : themesPrecedents.join(', ');

    const prompt = `
Tu es le Rédacteur en Chef. La mission est : "${mission.mission}" (${mission.startYear}-${mission.endYear}).
Divise cette mission en 5 sous-thèmes factuels et datables.

CONSIGNES :
- AUCUNE MARQUE dans les titres d'angles (ex: pas de "L'histoire d'Apple", mais "L'essor de l'informatique personnelle").
- PLAGE STRICTE : 1 à 2010.
- On veut du concret : des lancements, des découvertes, des signatures.

Angles déjà faits : [${pastThemes.slice(-20)}].
Renvoie un tableau JSON des 5 angles (chaînes).`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        })
    });

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const parsed = extractJsonFromText(text);
    return Array.isArray(parsed) ? parsed : [];
}

// =========================================================================
// ÉTAGE 2 : LE CHASSEUR (GEMINI)
// =========================================================================
async function chasserTopEvidences(angle, mission) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = "gemini-2.0-flash";

    const prompt = `
Tu es un documentaliste pour un jeu de chronologie. 
Trouve 5 ÉVÉNEMENTS PONCTUELS (faits précis arrivés à une date donnée).

Angle : "${angle}" (${mission.startYear}-${mission.endYear}).

DÉFINITION D'UN BON ÉVÉNEMENT :
- Il doit avoir un jour/mois/année précis.
- Ce doit être une ACTION ou une DISPONIBILITÉ (ex: "Première diffusion de...", "Mort de...", "Inauguration de...").
- REBUTS : Pas de tendances, rivalités, styles ou gestes techniques.
- IDENTIFICATION : L'événement doit être UNIQUE. Si titre générique, nom officiel entre parenthèses.

RÈGLE DE TITRAGE (STRICT) :
- Le titre doit être AUTO-PORTEUR et UNIQUE.
- Interdiction d'utiliser des titres génériques comme "Tremblement de terre de..." ou "Naissance de..." sans préciser le lieu exact ou l'impact majeur.
  Exemple acceptable : "Séisme de Port Royal".
- Si ton titre commence par un motif générique, REFORMULE immédiatement vers un titre premium (lieu exact, impact majeur, nom officiel), ne laisse jamais un titre vague passer.

Renvoie UNIQUEMENT un tableau JSON :
[ { "titre": "NOM", "year": XXX, "description": "2 lignes max" } ]`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
    });
    const data = await res.json();

    try {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const parsed = extractJsonFromText(text);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("      ❌ Erreur parsing JSON Gemini Chasseur :", e.message);
        return [];
    }
}

async function filtrerDoublons(propositions) {
    if (propositions.length === 0) return [];

    const apiKey = process.env.OPENAI_API_KEY;
    const finalResults = [];

    for (let i = 0; i < propositions.length; i++) {
        const p = propositions[i];
        const range = 3; // +/- 3 ans
        const start = p.year - range;
        const end = p.year + range;

        // 1. Chercher dans PROD (colonne 'date' au format YYYY-MM-DD)
        const prodStart = `${String(start).padStart(4, '0')}-01-01`;
        const prodEnd = `${String(end).padStart(4, '0')}-12-31`;

        const { data: prodMatches } = await prodDb
            .from('evenements')
            .select('titre')
            .gte('date', prodStart)
            .lte('date', prodEnd);

        // 2. Chercher dans LOCAL (colonne 'year' au format INT)
        const { data: localMatches } = await localDb
            .from('labo')
            .select('titre')
            .gte('year', start)
            .lte('year', end);

        const suspects = [
            ...(prodMatches || []).map(m => m.titre),
            ...(localMatches || []).map(m => m.titre)
        ];

        if (suspects.length === 0) {
            finalResults.push(p);
            continue;
        }

        console.log(`      🔎 Doublon suspect pour "${p.titre}" : ${suspects.length} trouvé(s) en base.`);

        // 3. Arbitrage IA s'il y a des suspects
        const prompt = `
Tu es le Gardien de la base de données.
Vérifie si cet événement est déjà présent (doublon sémantique).
Sois extrêmement sévère. Si un événement proposé est une variante d'un événement existant (ex: premier vol public vs premier vol), rejette-le comme doublon pour éviter de perdre le joueur.
PROPOSITION : "${p.titre}" (${p.year})
EXISTANT DANS LA MÊME PÉRIODE :
${suspects.map(s => `- ${s}`).join('\n')}

Renvoie UNIQUEMENT un JSON : { "estDoublon": true/false, "raison": "..." }`;

        try {
            const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1,
                    response_format: { type: "json_object" }
                })
            });
            const data = await res.json();
            const decision = JSON.parse(data.choices[0].message.content);

            if (!decision.estDoublon) {
                finalResults.push(p);
            } else {
                console.log(`      🛡️ Doublon rejeté : "${p.titre}" car existant : ${decision.raison}`);
            }
        } catch (e) {
            console.error("      ❌ Erreur Gardien :", e.message);
            finalResults.push(p); // En cas d'erreur, on garde la pépite par précaution
        }
    }

    return finalResults;
}

// =========================================================================
// CHEF D'ORCHESTRE
// =========================================================================
async function runDenicheur() {
    console.log("======================================================");
    console.log(`  🕵️  DÉNICHEUR ENCYCLOPÉDIQUE — PLAGE 0-2010`);
    console.log("======================================================\n");

    try {
        assertStartupConfig();
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const state = loadMemory();

    const budget = creerCompteur();

    console.log("🛡️ Protection anti-doublon activée (+/- 3 ans ciblés).");

    let totalSession = 0;
    const insertedThisSession = [];

    for (let cycleCount = 1; cycleCount <= MAX_CYCLES; cycleCount++) {
        if (budget.depasse()) break;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`  🔄 CYCLE ${cycleCount}/${MAX_CYCLES} | 💰 ${budget.afficher()}`);
        console.log(`${'='.repeat(60)}`);

        // 0. DÉLIBÉRATION (Le Conseil des Sages)
        let mission;
        try {
            mission = await delibererMission(state, budget);
            console.log(`\n🏆 GAGNANT : "${mission.mission}" (${mission.startYear} - ${mission.endYear})`);
            console.log(`   💡 Pitch : ${mission.explication}`);

            try {
                const mots_cles = await genererMotsClesTheme(mission.mission);
                budget.ajouter('gemini');
                if (!Array.isArray(state.themesHistory)) state.themesHistory = [];
                state.themesHistory.push({ titre: mission.mission, mots_cles });
                saveMemory(state);
            } catch (e) {
                console.error("⚠️  Mots-clés thème :", e.message);
            }
        } catch (e) {
            console.error("❌ Échec Délibération :", e.message);
            await new Promise(r => setTimeout(r, 5000));
            continue;
        }

        // 1. GÉNÉRATION DES ANGLES (Le Rédacteur)
        console.log(`\n🧠 [RÉDACTEUR] Déclinaison en angles de recherche...`);
        let nouveauxAngles = [];
        try {
            nouveauxAngles = await genererNouveauxAngles(mission, state.anglesExplores);
            budget.ajouter('gemini');
            nouveauxAngles.forEach(a => console.log(`      - ${a}`));
        } catch (e) {
            console.error("❌ Échec Rédacteur :", e.message);
            continue;
        }

        let totalCycle = 0;

        for (const angle of nouveauxAngles) {
            if (budget.depasse()) break;

            console.log(`\n🎯 THÈME : "${angle}"`);

            // 2. LA CHASSE (GEMINI)
            console.log(`   🏹 Gemini (Le Chasseur)...`);
            let evidences = [];
            try {
                evidences = await chasserTopEvidences(angle, mission);
                budget.ajouter('gemini');
                console.log(`   🎁 ${evidences.length} évidences rapportées.`);
            } catch (e) {
                console.error(`   ❌ Échec Gemini :`, e.message);
                continue;
            }

            const beforeQuality = evidences.length;
            evidences = evidences.filter(e => isTitreQualiteOk(e?.titre));
            const rejectedQuality = beforeQuality - evidences.length;
            if (rejectedQuality > 0) {
                console.log(`   🧹 Filtre qualité titre : ${rejectedQuality} rejeté(s).`);
            }

            if (evidences.length === 0) continue;

            // 3. LE GARDIEN SÉMANTIQUE (OPENAI)
            console.log(`   🛡️ OpenAI (Le Gardien) vérifie les doublons...`);
            let pursInedits = [];
            try {
                pursInedits = await filtrerDoublons(evidences);
                budget.ajouter('openai');
            } catch (e) {
                console.error(`   ❌ Échec OpenAI :`, e.message);
                continue;
            }

            // 4. SAUVEGARDE
            if (pursInedits.length > 0) {
                console.log(`   🎉 ${pursInedits.length} pépites inédites.`);
                const rows = pursInedits.map(p => {
                    return {
                        titre: p.titre,
                        year: p.year,
                        description: p.description,
                        status: 'PENDING',
                        type: mission.mission
                    };
                });

                const titres = rows.map(r => r.titre);
                const { data: existing, error: existingErr } = await localDb
                    .from('labo')
                    .select('titre')
                    .in('titre', titres);

                if (existingErr) {
                    console.error("   ❌ Erreur vérification idempotence :", existingErr.message);
                }

                const existingSet = new Set((existing || []).map(e => e.titre));
                const toInsert = rows.filter(r => !existingSet.has(r.titre));

                if (toInsert.length === 0) {
                    console.log(`   ✅ Rien à insérer (idempotence: tous les titres existent déjà).`);
                } else {
                    const { error: insertErr } = await localDb.from('labo').insert(toInsert);
                    if (insertErr) console.error("   ❌ Erreur insertion :", insertErr.message);
                    else {
                        totalCycle += toInsert.length;
                        totalSession += toInsert.length;
                        for (const r of toInsert) {
                            insertedThisSession.push({ titre: r.titre, year: r.year });
                        }
                    }
                }
            } else {
                console.log(`   ⚠️ Doublons détectés par le Gardien.`);
            }

            state.anglesExplores.push(angle);
            saveMemory(state);

            await new Promise(r => setTimeout(r, 4000));
        }

        state.missionsExplorees.push(mission.mission);
        saveMemory(state);

        console.log(`\n✅ Cycle terminé : +${totalCycle} events | Total session : ${totalSession} | Dépense : ${budget.afficher()}`);
        console.log(`⏳ Pause 15s avant le prochain chantier...`);
        await new Promise(r => setTimeout(r, 15000));
    }

    console.log(`\n💥 SESSION TERMINÉE — ${totalSession} événements ajoutés.`);

    if (insertedThisSession.length > 0) {
        console.log("\n📋 RÉCAP — ÉVÉNEMENTS INSÉRÉS (SESSION)");
        console.table(insertedThisSession.map(e => ({ Titre: e.titre, Année: e.year })));
    } else {
        console.log("\n📋 RÉCAP — Aucun événement inséré durant cette session.");
    }
}

// =========================================================================
// GARDE-FOU BUDGÉTAIRE & UTILS
// =========================================================================
const MAX_CYCLES = 150; // SESSION DE PRODUCTION
const MAX_BUDGET = 15.0;
const COUT_PAR_APPEL = { gemini: 0.001, openai: 0.001 };

function isTitreQualiteOk(titre) {
    if (!titre || typeof titre !== 'string') return false;
    const t = titre.trim();
    if (t.length === 0) return false;

    const words = t.split(/\s+/).filter(Boolean);
    if (words.length < 3) return false;

    const norm = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();

    const lower = norm(t);
    const forbiddenStarts = [
        'tremblement de terre', 'seisme', 'tsunami', 'eruption de',
        'naissance de', 'mort de', 'deces de',
        'bataille de', 'siege de', 'prise de', 'capture de',
        'traite de', 'signature du', 'accord de', 'convention de',
        'fondation de', 'creation de', 'inauguration de', 'ouverture de',
        'decouverte de', 'arrivee de', 'depart de', 'expedition de',
        'recoit une', 'attribution de', 'obtention de',
        'premier vol', 'premiere de', 'lancement de',
        'debut de', 'fin de', 'chute de', 'apogee de'
    ].map(norm);

    const isForbiddenStart = forbiddenStarts.some(prefix => lower.startsWith(prefix + ' ') || lower === prefix);
    if (isForbiddenStart && !t.includes('(')) return false;

    return true;
}

function creerCompteur() {
    let depense = 0;
    return {
        ajouter(api) { depense += COUT_PAR_APPEL[api] ?? 0; },
        afficher() { return `$${depense.toFixed(3)}`; },
        depasse() { return depense >= MAX_BUDGET; }
    };
}

runDenicheur();
