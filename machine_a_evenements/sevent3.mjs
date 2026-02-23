// ==============================================================================
// sayon8_style_column.mjs - VERSION AVEC COLONNES style_info ET style_name
// GÉNÉRATION PROMPTS : Claude 3.5 Sonnet
// AUTRES FONCTIONS : Gemini 2.0 Flash
// SYSTÈME DE STYLES : Bibliothèque artistique aléatoire cinéma / photo / art
// 
// CHANGEMENTS : 
// - Ajout colonnes style_info (JSONB) et style_name (VARCHAR)
// - Suppression du préfixe [Style: ...] dans description_detaillee
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import readline from 'readline';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
// Fallback constants if config.js is missing
const PROMPT_TIMEOUT_MS = 60000;
const PROMPT_RETRIES = 1;
const PROMPT_BACKOFF_BASE_MS = 1000;
const PROMPT_BACKOFF_FACTOR = 2;
const CONCURRENCY_LIMIT = 5;

// Unified timeout helper
async function withPromptTimeout(promise, ms, label) {
    let timeout;
    const timeoutPromise = new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timeout ${label} après ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

// Unified retry helper
async function retryWithBackoff(fn, options = {}) {
    const { retries = 3, baseDelay = 1000, factor = 2, label = 'Task' } = options;
    let lastError;
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i === retries) break;
            const delay = baseDelay * Math.pow(factor, (i > 0 ? i : 0));
            console.log(`[${label}] Tentative ${i + 1} échouée. Nouvelle tentative dans ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}

// Optional bank of MUST DEPICT hints loaded from JSON (fallback to built-ins if missing)
let mustDepictBank = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bankAbsPath = path.join(__dirname, 'indicesMustDepict.json');
const reportAbsPath = path.join(__dirname, 'rapport_sevent.txt');
const loadReport = { title: 'MUST DEPICT bank load', timestamp: new Date().toISOString(), method: 'fallback', path: bankAbsPath, size: 0, status: 'Fallback', error: null };

// Initialisation du mode Réalisme Historique
console.log(`✅ Mode Réalisme Historique activé (Flux-Schnell @ 4 steps MAX)`);

// Gestion des chemins personnalisables (file queue / retry)
const customQueueFile = process.env.SEVENT_QUEUE_FILE ? path.resolve(process.env.SEVENT_QUEUE_FILE) : null;
const customRetryFile = process.env.SEVENT_RETRY_FILE ? path.resolve(process.env.SEVENT_RETRY_FILE) : null;

// Gestion des échecs pour relance ciblée (sevent_retry)
const retryFilePath = customRetryFile || path.join(__dirname, 'sevent_retry.json');
let retryRegistry = [];
let retryDirty = false;
try {
    const rawRetry = await fs.promises.readFile(retryFilePath, 'utf8');
    const parsedRetry = JSON.parse(rawRetry);
    if (Array.isArray(parsedRetry)) {
        retryRegistry = parsedRetry;
    } else {
        console.warn('⚠️ [DEBUG] Format inattendu dans sevent_retry.json (tableau attendu)');
    }
} catch (error) {
    if (error.code !== 'ENOENT') {
        console.warn(`⚠️ [DEBUG] Impossible de charger sevent_retry.json: ${error.message}`);
    }
}
let retryIndex = new Map();

// Gestion du fichier source "etape2.json" (personnalisable via SEVENT_QUEUE_FILE)
const etape2Path = customQueueFile || path.join(__dirname, 'etape2.json');
let etape2Cache = [];
let etape2Index = new Map();

function loadEtape2Cache() {
    try {
        const raw = fs.readFileSync(etape2Path, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
            etape2Cache = data;
        } else {
            console.warn('⚠️ [DEBUG] etape2.json n’est pas un tableau — cache initial vidé.');
            etape2Cache = [];
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn('ℹ️ [DEBUG] etape2.json introuvable — un nouveau fichier sera créé si nécessaire.');
            etape2Cache = [];
        } else {
            console.warn(`⚠️ [DEBUG] Impossible de lire etape2.json: ${error.message}`);
            etape2Cache = [];
        }
    }
    rebuildEtape2Index();
}

function rebuildEtape2Index() {
    etape2Index = new Map();
    etape2Cache.forEach((entry, idx) => {
        const key = normalizeTitle(entry?.titre || '');
        if (key) {
            etape2Index.set(key, idx);
        }
    });
}

function writeEtape2Cache() {
    try {
        fs.writeFileSync(etape2Path, JSON.stringify(etape2Cache, null, 2) + '\n', 'utf8');
    } catch (error) {
        console.warn(`⚠️ [DEBUG] Impossible d’écrire etape2.json: ${error.message}`);
    }
}

loadEtape2Cache();

try {
    // Try filesystem read first
    const raw = await fs.promises.readFile(bankAbsPath, 'utf8');
    try {
        const parsed = JSON.parse(raw);
        mustDepictBank = parsed?.default ? parsed.default : parsed;
        loadReport.method = 'fs';
        loadReport.size = Buffer.byteLength(raw);
        loadReport.status = 'OK';
        console.log('MUST DEPICT bank loaded (fs)');
    } catch (pe) {
        throw new Error(`JSON.parse failed: ${pe.message}`);
    }
} catch (e1) {
    // Fallback to dynamic import
    try {
        const mod = await import(pathToFileURL(bankAbsPath).href, { assert: { type: 'json' } });
        mustDepictBank = mod.default || null;
        if (mustDepictBank) {
            const sizeGuess = Buffer.byteLength(JSON.stringify(mustDepictBank));
            loadReport.method = 'import';
            loadReport.size = sizeGuess;
            loadReport.status = 'OK';
            console.log('MUST DEPICT bank loaded (import)');
        } else {
            throw new Error('Empty module after import');
        }
    } catch (e2) {
        loadReport.error = `${e1.message}; import fallback: ${e2.message}`;
        console.log('No indicesMustDepict.json found or failed to load. Using built-in hint banks.');
    }
}

// Always write a short run report (overwrites)
try {
    const lines = [];
    lines.push('Titre: MUST DEPICT bank load report');
    lines.push(`Horodatage: ${loadReport.timestamp}`);
    lines.push(`Méthode: ${loadReport.method}`);
    lines.push(`Chemin: ${loadReport.path}`);
    lines.push(`Taille (octets): ${loadReport.size}`);
    lines.push(`Statut: ${loadReport.status}`);
    if (loadReport.error) lines.push(`Erreur: ${loadReport.error}`);
    await fs.promises.writeFile(reportAbsPath, lines.join('\n'));
} catch (_) {
    // ignore report write errors
}

async function writeRunReport({ title, overridesApplied, mustDepictList, validationRule, eventId, status }) {
    try {
        const lines = [];
        lines.push(title || 'Run report');
        lines.push(`Timestamp: ${new Date().toISOString()}`);
        lines.push(`Overrides: ${overridesApplied ? 'politics+medieval applied (edict-friendly)' : 'none'}`);
        if (mustDepictList && mustDepictList.length) {
            lines.push('MUST DEPICT: ' + mustDepictList.slice(0, 3).join('; '));
        }
        lines.push(`Validation rule: ${validationRule || '2/3 elements accepted'}`);
        if (eventId) lines.push(`Event: ${eventId}`);
        lines.push(`Status: ${status || 'n/a'}`);
        await fs.promises.writeFile(reportAbsPath, lines.join('\n'));
    } catch (_) { }
}
const COST_ESTIMATES = {
    GEMINI_2_FLASH_INPUT: 0.0000001, // per token ($0.10 / 1M)
    GEMINI_2_FLASH_OUTPUT: 0.0000004, // per token ($0.40 / 1M)
    FLUX_SCHNELL: 0.003, // estimate per image
    SHARP_PROCESSING: 0.00001
};


const AI_CONFIG = {
    // Utilisation de Gemini pour la génération de prompts (remplace Claude)
    promptGeneration: "gemini-2.0-flash",
    eventGeneration: "gemini-2.0-flash",
    historicalVerification: "gemini-2.0-flash",
    contextEnrichment: "gemini-2.0-flash",
    imageValidation: "gemini-2.5-flash-lite", // Filtre rapide ultra-performant (731ms)
    imageValidationPro: "gemini-2.5-pro" // Validation fine (remplace 1.5-pro obsolète)
};

const HISTORICAL_PRECISION_RULES = `
### MANDATORY HISTORICAL PRECISION RULES:
1. **ANTI-MODERNITY**: Strictly NO power lines, NO asphalt, NO modern shop signs, NO plastic, NO modern glasses, NO electric lanterns.
2. **INFRASTRUCTURE**: Pre-1900 roads must be "muddy rutted carriage tracks" or "crude cobblestones". No smooth paving.
3. **ARCHITECTURE (CHRONOLOGY)**: 
   - Pre-800: Use "low-rise timber and thatch" or "Roman stone ruins". 
   - 800-1300: Use "massive stone Romanesque walls" and "steep blue slate roofs".
   - 1300-1500: Use "Gothic verticality" and "half-timbered houses".
   - 1500-1650: Use "French Renaissance luxury, white stone, ornate carvings". NOT medieval.
4. **SCRIBING**: Pre-1850, use ONLY "goose quills and inkwells". Strictly NO pens.
5. **GROOMING**: Strictly NO modern fades, NO undercuts, NO laser-trimmed beards. For clergy, MUST use "circular clerical tonsures (shaved crown)". For others, use "messy period hair".
6. **MAJESTY & PRESTIGE**: For Royalty/Nobility, use "opulent silks, gold embroidery, heavy jewelry, and heraldic banners". Avoid "peasant-style" rough wool for kings.
7. **WAR (PRE-1000)**: Strictly NO plate armor or heraldic banners. Use "chainmail (lorica), bronze helmets, and large wooden shields". No stirrups before 500 AD.
8. **POSTURE**: For ceremonies, weddings, or oaths, people MUST be STANDING or KNEELING at an altar. Avoid sitting around tables like modern meetings.
9. **INDUSTRIAL**: For 19th-century, use "exposed riveted iron beams and massive glass verrières". For early trains, use "fragile spindly boilers and large thin wheels".
10. **SYMBOLS**: For French Royalty, always include "Fleur-de-lis motifs" and "Royal Blue & Gold" color palette.
11. **NARRATIVE ARTIFACTS**: Every scene MUST include visual proof of the specific action. If it's a "Post office" event, show mailbags and horses. If it's "Education", show blackboards and students. If it's "Law", show a public crier or posters. Avoid "people just talking in a room".
`;

// Mode dry-run pour éviter tout appel réseau/coût
const IS_DRY_RUN = process.argv.includes('--dry-run');
const OFFLINE = IS_DRY_RUN || process.argv.includes('--offline') || process.env.OFFLINE === '1' || process.env.NO_NETWORK === '1';
const TEST_SINGLE = process.argv.includes('--test-single') || process.env.TEST_SINGLE === '1';
const now = () => new Date().toISOString();
// Existing generic timeout kept for non-prompt operations
const withTimeout = async (p, ms, label) => {
    let to; const timer = new Promise((_, rej) => to = setTimeout(() => rej(new Error(`timeout ${label} after ${ms}ms`)), ms));
    try { console.log(now(), 'START', label); const res = await Promise.race([p, timer]); console.log(now(), 'DONE', label); return res; }
    finally { clearTimeout(to); }
};

// Fast mode / retries config
let MAX_RETRIES = Number(process.env.RETRIES || 2);
if (process.env.FAST) {
    MAX_RETRIES = 1;
    process.env.NO_GEMINI = '1';
}

// Contraintes génériques de représentation visuelle
const DEPICTION_ENFORCEMENT = {
    enabled: true,         // passer à false pour désactiver la contrainte
    minScore: 0.4          // seuil depictionScore (0.0 – 1.0)
};

// Utilitaires normalisation/keywords
const _STOPWORDS = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'd', 'un', 'une', 'et', 'en', 'sur', 'dans', 'avec', 'sans', 'à', 'au', 'aux', 'the', 'a', 'an', 'of', 'for', 'on', 'at', 'to', 'from', 'by']);
function _stripAccents(s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function _normalizeText(s) { return _stripAccents(String(s || '').toLowerCase()).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function _normalizeWithSynonyms(s) {
    const syn = {
        rostrum: 'podium', dais: 'podium', lectern: 'podium',
        banner: 'flag', standards: 'flag', standard: 'flag', pennant: 'flag', placard: 'banner',
        parchment: 'parchment', 'parchment scroll': 'scroll', scroll: 'scroll',
        'royal seal (wax)': 'wax seal', 'wax seal': 'wax seal', seal: 'seal',
        canoes: 'canoe', canoe: 'canoe', 'birchbark canoe': 'canoe',
        palisade: 'palisade', stockade: 'palisade',
        map: 'map', 'parchment map': 'map'
    };
    let t = _normalizeText(s);
    for (const [k, v] of Object.entries(syn)) {
        const re = new RegExp(`\\b${k}\\b`, 'g');
        t = t.replace(re, v);
    }
    return t;
}
function _mainKeyword(phrase) {
    const words = _normalizeWithSynonyms(phrase).split(' ').filter(w => w && !_STOPWORDS.has(w) && w.length > 3);
    words.sort((a, b) => b.length - a.length);
    return words[0] || _normalizeText(phrase).split(' ')[0] || '';
}
function _uniqKeepOrder(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr) { const k = _normalizeText(x); if (!k || seen.has(k)) continue; seen.add(k); out.push(x); }
    return out;
}

// Thématique FR->EN (titre -> mots-clés neutres)
function buildThematicKeywords(title) {
    const t = _normalizeText(title || '');
    const map = [
        { re: /(bataille|combat|si[eè]ge|assaut)/, kws: ['battlefield', 'soldiers', 'banners', 'armor', 'pikes'] },
        { re: /(couronnement|sacre)/, kws: ['coronation', 'crown', 'cathedral', 'altar', 'royal orb'] },
        { re: /(imprimerie|presse|typographie)/, kws: ['printing press', 'movable type', 'typeset', 'inked pages', 'printer workshop'] },
        { re: /(trait[ée]|accord|[ée]dit)/, kws: ['treaty signing', 'parchment', 'wax seal', 'council table'] },
        { re: /(d[ée]couverte|science|observatoire|astronomie)/, kws: ['observatory', 'astronomer', 'telescope', 'star chart'] },
        { re: /(invention|machine|m[ée]canisme)/, kws: ['workshop', 'mechanism', 'prototype', 'tools', 'blueprints'] },
        { re: /(eruption|[ée]ruption|volcan)/, kws: ['volcano eruption', 'ash cloud', 'pyroclastic flow', 'buried town'] },
        { re: /(peste|[ée]pid[ée]mie|quarantaine)/, kws: ['plague doctor', 'quarantine', 'herbal remedies', 'city alleys'] },
        { re: /(r[ée]volution|[ée]meute|insurrection|barricade)/, kws: ['barricade', 'crowd', 'flags', 'cobblestone street'] },
        { re: /(navigation|exploration|caravelle|voyage)/, kws: ['caravel', 'harbor', 'compass', 'map on table'] },
        { re: /(architecture|construction|chantier|cath[ée]drale|nef)/, kws: ['scaffolding (historic)', 'stone blocks', 'masons', 'cathedral nave'] }
    ];
    const out = [];
    for (const { re, kws } of map) {
        if (re.test(t)) { out.push(...kws); }
    }
    // Normalisation finale et coupe 3–6 items
    const clean = _uniqKeepOrder(out).slice(0, 6);
    return clean;
}

// Libellé d'époque précis (affichage prompt)
function mapEraLabel(year) {
    const y = parseInt(year, 10) || 0;
    if (y >= 1200 && y <= 1499) return 'medieval';
    if (y >= 1500 && y <= 1599) return 'Renaissance';
    if (y >= 1600 && y <= 1799) return 'early modern (17th/18th century)';
    if (y >= 1800 && y <= 1899) return 'industrial era';
    if (y >= 1900 && y <= 1945) return 'early 20th century';
    if (y >= 1946) return 'modern/late modern';
    // fallback by eraBucket
    const e = eraBucket(y);
    return e === 'early-modern' ? 'early modern' : `${e}`;
}

// Détection ville simple dans le titre
function detectCity(title) {
    const cities = ['Paris', 'Tours', 'Bordeaux', 'Lyon', 'Marseille', 'Rouen', 'Reims', 'Dijon', 'Toulouse', 'Nantes', 'Lille', 'Orléans', 'Avignon', 'Grenoble'];
    const t = title || '';
    for (const c of cities) {
        const re = new RegExp(`\\b${c}\\b`, 'i');
        if (re.test(t)) return c;
    }
    return '';
}

// Buckets FR->EN simplifiés pour mots-clés
function keywordsFromTitle(title) {
    const t = _normalizeText(title || '');
    const buckets = [
        { re: /(bataille|combat|si[eè]ge)/, list: ['battlefield', 'banners', 'armor', 'pikes'] },
        { re: /(couronnement|sacre)/, list: ['coronation', 'cathedral', 'crown', 'royal orb'] },
        { re: /(trait[ée]|[ée]dit|charte|ordonnance)/, list: ['treaty signing', 'parchment', 'wax seal', 'council table'] },
        { re: /(imprimerie|presse|typographie)/, list: ['printing press', 'movable type', 'typeset', 'printer workshop'] },
        { re: /(architecture|construction|chantier|cath[ée]drale|nef)/, list: ['stone blocks', 'masons', 'cathedral nave'] },
        { re: /(peste|[ée]pid[ée]mie)/, list: ['plague doctor', 'quarantine', 'herbal remedies'] },
        { re: /(exploration|navigation|caravelle|voyage)/, list: ['caravel', 'harbor', 'compass', 'map on table'] },
        { re: /(science|observatoire|astronomie)/, list: ['observatory', 'telescope', 'star chart'] }
    ];
    const out = [];
    for (const b of buckets) if (b.re.test(t)) out.push(...b.list);
    return _uniqKeepOrder(out).slice(0, 6);
}

function randPick(arr, n = 2) {
    const a = [...arr];
    const res = [];
    while (a.length && res.length < n) {
        const i = Math.floor(Math.random() * a.length);
        res.push(a.splice(i, 1)[0]);
    }
    return res;
}

function pickOptionalMDP(type, era, n = 2) {
    const tb = mustDepictBank?.byType?.[type]?.[era] || mustDepictBank?.byType?.[type] || {};
    const eb = mustDepictBank?.byEra?.[era] || {};
    const pool = _uniqKeepOrder([...(tb.locations || []), ...(tb.actions || []), ...(tb.objects || []), ...(eb.locations || []), ...(eb.actions || []), ...(eb.objects || [])]);
    const filtered = pool.filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));
    return randPick(filtered, n);
}

// MUST DEPICT: anti-génériques et concrétisation en anglais
const _GENERIC_BANNED = new Set([
    'historic scene', 'historical scene', 'scene', 'meeting room', 'room', 'hall', 'generic hall', 'people', 'crowd', 'group of people', 'figures', 'persons', 'person', 'men', 'women',
    'scène historique', 'salle de réunion', 'salle', 'monde', 'personnes', 'foule', 'groupe de personnes', 'figures'
]);

// Contextual bans (trench outside war, early-era parliament artifacts, generic city names)
const _BANNED_CITIES = new Set(['paris', 'london', 'rome', 'berlin', 'madrid', 'lisbon', 'vienna', 'prague', 'venice', 'florence', 'athens', 'istanbul', 'constantinople']);
function _isBannedByContext(elem, type, era) {
    const n = _normalizeText(elem);
    if (!n) return true;
    if (_BANNED_CITIES.has(n)) return true; // city name alone is not a visual landmark
    if (n === 'trench' && type !== 'war') return true;
    if ((era === 'ancient' || era === 'medieval' || era === 'early-modern')) {
        if (n === 'vote by raised hands' || n === 'wooden podium') return true;
    }
    return false;
}

function _isGeneric(elem) {
    const n = _normalizeText(elem);
    if (!n) return true;
    if (_GENERIC_BANNED.has(n)) return true;
    // très court sans sens
    if (n.length < 4) return true;
    return false;
}

function _proposeConcreteTriplet(type, epoch) {
    const t = (type || '').toLowerCase();
    if (/(politique|parlement|assemblee|assemblée|senat|sénat|vote|decret|décret|loi)/.test(t)) {
        return ['parliament benches', 'vote by raised hands', 'wooden podium'];
    }
    if (/(bataille|guerre|militaire|armée|armee|tranchee|tranchée|war|battle|military)/.test(t)) {
        return ['muddy trench with sandbags', 'soldiers advancing with rifles', 'field artillery'];
    }
    if (/(marine|naval|port|arsenal|flotte|shipyard|dock)/.test(t)) {
        return ['dockyard/arsenal', 'sailors at work', 'ropes and pulleys'];
    }
    if (/(industrie|factory|ouvrier|worker|usine)/.test(t)) {
        return ['factory machines with belts', 'workers operating presses', 'smokestacks'];
    }
    if (/(manifestation|protest|greve|grève|union)/.test(t)) {
        return ['union banner with symbols', 'speech on wooden platform', 'raised placards'];
    }
    if (/(architecture|construction|cathedrale|cathédrale|eglise|église)/.test(t)) {
        return ['cathedral nave interior', 'stone blocks and chisels', "mason's chisels and stone blocks"];
    }
    // defaults by epoch
    if (epoch === 'medieval') return ['castle courtyard', 'guards with spears', 'wooden shields'];
    if (epoch === 'renaissance') return ['renaissance workshop', 'artisan at work', 'oil painting tools'];
    if (epoch === 'industrial') return ['steam-era workshop', 'workers with tools', 'belts and gears'];
    return ['historic street', 'public speech', 'period banners'];
}

function _categorize(elem) {
    const n = _normalizeText(elem);
    if (/(dock|arsenal|cathedral|nave|workshop|castle|street|parliament|benches|trench|yard|courtyard|platform|podium)/.test(n)) return 'location';
    if (/(vote|speech|advancing|operating|working|building|signing|raising)/.test(n)) return 'action';
    return 'object';
}

// Extraction MUST DEPICT (2–4 éléments génériques et robustes)
function extractMustDepictElements(ev) {
    const e = ev || {};
    const enr = e.enrichissement || {};
    const year = parseInt(e.year || e.date_formatee || '0', 10) || 0;
    const era = eraBucket(year);
    const type = classifyType(e);

    // Collect raw candidates (proper nouns preserved)
    const candidates = [];
    if (e.specificLocation && String(e.specificLocation).length > 2) candidates.push(String(e.specificLocation));
    if (Array.isArray(enr.elementsVisuelsEssentiels)) {
        for (const it of enr.elementsVisuelsEssentiels.slice(0, 3)) {
            if (it && String(it).length > 2) candidates.push(String(it));
        }
    }

    // Add type/era hint bank
    const bank = typeHintBank(type, era, e);
    candidates.push(...bank.locations, ...bank.actions, ...bank.objects);

    // Filter generics and concretize
    const concretized = [];
    for (const c of candidates) {
        if (_isGeneric(c)) continue;
        concretized.push(c);
    }

    // Prioritize [location, action, object] and cap to 3
    const byCat = { location: [], action: [], object: [] };
    for (const c of _uniqKeepOrder(concretized)) {
        byCat[_categorize(c)].push(c);
    }
    const finalList = [];
    if (byCat.location.length) finalList.push(byCat.location[0]);
    if (byCat.action.length) finalList.push(byCat.action[0]);
    if (byCat.object.length) finalList.push(byCat.object[0]);
    // If still < 2, fill from remaining regardless of cat
    const remaining = [...byCat.location.slice(1), ...byCat.action.slice(1), ...byCat.object.slice(1)];
    while (finalList.length < 2 && remaining.length) finalList.push(remaining.shift());
    return finalList.slice(0, 3);
}

function generateMustDepictBlock(ev) {
    const elems = extractMustDepictElements(ev);
    const list = elems.slice(0, Math.max(2, Math.min(3, elems.length)));
    if (list.length === 0) return '';
    return `MUST DEPICT: ${list.join('; ')}. AVOID GENERIC depictions without these elements.`;
}

function applyFocusOnMissing(prompt, missingElements = []) {
    const cleanMissing = _uniqKeepOrder((missingElements || []).filter(Boolean)).slice(0, 3);
    if (cleanMissing.length === 0) return prompt;
    const focusLine = `FOCUS ON MISSING ELEMENTS: ${cleanMissing.join('; ')}`;
    if (/FOCUS ON MISSING ELEMENTS:/i.test(prompt)) {
        return prompt.replace(/FOCUS ON MISSING ELEMENTS:[^\n]*/i, focusLine);
    }
    const combined = `${prompt}, ${focusLine}`;
    return combined.length > 500 ? combined.slice(0, 480) : combined;
}

// Negative prompt par période
function eraNegatives(year) {
    const y = parseInt(year, 10) || 0;
    const groomingNegs = ['modern haircut', 'fade haircut', 'undercut', 'sidecut', 'laser-trimmed beard', 'groomed eyebrows', 'hair gel', 'hair spray'];
    const common = ['plastic', 'laptop', 'smartphone', 'digital screen', 'led', 'neon sign', 'modern glasses', 'electric power lines', 'overhead cables', 'modern shop signs', 'asphalt road', 'concrete sidewalk', ...groomingNegs];

    if (y <= 1880) common.push('electric chandelier', 'light bulb', 'incandescent lamp');

    if (y <= 500) return [
        ...common, 'stirrups', 'plate armor', 'medieval flags', 'heraldry', 'knights', 'saddles with high pommels', 'castle (medieval style)', 'gothic architecture'
    ];
    if (y <= 1000) return [
        ...common, 'plate armor', 'cannon', 'gunpowder', 'crossbow (advanced)', 'printed books'
    ];
    if (y <= 1850) return [
        ...common, 'ballpoint pen', 'felt-tip pen', 'pencil (modern)', 'rubber tires', 'tractor', 'truck', 'motorized vehicle', 'engine', 'combustion engine', 'electric lamp post'
    ];
    if (y <= 1900) return [
        ...common, 'car (modern)', 'rubber tires', 'asphalt', 'modern concrete'
    ];
    if (y <= 1950) return [
        'modern car (post-1955)', 'led screen', 'plastic bottle', 'nylon jacket', 'smartphone', 'television', 'jeans', 't-shirt'
    ];
    return [];
}

function classifyType(ev) {
    const t = _normalizeText(ev.type || '');
    const text = _normalizeText([ev.titre, ev.description, ev.enrichissement?.contextHistorique].filter(Boolean).join(' '));
    const has = k => t.includes(k) || text.includes(k);
    if (has('war') || has('battle') || has('guerre') || has('bataille') || has('militaire')) return 'war';
    if (has('politique') || has('parlement') || has('assembly') || has('treaty') || has('loi')) return 'politics';
    if (has('science') || has('astronomy') || has('observatory') || has('laboratory') || has('scientifique')) return 'science';
    if (has('music') || has('composer') || has('choir') || has('organ') || has('musique')) return 'music';
    if (has('religion') || has('church') || has('temple') || has('basilica') || has('religieux')) return 'religion';
    if (has('exploration') || has('voyage') || has('expedition') || has('harbor') || has('caravel')) return 'exploration';
    if (has('architecture') || has('construction') || has('cathedral') || has('vault')) return 'architecture';
    if (has('economy') || has('market') || has('mint') || has('factory') || has('usine') || has('compagnie') || has('company')) return 'economy';
    if (has('disaster') || has('fire') || has('flood') || has('earthquake')) return 'disaster';
    if (has('colonisation') || has('colonie') || has('colons') || has('settlement') || has('foundation') || has('fondation') || has('maisonneuve') || has('mission') || has('habitation')) return 'settlement';
    return 'culture';
}

function eraBucket(year) {
    const y = parseInt(year, 10) || 0;
    if (y <= 500) return 'ancient';
    if (y <= 1500) return 'medieval';
    if (y <= 1800) return 'early-modern';
    if (y <= 1914) return 'industrial';
    if (y <= 1970) return 'modern';
    if (y <= 2000) return 'late-modern';
    return 'contemporary';
}

function typeHintBank(type, era, ev) {
    // Prefer external bank if available
    if (mustDepictBank && mustDepictBank.byType && mustDepictBank.byEra) {
        const tb = mustDepictBank.byType[type] || {};
        const eb = mustDepictBank.byEra[era] || {};
        let Lext = _uniqKeepOrder([...(tb.locations || []), ...(eb.locations || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));
        let Aext = _uniqKeepOrder([...(tb.actions || []), ...(eb.actions || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));
        let Oext = _uniqKeepOrder([...(tb.objects || []), ...(eb.objects || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));

        // Override for politics + medieval (edict-friendly)
        if (type === 'politics' && era === 'medieval') {
            console.log('Overrides politics+medieval applied (edict-friendly)');
            Lext = ['royal court interior', 'carolingian palace courtyard', 'fortified wooden bridge over river'];
            Aext = ['royal proclamation with parchment and wax seal', 'scribes recording decree', 'mint workers forging silver deniers'];
            Oext = ['royal seal (wax)', 'parchment scroll', 'viking longship on river (distant)'];
        }
        if (type === 'politics' && era === 'early-modern') {
            console.log('Overrides politics+early-modern applied (edict/royal courts)');
            Lext = ['royal bedchamber', "state council chamber", "cardinal's private chapel"];
            Aext = ['last rites by priest', 'royal visit at deathbed', 'scribes recording decree'];
            Oext = ["cardinal's red biretta", 'wax seal on parchment', 'viaticum chalice'];
        }

        if (Lext.length || Aext.length || Oext.length) {
            // Apply early-era adjustments (no scaffolding/factory belts)
            if (era === 'ancient' || era === 'medieval' || era === 'early-modern') {
                return {
                    locations: Lext.filter(x => !/scaffold/i.test(x)),
                    actions: Aext,
                    objects: Oext.filter(x => !/(belt|scaffold)/i.test(x))
                };
            }
            return { locations: Lext, actions: Aext, objects: Oext };
        }
        if (type === 'settlement' && era === 'early-modern') {
            console.log('bank empty for settlement/early-modern → using settlement defaults');
        }
    }

    const L = [], A = [], O = [];
    const add = (arr, items = []) => arr.push(...items);
    switch (type) {
        case 'settlement':
            add(L, ['river shoreline with forest', 'wooden palisade fort', 'camp near river confluence']);
            add(A, ['unloading supplies from boats', 'building wooden structures', 'trading with local population']);
            add(O, ['canoes or small boats', 'parchment map', 'axes and crates']);
            break;
        case 'politics':
            add(L, ['assembly chamber', 'royal court', 'town hall']);
            add(A, ['oath taking', 'vote by raised hands', 'treaty signing']);
            add(O, ['wooden podium', 'parchment', 'seals']);
            break;
        case 'war':
            const isNaval = _normalizeText(ev.titre || '').match(/(navale|mer|naval|ocean|flotte|ship|vaisseau|canons|trafalgar|lepante|aboukir|jutland|midway|leyte)/i);
            if (isNaval) {
                add(L, ['naval deck with thick wooden bulwarks', 'man-of-war gun deck', 'smoke-filled battery']);
                add(A, ['sailors operating naval cannons on low wooden trucks', 'loading broadside battery', 'firing through gun ports']);
                add(O, ['low naval gun carriages', 'rammers and rammers', 'functional block and tackle', 'British White Ensign', 'French naval tricolore', 'absolutely no American flags', 'no US stars and stripes', 'European Napoleonic era only', 'no statues', 'no winged figures']);
            } else {
                add(L, ['battlefield', 'city walls', 'trench']);
                add(A, ['charge', 'siege', 'phalanx formation', 'cannon firing']);
                add(O, ['spears', 'shields', 'banners', 'drums', 'no metal helmets']);
            }
            break;
        case 'science':
            add(L, ['cabinet of curiosities', 'observatory', 'laboratory bench']);
            add(A, ['experimenting', 'observing through instrument', 'writing treatise']);
            add(O, ['astrolabe', 'quadrant', 'microscope', 'glassware']);
            break;
        case 'music':
            add(L, ['baroque salon', 'cathedral choir loft', 'court stage']);
            add(A, ['composer conducting', 'ensemble performance', 'notation writing']);
            add(O, ['harpsichord', 'lute', 'sheet music', 'organ pipes']);
            break;
        case 'religion':
            add(L, ['basilica nave', 'cloister', 'temple steps']);
            add(A, ['procession', 'blessing', 'council debate']);
            add(O, ['reliquary', 'incense thurible', 'icon', 'scrolls']);
            break;
        case 'exploration':
            add(L, ['harbor quay', 'caravel deck', 'desert caravan', 'jungle camp']);
            add(A, ['unfurling maps', 'star navigation', 'landfall']);
            add(O, ['compass', 'sextant', 'map case', 'standards']);
            break;
        case 'architecture':
            add(L, ['scaffolding around façade', 'quarry', 'worksite lodge']);
            add(A, ['stone cutting', 'vault construction', 'blueprint review']);
            add(O, ['wooden scaffolds', 'pulley crane (preindustrial)', 'mallet and chisel']);
            break;
        case 'economy':
            add(L, ['mint workshop', 'market hall', 'factory floor (belts)']);
            add(A, ['weighing', 'forging', 'assembly']);
            add(O, ['balance scale', 'coin dies', 'belt-driven machines']);
            break;
        case 'disaster':
            add(L, ['burning quarter', 'collapsed bridge', 'flooded streets']);
            add(A, ['firefighting bucket line', 'evacuation', 'rescue']);
            add(O, ['water buckets', 'hand pumps', 'sandbags']);
            break;
        default:
            add(L, ['historic street', 'public square', 'guild hall']);
            add(A, ['speech', 'craft work', 'signing']);
            add(O, ['banners', 'tools', 'manuscripts']);
    }
    // Era adjustments
    if (era === 'ancient' || era === 'medieval' || era === 'early-modern') {
        // remove factories/modern floors and any scaffolding mentions for early periods
        const loc = L.filter(x => !/factory/i.test(x) && !/scaffold/i.test(x));
        const obj = O.filter(x => !/belt/i.test(x) && !/scaffold/i.test(x));
        return { locations: loc, actions: A, objects: obj };
    }
    return { locations: L, actions: A, objects: O };
}

function typeNegatives(type, era) {
    const out = [];
    // Early eras: systematically add modern parliamentary artifacts
    if (era === 'ancient' || era === 'medieval' || era === 'early-modern') {
        out.push('parliament vote', 'ballot', 'microphones', 'modern podium');
    }
    if (type === 'war' && (era === 'ancient' || era === 'medieval' || era === 'early-modern')) {
        out.push('modern firearm', 'bolt-action rifle', 'rifles with scopes', 'machine gun', 'gatling gun', 'tank', 'barbed wire', 'breech-loading cannon', 'shell casing', 'brass cartridge');
    }
    if (type === 'music' && (era === 'early-modern' || era === 'industrial')) {
        out.push('electric guitar', 'microphone (modern)');
    }
    if (type === 'architecture' && (era === 'ancient' || era === 'medieval' || era === 'early-modern')) {
        out.push('hard hats (modern)', 'hi-vis vests', 'concrete mixer', 'power tools', 'modern steel crane', 'bulldozer');
    }
    if (type === 'settlement' && era === 'early-modern') {
        out.push('modern skyline', 'asphalt road', 'steel ship', 'neon sign');
    }
    return out;
}

function buildNegativePrompt(baseString, year, ev = null) {
    const base = (baseString || '').split(',').map(s => s.trim()).filter(Boolean);
    const era = eraBucket(year);
    const extraEra = eraNegatives(year);
    const evType = ev ? classifyType(ev) : null;
    const extraType = evType ? typeNegatives(evType, era) : [];
    const merged = _uniqKeepOrder([...base, ...extraEra, ...extraType]);
    return merged.join(', ');
}

// Configuration des types d'événements
const EVENT_FOCUS_TYPES = {
    FRANCE: "france",
    UNIVERSAL: "universal",
    MIXED: "mixed"
};

// ==============================================================================
// SYSTÈME DE STYLES DIVERSIFIÉS - DÉSACTIVÉ
// ==============================================================================

// Bibliothèque de styles supprimée pour privilégier le réalisme photographique
const ARTISTIC_STYLE_LIBRARY = [];

/*
// Sélection de style simplifiée (Réalisme photographique forcé) - COMMENTÉ
function selectStyleForEvent(event) {
    return {
        category: 'photographic',
        name: 'historical_realism',
        style: {
            enhancers: ['high-fidelity documentary photography', 'ultra-sharp forensic focus', 'natural daylighting', 'historical accuracy'],
            description: 'Réalisme historique photographique',
            composition: 'wide-angle documentary perspective, deep depth of field, authentic period textures, strict adherence to gravity and physics, no floating elements'
        }
    };
}
*/

function deriveStyleContextualNotes(event) {
    const notes = [];
    const normalizedTitle = _normalizeText(event.titre || event.title || '');
    const normalizedType = String(event.type || '').toLowerCase();

    if (/bataille|combat|si[eè]ge|guerre/.test(normalizedTitle) || /bataille|guerre|militaire/.test(normalizedType)) {
        notes.push('underscore disciplined motion and controlled chaos');
    }
    if (/revolution|révolution|revolte|uprising|emeute|émeute/.test(normalizedTitle)) {
        notes.push('emphasize charged crowds and banners in movement');
    }
    if (/trait[eé]|accord|traitement diplomatique|congres|signature/.test(normalizedTitle) || /diplomatie|politique/.test(normalizedType)) {
        notes.push('highlight ceremonial gestures and diplomatic staging');
    }
    if (/scientifique|laboratoire|exp[ée]rience|invention/.test(normalizedTitle) || /science|technologie|innovation/.test(normalizedType)) {
        notes.push('include precise instruments and analytical focus');
    }
    if (/catastrophe|eruption|éruption|incendie|d[ée]sesperation/.test(normalizedTitle) || /catastrophe/.test(normalizedType)) {
        notes.push('capture dramatic lighting with urgent human response');
    }

    return notes.slice(0, 2);
}

// ==============================================================================
// STYLE BLOCKS PAR ÉPOQUE (Optimisation Gemini - évite la redondance)
// ==============================================================================
function getStyleBlock(year) {
    const y = parseInt(year, 10) || 0;

    if (y <= 500) {
        // ANCIENT (0-500): Antiquité
        return "Ancient era aesthetics: marble columns, stone architecture, togas and tunics, oil lamps, scrolls, bronze weapons, natural earth tones, Mediterranean light";
    }

    if (y <= 1500) {
        // MEDIEVAL (500-1500): Moyen Âge
        return "Medieval period style: illuminated manuscript quality, stone castles, chainmail and armor, religious iconography, rich tapestries, candlelight, heraldic symbols, hand-crafted textures";
    }

    if (y <= 1800) {
        // EARLY MODERN (1500-1800): Renaissance à Lumières
        return "Early modern era: Renaissance to Enlightenment aesthetics, elaborate fabrics (velvet, silk), doublets, oil painting quality, authentic interior textures of wood and stone, focused period-accurate light sources";
    }

    if (y <= 1900) {
        // 19TH CENTURY (1800-1900): Révolution industrielle
        return "19th century atmosphere: daguerreotype or early photography style, slight sepia tone, heavy wool coats, top hats, steam engines, gas lamps, industrial textures, Victorian architecture";
    }

    if (y <= 1970) {
        // MODERN (1900-1970): 20ème siècle classique
        return "Early-to-mid 20th century style: vintage photography grain, period-accurate vehicles, fedoras, suits with vests, art deco elements, black-and-white or muted color palette";
    }

    // LATE MODERN (1970-2000)
    return "Late 20th century aesthetics: 1970s-1990s photography style, period-specific clothing and hairstyles, authentic technology of the era";
}

// ==============================================================================
// CONFIGURATION EXISTANTE
// ==============================================================================

// Types d'événements étendus par catégories
const EVENT_TYPES = {
    cultural: [
        "Arts", "Littérature", "Musique", "Théâtre", "Cinéma", "Peinture",
        "Sculpture", "Architecture", "Photographie", "Danse", "Opéra",
        "Mode", "Design", "Artisanat", "Festivals", "Expositions"
    ],
    political: [
        "Militaire", "Politique", "Diplomatie", "Guerre", "Bataille",
        "Révolution", "Coup d'État", "Traité", "Alliance", "Indépendance",
        "Unification", "Colonisation", "Décolonisation", "Résistance", "Paix"
    ],
    scientific: [
        "Science", "Invention", "Découverte", "Innovation", "Médecine",
        "Physique", "Chimie", "Biologie", "Astronomie", "Mathématiques",
        "Technologie", "Informatique", "Transport", "Communication", "Énergie"
    ],
    sports: [
        "Sport", "Olympiques", "Football", "Athlétisme", "Tennis", "Cyclisme",
        "Natation", "Boxe", "Course", "Gymnastique", "Sports d'hiver",
        "Rugby", "Basketball", "Baseball", "Golf", "Compétition"
    ],
    social: [
        "Institution", "Société", "Éducation", "Université", "Loi", "Justice",
        "Droits humains", "Mouvement social", "Syndicalisme", "Féminisme",
        "Égalité", "Liberté", "Démocratisation", "Réforme", "Abolition"
    ],
    economic: [
        "Économie", "Commerce", "Industrie", "Finance", "Banque", "Monnaie",
        "Bourse", "Crise économique", "Croissance", "Innovation économique",
        "Capitalisme", "Socialisme", "Mondialisation", "Agriculture", "Marché"
    ],
    religious: [
        "Religion", "Spiritualité", "Christianisme", "Islam", "Judaïsme",
        "Bouddhisme", "Hindouisme", "Réforme religieuse", "Concile", "Pèlerinage",
        "Missionnaire", "Monastère", "Temple", "Cathédrale", "Secte"
    ],
    exploration: [
        "Exploration", "Voyage", "Navigation", "Expédition", "Géographie",
        "Cartographie", "Colonisation", "Découverte géographique", "Route commerciale",
        "Immigration", "Migration", "Frontière", "Territoire", "Conquête", "Expansion"
    ],
    environmental: [
        "Catastrophe", "Tremblement de terre", "Volcan", "Tsunami", "Inondation",
        "Sécheresse", "Épidémie", "Pandémie", "Famine", "Incendie", "Ouragan",
        "Météorologie", "Climat", "Écologie", "Environnement"
    ],
    daily: [
        "Vie quotidienne", "Coutumes", "Tradition", "Festivité", "Célébration",
        "Mode de vie", "Gastronomie", "Habitat", "Famille", "Mariage",
        "Naissance", "Mort", "Folklore", "Langue", "Communication"
    ],
    media: [
        "Médias", "Presse", "Journal", "Radio", "Télévision", "Internet",
        "Publication", "Livre", "Magazine", "Journalisme", "Censure",
        "Propagande", "Information", "Diffusion", "Communication de masse"
    ],
    transport: [
        "Transport", "Infrastructure", "Chemin de fer", "Route", "Pont",
        "Canal", "Port", "Aéroport", "Aviation", "Automobile", "Navigation",
        "Urbanisme", "Construction", "Génie civil", "Logistique"
    ]
};

function getAllEventTypes() {
    const allTypes = [];
    Object.values(EVENT_TYPES).forEach(category => {
        allTypes.push(...category);
    });
    return [...new Set(allTypes)];
}

function getTypesForFocus(focusType) {
    return getAllEventTypes();
}

const MAX_IMAGE_ATTEMPTS_BASE = 4;
const BATCH_SIZE = 4;
const MIN_VALIDATION_SCORE = 4;

// Limites optimisées Flux-schnell
const FLUX_SCHNELL_LIMITS = {
    MAX_T5_TOKENS: 256,
    OPTIMAL_T5_TOKENS: 200,
    TARGET_T5_TOKENS: 180,
    TARGET_WORDS: 45,
    MAX_WORDS: 60
};

// Initialisation du mode Réalisme Historique (Optimisé Flux-Schnell)
console.log(`✅ Mode Réalisme Historique activé (Claude + Flux-Schnell @ 4 steps MAX)`);

// ... existing code ...

// Enforce steps for Flux-schnell - MAX 4 steps (limite API Replicate janvier 2026)
const envSteps = parseInt(process.env.FLUX_STEPS || '', 10);
const steps = Number.isFinite(envSteps) ? envSteps : 4;
console.debug(`[Flux] steps=${steps} (Flux-schnell mode optimisé)`);

const FLUX_CONFIG = {
    steps,
    quality: 95,  // 🎯 OPTIMISATION #3: 90→95 pour réduire artifacts WebP (meilleure validation Gemini)
    seed: () => Math.floor(Math.random() * 1000000)
};

// Initialisation APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Détection cachée des colonnes disponibles sur la table 'goju'
const GOJU_COLUMN_SUPPORT = {
    checked: false,
    style_name: false,
    style_info: false
};

async function checkColumnExists(table, column) {
    if (OFFLINE) return true;
    try {
        const { error } = await supabase.from(table).select(column, { head: true, count: 'exact' }).limit(1);
        return !error;
    } catch (_) {
        return false;
    }
}

async function detectGojuColumns() {
    if (GOJU_COLUMN_SUPPORT.checked) return GOJU_COLUMN_SUPPORT;
    const table = 'goju2'; // On vérifie goju2 qui est la table cible
    const [hasStyleName, hasStyleInfo, hasDateFormatee, hasPromptFlux] = await Promise.all([
        checkColumnExists(table, 'style_name'),
        checkColumnExists(table, 'style_info'),
        checkColumnExists(table, 'date_formatee'),
        checkColumnExists(table, 'prompt_flux')
    ]);
    GOJU_COLUMN_SUPPORT.checked = true;
    GOJU_COLUMN_SUPPORT.style_name = hasStyleName;
    GOJU_COLUMN_SUPPORT.style_info = hasStyleInfo;
    GOJU_COLUMN_SUPPORT.date_formatee = hasDateFormatee;
    GOJU_COLUMN_SUPPORT.prompt_flux = hasPromptFlux;
    return GOJU_COLUMN_SUPPORT;
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Barre de progression
class ProgressBar {
    constructor(total, label = 'Progression') {
        this.total = total;
        this.current = 0;
        this.label = label;
        this.startTime = Date.now();
        this.barLength = 40;
    }

    update(current, info = '') {
        // S'assurer que current ne dépasse jamais total et ne recule jamais
        this.current = Math.min(Math.max(current, this.current), this.total);
        const percentage = Math.round((this.current / this.total) * 100);
        const filledLength = Math.round((this.barLength * this.current) / this.total);
        const bar = '█'.repeat(filledLength) + '░'.repeat(this.barLength - filledLength);

        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.current / (elapsed / 60);

        const canTTY = process.stdout && process.stdout.isTTY && typeof process.stdout.clearLine === 'function' && typeof process.stdout.cursorTo === 'function';
        const line = `${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total}) - ${rate.toFixed(1)}/min ${info}`;
        if (canTTY) {
            try {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(line);
                if (this.current >= this.total) process.stdout.write('\n');
            } catch (_) {
                console.log(line);
            }
        } else {
            console.log(line);
        }
    }
}

// Wrapper Claude robuste
async function callClaude(prompt, options = {}) {
    const {
        model = AI_CONFIG.promptGeneration,
        maxTokens = 300,
        temperature = 0.7,
        retryAttempt = 1
    } = options;

    // REDIRECTION GEMINI SI LE MODÈLE EST GEMINI (MODERNISATION)
    if (model && model.toLowerCase().includes('gemini')) {
        return callGemini(prompt, { ...options, model, maxOutputTokens: maxTokens });
    }

    const maxRetries = 5;

    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }]
        });

        return response.content[0].text;

    } catch (error) {
        const isTemporaryError = error.message.includes('rate_limit') ||
            error.message.includes('overloaded') ||
            error.message.includes('Overloaded') ||
            error.message.includes('timeout') ||
            error.message.includes('529') ||
            error.status === 529;

        if (isTemporaryError && retryAttempt < maxRetries) {
            let waitTime;
            if (error.message.includes('overloaded') || error.message.includes('Overloaded') || error.message.includes('529') || error.status === 529) {
                waitTime = Math.min(retryAttempt * 15000, 60000);
            } else {
                waitTime = retryAttempt * 5000;
            }

            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callClaude(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }

        throw error;
    }
}

async function callClaudeWithImage(prompt, imageUrl, options = {}) {
    const {
        model = "claude-3-5-haiku-20241022",
        maxTokens = 1000,
        temperature = 0.1,
        retryAttempt = 1
    } = options;

    try {
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        const mediaType = "image/webp"; // Replicate Flux outputs webp

        const response = await anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType,
                                data: base64Image,
                            },
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        });

        return response.content[0].text;

    } catch (error) {
        console.warn(`⚠️ [DEBUG] Claude Vision Error: ${error.message}`);
        if (retryAttempt < 3) {
            await new Promise(r => setTimeout(r, 2000 * retryAttempt));
            return callClaudeWithImage(prompt, imageUrl, { ...options, retryAttempt: retryAttempt + 1 });
        }
        throw error;
    }
}

// Wrappers Gemini robustes
async function callGemini(prompt, options = {}) {
    const {
        model = AI_CONFIG.eventGeneration,
        maxOutputTokens = 1000,
        temperature = 0.3,
        responseFormat = null,
        retryAttempt = 1
    } = options;

    try {
        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: {
                maxOutputTokens,
                temperature,
                ...(responseFormat === 'json' && { responseMimeType: "application/json" })
            }
        });

        const result = await geminiModel.generateContent(prompt);
        const response = result.response.text();

        return response;

    } catch (error) {
        if ((error.message.includes('quota') ||
            error.message.includes('rate_limit') ||
            error.message.includes('overloaded') ||
            error.message.includes('timeout')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 5000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callGemini(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }

        throw error;
    }
}

async function callGeminiWithImage(prompt, imageUrl, options = {}) {
    const {
        model = AI_CONFIG.imageValidation,
        maxOutputTokens = 350,
        temperature = 0.05,
        retryAttempt = 1
    } = options;

    try {
        const geminiModel = genAI.getGenerativeModel({
            model,
            generationConfig: {
                maxOutputTokens,
                temperature,
                responseMimeType: "application/json"
            }
        });

        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();

        const imagePart = {
            inlineData: {
                data: Buffer.from(imageBuffer).toString('base64'),
                mimeType: 'image/webp'
            }
        };

        const result = await geminiModel.generateContent([prompt, imagePart]);
        const response = result.response.text();

        return response;

    } catch (error) {
        // GESTION AGRESSIVE DES QUOTAS (429)
        const isQuotaError = error.message.includes('quota') ||
            error.message.includes('rate_limit') ||
            error.message.includes('429');

        if (isQuotaError && retryAttempt < 10) { // On insiste jusqu'à 10 fois
            // Backoff exponentiel : 10s, 20s, 40s, 60s...
            const waitTime = Math.min(Math.pow(2, retryAttempt) * 5000, 60000);
            console.log(`⏳ [DEBUG] Quota Gemini atteint (tentative ${retryAttempt}/10). Pause de ${waitTime / 1000}s...`);

            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callGeminiWithImage(prompt, imageUrl, { ...options, retryAttempt: retryAttempt + 1 });
        }

        throw error;
    }
}

// Détection intelligente des doublons
let existingNormalizedTitles = new Set();
let titleMappings = new Map();
let existingEventsData = [];

function extractYear(dateString) {
    if (!dateString) return null;
    const yearMatch = dateString.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

function normalizeTitle(titre) {
    if (!titre) return '';

    let normalized = titre.toLowerCase().trim();

    // Normalisation unicode COMPLÈTE
    normalized = normalized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime tous les accents
        .replace(/['']/g, "'") // Normalise les apostrophes
        .replace(/[""]/g, '"') // Normalise les guillemets
        .replace(/[–—]/g, '-') // Normalise les tirets
        .replace(/\s*\(?\d{4}\)?$/g, '') // Supprime années à la fin
        .replace(/\s+\d{4}\s*$/g, '')
        .replace(/\s*\([^)]*\)\s*/g, ' ') // Supprime contenu entre parenthèses
        .replace(/\s*\[[^\]]*\]\s*/g, ' ') // Supprime contenu entre crochets

    // Normalisation des termes équivalents (GÉNÉRIQUE)
    const equivalences = [
        [/^(traité|traite|accord|pacte|convention|contrat)\s+(de\s+|du\s+|des\s+|d')?/g, 'traite de '],
        [/^(partage|division|répartition)\s+(de\s+|du\s+|des\s+|d')?/g, 'traite de '],
        [/^(bataille|combat|affrontement)\s+(de\s+|du\s+|des\s+|d')?/g, 'bataille de '],
        [/^(guerre|conflit)\s+(de\s+|du\s+|des\s+|d')?/g, 'guerre de '],
        [/^(révolution|soulèvement|révolte)\s+(de\s+|du\s+|des\s+|d')?/g, 'revolution de '],
        [/^(découverte|invention)\s+(de\s+|du\s+|des\s+|d')?/g, 'decouverte de '],
        [/^(fondation|création|établissement)\s+(de\s+|du\s+|des\s+|d')?/g, 'fondation de '],
        [/^(construction|édification|bâtiment)\s+(de\s+|du\s+|des\s+|d')?/g, 'construction de '],
        [/^(mort|décès|disparition)\s+(de\s+|du\s+|des\s+|d')?/g, 'mort de '],
        [/^(naissance|venue au monde)\s+(de\s+|du\s+|des\s+|d')?/g, 'naissance de '],
        [/^(couronnement|sacre|intronisation)\s+(de\s+|du\s+|des\s+|d')?/g, 'couronnement de '],
        [/^(élection|nomination)\s+(de\s+|du\s+|des\s+|d')?/g, 'election de ']
    ];

    equivalences.forEach(([pattern, replacement]) => {
        normalized = normalized.replace(pattern, replacement);
    });

    // Suppression des mots vides
    normalized = normalized
        .replace(/\s+(le|la|les|du|de|des|en|et|ou|dans|pour|avec|par|sur|sous|vers|chez|sans|contre|depuis|pendant)\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return normalized;
}

function rebuildRetryIndex() {
    retryIndex = new Map();
    retryRegistry.forEach((entry, idx) => {
        const key = normalizeTitle(entry?.titre || entry?.event?.titre || '');
        if (key) {
            retryIndex.set(key, idx);
        }
    });
}

rebuildRetryIndex();

function flushRetryFailures() {
    if (!retryDirty) return;
    try {
        fs.writeFileSync(retryFilePath, JSON.stringify(retryRegistry, null, 2) + '\n', 'utf8');
        retryDirty = false;
    } catch (error) {
        console.warn(`⚠️ [DEBUG] Impossible d'écrire ${retryFilePath}: ${error.message}`);
    }
}

process.on('exit', () => {
    flushRetryFailures();
});

function upsertRetryFailure(entry) {
    const key = normalizeTitle(entry?.titre || entry?.event?.titre || '');
    if (!key) return;
    const existingIdx = retryIndex.get(key);
    if (Number.isInteger(existingIdx)) {
        retryRegistry[existingIdx] = entry;
    } else {
        retryRegistry.push(entry);
        retryIndex.set(key, retryRegistry.length - 1);
    }
    retryDirty = true;
}

function clearRetryFailureByTitle(title) {
    const key = normalizeTitle(title || '');
    if (!key) return;
    const idx = retryIndex.get(key);
    if (idx === undefined) return;
    retryRegistry.splice(idx, 1);
    retryDirty = true;
    rebuildRetryIndex();
}

function removeEventFromEtape2(title) {
    const key = normalizeTitle(title || '');
    if (!key) return false;
    const idx = etape2Index.get(key);
    if (idx === undefined) return false;
    etape2Cache.splice(idx, 1);
    rebuildEtape2Index();
    writeEtape2Cache();
    return true;
}

function ensureField(entry, key, value) {
    if (value === undefined || value === null) return;
    if (entry[key] === undefined || entry[key] === null || entry[key] === '') {
        entry[key] = value;
    }
}

function upsertEtape2Failure(event, enrichedEvent, failureSummary) {
    if (!event?.titre) return;
    const key = normalizeTitle(event.titre);
    const idx = etape2Index.get(key);
    const baseEvent = idx !== undefined ? { ...etape2Cache[idx] } : {};
    const source = enrichedEvent || event || {};

    ensureField(baseEvent, 'titre', source.titre || event.titre);
    ensureField(baseEvent, 'year', source.year || event.year || null);
    ensureField(baseEvent, 'type', source.type || event.type || '');
    ensureField(baseEvent, 'lieu', source.lieu || source.specificLocation || event.lieu || '');
    ensureField(baseEvent, 'roles', source.roles || event.roles || []);
    ensureField(baseEvent, 'objets', source.objets || event.objets || []);
    ensureField(baseEvent, 'action', source.action || event.action || '');
    ensureField(baseEvent, 'scene', source.scene || event.scene || '');
    ensureField(baseEvent, 'specificLocation', source.specificLocation || event.specificLocation || '');
    ensureField(baseEvent, 'description_detaillee', source.description_detaillee || source.description || event.description || '');
    if (source.enrichissement) {
        baseEvent.enrichissement = source.enrichissement;
    }

    const lastAttempt = failureSummary?.lastAttempt || null;
    const analysis = failureSummary?.analysis || {};
    const notes = {
        updated_at: new Date().toISOString(),
        reason: failureSummary?.reason || lastAttempt?.validation?.explanation || lastAttempt?.error || 'Raison inconnue',
        score: failureSummary?.score ?? lastAttempt?.validation?.score ?? null,
        has_modern_objects: analysis.hasModernObjects ?? null,
        period_clothing: analysis.periodClothing ?? null,
        represents_event: analysis.representsEvent ?? null,
        missing_elements: Array.isArray(analysis.missingElements) ? analysis.missingElements : [],
        hints: failureSummary?.hints || [],
        gemini_event_relevance: analysis.eventRelevance || '',
        has_forbidden_text: analysis.hasForbiddenText ?? null,
        last_prompt: lastAttempt?.prompt || '',
        last_style: lastAttempt?.styleInfo?.name || lastAttempt?.styleInfo?.category || '',
        last_negative: lastAttempt?.negativePrompt || '',
        extra_keywords: lastAttempt?.extraKeywords || [],
        focus_must_depict: lastAttempt?.focusMustDepict || []
    };
    baseEvent.validation_notes = notes;

    if (idx !== undefined) {
        etape2Cache[idx] = baseEvent;
    } else {
        etape2Cache.push(baseEvent);
    }
    rebuildEtape2Index();
    writeEtape2Cache();
}

function buildRetryHints(analysis = {}, event = {}) {
    const hints = [];
    if (analysis.missingElements && analysis.missingElements.length) {
        hints.push(`Insister sur: ${analysis.missingElements.join(', ')}`);
    }
    if (analysis.hasModernObjects) {
        hints.push('Retirer ou remplacer les objets modernes détectés (caméras, éclairage récent, mobilier contemporain).');
    }
    if (analysis.periodClothing === false) {
        const yearHint = event.year ? ` (période ${event.year})` : '';
        hints.push(`Décrire explicitement des vêtements d'époque${yearHint}.`);
    }
    if (analysis.anatomyRealistic === false) {
        hints.push('Demander des poses naturelles et cohérentes.');
    }
    if (analysis.representsEvent === false) {
        hints.push('Renforcer la description de la scène et du contexte pour guider la génération.');
    }
    if (analysis.hasForbiddenText) {
        hints.push('Éviter tout texte lisible (dates, titres) dans l’image.');
    }
    if (analysis.hasWingsOrSupernatural) {
        hints.push('Supprimer toute mention de créatures ou éléments surnaturels.');
    }
    if (!hints.length) {
        hints.push('Réécrire le prompt en rappelant le contexte historique et les éléments visuels clés.');
    }
    return hints;
}

function buildRetryPromptAugmentation(notes = {}, event = {}) {
    const segments = [];
    if (Array.isArray(notes.missing_elements) && notes.missing_elements.length) {
        segments.push(`Focus on ${notes.missing_elements.join(', ')}.`);
    }
    if (Array.isArray(notes.hints) && notes.hints.length) {
        segments.push(notes.hints.join(' '));
    }
    if (notes.has_modern_objects) {
        segments.push('Exclude modern technology such as contemporary cameras, lighting or furniture.');
    }
    if (notes.period_clothing === false) {
        const yearHint = event.year ? `from ${event.year}` : 'from the correct era';
        segments.push(`Ensure clothing and accessories are historically accurate ${yearHint}.`);
    }
    if (notes.represents_event === false) {
        segments.push('Clearly depict the key action of the historical event with recognizable context.');
    }
    if (notes.has_forbidden_text) {
        segments.push('Avoid any visible readable text such as dates or titles.');
    }
    if (notes.extra_keywords && notes.extra_keywords.length) {
        segments.push(`Include contextual details: ${notes.extra_keywords.join(', ')}.`);
    }
    return segments.join(' ').trim();
}

function buildImageReferenceAugmentation(previousAttempt) {
    if (!previousAttempt || !previousAttempt.imageUrl) {
        return null;
    }
    const analysis = previousAttempt.validation?.detailedAnalysis
        || previousAttempt.validation?.analysis
        || previousAttempt.validation
        || {};
    const segments = [];
    if (Array.isArray(analysis.missingElements) && analysis.missingElements.length) {
        segments.push(`Ajouter absolument : ${analysis.missingElements.join(', ')}.`);
    }
    if (analysis.hasModernObjects) {
        segments.push('Retirer tous les objets modernes détectés (smartphones, néons, mobilier contemporain).');
    }
    if (analysis.hasForbiddenText) {
        segments.push('Supprimer tout texte lisible (dates, titres, logos).');
    }
    if (analysis.periodClothing === false) {
        segments.push('Corriger les tenues pour qu’elles correspondent à la période historique exacte.');
    }
    if (analysis.representsEvent === false) {
        segments.push("Recentrer la scène sur l’action principale de l’événement, avec un cadrage explicite.");
    }
    if (analysis.eventRelevance) {
        segments.push(analysis.eventRelevance);
    }
    if (!segments.length && previousAttempt.validation?.explanation) {
        segments.push(previousAttempt.validation.explanation);
    }
    const guidance = segments.join(' ').trim();
    return {
        imageUrl: previousAttempt.imageUrl,
        guidance
    };
}

function recordRetryFailure(event, enrichedEvent, attemptLogs) {
    if (!event?.titre) return;
    const lastAttempt = Array.isArray(attemptLogs) && attemptLogs.length ? attemptLogs[attemptLogs.length - 1] : null;
    const analysis = lastAttempt?.validation?.analysis || lastAttempt?.validation?.detailedAnalysis || lastAttempt?.validation?.detailed_analysis || lastAttempt?.validation || null;
    const normalizedAnalysis = lastAttempt?.validation?.detailedAnalysis || lastAttempt?.validation?.analysis || null;
    const finalAnalysis = normalizedAnalysis || analysis || {};
    const entry = {
        titre: event.titre,
        year: event.year,
        timestamp: new Date().toISOString(),
        event,
        enrichedEvent,
        attempts: attemptLogs,
        last_reason: lastAttempt?.validation?.explanation || lastAttempt?.error || 'Raison inconnue',
        last_analysis: finalAnalysis,
        hints: buildRetryHints(finalAnalysis, event),
        source: 'sevent2'
    };
    const failureSummary = {
        reason: entry.last_reason,
        analysis: finalAnalysis,
        hints: entry.hints,
        score: finalAnalysis?.score ?? lastAttempt?.validation?.score ?? null,
        lastAttempt
    };
    upsertEtape2Failure(event, enrichedEvent, failureSummary);
    upsertRetryFailure(entry);
}

function calculateSimilarity(str1, str2) {
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);

    let commonWords = 0;
    words1.forEach(word1 => {
        if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
            commonWords++;
        }
    });

    return commonWords / Math.max(words1.length, words2.length);
}

// Détection doublons avec Gemini Flash
async function detectDuplicatesWithGemini(newEvent, existingEvents) {
    const newEventYear = newEvent.year;
    const candidatesNearDate = existingEvents.filter(existing => {
        const existingYear = extractYear(existing.date || existing.date_formatee);
        return existingYear && newEventYear && Math.abs(existingYear - newEventYear) <= 5;
    });

    if (candidatesNearDate.length === 0) {
        return { isDuplicate: false, reason: "Aucun événement dans la période temporelle" };
    }

    const normalizedNewTitle = normalizeTitle(newEvent.titre);
    const candidatesNearTitle = candidatesNearDate.filter(existing => {
        const normalizedExisting = normalizeTitle(existing.titre);
        const similarity = calculateSimilarity(normalizedNewTitle, normalizedExisting);
        return similarity > 0.3;
    });

    if (candidatesNearTitle.length === 0) {
        return { isDuplicate: false, reason: "Aucun titre similaire trouvé" };
    }

    const candidatesText = candidatesNearTitle.map((existing, index) =>
        `${index + 1}. "${existing.titre}" (${extractYear(existing.date || existing.date_formatee)}) - ${existing.description_detaillee || 'Pas de description'}`
    ).join('\n');

    const prompt = `Tu es un expert historien chargé de détecter les VRAIS doublons d'événements historiques.

NOUVEL ÉVÉNEMENT À ANALYSER :
- Titre: "${newEvent.titre}"
- Année: ${newEvent.year}
- Description: ${newEvent.description || 'Pas de description'}
- Type: ${newEvent.type || 'Non spécifié'}

ÉVÉNEMENTS EXISTANTS POTENTIELLEMENT SIMILAIRES :
${candidatesText}

MISSION CRITIQUE : Détermine s'il y a un VRAI doublon (même événement historique) parmi les existants.

RÈGLES DE DÉTECTION :
1. **DOUBLON CONFIRMÉ** si c'est EXACTEMENT le même événement historique (même fait, même date approximative)
2. **PAS DE DOUBLON** si ce sont des événements DIFFÉRENTS même s'ils sont liés
3. **TOLÉRANCE TEMPORELLE** : ±2 ans acceptable pour variations de datation historique

SOIS STRICT : Un vrai doublon = EXACTEMENT le même fait historique, pas juste la même période/thème.

FORMAT JSON OBLIGATOIRE :
{
  "isDuplicate": true/false,
  "duplicateTitle": "Titre de l'événement dupliqué si trouvé ou null",
  "confidence": "high|medium|low",
  "reason": "Explication détaillée de ta décision",
  "analysis": "Comparaison précise entre le nouvel événement et le(s) candidat(s)"
}

PRIORITÉ ABSOLUE : Éviter les faux positifs tout en détectant les vrais doublons.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.eventGeneration,
            maxOutputTokens: 600,
            temperature: 0.1,
            responseFormat: 'json'
        });

        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const analysis = JSON.parse(jsonText);
        return analysis;

    } catch (error) {
        return {
            isDuplicate: false,
            reason: `Erreur d'analyse Gemini: ${error.message}`,
            confidence: "low"
        };
    }
}

async function loadExistingTitles(startYear, endYear) {
    console.log("Chargement optimisé pour période demandée...");

    try {
        // Stratégie optimisée : charger seulement la zone étendue (±10 ans)
        const extendedStartYear = Math.max(startYear - 10, 0);
        const extendedEndYear = endYear + 10;

        console.log(`Chargement zone ${extendedStartYear}-${extendedEndYear} (au lieu de tout charger)`);

        // Chargement avec filtres optimisés par table
        const [gojuResult, eventsResult] = await Promise.all([
            // Table goju : date_formatee est Integer
            supabase.from('goju2')
                .select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
                .gte('date_formatee', extendedStartYear)
                .lte('date_formatee', extendedEndYear),
            // Table evenements : date_formatee est String, on filtre par extraction d'année
            supabase.from('evenements')
                .select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
        ]);

        // Filtrage manuel pour evenements (car date_formatee est string)
        const filteredEvents = (eventsResult.data || []).filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= extendedStartYear && eventYear <= extendedEndYear;
        });

        const extendedEvents = [
            ...(gojuResult.data || []),
            ...filteredEvents
        ];

        // Séparer les événements de la période exacte
        const periodEvents = extendedEvents.filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= startYear && eventYear <= endYear;
        });

        console.log(`📊 Période ${startYear}-${endYear}: ${periodEvents.length} événements`);
        console.log(`📊 Zone étendue ${extendedStartYear}-${extendedEndYear}: ${extendedEvents.length} événements (vs ~1000 avant)`);

        // Cache de détection basé sur la zone étendue
        const allNormalizedTitles = new Set();
        const allMappings = new Map();

        extendedEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            allNormalizedTitles.add(normalized);
            if (!allMappings.has(normalized)) {
                allMappings.set(normalized, []);
            }
            allMappings.get(normalized).push(event.titre);
        });

        // Données pour Gemini limitées à la zone étendue
        existingEventsData = extendedEvents.map(event => ({
            ...event,
            year: extractYear(event.date || event.date_formatee)
        }));

        existingNormalizedTitles = allNormalizedTitles;
        titleMappings = allMappings;

        console.log(`📊 Cache doublons: ${allNormalizedTitles.size} titres (optimisé vs 998 avant)`);

        // Diagnostic léger des conflits dans la zone
        const conflicts = [];
        const seen = new Map();
        extendedEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            if (seen.has(normalized)) {
                conflicts.push([normalized, seen.get(normalized), event.titre]);
            } else {
                seen.set(normalized, event.titre);
            }
        });

        if (conflicts.length > 0) {
            console.log(`⚠️  ${conflicts.length} conflit(s) dans zone étendue`);
            conflicts.slice(0, 2).forEach(([normalized, first, second]) => {
                console.log(`  "${normalized}" ← [${first}, ${second}]`);
            });
        }

        return {
            allNormalizedTitles,
            periodEvents: periodEvents.map(e => e.titre),
            loadedEventsCount: extendedEvents.length
        };

    } catch (error) {
        console.error("❌ Erreur chargement optimisé:", error.message);
        console.log("🔄 Fallback vers chargement complet...");

        // Fallback : chargement complet
        const [gojuResult, eventsResult] = await Promise.all([
            supabase.from('goju2').select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee'),
            supabase.from('evenements').select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
        ]);

        const allEvents = [
            ...(gojuResult.data || []),
            ...(eventsResult.data || [])
        ];

        const periodEvents = allEvents.filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= startYear && eventYear <= endYear;
        });

        const allNormalizedTitles = new Set();
        const allMappings = new Map();

        allEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            allNormalizedTitles.add(normalized);
            if (!allMappings.has(normalized)) {
                allMappings.set(normalized, []);
            }
            allMappings.get(normalized).push(event.titre);
        });

        existingEventsData = allEvents.map(event => ({
            ...event,
            year: extractYear(event.date || event.date_formatee)
        }));

        existingNormalizedTitles = allNormalizedTitles;
        titleMappings = allMappings;

        console.log(`📊 Fallback: ${allEvents.length} événements chargés, ${periodEvents.length} dans période`);

        return {
            allNormalizedTitles,
            periodEvents: periodEvents.map(e => e.titre),
            loadedEventsCount: allEvents.length
        };
    }
}

async function isDuplicate(titre, eventData = null) {
    // 1. VÉRIFICATION EXACTE par titre normalisé
    const normalized = normalizeTitle(titre);
    const exists = existingNormalizedTitles.has(normalized);

    if (exists) {
        const existingVersions = titleMappings.get(normalized) || [];
        // Log discret pour diagnostic
        if (process.env.DEBUG_DUPLICATES === 'true') {
            console.log(`❌ Doublon exact: "${titre}" -> "${normalized}"`);
            console.log(`   Versions existantes: [${existingVersions.slice(0, 2).join(', ')}]`);
        }
        return true;
    }

    // 2. VÉRIFICATION SIMILARITÉ AVANCÉE
    // Recherche de titres très similaires (même si pas exactement identiques)
    for (const existingNormalized of existingNormalizedTitles) {
        const similarity = calculateAdvancedSimilarity(normalized, existingNormalized);
        if (similarity > 0.85) { // Seuil de similarité élevé
            if (process.env.DEBUG_DUPLICATES === 'true') {
                console.log(`⚠️  Similarité élevée (${(similarity * 100).toFixed(0)}%): "${normalized}" ≈ "${existingNormalized}"`);
            }
            return true;
        }
    }

    // 3. VÉRIFICATION GEMINI FLASH (si données disponibles et pas de doublon évident)
    if (eventData) {
        const geminiAnalysis = await detectDuplicatesWithGemini(eventData, existingEventsData);
        if (geminiAnalysis.isDuplicate) {
            if (process.env.DEBUG_DUPLICATES === 'true') {
                console.log(`🤖 Doublon IA détecté: "${titre}"`);
                console.log(`   Raison: ${geminiAnalysis.reason}`);
            }
            return true;
        }
    }

    return false;
}

// Fonction de similarité améliorée
function calculateAdvancedSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;

    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Mots communs
    let commonWords = 0;
    words1.forEach(word1 => {
        if (words2.some(word2 =>
            word2.includes(word1) ||
            word1.includes(word2) ||
            levenshteinDistance(word1, word2) <= 1
        )) {
            commonWords++;
        }
    });

    // Score de Jaccard amélioré
    const jaccard = commonWords / Math.max(words1.length, words2.length);

    // Bonus si la longueur est similaire
    const lengthSimilarity = 1 - Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);

    return (jaccard * 0.7) + (lengthSimilarity * 0.3);
}

// Distance de Levenshtein simplifiée pour mots courts
function levenshteinDistance(str1, str2) {
    if (str1.length > 10 || str2.length > 10) return 999; // Éviter calculs lourds

    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

function addToCache(titre, eventData = null) {
    const normalized = normalizeTitle(titre);
    existingNormalizedTitles.add(normalized);

    if (!titleMappings.has(normalized)) {
        titleMappings.set(normalized, []);
    }
    titleMappings.get(normalized).push(titre);

    if (eventData) {
        existingEventsData.push({
            ...eventData,
            year: extractYear(eventData.date || eventData.date_formatee)
        });
    }
}

// Génération d'événements optimisée
async function generateEventBatchWithGemini(startYear, endYear, count, focusType = "mixed", attemptNumber = 1) {
    const periodExistingTitles = [];
    titleMappings.forEach((originals, normalized) => {
        originals.forEach(original => {
            const eventYear = extractYear(original);
            if (eventYear >= startYear && eventYear <= endYear) {
                periodExistingTitles.push(original);
            }
        });
    });

    const allExistingInPeriod = periodExistingTitles.join('", "');

    const focusPrompts = {
        france: {
            description: "événements de l'HISTOIRE DE FRANCE exclusivement",
            constraints: `
🇫🇷 FOCUS SPÉCIALISÉ HISTOIRE DE FRANCE :
- UNIQUEMENT des événements qui se sont déroulés EN FRANCE ou impliquant directement la France
- Rois de France, batailles françaises, révolutions françaises, politique française
- Constructions françaises, découvertes françaises, personnalités françaises
- Traités signés par la France, guerres françaises, réformes françaises
- Villes françaises, régions françaises, institutions françaises

🚫 INTERDICTIONS POUR FOCUS FRANCE :
- Événements purement étrangers sans lien direct avec la France
- Guerres sans participation française significative
- Découvertes/inventions non françaises
- Politique étrangère sans impact français

🎯 GÉOGRAPHIE : France métropolitaine, colonies françaises, territoires sous influence française`,
            regions: ["France", "Europe"],
            universalField: false
        },
        universal: {
            description: "événements UNIVERSELLEMENT CONNUS dans le monde entier",
            constraints: `
🌍 FOCUS SPÉCIALISÉ ÉVÉNEMENTS UNIVERSELS :
- Événements connus et enseignés DANS LE MONDE ENTIER
- Grandes découvertes, inventions majeures, révolutions mondiales
- Personnalités de renommée mondiale, œuvres universelles
- Catastrophes naturelles majeures, phénomènes astronomiques
- Traités internationaux majeurs, guerres mondiales
- Fondations de grandes civilisations, empires mondiaux

🎯 CRITÈRES UNIVERSALITÉ :
- Enseigné dans les manuels scolaires internationaux
- Impact sur plusieurs continents
- Connu par les populations éduquées globalement
- Importance historique reconnue mondialement

🌎 GÉOGRAPHIE : Diversité maximale (Asie, Afrique, Amérique, Europe, Océanie)`,
            regions: ["Asie", "Afrique", "Amérique", "Europe", "Océanie"],
            universalField: true
        },
        mixed: {
            description: "événements mixtes (France + Universels)",
            constraints: `
🌍🇫🇷 FOCUS MIXTE ÉQUILIBRÉ :
- 50% événements d'histoire de France
- 50% événements universellement connus
- Diversité géographique et thématique
- Équilibre entre local français et global mondial`,
            regions: ["France", "Europe", "Asie", "Afrique", "Amérique"],
            universalField: "mixed"
        }
    };

    const currentFocus = focusPrompts[focusType] || focusPrompts.mixed;
    const availableTypes = getTypesForFocus(focusType);
    const typesString = availableTypes.join('|');

    const promptVariations = {
        france: [
            "batailles et guerres de France",
            "rois et reines de France",
            "révolutions et réformes françaises",
            "constructions et monuments français",
            "traités et alliances de la France",
            "découvertes et inventions françaises",
            "fondations de villes françaises",
            "personnalités politiques françaises",
            "mouvements artistiques français",
            "institutions françaises",
            "explorations françaises",
            "réformes religieuses en France",
            "développements économiques français",
            "innovations techniques françaises",
            "événements juridiques français",
            "sports et compétitions françaises",
            "art et culture française",
            "gastronomie et traditions françaises",
            "mode et design français",
            "littérature et théâtre français"
        ],
        universal: [
            "grandes découvertes mondiales documentées",
            "inventions révolutionnaires universelles",
            "empires et civilisations majeures",
            "catastrophes naturelles historiques",
            "traités internationaux majeurs",
            "guerres mondiales et conflits globaux",
            "personnalités de renommée mondiale",
            "révolutions qui ont changé le monde",
            "fondations de grandes religions",
            "explorations géographiques majeures",
            "innovations scientifiques universelles",
            "phénomènes astronomiques historiques",
            "fondations de grandes universités",
            "mouvements artistiques mondiaux",
            "développements commerciaux globaux",
            "jeux olympiques et sports internationaux",
            "épidémies et pandémies historiques",
            "inventions médicales révolutionnaires",
            "découvertes archéologiques majeures",
            "événements culturels universels",
            "innovations en transport et communication",
            "mouvements sociaux mondiaux",
            "créations artistiques emblématiques",
            "révolutions technologiques",
            "événements astronomiques historiques"
        ],
        mixed: [
            "événements historiques majeurs France et monde",
            "personnalités françaises et mondiales",
            "découvertes françaises et inventions universelles",
            "batailles françaises et conflits mondiaux",
            "constructions françaises et monuments universels",
            "sports français et compétitions internationales",
            "art français et mouvements artistiques mondiaux",
            "innovations françaises et révolutions technologiques",
            "traditions françaises et coutumes mondiales",
            "littérature française et œuvres universelles"
        ]
    };

    const focusArea = promptVariations[focusType][attemptNumber % promptVariations[focusType].length];

    const prompt = `Tu es un historien expert reconnu. Génère EXACTEMENT ${count} événements historiques DOCUMENTÉS et VÉRIFIABLES entre ${startYear}-${endYear}.

🚫 ÉVÉNEMENTS STRICTEMENT INTERDITS (TOUS ceux de la période ${startYear}-${endYear}) :
"${allExistingInPeriod}"

${currentFocus.constraints}

🎯 FOCUS SPÉCIALISÉ : ${focusArea}

🔧 STRATÉGIE ANTI-DOUBLONS : Privilégie des événements MOINS CONNUS mais historiquement vérifiables.

RÈGLES CRITIQUES :
1. DATES EXACTES obligatoires - VÉRIFIE CHAQUE DATE avec précision absolue
2. ÉVÉNEMENTS DOCUMENTÉS uniquement - Sources historiques vérifiables
3. ZÉRO DOUBLON avec les ${periodExistingTitles.length} événements interdits ci-dessus
4. RESPECT ABSOLU DU FOCUS ${focusType.toUpperCase()}
5. TITRES précis (max 60 caractères) SANS l'année

CONSIGNE QUALITÉ :
- Privilégie des événements MOINS connus mais historiquement importants
- ${focusType === 'france' ? 'UNIQUEMENT France/territoires français' : focusType === 'universal' ? 'DIVERSITÉ GÉOGRAPHIQUE MAXIMALE' : 'ÉQUILIBRE France/Monde'}
- Assure-toi de la précision des dates (±0 tolérance d'erreur)
- Évite les "grands classiques" probablement déjà pris

FORMAT JSON STRICT :
{
  "events": [
    {
      "year": number (année exacte vérifiée),
      "titre": "Titre factuel précis SANS année",
      "description": "Contexte historique bref", 
      "type": "${typesString}",
      "region": "${currentFocus.regions.join('|')}",
      "specificLocation": "Pays/région précise",
      "confidence": "high|medium" (niveau de certitude historique),
      "focusType": "${focusType}",
      "universel": ${currentFocus.universalField}
    }
  ]
}

PRIORITÉ ABSOLUE : Précision historique + RESPECT DU FOCUS ${focusType.toUpperCase()} + ZÉRO ressemblance avec les ${periodExistingTitles.length} événements interdits.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.eventGeneration,
            maxOutputTokens: 2200,
            temperature: 0.25,
            responseFormat: 'json'
        });

        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const batchData = JSON.parse(jsonText);

        if (!batchData.events || !Array.isArray(batchData.events)) {
            if (attemptNumber < 3) {
                return await generateEventBatchWithGemini(startYear, endYear, count, focusType, attemptNumber + 1);
            }
            return [];
        }

        const validEvents = [];
        const rejectedEvents = [];

        for (const event of batchData.events) {
            const numericYear = parseInt(event.year, 10);
            if (!Number.isFinite(numericYear) || numericYear <= 0) {
                rejectedEvents.push({ event: event.titre, reason: 'Année invalide (<= 0)' });
                continue;
            }

            event.year = numericYear;

            if (!event.titre || !event.year || event.titre.length >= 100) {
                rejectedEvents.push({ event: event.titre, reason: 'Format invalide' });
                continue;
            }

            if (!event.titre.match(/^[a-zA-Z0-9\s\-àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ'():.,]+$/) || event.titre.includes('undefined')) {
                rejectedEvents.push({ event: event.titre, reason: 'Caractères invalides' });
                continue;
            }

            if (focusType === 'france' && event.region && !['France', 'Europe'].includes(event.region)) {
                rejectedEvents.push({ event: event.titre, reason: 'Pas conforme au focus France' });
                continue;
            }

            if (focusType === 'universal' && event.region && event.region === 'France') {
                rejectedEvents.push({ event: event.titre, reason: 'Trop spécifique France pour focus universel' });
                continue;
            }

            const sanitizedEvent = {
                titre: event.titre,
                year: numericYear,
                date: `${numericYear}-01-01`,
                type: event.type,
                region: event.region,
                specificLocation: event.specificLocation,
                description: event.description
            };

            if (await isDuplicate(event.titre, sanitizedEvent)) {
                rejectedEvents.push({ event: event.titre, reason: 'Doublon détecté' });
                continue;
            }

            validEvents.push({ ...event, year: numericYear });
        }

        return validEvents;

    } catch (error) {
        if (attemptNumber < 3) {
            return await generateEventBatchWithGemini(startYear, endYear, count, focusType, attemptNumber + 1);
        }
        return [];
    }
}

// Vérification historique optimisée
async function verifyEventBatchWithGemini(events) {
    const eventsText = events.map(e => `"${e.titre}" (${e.year})`).join('\n');

    const prompt = `Tu es un historien expert. VÉRIFIE RIGOUREUSEMENT ces événements historiques :

${eventsText}

Pour chaque événement, VALIDE :
1. EXISTENCE dans l'histoire documentée (sources primaires/secondaires)
2. DATE EXACTE (tolérance ±1 an maximum) - VÉRIFIE CHAQUE DATE avec précision absolue
3. TITRE cohérent avec les faits historiques

SOIS STRICT sur la précision factuelle. En cas de doute, REJETTE.

FORMAT JSON REQUIS :
{
  "validations": [
    {
      "titre": "titre exact",
      "isValid": true/false,
      "dateCorrect": true/false,
      "reason": "explication détaillée si rejeté",
      "confidence": "high|medium|low"
    }
  ]
}

PRIORITÉ : Précision historique absolue avec dates vérifiées.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.historicalVerification,
            maxOutputTokens: 1000,
            temperature: 0.1,
            responseFormat: 'json'
        });

        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const verification = JSON.parse(jsonText);

        const validEvents = [];
        const invalidEvents = [];

        events.forEach((event, index) => {
            const validation = verification.validations?.[index];
            if (validation && validation.isValid && validation.dateCorrect) {
                validEvents.push(event);
            } else {
                invalidEvents.push({ event, reason: validation?.reason || 'Non vérifié par Gemini' });
            }
        });

        return { validEvents, invalidEvents };

    } catch (error) {
        return { validEvents: events, invalidEvents: [] };
    }
}

// Enrichissement contextuel robuste - GÉNÉRATION EN ANGLAIS POUR FLUX
// OPTIMISÉ: Prompts courts (<150 mots total) pour éviter le "Prompt Drifting" sur Flux-Schnell
async function enrichEventWithGemini(event, attemptNumber = 1) {
    const background = event.description ? `BACKGROUND: ${event.description}` : '';
    const prompt = `You are an expert historian. Provide CONCISE visual elements for this event:

EVENT: "${event.titre}" (${event.year})
TYPE: ${event.type}
REGION: ${event.region}
${background}

MISSION: Generate SHORT, precise visual elements for Flux-schnell (max 150 words TOTAL).
CRITICAL: NO water/ships/sails unless the event is explicitly maritime. NO windows/sky for interiors.

REQUIRED JSON FORMAT (ALL TEXT IN ENGLISH):
{
  "contextHistorique": "1 sentence max (15-20 words)",
  "elementsVisuelsEssentiels": [
    "3 ESSENTIAL visual elements ONLY (max 10 words each)",
    "Example Strategy: Focus on specific tools, clothing fabrics, or floor textures.",
    "Example: 'Flickering candles on a rough oak table'"
  ],
  "sceneIdeale": "Main scene in 1 sentence (15-20 words max)",
  "motsClesVisuels": ["4-5 SHORT visual keywords"],
  "atmosphere": "1-2 words (e.g. 'dramatic', 'ceremonial')",
  "periodeSpecifique": "Brief temporal context (5-10 words)"
}

CRITICAL: Keep it SHORT and VISUAL. Absolute historical accuracy for ${event.year}. No anachronisms. ALL text in ENGLISH.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.contextEnrichment,
            maxOutputTokens: 600,
            temperature: 0.3,
            responseFormat: 'json'
        });

        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const enrichedData = JSON.parse(jsonText);

        return {
            ...event,
            enrichissement: enrichedData
        };

    } catch (error) {
        if (error.message.includes('Connection error') && attemptNumber < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await enrichEventWithGemini(event, attemptNumber + 1);
        }

        return {
            ...event,
            enrichissement: {
                contextHistorique: `Historical event from ${event.year}`,
                elementsVisuelsEssentiels: [`${event.type} scene`, `Period clothing ${event.year}`, "Period architecture"],
                sceneIdeale: `Representation of ${event.titre}`,
                motsClesVisuels: ["historical", "period", "scene"],
                atmosphere: "historical",
                periodeSpecifique: event.year.toString()
            }
        };
    }
}

// Génération prompts optimisée pour Flux-schnell
function countWords(text) {
    return text.trim().split(/\s+/).length;
}

function optimizePromptIntelligently(prompt) {
    const yearMatch = prompt.match(/\b(1\d{3}|20\d{2})\b/);

    let optimized = prompt
        .replace(/historical accuracy/gi, 'historical')
        .replace(/photorealistic/gi, 'realistic')
        .replace(/dramatic scene/gi, 'dramatic')
        .replace(/\s+/g, ' ')
        .replace(/,\s*/g, ', ')
        .replace(/\.\s*/g, '. ')
        .trim();

    if (yearMatch && !optimized.includes(yearMatch[0])) {
        optimized = `${optimized}, ${yearMatch[0]}`;
    }

    return optimized;
}

// ==============================================================================
// GÉNÉRATION DE PROMPTS AVEC SYSTÈME DE STYLES DIVERSIFIÉS
// ==============================================================================

// Build a robust deterministic prompt from our "Colisée" event JSON fields.
// event shape: { titre, year, type, lieu, roles[], objets[], action, scene, specificLocation, enrichissement: { elementsVisuelsEssentiels[], negatifsSouhaites[] } }
// OPTIMISÉ avec Style Blocks pour éviter redondance et améliorer cohérence (recommandation Gemini)
export function buildDeterministicPrompt(ev) {
    const essentials = Array.isArray(ev?.enrichissement?.elementsVisuelsEssentiels) ? ev.enrichissement.elementsVisuelsEssentiels.join('; ') : '';
    const negatives = Array.isArray(ev?.enrichissement?.negatifsSouhaites) ? ev.enrichissement.negatifsSouhaites.join('; ') : '';
    const roles = Array.isArray(ev?.roles) ? ev.roles.join(', ') : '';
    const objets = Array.isArray(ev?.objets) ? ev.objets.join(', ') : '';
    const background = ev.description || ev.sceneDescription || '';

    // STYLE BLOCK par époque (réduit la verbosité du prompt)
    const styleBlock = getStyleBlock(ev.year);

    // Détection de contexte romain pour forcer l'architecture
    const isRoman = (ev.lieu && ev.lieu.toLowerCase().includes('rome')) ||
        (ev.titre && ev.titre.toLowerCase().includes('romain')) ||
        (ev.titre && ev.titre.toLowerCase().includes('rome'));

    let architecturalContext = "";
    if (isRoman && ev.year < 500) {
        architecturalContext = "Ancient Roman architecture, stone buildings, roman columns, latin inscriptions, no asian roofs, no pagodas.";
    }

    return [
        `${ev.year}, historical ${ev.type || 'scene'}.`,
        `STYLE: ${styleBlock}`,
        `CONTEXT: ${background}`,
        `MUST DEPICT: ${ev.specificLocation || ev.lieu || ''}.`,
        architecturalContext ? `ARCHITECTURE: ${architecturalContext}` : '',
        objets ? `OBJECTS: ${objets}.` : '',
        `SCENE: ${ev.scene || ''}. ACTION: ${ev.action || ''}. ROLES: ${roles || ''}.`,
        essentials ? `ESSENTIALS: ${essentials}.` : '',
        `NEGATIVES: no modern objects, no text or numbers, no anachronistic architecture or clothing${negatives ? `; ${negatives}` : ''}.`
    ].filter(Boolean).join(' ');
}

// Provider shims producing plain prompt strings
async function _genClaude(event, attemptNumber = 1) {
    const res = await generateOptimizedFluxPromptWithClaude(event, attemptNumber);
    if (!res) return '';
    if (typeof res === 'string') return res;
    return String(res.prompt || res.optimizedPrompt || '').trim();
}
async function _genGemini(event, attemptNumber = 1) {
    const res = await generateOptimizedFluxPromptWithGemini(event, attemptNumber);
    if (!res) return '';
    if (typeof res === 'string') return res;
    return String(res.prompt || res.optimizedPrompt || '').trim();
}

// Unified orchestrator with timeout + retry and deterministic fallback
async function generateOptimizedFluxPrompt(event, attemptNumber = 1) {
    try {
        const pGemini = () => withPromptTimeout(_genGemini(event, attemptNumber), PROMPT_TIMEOUT_MS, 'generateOptimizedFluxPromptWithGemini');
        const gemini = await retryWithBackoff(pGemini, { retries: PROMPT_RETRIES, baseDelay: PROMPT_BACKOFF_BASE_MS, factor: PROMPT_BACKOFF_FACTOR, label: 'Gemini' });
        if (gemini && gemini.trim()) {
            console.log('[PROMPT] Using Gemini prompt');
            return gemini.trim();
        }
    } catch (e) {
        console.warn(`[PROMPT][WARN] Gemini failed: ${e.message}`);
    }

    try {
        const pGemini = () => withPromptTimeout(_genGemini(event, attemptNumber), PROMPT_TIMEOUT_MS, 'generateOptimizedFluxPromptWithGemini');
        const gemini = await retryWithBackoff(pGemini, { retries: PROMPT_RETRIES, baseDelay: PROMPT_BACKOFF_BASE_MS, factor: PROMPT_BACKOFF_FACTOR, label: 'Gemini' });
        if (gemini && gemini.trim()) {
            console.log('[PROMPT] Using Gemini prompt');
            return gemini.trim();
        }
        console.warn('[PROMPT][WARN] Gemini prompt empty — using deterministic fallback');
    } catch (e) {
        console.warn(`[PROMPT][WARN] Gemini failed: ${e.message} — using deterministic fallback`);
    }

    const local = buildDeterministicPrompt(event);
    console.log('[PROMPT] Using deterministic fallback prompt');
    return local;
}

// Génération d'une description de scène concise via Claude
async function buildSceneDescription(title, year, type, era) {
    // Instructions détaillées pour TOUS les types d'anachronismes selon l'époque

    // 1. ARMES selon l'époque
    const weaponsGuidance = year < 1800
        ? `ARMES ${year}: Exclusively period-appropriate weapons - muskets, flintlocks, swords, pikes, arquebuses. NO modern rifles, NO automatic weapons, NO 20th century military equipment.`
        : year < 1900
            ? `ARMES ${year}: Only 19th century weapons - muzzle-loading rifles, early cartridge rifles, bayonets. NO automatic weapons, NO modern military gear.`
            : year < 1945
                ? `ARMES ${year}: Early 20th century weapons only - bolt-action rifles, early machine guns. NO contemporary tactical equipment.`
                : `ARMES ${year}: Period-appropriate weapons for ${year}.`;

    // 2. BÂTIMENTS selon l'époque
    const buildingsGuidance = year < 1850
        ? `BÂTIMENTS ${year}: Only traditional architecture (stone, wood, brick). NO steel structures, NO Tour Eiffel (built 1889), NO skyscrapers.`
        : year < 1900
            ? `BÂTIMENTS ${year}: 19th century architecture. NO modern buildings, NO Tour Eiffel before 1889, NO contemporary glass/steel structures.`
            : `BÂTIMENTS ${year}: Period-appropriate architecture for ${year}. Check that famous monuments existed at this date.`;

    // 3. VÉHICULES selon l'époque
    const vehiclesGuidance = year < 1830
        ? `TRANSPORT ${year}: ONLY horses, carriages. NO trains, NO cars, NO planes. NO sailing ships unless explicitly stated.`
        : year < 1886
            ? `TRANSPORT ${year}: Horses, carriages, steam trains OK. NO automobiles (invented 1886), NO planes.`
            : year < 1903
                ? `TRANSPORT ${year}: Horses, trains, early cars OK. NO airplanes (first flight 1903).`
                : `TRANSPORT ${year}: Period-appropriate vehicles for ${year}.`;

    // 4. OBJETS DU QUOTIDIEN selon l'époque
    const objectsGuidance = year < 1900
        ? `OBJETS ${year}: Only period furniture, tools, utensils. NO plastic (invented ~1950), NO modern appliances, NO electric devices before their invention.`
        : `OBJETS ${year}: Period-appropriate everyday objects for ${year}. NO anachronistic technology.`;

    const militaryNote = (type === 'Guerre' || title.toLowerCase().includes('bataille') || title.toLowerCase().includes('guerre'))
        ? `\nCRITICAL: This is a military event. ${weaponsGuidance} Describe military uniforms specific to ${year} (tricorn hats for 1700s, shakos for 1800s, etc.). Be extremely precise about period military equipment.`
        : '';

    const anachronismWarning = `\nSTRICT ANACHRONISM RULES for ${year}:\n${buildingsGuidance}\n${vehiclesGuidance}\n${objectsGuidance}\nAbsolutely NO objects, buildings, or vehicles that did not exist in ${year}.`;

    const sys = `Write a concise, neutral scene description (2–3 sentences) of the historical event:\n- Title: ${title}\n- Year: ${year}\n- Era: ${era}\n- Type: ${type}\nMention plausible setting, clothing specific to ${year}, and objects/tools appropriate for ${year}. No anachronisms or real people's names.${militaryNote}${anachronismWarning}`;
    try {
        const out = await callClaude(sys, { model: AI_CONFIG.promptGeneration, maxTokens: 120, temperature: 0.2 });
        const text = String(out || '').trim();
        return text.length > 10 ? text : String(title || '').trim();
    } catch (_) {
        return String(title || '').trim();
    }
}

// Intégration dans le processus principal
// ============================================================================
// SYSTÈME DE STYLES DÉSACTIVÉ - Utilisation du fallback simple
// ============================================================================
async function integrateStyleSystemInProcess(enrichedEvent, attemptNumber = 1) {
    // Fallback simple sans système de styles
    const epoch = eraBucket(enrichedEvent.year);
    const type = classifyType(enrichedEvent);
    const mustList = pickOptionalMDP(type, epoch, 2) || [];

    const safeEnrichment = {
        ...(enrichedEvent.enrichissement || {}),
        elementsVisuelsEssentiels: Array.isArray(enrichedEvent.enrichissement?.elementsVisuelsEssentiels)
            ? enrichedEvent.enrichissement.elementsVisuelsEssentiels
            : [],
        negatifsSouhaites: Array.isArray(enrichedEvent.enrichissement?.negatifsSouhaites)
            ? enrichedEvent.enrichissement.negatifsSouhaites
            : []
    };

    const safeEvent = { ...enrichedEvent, enrichissement: safeEnrichment };
    const fallbackPrompt = buildDeterministicPrompt(safeEvent);

    const promptResult = {
        prompt: fallbackPrompt,
        styleInfo: {
            category: 'photographic',
            name: 'no_style',
            description: 'Simple realistic historical scene (no style system)',
            enhancers: [],
            composition: [],
            contextualNotes: []
        },
        mustDepictList: mustList
    };

    console.log(`🎨 Style: DÉSACTIVÉ (utilisation du prompt déterministe)`);

    return {
        optimizedPrompt: promptResult.prompt,
        styleInfo: promptResult.styleInfo,
        mustDepictList: promptResult.mustDepictList || []
    };
}

/*
// ============================================================================
// ANCIENNE VERSION AVEC SYSTÈME DE STYLES (COMMENTÉE)
// ============================================================================
async function integrateStyleSystemInProcess_OLD(enrichedEvent, attemptNumber = 1) {
    // Sélection du style
    const selectedStyle = selectStyleForEvent(enrichedEvent);
    let promptResult;
    let fallbackUsed = false;

    try {
        // Génération du prompt avec style (limite stricte pour éviter les blocages)
        promptResult = await withTimeout(
            generateEnhancedPromptWithStyle(enrichedEvent, selectedStyle, attemptNumber),
            25000,
            'generateEnhancedPromptWithStyle'
        );
    } catch (error) {
        fallbackUsed = true;
        console.warn(`⚠️ [STYLE] Fallback pour "${enrichedEvent.titre}" → ${error.message}`);

        const safeEnrichment = {
            ...(enrichedEvent.enrichissement || {}),
            elementsVisuelsEssentiels: Array.isArray(enrichedEvent.enrichissement?.elementsVisuelsEssentiels)
                ? enrichedEvent.enrichissement.elementsVisuelsEssentiels
                : [],
            negatifsSouhaites: Array.isArray(enrichedEvent.enrichissement?.negatifsSouhaites)
                ? enrichedEvent.enrichissement.negatifsSouhaites
                : []
        };

        const safeEvent = { ...enrichedEvent, enrichissement: safeEnrichment };
        const fallbackPrompt = buildDeterministicPrompt(safeEvent);
        const epoch = eraBucket(enrichedEvent.year);
        const type = classifyType(enrichedEvent);
        const mustList = pickOptionalMDP(type, epoch, 2) || [];

        promptResult = {
            prompt: fallbackPrompt,
            styleInfo: {
                category: selectedStyle.category,
                name: selectedStyle.name,
                description: `${selectedStyle.style.description} (fallback)`,
                enhancers: selectedStyle.style.enhancers,
                composition: selectedStyle.style.composition,
                contextualNotes: selectedStyle.style.contextualNotes || []
            },
            mustDepictList: mustList
        };
    }

    console.log(`🎨 Style: ${selectedStyle.name} (${selectedStyle.category}) - ${selectedStyle.style.description}${fallbackUsed ? ' [fallback]' : ''}`);

    return {
        optimizedPrompt: promptResult.prompt,
        styleInfo: promptResult.styleInfo,
        mustDepictList: promptResult.mustDepictList || []
    };
}
*/

// Génération du prompt avec style sélectionné
async function generateEnhancedPromptWithStyle(enrichedEvent, selectedStyle, attemptNumber = 1) {
    const epoch = eraBucket(enrichedEvent.year);
    const eraLabel = mapEraLabel(enrichedEvent.year);

    const enr = enrichedEvent.enrichissement || {};
    const ess = Array.isArray(enr.elementsVisuelsEssentiels) ? enr.elementsVisuelsEssentiels.slice(0, 3).join(', ') : '';

    // Construction du prompt avec style sélectionné
    const type = classifyType(enrichedEvent);
    const scene = await buildSceneDescription(enrichedEvent.titre, enrichedEvent.year, epoch, type);
    // Conserver la description de scène pour l'enregistrement DB
    enrichedEvent.sceneDescription = scene;
    const kw = keywordsFromTitle(enrichedEvent.titre || '');
    const optionalMdp = pickOptionalMDP(type, epoch, 2);
    const mustList = Array.isArray(optionalMdp) ? optionalMdp : [];
    const kwPair = randPick(kw, 2).join(', ');
    let elementsLine = '';
    if (kwPair) elementsLine += kwPair;
    if (mustList.length) elementsLine = elementsLine ? `${elementsLine}, ${mustList.slice(0, 2).join(', ')}` : mustList.slice(0, 2).join(', ');
    const mustPhrase = elementsLine ? ` Suggested elements: ${elementsLine}.` : '';
    // Contexte lieu automatique (villes simples)
    const city = detectCity(enrichedEvent.titre || '');
    const urbanHint = city ? ` Urban setting hint: ${city} square/street/council hall (no modern signage).` : '';
    // Formulation positive et concise (Flux ne comprend pas bien les négatifs)
    const year = parseInt(enrichedEvent.year, 10);

    // Ajout contexte temporel positif
    let periodContext = '';
    if (year < 1800) {
        periodContext = ' Period-accurate 18th century setting with historical authenticity.';
    } else if (year < 1900) {
        periodContext = ' Authentic 19th century historical scene with period details.';
    } else if (year < 1950) {
        periodContext = ' Early 20th century historical setting.';
    }

    let finalPrompt = `${scene}.${mustPhrase}${periodContext}${urbanHint}`;
    if (!finalPrompt.trim()) {
        // Prompt vide: régénérer une description minimale
        const retryDesc = await buildSceneDescription(enrichedEvent.titre, enrichedEvent.year, enrichedEvent.type, epoch);
        finalPrompt = retryDesc || String(enrichedEvent.titre || '').trim();
    }

    // Optimisation longueur
    if (countWords(finalPrompt) > FLUX_SCHNELL_LIMITS.TARGET_WORDS) {
        finalPrompt = optimizePromptIntelligently(finalPrompt);

        // S'assurer que les éléments critiques restent
        if (!finalPrompt.includes(enrichedEvent.year.toString())) {
            finalPrompt = `${finalPrompt}, ${enrichedEvent.year}`;
        }
        if (!finalPrompt.toLowerCase().includes(eraLabel.toLowerCase())) {
            finalPrompt = `${finalPrompt}, ${eraLabel}`;
        }
    }

    return {
        prompt: finalPrompt,
        styleInfo: {
            category: selectedStyle.category,
            name: selectedStyle.name,
            description: selectedStyle.style.description,
            enhancers: selectedStyle.style.enhancers,
            composition: selectedStyle.style.composition,
            contextualNotes: selectedStyle.style.contextualNotes || []
        },
        mustDepictList: mustList
    };
}

// Sélection MUST DEPICT par événement (3 max: location, object, action)
function pickMustDepictForEvent(ev, bank) {
    const type = classifyType(ev);
    const era = eraBucket(ev.year);
    const byType = bank?.byType?.[type] || {};
    const byEra = bank?.byEra?.[era] || {};
    const candLocations = _uniqKeepOrder([...(byType.locations || []), ...(byEra.locations || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));
    const candActions = _uniqKeepOrder([...(byType.actions || []), ...(byEra.actions || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));
    const candObjects = _uniqKeepOrder([...(byType.objects || []), ...(byEra.objects || [])]).filter(x => !_isGeneric(x) && !_isBannedByContext(x, type, era));

    // Extract simple keywords from title/description (english-ish)
    const text = [ev.titre, ev.description_detaillee].filter(Boolean).join(' ');
    const tokens = _uniqKeepOrder(_normalizeWithSynonyms(text).split(' ').filter(w => w && w.length > 2)).slice(0, 25);
    const tokSet = new Set(tokens);
    const themas = buildThematicKeywords(ev.titre || '');
    const kwSet = new Set(themas.map(_normalizeWithSynonyms));
    const scoreItem = (s) => {
        const n = _normalizeWithSynonyms(s);
        const words = n.split(' ').filter(Boolean);
        const hitTok = words.some(w => tokSet.has(w)) ? 1 : 0;
        const hitKw = words.some(w => kwSet.has(w)) ? 2 : 0; // weight ×3 total when both
        return hitTok + hitKw;
    };

    const locHit = candLocations.map(s => ({ s, score: scoreItem(s) })).sort((a, b) => b.score - a.score);
    const objHit = candObjects.map(s => ({ s, score: scoreItem(s) })).sort((a, b) => b.score - a.score);
    const actHit = candActions.map(s => ({ s, score: scoreItem(s) })).sort((a, b) => b.score - a.score);

    let location = locHit.find(x => x.score > 0)?.s || locHit[0]?.s || '';
    let object = objHit.find(x => x.score > 0)?.s || objHit[0]?.s || '';
    let action = actHit.find(x => x.score > 0)?.s || actHit[0]?.s || '';

    // Deathbed priority
    const txt = _normalizeText([ev.titre, ev.description_detaillee].filter(Boolean).join(' '));
    if (/(mort|death|agonie|last\s+rites|extreme\s*onction|extr[eé]me[-\s]?onction|viaticum)/.test(txt)) {
        location = location || 'deathbed scene';
        action = action || 'priest giving last rites';
        object = object || 'chalice';
    }

    // Normalize to 2–3 words
    const trim23 = (s) => { if (!s) return ''; const parts = s.split(/\s+/).slice(0, 3); return parts.join(' '); };
    const pick = _uniqKeepOrder([location, object, action].filter(Boolean)).slice(0, 3).map(trim23);
    return pick;
}

// Version optimisée avec Claude + système de styles
async function generateOptimizedFluxPromptWithClaude(enrichedEvent, attemptNumber = 1) {
    // Utilisation du nouveau système de styles
    const styleResult = await integrateStyleSystemInProcess(enrichedEvent, attemptNumber);

    // Désactive le toggle créatif pour forcer Claude
    const needsCreativeBoost = false;

    // Toujours passer par Claude pour un prompt de qualité
    if (needsCreativeBoost) {
        const enrichissement = enrichedEvent.enrichissement;
        const epoch = enrichedEvent.year < 476 ? 'ancient' :
            enrichedEvent.year < 1492 ? 'medieval' :
                enrichedEvent.year < 1789 ? 'renaissance' :
                    enrichedEvent.year < 1914 ? 'industrial' : 'modern';

        const mdpSample = Array.isArray(styleResult.mustDepictList) ? styleResult.mustDepictList : [];
        const description_detaillee = enrichedEvent.sceneDescription || enrichedEvent.enrichissement?.contextHistorique || enrichedEvent.description || '';
        const promptForClaude = `\nTitle: ${enrichedEvent.titre}\nYear: ${enrichedEvent.year} | Era: ${epoch} | Type: ${enrichedEvent.type}\nBackground (if any): ${description_detaillee || 'N/A'}\nOptional visual hints: ${mdpSample?.join(', ') || 'N/A'}\nTASK: Write a concise scene prompt (<= 70 words) in English that evokes this historical event.\nInclude plausible setting, clothing, tools; avoid anachronisms.\nIMPORTANT: DO NOT mention names of specific real persons (generals, kings, etc.). HOWEVER, YOU MAY and SHOULD use names of specific military units, factions, or ethnic groups (e.g., "French Imperial Guard", "Roman X Legion", "Russian Imperial Army", "Spartan hoplites") to ensure visual accuracy.\nReturn ONLY the prompt text, no markup.`;

        try {
            const eraForLog = epoch;
            const description_detaillee = enrichedEvent.sceneDescription || enrichedEvent.enrichissement?.contextHistorique || enrichedEvent.description || '';
            console.log('[CLAUDE][IN]', { title: enrichedEvent.titre, year: enrichedEvent.year, era: eraForLog, type: enrichedEvent.type, description: description_detaillee?.slice(0, 240) });
            const claudePrompt = await callClaude(promptForClaude, {
                model: AI_CONFIG.promptGeneration,
                maxTokens: 150,
                temperature: 0.8
            });
            console.log('[CLAUDE][RAW]', JSON.stringify(claudePrompt).slice(0, 400));

            let cleanPrompt = claudePrompt.trim().replace(/^["']|["']$/g, '');

            if (!cleanPrompt) {
                const eraLabel = (enrichedEvent.year >= 1600 && enrichedEvent.year < 1800) ? 'early modern period'
                    : (enrichedEvent.year >= 1500 && enrichedEvent.year < 1600) ? 'Renaissance'
                        : (enrichedEvent.year < 1500) ? 'medieval period'
                            : (enrichedEvent.year < 1900) ? 'industrial era' : 'modern era';
                const base = description_detaillee
                    ? `Scene of "${enrichedEvent.titre}" (${enrichedEvent.year}), ${eraLabel}. ${description_detaillee}`
                    : `Scene of "${enrichedEvent.titre}" (${enrichedEvent.year}), ${eraLabel}.`;
                const suggested = mdpSample?.length ? ` Suggested elements: ${mdpSample.slice(0, 2).join(', ')}.` : '';
                cleanPrompt = `${base} Accurate period clothing, historically plausible setting, no modern objects.${suggested}`;
            }
            // Negative doux si non guerre
            if (classifyType(enrichedEvent) !== 'war') {
                cleanPrompt = `${cleanPrompt} Avoid soldiers, muskets, battle formations.`;
            }

            return {
                prompt: cleanPrompt,
                styleInfo: styleResult.styleInfo
            };

        } catch (error) {
            console.warn('[CLAUDE][ERR]', error.message);
            throw error;
        }
    }

    return styleResult;
}

// Version optimisée avec Gemini (fallback) + système de styles
// Returns a prompt string or null. Mirrors Claude logic and params (maxTokens/temperature)
async function generateOptimizedFluxPromptWithGemini(enrichedEvent, attemptNumber = 1) {
    // Utilisation du système de styles (même que Claude)
    const styleResult = await integrateStyleSystemInProcess(enrichedEvent, attemptNumber);

    const needsCreativeBoost = false;

    // Fallback Gemini si besoin d'amélioration créative
    if (needsCreativeBoost) {
        const epoch = enrichedEvent.year < 476 ? 'ancient' :
            enrichedEvent.year < 1492 ? 'medieval' :
                enrichedEvent.year < 1789 ? 'renaissance' :
                    enrichedEvent.year < 1914 ? 'industrial' : 'modern';

        const mdpSample = Array.isArray(styleResult.mustDepictList) ? styleResult.mustDepictList : [];
        const description_detaillee = enrichedEvent.sceneDescription || enrichedEvent.enrichissement?.contextHistorique || enrichedEvent.description || '';
        const promptForGemini = `
Title: ${enrichedEvent.titre}
Year: ${enrichedEvent.year} | Era: ${epoch} | Type: ${enrichedEvent.type}
Background (if any): ${description_detaillee || 'N/A'}
Optional visual hints: ${mdpSample?.join(', ') || 'N/A'}

TASK: Write a concise scene prompt (<= 75 words) in English that evokes this historical event.

${HISTORICAL_PRECISION_RULES}

IMPORTANT: 
- VISUAL STORYTELLING: Do NOT describe a static portrait. Describe an ACTION sequence with contextual objects (mailbags for post, tools for inventions, maps for exploration) that makes the event immediately recognizable without text.
- DO NOT mention names of specific real persons (generals, kings, etc.).
- STRICT COLOR ACCURACY: French/Grand Armée=DARK BLUE/WHITE; Russian=WHITE/DARK GREEN; Austrian=WHITE; British=RED; Prussian=DARK BLUE.
- YOU MAY and SHOULD use names of specific military units or ethnic groups.

Return ONLY the prompt text, no markup.`;

        try {
            console.log('[GEMINI][IN]', { title: enrichedEvent.titre, year: enrichedEvent.year, era: epoch, type: enrichedEvent.type, description: description_detaillee?.slice(0, 240) });
            const geminiPrompt = await callGemini(promptForGemini, {
                model: AI_CONFIG.eventGeneration,
                maxTokens: 150,
                temperature: 0.8
            });
            console.log('[GEMINI][RAW]', JSON.stringify(geminiPrompt).slice(0, 400));

            let cleanPrompt = String(geminiPrompt || '').trim().replace(/^["']|["']$/g, '');

            if (!cleanPrompt) {
                const eraLabel = (enrichedEvent.year >= 1600 && enrichedEvent.year < 1800) ? 'early modern period'
                    : (enrichedEvent.year >= 1500 && enrichedEvent.year < 1600) ? 'Renaissance'
                        : (enrichedEvent.year < 1500) ? 'medieval period'
                            : (enrichedEvent.year < 1900) ? 'industrial era' : 'modern era';
                const base = description_detaillee
                    ? `Scene of "${enrichedEvent.titre}" (${enrichedEvent.year}), ${eraLabel}. ${description_detaillee}`
                    : `Scene of "${enrichedEvent.titre}" (${enrichedEvent.year}), ${eraLabel}.`;
                const suggested = mdpSample?.length ? ` Suggested elements: ${mdpSample.slice(0, 2).join(', ')}.` : '';
                cleanPrompt = `${base} Accurate period clothing, historically plausible setting, no modern objects.${suggested}`;
            }
            if (classifyType(enrichedEvent) !== 'war') {
                cleanPrompt = `${cleanPrompt} Avoid soldiers, muskets, battle formations.`;
            }

            // NOTE: Prompt generated by Gemini
            return {
                prompt: cleanPrompt,
                styleInfo: styleResult.styleInfo
            };
        } catch (error) {
            console.warn('[GEMINI][PROMPT_ERR]', error.message);
            throw error;
        }
    }

    return styleResult;
}

// Adaptive retries without changing 3 MUST DEPICT items
function adaptPromptForRetry(prompt, attempt, keyObject = '') {
    if (attempt === 2) {
        const extra = keyObject ? `, close-up on ${keyObject}` : '';
        return `${prompt}, three-quarter view${extra}`;
    }
    if (attempt === 3) {
        return `${prompt}, fewer background figures, simpler backdrop`;
    }
    return prompt;
}

// Génération d'image optimisée Flux-Schnell uniquement
async function generateImageEnhanced(promptData, event) {
    if (OFFLINE) {
        const prompt = typeof promptData === 'string' ? promptData : promptData.prompt;
        console.log('🎨 [DEBUG] OFFLINE mode — skipping image generation');
        return `offline://image/${encodeURIComponent(event.titre || 'image')}`;
    }
    const prompt = typeof promptData === 'string' ? promptData : promptData.prompt;

    const modelName = 'flux-schnell';
    const steps = FLUX_CONFIG.steps;

    // 🎯 OPTIMISATION #2: Guidance scale dynamique par époque
    // Antiquité/Médiéval: guidance basse (2.0) laisse respirer → moins de clichés statues
    // Moderne: guidance normale (3.0) pour précision photographique
    const guidanceScale = (event.year < 1500) ? 2.0 :
        (event.year < 1900) ? 2.5 : 3.0;

    console.log(`🎨 [DEBUG] Début génération image Flux-Schnell`);
    console.log(`🎨 [DEBUG] Prompt: "${prompt}"`);

    // 🎯 OPTIMISATION #1: Suppression des negative prompts (Stratégie "Positive Only")
    // Les negative prompts renforcent paradoxalement les concepts qu'on veut éviter
    // Flux n'a pas de canal negative natif - mentionner "statue" ou "wings" les génère au lieu de les éviter
    // Voir MODE_EMPLOI_FLUX.md pour explications détaillées
    const finalPrompt = prompt;

    const fluxConfig = {
        prompt: finalPrompt,
        aspect_ratio: "16:9",
        num_inference_steps: steps,
        output_format: "webp",
        output_quality: FLUX_CONFIG.quality,
        seed: FLUX_CONFIG.seed(),
        guidance_scale: guidanceScale
    };

    console.log(`🎨 [DEBUG] Config Flux-Schnell: steps=${fluxConfig.num_inference_steps}, quality=${fluxConfig.output_quality}, guidance=${guidanceScale}`);

    try {
        console.log(`🎨 [DEBUG] Appel Replicate run (Flux-Schnell)...`);
        const runRes = await withTimeout(replicate.run(`black-forest-labs/${modelName}`, { input: fluxConfig }), 40000, 'replicate.run');
        const runOut = runRes?.output;
        console.log(`🎨 [DEBUG] Replicate run terminé, direct=${Array.isArray(runOut) && runOut.length ? 'yes' : 'no'}`);
        if (runOut && Array.isArray(runOut) && runOut.length && typeof runOut[0] === 'string' && runOut[0].startsWith('http')) {
            console.log(`✅ [DEBUG] Image générée directement: ${runOut[0].substring(0, 50)}...`);
            return runOut[0];
        }

        console.log(`🎨 [DEBUG] Pas de résultat direct, utilisation prediction...`);
        const model = await withTimeout(replicate.models.get("black-forest-labs", modelName), 8000, 'replicate.models.get');
        console.log(`🎨 [DEBUG] Modèle récupéré: ${model.name}`);

        // Prediction avec polling robuste
        let pred = await withTimeout(replicate.predictions.create({ version: model.latest_version.id, input: fluxConfig }), 8000, 'replicate.predictions.create');
        const started = Date.now();
        while (!['succeeded', 'failed', 'canceled'].includes(pred.status)) {
            if (Date.now() - started > 60000) throw new Error('replicate prediction timeout');
            await new Promise(r => setTimeout(r, 800));
            pred = await withTimeout(replicate.predictions.get(pred.id), 8000, 'replicate.predictions.get');
        }
        console.log(`🎨 [DEBUG] Prediction status=${pred.status}, latency=${Date.now() - started}ms`);
        if (pred.status === 'succeeded' && pred.output?.length) {
            return pred.output[0];
        }
        // Retry soft: seed différent
        console.log(`🎨 [DEBUG] Retry soft prediction avec seed alternatif...`);
        const altInput = { ...fluxConfig, seed: Math.floor(Math.random() * 1e9) };
        let alt = await withTimeout(replicate.predictions.create({ version: model.latest_version.id, input: altInput }), 8000, 'replicate.predictions.create.retry');
        const t0 = Date.now();
        while (!['succeeded', 'failed', 'canceled'].includes(alt.status)) {
            if (Date.now() - t0 > 60000) throw new Error('replicate prediction timeout (retry)');
            await new Promise(r => setTimeout(r, 800));
            alt = await withTimeout(replicate.predictions.get(alt.id), 8000, 'replicate.predictions.get.retry');
        }
        console.log(`🎨 [DEBUG] Retry prediction status=${alt.status}, latency=${Date.now() - t0}ms`);
        if (alt.status !== 'succeeded' || !alt.output?.length) throw new Error('replicate empty');
        return alt.output[0];

    } catch (error) {
        console.log(`❌ [DEBUG] Erreur génération image: ${error.message}`);
        console.log(`❌ [DEBUG] Stack: ${error.stack}`);
        return null;
    }
}

// VALIDATION SIMPLE: Flash-Lite uniquement (ultra rapide 731ms)
// Approche optimisée pour traitement de masse (10k événements)
async function validateImageWithGemini(event, imageUrl) {
    if (OFFLINE) {
        return {
            isValid: true,
            score: 7,
            explanation: 'offline validation (skipped network)',
            detailedAnalysis: {
                hasForbiddenText: false,
                hasAcceptableText: false,
                representsEvent: true,
                hasWingsOrSupernatural: false,
                hasModernObjects: false,
                anatomyRealistic: true,
                historicalAccuracy: true,
                periodClothing: true,
                overallValid: true
            }
        };
    }
    console.log(`🤖 [DEBUG] Validation Gemini Flash-Lite pour "${event.titre}"`);
    console.log(`🤖 [DEBUG] URL image: ${imageUrl.substring(0, 80)}...`);

    // Validation unique avec Flash-Lite (pas de double validation)
    const flashResult = await validateWithFlash(event, imageUrl);

    console.log(`🤖 [DEBUG] [FLASH VERDICT] Score: ${flashResult.score}/10 - "${flashResult.explanation}"`);
    return flashResult;
}

// FLASH: Filtre rapide pour erreurs grossières
async function validateWithFlash(event, imageUrl) {
    const flashPrompt = `Quick visual check for gross anachronisms in "${event.titre}" (${event.year}).

REJECT IMMEDIATELY if you see:
- Modern objects: smartphones, cars, plastic, jeans, t-shirts, sneakers
- Impossible anatomy: 6 fingers, extra limbs, distorted bodies
- Fantasy elements: wings, magic, supernatural glow, dragons
- Obvious text: dates, titles, modern typography

Return JSON:
{
  "score": 0-10,
  "isValid": true/false,
  "explanation": "Brief reason (1 sentence)"
}`;

    try {
        const responseText = await callGeminiWithImage(flashPrompt, imageUrl, {
            model: AI_CONFIG.imageValidation, // Flash
            maxOutputTokens: 300,
            temperature: 0
        });

        // 🎯 OPTIMISATION #4: Validation explicite pré-score pour anachronismes critiques
        // Gemini tolère parfois les statues avec 9/10 → rejet automatique si détecté
        const lowerText = responseText.toLowerCase();
        const anachronismKeywords = ['statue', 'wing', 'winged', 'angel', 'dragon', 'gargoyle', 'mythological'];
        const detectedAnachronism = anachronismKeywords.find(kw => lowerText.includes(kw));

        if (detectedAnachronism) {
            console.log(`⚠️ [VALIDATION] Anachronisme détecté dans réponse Gemini: "${detectedAnachronism}" → rejet automatique`);
            return {
                isValid: false,
                score: 0,
                explanation: `Anachronisme critique détecté: ${detectedAnachronism}`,
                detailedAnalysis: { explicitRejection: true, keyword: detectedAnachronism }
            };
        }

        let jsonText = responseText;
        if (responseText.includes("```json")) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) jsonText = match[1];
        } else if (responseText.includes("{")) {
            const startIndex = responseText.indexOf("{");
            const endIndex = responseText.lastIndexOf("}") + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const result = JSON.parse(jsonText);
        return {
            isValid: result.isValid === true && (result.score || 0) >= 6,
            score: result.score || 0,
            explanation: result.explanation || "No explanation",
            detailedAnalysis: { flashFilter: true }
        };
    } catch (error) {
        return { isValid: false, score: 0, explanation: `Flash error: ${error.message}`, detailedAnalysis: {} };
    }
}

// PRO: Validation détaillée (drapeaux, tissus, héraldique)
async function validateWithPro(event, imageUrl) {
    const proPrompt = `Tu es un conservateur de musée extrêmement rigoureux. Ta réputation dépend de ta capacité à repérer le moindre détail erroné.

Évalue cette image pour l'événement "${event.titre}" (${event.year}).

MÉTHODE DE VALIDATION (Chain-of-Verification) :
1. INVENTAIRE : Liste chaque objet, vêtement et symbole (drapeaux) présent.
2. DATATION : Pour chaque élément listé, indique sa période d'usage courant.
3. CONFRONTATION : Compare ces dates avec l'année "${event.year}". Identifie toute contradiction.
4. VERDICT : Si un seul anachronisme flagrant est détecté (objet moderne, drapeau incohérent, arme trop récente), le score doit être inférieur à 4/10.

CRITÈRES DE REJET IMPITOYABLES :
- DRAPEAUX : Rejeter si les drapeaux ne correspondent pas aux nations de l'époque ou s'ils sont postérieurs (ex: drapeau USA à 50 étoiles en 1805).
- TECHNIQUE : Pas de tirs de canon sortant des mâts ou des voiles, pas d'ailes, pas de magie.
- ÉPOQUE : Différence >50 ans avec ${event.year}.
- TEXTE : Pas de date "${event.year}" ou de titre écrit lisiblement.
- VÊTEMENTS MODERNES : REJETER ABSOLUMENT si tu vois des chemises à boutons modernes, des poches de poitrine, des fermetures éclair, des baskets, des lunettes de soleil ou des coupes de cheveux contemporaines (dégradés à blanc, undercuts).

FORMAT JSON REQUIS :
{
  "inventory": ["liste"],
  "analysis": { "objet": "Verdict historique" },
  "score": 0 a 10,
  "isValid": true/false,
  "reason": "Justification concise",
  "detailedAnalysis": {
     "hasForbiddenText": false,
     "hasWingsOrSupernatural": false,
     "hasAnachronisms": false,
     "anatomyRealistic": true,
     "periodClothing": true,
     "overallValid": true
  }
}`;

    try {
        const responseText = await callGeminiWithImage(proPrompt, imageUrl, {
            model: AI_CONFIG.imageValidationPro, // Pro
            maxOutputTokens: 2000,
            temperature: 0.1
        });

        let jsonText = responseText;
        if (responseText.includes("```json")) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) jsonText = match[1];
        } else if (responseText.includes("{")) {
            const startIndex = responseText.indexOf("{");
            const endIndex = responseText.lastIndexOf("}") + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }

        const result = JSON.parse(jsonText);
        const da = result.detailedAnalysis || {};
        const finalIsValid = result.isValid === true && (result.score || 0) >= 7;
        const explanation = result.reason || "Pas d'explication fournie.";

        console.log(`🤖 [DEBUG] [CoVe] Inventory: ${JSON.stringify(result.inventory)}`);
        console.log(`🤖 [DEBUG] [CoVe] Verdict: ${finalIsValid} (Score: ${result.score}/10)`);
        console.log(`🤖 [DEBUG] [CoVe] Reason: ${explanation}`);

        return {
            isValid: finalIsValid,
            score: result.score || 0,
            explanation: explanation,
            detailedAnalysis: {
                ...da,
                inventory: result.inventory,
                analysis: result.analysis,
                score: result.score
            }
        };
    } catch (error) {
        console.error(`❌ [DEBUG] Erreur validation Gemini Pro: ${error.message}`);
        return {
            isValid: false,
            score: 0,
            explanation: `Erreur technique Pro: ${error.message}`,
            detailedAnalysis: { overallValid: false }
        };
    }
};

// Traitement stratégie hybride optimale avec styles
async function processEventWithHybridStrategy(event, progressBar, globalIndex) {
    console.log(`\n🔍 [DEBUG] Traitement "${event.titre}" (${event.year})`);

    // Tracking temps et coûts
    const perfTracker = {
        startTime: Date.now(),
        steps: [],
        totalCost: 0
    };

    const trackStep = (stepName, durationMs, cost = 0, details = '') => {
        perfTracker.steps.push({ stepName, durationMs, cost, details });
        perfTracker.totalCost += cost;
        const costStr = cost > 0 ? ` (coût: $${cost.toFixed(6)})` : '';
        console.log(`⏱️  [PERF] ${stepName}: ${durationMs}ms${costStr} ${details}`);
    };

    let stepStart = Date.now();
    const enrichedEvent = IS_DRY_RUN ? event : await enrichEventWithGemini(event);
    trackStep('Enrichissement Gemini', Date.now() - stepStart, COST_ESTIMATES.GEMINI_2_FLASH_INPUT * 500 + COST_ESTIMATES.GEMINI_2_FLASH_OUTPUT * 300);
    console.log(`✅ [DEBUG] Enrichissement ${IS_DRY_RUN ? 'skippé (dry-run)' : 'terminé'}`);

    let successfullyCreated = false;
    let validationData = null;
    let finalStyleInfo = null;

    let missingElementsForRetry = null;
    let extraKeywordsForRetry = [];
    let lastMDPList = [];
    const attemptLogs = [];
    const retryNotes = event.validation_notes || event.retryNotes || null;
    if (retryNotes) {
        if (Array.isArray(retryNotes.focus_must_depict) && retryNotes.focus_must_depict.length) {
            missingElementsForRetry = [...new Set(retryNotes.focus_must_depict.filter(Boolean))];
        } else if (Array.isArray(retryNotes.missing_elements) && retryNotes.missing_elements.length) {
            missingElementsForRetry = [...new Set(retryNotes.missing_elements.filter(Boolean))];
        }
        if (Array.isArray(retryNotes.extra_keywords) && retryNotes.extra_keywords.length) {
            extraKeywordsForRetry = [...new Set(retryNotes.extra_keywords.filter(Boolean))];
        }
    }
    // Pré-contrôle: éviter appels Flux si enrichissement trop pauvre
    const precheckElems = extractMustDepictElements(enrichedEvent);
    const hasDesc = !!(enrichedEvent.enrichissement?.sceneIdeale || (enrichedEvent.enrichissement?.elementsVisuelsEssentiels || []).length || enrichedEvent.description);
    if (precheckElems.length < 2 || !hasDesc) {
        const reason = 'enrichissement insuffisant (MUST DEPICT < 2 ou description manquante)';
        console.log(`🛑 [DEBUG] Pré-contrôle: ${reason}`);
        progressBar.update(globalIndex + 1, `○ "${event.titre}" insuffisant (no-gen)`);
        return { ok: false, reason };
    }

    // Safe enriched object to protect optional fields (esp. in dry-run)
    const safeEnriched = {
        ...enrichedEvent,
        enrichissement: {
            ...(enrichedEvent.enrichissement || {}),
            sceneIdeale: (enrichedEvent.enrichissement && enrichedEvent.enrichissement.sceneIdeale)
                ?? enrichedEvent.sceneIdeale
                ?? enrichedEvent.description_scene
                ?? enrichedEvent.titre
                ?? '',
            elementsVisuelsEssentiels: Array.isArray(enrichedEvent.enrichissement?.elementsVisuelsEssentiels)
                ? enrichedEvent.enrichissement.elementsVisuelsEssentiels
                : []
        }
    };

    // RETRY INTELLIGENT: 3 tentatives Flux-Schnell maximum
    const MAX_IMAGE_ATTEMPTS = 3; // Schnell uniquement (approche rapide)
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS && !successfullyCreated; attempt++) {
        console.log(`🔄 [DEBUG] Tentative ${attempt}/${MAX_IMAGE_ATTEMPTS}`);

        try {
            let promptResult;
            if (IS_DRY_RUN) {
                // Pas d'appel aux providers en dry-run: on garde uniquement le style
                const styleOnly = await withTimeout(integrateStyleSystemInProcess(safeEnriched, attempt), 8000, 'integrateStyleSystemInProcess');
                promptResult = styleOnly;
            } else {
                // Toujours sélectionner le style pour cohérence, puis orchestrer le texte de prompt
                stepStart = Date.now();
                const styleOnly = await withTimeout(integrateStyleSystemInProcess(safeEnriched, attempt), 8000, 'integrateStyleSystemInProcess');
                const textPrompt = await generateOptimizedFluxPrompt(safeEnriched, attempt);
                promptResult = { prompt: textPrompt, styleInfo: styleOnly.styleInfo, mustDepictList: styleOnly.mustDepictList };
                trackStep('Génération prompt Gemini', Date.now() - stepStart, COST_ESTIMATES.GEMINI_2_FLASH_INPUT * 2000 + COST_ESTIMATES.GEMINI_2_FLASH_OUTPUT * 500, `tentative ${attempt}`);
            }

            if (!promptResult || !promptResult.prompt) {
                console.log(`❌ [DEBUG] Prompt vide/invalide (tentative ${attempt}) — utilisation d'un fallback minimal`);
                const minimal = buildMinimalFallbackPrompt(enrichedEvent);
                promptResult = { prompt: minimal, styleInfo: { category: 'cinematic', name: 'minimal_fallback', description: 'Minimal fallback prompt' } };

                // MUST-DEPICT enrichments for fallback (idempotent)
                try {
                    const mdpBlock = generateMustDepictBlock(safeEnriched);
                    if (mdpBlock && !promptResult.prompt.includes('MUST DEPICT:')) {
                        promptResult.prompt = `${promptResult.prompt}. ${mdpBlock}`;
                    }
                    // On 2nd attempt, hard-focus missing specifics
                    if (attempt >= 2 && !promptResult.prompt.includes('FOCUS ON MISSING ELEMENTS:')) {
                        promptResult.prompt = applyFocusOnMissing(
                            promptResult.prompt,
                            ['Colosseum facade with multi-level arches', 'velarium partly unfurled', 'Emperor Titus on dais']
                        );
                    }
                } catch (_) { }
            }
            // Track selected MUST DEPICT list and log
            if (promptResult.mustDepictList && promptResult.mustDepictList.length) {
                lastMDPList = promptResult.mustDepictList;
                console.log('MDP: picked', JSON.stringify(lastMDPList));
            }
            // Injection éventuelle d'un focus sur éléments manquants
            if (missingElementsForRetry && missingElementsForRetry.length) {
                promptResult = {
                    ...promptResult,
                    prompt: applyFocusOnMissing(promptResult.prompt, missingElementsForRetry)
                };
                // Adaptive retry framing without changing the 3 MUST DEPICT items
                const keyObj = lastMDPList?.[2] || lastMDPList?.[0] || '';
                const adapted = adaptPromptForRetry(promptResult.prompt, attempt, keyObj);
                if (adapted) {
                    promptResult = { ...promptResult, prompt: adapted };
                }
                console.log(`Retry ${attempt}: angle=${attempt === 2 ? 'three-quarter view' : ''}, density=${attempt === 3 ? 'fewer background figures, simpler backdrop' : ''}`);
            }
            // Injection de mots-clés thématiques supplémentaires si nécessaire
            if (extraKeywordsForRetry.length) {
                const keywordsText = extraKeywordsForRetry.slice(0, 6).join(', ');
                promptResult = { ...promptResult, prompt: `${promptResult.prompt}, ${keywordsText}` };
            }
            if (retryNotes && Array.isArray(retryNotes.hints) && retryNotes.hints.length) {
                const hintText = retryNotes.hints.slice(0, 3).map((hint) => hint && hint.trim()).filter(Boolean).join(' ');
                if (hintText) {
                    promptResult = { ...promptResult, prompt: `${promptResult.prompt.trim()} Historical accuracy instructions: ${hintText}`.trim() };
                }
            }
            if (retryNotes) {
                const augmentation = buildRetryPromptAugmentation(retryNotes, event);
                if (augmentation) {
                    promptResult = { ...promptResult, prompt: `${promptResult.prompt.trim()} ${augmentation}`.trim() };
                }
            }

            if (attempt > 1 && !IS_DRY_RUN) {
                const previousWithImage = [...attemptLogs].reverse().find(entry => entry.imageUrl);
                const refAugmentation = buildImageReferenceAugmentation(previousWithImage);
                if (refAugmentation) {
                    const rejectionPrefix = previousWithImage?.validation?.isValid === false ? "⚠️ L'image précédente a été REJETÉE par la validation historique. " : "";
                    const guidanceText = refAugmentation.guidance
                        ? `${rejectionPrefix}Corriger en prenant l'image précédente (${refAugmentation.imageUrl}) comme référence : ${refAugmentation.guidance}`
                        : `${rejectionPrefix}Corriger en prenant l'image précédente (${refAugmentation.imageUrl}) comme référence et en conservant les éléments réussis.`;
                    promptResult = {
                        ...promptResult,
                        prompt: `${promptResult.prompt.trim()} ${guidanceText}`.trim()
                    };
                }
            }

            const optimizedPrompt = promptResult.prompt;
            finalStyleInfo = promptResult.styleInfo;
            console.log(`✅ [DEBUG] Prompt généré: "${optimizedPrompt.substring(0, 100)}..."`);

            const baseNegative = `modern text, dates, titles, large inscriptions, contemporary writing, modern typography, wings, angel, flying, supernatural, mythological, god, deity, magical, glowing, divine, fantasy creature, dragon, dragons, dragon statue, gargoyle, angel statue, winged creature, unrealistic anatomy, modern objects, smartphones, cars, phones, computers, electronics, contemporary clothing, jeans, t-shirt, sneakers, digital art, cartoon, anime, manga, abstract, blurry, low quality, science fiction, alien, spaceship, robot, cyberpunk`;
            let mergedNegative = buildNegativePrompt(baseNegative, enrichedEvent.year, safeEnriched);
            if (retryNotes && Array.isArray(retryNotes.dynamic_negatives) && retryNotes.dynamic_negatives.length) {
                mergedNegative = `${mergedNegative}, ${retryNotes.dynamic_negatives.join(', ')}`;
            }
            const mustDepictElems = extractMustDepictElements(safeEnriched);
            const attemptEntry = {
                attempt,
                prompt: optimizedPrompt,
                negativePrompt: mergedNegative,
                styleInfo: finalStyleInfo,
                mustDepict: mustDepictElems,
                extraKeywords: extraKeywordsForRetry.slice(),
                focusMustDepict: missingElementsForRetry ? [...missingElementsForRetry] : [],
                imageUrl: null,
                validation: null
            };
            if (IS_DRY_RUN) {
                console.log('📄 [DRY-RUN] MUST DEPICT:', mustDepictElems.join('; '));
                console.log('📄 [DRY-RUN] Prompt:', optimizedPrompt);
                console.log('📄 [DRY-RUN] Negative:', mergedNegative);
                console.log('📄 [DRY-RUN] DepictionScore threshold:', DEPICTION_ENFORCEMENT.minScore);
                progressBar.update(globalIndex + 1, `◎ "${event.titre}" dry-run`);
                attemptLogs.push({ ...attemptEntry, note: 'dry-run' });
                return { ok: true, dryRun: true, prompt: optimizedPrompt, negative: mergedNegative, mustDepict: mustDepictElems };
            }

            stepStart = Date.now();
            const replicateUrl = await withTimeout(generateImageEnhanced(promptResult, enrichedEvent), 60000, 'generateFlux');

            if (!replicateUrl) {
                console.log(`❌ [DEBUG] Échec génération image (tentative ${attempt})`);
                attemptEntry.error = 'image_generation_failed';
                attemptLogs.push(attemptEntry);
                continue;
            }
            trackStep('Génération image Replicate', Date.now() - stepStart, COST_ESTIMATES.FLUX_SCHNELL, `tentative ${attempt}`);
            console.log(`✅ [DEBUG] Image générée sur Replicate: ${replicateUrl.substring(0, 50)}...`);
            try {
                fs.appendFileSync('recovery_images.txt', `${new Date().toISOString()} - ${event.titre}: ${replicateUrl}\n`);
            } catch (err) { console.error('Failed to save recovery URL', err); }

            // Valider AVANT d'uploader (avec URL Replicate que Gemini peut voir)
            attemptEntry.imageUrl = replicateUrl;

            stepStart = Date.now();
            let validationResult = { isValid: true, score: 0, explanation: 'skipped', detailedAnalysis: {} };
            if (!process.env.NO_GEMINI) {
                validationResult = await withTimeout(validateImageWithGemini(enrichedEvent, replicateUrl), 300000, 'validateGemini');
            }
            trackStep('Validation image Gemini', Date.now() - stepStart, COST_ESTIMATES.GEMINI_2_FLASH_INPUT * 1000 + COST_ESTIMATES.GEMINI_2_FLASH_OUTPUT * 500, `score: ${validationResult.score}/10`);
            validationData = validationResult;
            attemptEntry.validation = {
                isValid: validationResult.isValid,
                score: validationResult.score,
                explanation: validationResult.explanation,
                detailedAnalysis: validationResult.detailedAnalysis
            };
            attemptLogs.push(attemptEntry);

            console.log(`🤖 [DEBUG] Validation Gemini:`);
            console.log(`  - Score: ${validationResult.score}/10`);
            console.log(`  - Valide: ${validationResult.isValid}`);
            console.log(`  - Raison: ${validationResult.explanation}`);

            if (validationResult.detailedAnalysis) {
                const analysis = validationResult.detailedAnalysis;
                console.log(`  - Texte interdit: ${analysis.hasForbiddenText}`);
                console.log(`  - Objets modernes: ${analysis.hasModernObjects}`);
                console.log(`  - Vêtements d'époque: ${analysis.periodClothing}`);
                console.log(`  - Anatomie réaliste: ${analysis.anatomyRealistic}`);
                console.log(`  - Représente événement: ${analysis.representsEvent}`);
                if (analysis.forbiddenTextDescription) {
                    console.log(`  - Détail texte interdit: ${analysis.forbiddenTextDescription}`);
                }
                if (analysis.acceptableTextDescription) {
                    console.log(`  - Texte toléré: ${analysis.acceptableTextDescription}`);
                }
                if (analysis.eventRelevance) {
                    console.log(`  - Analyse événement: ${analysis.eventRelevance}`);
                }
                if (Array.isArray(analysis.missingElements) && analysis.missingElements.length) {
                    console.log(`  - Manque éléments MUST DEPICT: ${analysis.missingElements.join('; ')}`);
                }
            }

            if (validationResult.isValid) {
                console.log(`✅ [DEBUG] Validation réussie! Upload vers Supabase...`);
                try {
                    // Upload l'image validée vers Supabase Storage
                    stepStart = Date.now();
                    const imageUrl = await withTimeout(
                        uploadImageToSupabase(replicateUrl, enrichedEvent.titre),
                        30000,
                        'uploadToSupabase'
                    );
                    trackStep('Upload image Supabase Storage', Date.now() - stepStart, COST_ESTIMATES.SHARP_PROCESSING, '(download + resize + upload)');

                    if (!imageUrl) {
                        throw new Error('Échec upload Supabase');
                    }
                    console.log(`✅ [DEBUG] Image uploadée: ${imageUrl.substring(0, 80)}...`);

                    const finalEvent = enrichAndFinalizeEvent(enrichedEvent, imageUrl, optimizedPrompt, validationData, event.focusType, finalStyleInfo);
                    clearRetryFailureByTitle(event.titre);
                    removeEventFromEtape2(event.titre);
                    stepStart = Date.now();
                    await insertValidatedEvent(finalEvent);
                    trackStep('Insertion DB goju2', Date.now() - stepStart, 0, '(local ou Supabase)');
                    // Report success (overwrite) if politics+medieval
                    try {
                        const evtType = classifyType(enrichedEvent);
                        const evtEra = eraBucket(enrichedEvent.year);
                        const overridesApplied = (evtType === 'politics' && evtEra === 'medieval');
                        const mustList = (lastMDPList || []).slice(0, 3);
                        await writeRunReport({
                            title: 'Overrides politics+medieval applied report',
                            overridesApplied,
                            mustDepictList: mustList,
                            validationRule: '2/3 elements accepted',
                            eventId: `${enrichedEvent.titre} (${enrichedEvent.year})`,
                            status: 'success'
                        });
                    } catch (_) { }
                    console.log(`✅ [DEBUG] Insertion DB réussie`);

                    addToCache(event.titre, finalEvent);
                    progressBar.update(globalIndex + 1, `✓ "${event.titre}" créé [${finalStyleInfo?.name || 'default'}]`);
                    successfullyCreated = true;

                    // Résumé performance
                    const totalTime = Date.now() - perfTracker.startTime;
                    console.log(`\n📊 [RÉSUMÉ PERFORMANCE] "${event.titre}"`);
                    console.log(`   Temps total: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
                    console.log(`   Coût total estimé: $${perfTracker.totalCost.toFixed(6)}`);
                    console.log(`   Détail par étape:`);
                    perfTracker.steps.forEach(s => {
                        console.log(`     - ${s.stepName}: ${s.durationMs}ms ($${s.cost.toFixed(6)}) ${s.details}`);
                    });
                    console.log(``);

                    return finalEvent;

                } catch (insertError) {
                    console.log(`❌ [DEBUG] Erreur insertion DB: ${insertError.message}`);
                    if (attempt === MAX_IMAGE_ATTEMPTS) {
                        try {
                            console.log(`🔄 [DEBUG] Tentative insertion forcée à la dernière tentative...`);
                            const finalEvent = enrichAndFinalizeEvent(enrichedEvent, imageUrl, optimizedPrompt, validationData, event.focusType, finalStyleInfo);
                            clearRetryFailureByTitle(event.titre);
                            removeEventFromEtape2(event.titre);
                            await insertValidatedEvent(finalEvent);
                            try {
                                const evtType = classifyType(enrichedEvent);
                                const evtEra = eraBucket(enrichedEvent.year);
                                const overridesApplied = (evtType === 'politics' && evtEra === 'medieval');
                                const mustList = (lastMDPList || []).slice(0, 3);
                                await writeRunReport({
                                    title: 'Overrides politics+medieval applied report',
                                    overridesApplied,
                                    mustDepictList: mustList,
                                    validationRule: '2/3 elements accepted',
                                    eventId: `${enrichedEvent.titre} (${enrichedEvent.year})`,
                                    status: 'success'
                                });
                            } catch (_) { }
                            addToCache(event.titre, finalEvent);
                            progressBar.update(globalIndex + 1, `✓ "${event.titre}" créé (dernière tentative) [${finalStyleInfo?.name || 'default'}]`);
                            return finalEvent;
                        } catch (directError) {
                            console.log(`❌ [DEBUG] Erreur URL directe: ${directError.message}`);
                        }
                    }
                }
            } else {
                console.log(`❌ [DEBUG] Validation échouée (tentative ${attempt})`);
                // Retente intelligent: sauvegarder les indices pour le prochain tour
                if (validationResult.detailedAnalysis && validationResult.detailedAnalysis.missingElements && validationResult.detailedAnalysis.missingElements.length) {
                    missingElementsForRetry = validationResult.detailedAnalysis.missingElements.slice(0, 3);
                    console.log(`Retry ${attempt + 1}: focus sur les éléments manquants: ${missingElementsForRetry.join(', ')}`);
                }
                // Si l'image ne représente pas l'événement, ajouter 2 mots-clés thématiques et retenter
                if (validationResult.detailedAnalysis && validationResult.detailedAnalysis.representsEvent === false && extraKeywordsForRetry.length < 4) {
                    const baseK = buildThematicKeywords(enrichedEvent.titre || '');
                    const cand = baseK.filter(k => !extraKeywordsForRetry.includes(k));
                    const add = cand.slice(0, 2);
                    if (add.length) {
                        extraKeywordsForRetry = [...extraKeywordsForRetry, ...add];
                        console.log(`Retry ${attempt}: adding thematic keywords ${add.join(', ')}`);
                    }
                }
            }

        } catch (error) {
            console.warn(now(), 'RETRY due to', error.message);
            const alreadyLogged = attemptLogs.some(entry => entry.attempt === attempt);
            if (!alreadyLogged) {
                attemptLogs.push({
                    attempt,
                    error: error.message,
                    prompt: null,
                    negativePrompt: null,
                    styleInfo: null,
                    extraKeywords: extraKeywordsForRetry.slice(),
                    focusMustDepict: missingElementsForRetry ? [...missingElementsForRetry] : [],
                    imageUrl: null,
                    validation: null
                });
            }
            console.log(`❌ [DEBUG] Erreur générale tentative ${attempt}: ${error.message}`);
        }

        if (attempt < MAX_IMAGE_ATTEMPTS) {
            console.log(`⏳ [DEBUG] Attente 2s avant tentative suivante...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Fin: pas d'image retenue
    const lastAttempt = attemptLogs.length ? attemptLogs[attemptLogs.length - 1] : null;
    const noImgReason = lastAttempt?.validation?.explanation || lastAttempt?.error || 'aucune image retenue';
    console.log(`🛑 [DEBUG] ${noImgReason}`);
    progressBar.update(globalIndex + 1, `✗ "${event.titre}" ${noImgReason}`);
    recordRetryFailure(event, safeEnriched, attemptLogs);
    // Report (overwrite) for last attempt if politics+medieval
    try {
        const evtType = classifyType(enrichedEvent);
        const evtEra = eraBucket(enrichedEvent.year);
        const overridesApplied = (evtType === 'politics' && evtEra === 'medieval');
        const mustList = (lastMDPList || []).slice(0, 3);
        await writeRunReport({
            title: 'Overrides politics+medieval applied report',
            overridesApplied,
            mustDepictList: mustList,
            validationRule: '2/3 elements accepted',
            eventId: `${enrichedEvent.titre} (${enrichedEvent.year})`,
            status: 'failure'
        });
    } catch (_) { }
    return { ok: false, reason: noImgReason };
}

// Génère un prompt minimal de secours quand la génération est vide/invalide
function buildMinimalFallbackPrompt(enrichedEvent) {
    const epoch = enrichedEvent.year < 476 ? 'ancient' :
        enrichedEvent.year < 1492 ? 'medieval' :
            enrichedEvent.year < 1789 ? 'renaissance' :
                enrichedEvent.year < 1914 ? 'industrial' : 'modern';
    const type = (enrichedEvent.type || 'historical scene').toLowerCase();
    return [
        `${enrichedEvent.year}`,
        `${epoch} period`,
        `${type}`,
        'realistic',
        'documentary style',
        'realistic historical illustration, avoid futuristic or contemporary equipment',
        'accurate period clothing',
        'historical setting'
    ].join(', ');
}

// Fonctions utilitaires
async function uploadImageToSupabase(imageUrl, eventTitle) {
    if (OFFLINE) {
        console.log('🗃️ [DEBUG] OFFLINE upload — returning placeholder URL');
        return imageUrl || `offline://image/${encodeURIComponent(eventTitle || 'image')}`;
    }
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
        .webp({ quality: 85 })
        .resize(800, 450, { fit: 'cover' })
        .toBuffer();

    const fileName = `gemini_${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}.webp`;

    const { error } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, processedBuffer, {
            contentType: 'image/webp',
            upsert: true
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName);

    return publicUrl;
}

// FONCTION MODIFIÉE POUR LES NOUVELLES COLONNES
function enrichAndFinalizeEvent(enrichedEvent, imageUrl, illustrationPrompt, validationData = null, focusType = "mixed", styleInfo = null) {
    const parsedYear = parseInt(enrichedEvent.year, 10);
    if (!Number.isFinite(parsedYear) || parsedYear <= 0) {
        throw new Error(`ANNÉE REFUSÉE: "${enrichedEvent.year}" invalide ou BC. Le pipeline n'accepte que AD (1-2025).`);
    }
    const year = parsedYear;
    if (!Number.isFinite(parsedYear) || parsedYear <= 0) {
        console.warn(`⚠️ [DEBUG] Année invalide détectée pour "${enrichedEvent.titre}" → substitution ${year}`);
    }
    const epoch = year < 476 ? 'Antiquité' :
        year < 1492 ? 'Moyen Âge' :
            year < 1789 ? 'Moderne' :
                year < 1914 ? 'Contemporaine' : 'XXe';

    let universelValue;
    if (focusType === 'france') {
        universelValue = false;
    } else if (focusType === 'universal') {
        universelValue = true;
    } else {
        universelValue = enrichedEvent.region?.toLowerCase() !== 'france' &&
            enrichedEvent.region?.toLowerCase() !== 'europe';
    }

    // PAYLOAD pour goju2
    const finalEvent = {
        date: `${year.toString().padStart(4, '0')}-01-01`,
        date_formatee: year.toString(),
        titre: enrichedEvent.titre,
        illustration_url: imageUrl,
        types_evenement: [enrichedEvent.type],
        description_detaillee: enrichedEvent.sceneDescription || enrichedEvent.enrichissement?.contextHistorique || enrichedEvent.description,
        notoriete: enrichedEvent.notoriete || null,
        style_info: styleInfo,
        style_name: styleInfo?.name || null,
        prompt_flux: illustrationPrompt,
        score_validation: validationData?.score || 0
    };

    return finalEvent;
}

// FONCTION MODIFIÉE POUR VALIDATION COLONNES
async function insertValidatedEvent(finalEvent) {
    if (OFFLINE && process.env.FORCE_SUPABASE_INSERT !== '1') {
        // Save to local file as offline DB
        const file = path.join(__dirname, 'goju_local.json');
        let arr = [];
        try {
            const raw = await fs.promises.readFile(file, 'utf8');
            arr = JSON.parse(raw);
            if (!Array.isArray(arr)) arr = [];
        } catch (_) { arr = []; }
        arr.push(finalEvent);
        await fs.promises.writeFile(file, JSON.stringify(arr, null, 2));
        console.log(`💾 [DEBUG] OFFLINE DB append → ${file} (count=${arr.length})`);
        return finalEvent;
    }
    // S'assurer que style_info est bien un objet JSON
    if (finalEvent.style_info && typeof finalEvent.style_info !== 'object') {
        console.warn('⚠️ style_info doit être un objet JSON');
        delete finalEvent.style_info;
        delete finalEvent.style_name;
    }

    // Vérifier la présence des colonnes optionnelles et adapter la charge utile
    const columns = await detectGojuColumns();
    const payload = { ...finalEvent };
    if (!columns.style_info) delete payload.style_info;
    if (!columns.style_name) delete payload.style_name;
    if (!columns.date_formatee) delete payload.date_formatee;
    if (!columns.prompt_flux) delete payload.prompt_flux;

    // Déduplication: vérifier si (titre, year) existe déjà dans 'evenements' (PROD) ou 'goju' (STAGING)
    try {
        // 1. Vérifier dans la table principale 'evenements'
        // On vérifie TITRE + ANNÉE pour éviter les faux positifs
        const targetYear = String(payload.date_formatee);
        const { data: existingProd } = await supabase
            .from('evenements')
            .select('id, titre, date_formatee')
            .eq('titre', payload.titre);

        // Filtrer manuellement par année car date_formatee est une String dans evenements
        const matchingEvent = existingProd?.find(event => {
            const eventYear = String(event.date_formatee || '').substring(0, 4);
            return eventYear === targetYear;
        });

        if (matchingEvent) {
            console.log(`🛑 [DEBUG] Événement DÉJÀ PRÉSENT dans 'evenements' (PROD), insertion ignorée: "${payload.titre}" (${targetYear})`);
            return null; // On retourne null pour signaler qu'on n'a rien créé
        }

        // 2. Vérifier dans la table tampon 'goju'
        const { data: existing } = await supabase
            .from('goju2')
            .select('id, illustration_url, prompt_flux, style_info, style_name, date_formatee, titre')
            .eq('titre', payload.titre)
            .eq('date_formatee', payload.date_formatee)
            .limit(1);
        if (existing && existing.length) {
            const row = existing[0];
            // Si l'illustration est offline, tenter de régénérer et mettre à jour
            if (row.illustration_url && String(row.illustration_url).startsWith('offline://') && !OFFLINE) {
                try {
                    const minimalEvent = { titre: payload.titre, year: parseInt(payload.date_formatee, 10) || 0, type: Array.isArray(payload.types_evenement) ? payload.types_evenement[0] : '' };
                    const newUrl = await withTimeout(generateImageEnhanced(row.prompt_flux || payload.prompt_flux || payload.prompt_schnell || payload.titre, minimalEvent), 60000, 'generateFlux.repair');
                    if (newUrl) {
                        const uploadedUrl = await uploadImageToSupabase(newUrl, payload.titre);
                        await supabase.from('goju2').update({ illustration_url: uploadedUrl, style_info: payload.style_info || row.style_info, style_name: payload.style_name || row.style_name }).eq('id', row.id);
                        console.log(`🔁 [DEBUG] Illustration offline remplacée pour "${payload.titre}"`);
                        return { ...payload, id: row.id, illustration_url: uploadedUrl };
                    }
                } catch (e) {
                    console.warn(`⚠️ [DEBUG] Échec régénération illustration pour "${payload.titre}": ${e.message}`);
                }
            }
            console.log(`↩︎ [DEBUG] Événement déjà présent, insertion ignorée: "${payload.titre}" (${payload.date_formatee})`);
            return row;
        }
    } catch (e) {
        console.warn('⚠️ [DEBUG] Déduplication échouée (on tente insert):', e.message);
    }

    const { data, error } = await supabase.from('goju2').insert([payload]).select();
    console.log('🔍 [DEBUG-INSERT] Result:', { dataLength: data?.length, error, payloadTitle: payload.titre });
    if (error) {
        if (error.code === '23505') {
            finalEvent.code = `cld${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
            return await insertValidatedEvent(finalEvent);
        }
        throw error;
    }
    return data[0];
}

// FONCTION MODIFIÉE POUR STATISTIQUES
function getStyleStatistics(events) {
    const styleCount = {};
    const categoryCount = { cinematic: 0, alternative: 0 };

    events.forEach(event => {
        // Utiliser directement style_info au lieu de parser la description
        if (event.style_info) {
            const styleName = event.style_info.name;
            const category = event.style_info.category;

            styleCount[styleName] = (styleCount[styleName] || 0) + 1;
            categoryCount[category]++;
        }
    });

    const total = events.length;
    const cinematicPercentage = total > 0 ? ((categoryCount.cinematic / total) * 100).toFixed(1) : '0.0';
    const alternativePercentage = total > 0 ? ((categoryCount.alternative / total) * 100).toFixed(1) : '0.0';

    return {
        total,
        categoryCount,
        styleCount,
        cinematicPercentage,
        alternativePercentage,
        distribution: `${cinematicPercentage}% cinématographique, ${alternativePercentage}% alternatif`
    };
}

// Traitement principal hybride optimal
async function processBatchHybrid(startYear, endYear, batchSize, batchNumber, focusType, progressBar, globalCreatedCount, successSummary = null, failureSummary = null) {
    const events = await generateEventBatchWithGemini(startYear, endYear, batchSize, focusType, batchNumber);
    if (events.length === 0) {
        return [];
    }

    const { validEvents } = await verifyEventBatchWithGemini(events);
    if (validEvents.length === 0) {
        return [];
    }

    const completedEvents = [];

    for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        const globalIndex = globalCreatedCount + completedEvents.length;
        let result;
        try {
            result = await processEventWithHybridStrategy(event, progressBar, globalIndex);
        } catch (error) {
            console.warn(`⚠️ [DEBUG] Échec inattendu pour "${event.titre}": ${error.message}`);
            if (Array.isArray(failureSummary)) {
                failureSummary.push({ titre: event.titre, year: event.year, reason: error.message || 'Erreur inconnue' });
            }
            continue;
        }

        if (result && result.ok === false) {
            if (Array.isArray(failureSummary)) {
                failureSummary.push({ titre: event.titre, year: event.year, reason: result.reason || 'Raison non précisée' });
            }
        } else if (result) {
            completedEvents.push(result);
            if (Array.isArray(successSummary)) {
                const parsedYear = parseInt(result.date_formatee, 10);
                successSummary.push({
                    titre: result.titre || event.titre,
                    year: Number.isFinite(parsedYear) ? parsedYear : event.year,
                    style: result.style_name,
                    id: result.id
                });
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return completedEvents;
}

// Script principal optimal
async function main() {
    console.log("=== MODE RÉALISME HISTORIQUE (PHOTO/CINE) ===");
    console.log("Configuration: Gemini (prompts) + Flux-Schnell (4 steps) + Gemini (validation)");
    console.log("Styles: Réalisme photographique haute fidélité forcé");
    console.log("✅ Colonnes style_info (JSONB) et style_name (VARCHAR) utilisées");
    console.log(`📂 File d'attente: ${etape2Path}`);
    console.log(`📂 Journal des échecs: ${retryFilePath}`);

    // Vérification APIs (skippé en offline/dry-run)
    if (!OFFLINE) {
        if (!process.env.ANTHROPIC_API_KEY) {
            console.error("❌ ANTHROPIC_API_KEY manquante dans .env");
            process.exit(1);
        }
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY manquante dans .env");
            process.exit(1);
        }
        if (!process.env.REPLICATE_API_TOKEN) {
            console.error("❌ REPLICATE_API_TOKEN manquante dans .env");
            process.exit(1);
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
            console.error("❌ SUPABASE_SERVICE_ROLE_KEY manquante dans .env");
            process.exit(1);
        }
    } else {
        console.log('🌐 [DEBUG] OFFLINE/DRY-RUN: API checks skipped');
    }

    // Réparation des illustrations offline: --repair-offline
    if (process.argv.includes('--repair-offline')) {
        if (OFFLINE) console.log('ℹ️ [DEBUG] OFFLINE activé: la régénération utilisera les URLs offline. Désactivez OFFLINE pour générer de vraies images.');
        const { data, error } = await supabase.from('goju2').select('id, titre, date_formatee, illustration_url, prompt_flux, style_info, style_name');
        if (error) { console.error('Erreur lecture goju:', error.message); process.exit(1); }
        const offlineRows = (data || []).filter(r => r.illustration_url && String(r.illustration_url).startsWith('offline://'));
        console.log(`🔎 ${offlineRows.length} ligne(s) avec illustration offline à réparer`);
        for (const row of offlineRows) {
            try {
                if (OFFLINE) continue; // pas de régénération réelle en offline
                const minimalEvent = { titre: row.titre, year: parseInt(row.date_formatee, 10) || 0, type: '' };
                const newUrl = await withTimeout(generateImageEnhanced(row.prompt_flux || row.titre, minimalEvent), 60000, 'generateFlux.repair');
                if (!newUrl) { console.warn('   ⚠️ Pas d’URL générée'); continue; }
                const uploadedUrl = await uploadImageToSupabase(newUrl, row.titre);
                await supabase.from('goju2').update({ illustration_url: uploadedUrl }).eq('id', row.id);
                console.log(`   ✅ Réparé: ${row.titre}`);
            } catch (e) {
                console.warn(`   ❌ Échec réparation ${row.titre}: ${e.message}`);
            }
        }
        flushRetryFailures();
        return;
    }

    // Mode file d'attente (Supabase queue_sevent): --queue
    const args = process.argv.slice(2);
    const hasQueueArg = args.includes('--queue');
    const isNoArgs = args.length === 0;

    if (hasQueueArg || isNoArgs) {
        if (isNoArgs) {
            console.log("ℹ️ [SEVENT] Aucun argument fourni. Activation du mode --queue par défaut.");
        }
        console.log("📥 [QUEUE] Mode File d'attente activé (lecture depuis table 'queue_sevent')");
        try {
            // Charger titres existants pour doublons éventuels sur toute plage
            await loadExistingTitles(0, 9999);

            let { data: queueItems, error } = await supabase
                .from('queue_sevent')
                .select('*')
                .eq('status', 'pending');

            if (error) throw error;

            if (!queueItems || queueItems.length === 0) {
                console.log("∅ [QUEUE] Aucun événement en attente dans 'queue_sevent'.");
                return;
            }

            // Mode test: limiter à 1 événement
            if (TEST_SINGLE && queueItems.length > 1) {
                console.log(`🧪 [TEST MODE] Limitation à 1 seul événement pour test`);
                queueItems = [queueItems[0]];
            }

            console.log(`📑 [QUEUE] ${queueItems.length} événement(s) en attente détecté(s).`);
            const progressBar = new ProgressBar(queueItems.length, 'QUEUE processing');

            let created = 0, failed = 0;
            for (let i = 0; i < queueItems.length; i++) {
                const item = queueItems[i];
                const ev = {
                    titre: item.titre,
                    year: item.year,
                    type: item.type || 'Général',
                    region: item.region || '',
                    description: item.description || '',
                    specificLocation: item.specific_location || '',
                    notoriete: item.notoriete || null,
                    focusType: EVENT_FOCUS_TYPES.MIXED
                };

                try {
                    const res = await processEventWithHybridStrategy(ev, progressBar, i);
                    if (res && res.ok !== false) {
                        created++;
                        // Supprimer de la file d'attente après succès
                        await supabase.from('queue_sevent').delete().eq('id', item.id);
                    } else {
                        failed++;
                        // Noter l'erreur
                        await supabase.from('queue_sevent').update({
                            status: 'error',
                            error_log: res?.reason || 'Rejeté par la machine (doublon ou insuffisant)'
                        }).eq('id', item.id);
                    }
                } catch (e) {
                    console.warn(`[QUEUE] Échec pour "${item.titre}":`, e.message);
                    failed++;
                    await supabase.from('queue_sevent').update({
                        status: 'error',
                        error_log: e.message
                    }).eq('id', item.id);
                    progressBar.update(i + 1, `✗ "${item.titre}" error`);
                }
            }
            console.log(`\n✨ [QUEUE] Traitement terminé. Succès: ${created}, Échecs: ${failed}`);
            flushRetryFailures();
            return;
        } catch (e) {
            console.error(`❌ [QUEUE] Erreur critique:`, e.message);
            process.exit(1);
        }
    }

    // Mode fichier d'événements: --events [/path/etape2.json]
    const evIdx = args.indexOf('--events');
    if (evIdx !== -1) {
        const defaultEventsFile = etape2Path;
        const nextArg = args[evIdx + 1];
        const eventsPath = nextArg && !nextArg.startsWith('--') ? nextArg : defaultEventsFile;
        try {
            const raw = fs.readFileSync(eventsPath, 'utf8');
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) throw new Error('events file must be a JSON array');
            console.log('SEVENT from file:', eventsPath, 'items:', arr.length);

            // Charger titres existants pour doublons éventuels sur toute plage
            await loadExistingTitles(0, 9999);

            const progressBar = new ProgressBar(arr.length, 'SEVENT generation');
            let created = 0, failed = 0;
            for (let i = 0; i < arr.length; i++) {
                const it = arr[i] || {};
                const titre = it.titre || it.title || it.name || `Event ${i + 1}`;
                const y = parseInt(it.year || (it.date || '').slice(0, 4), 10) || 0;
                const type = it.type || it.category || 'General';
                const region = it.region || it.country || '';
                const description_detaillee = it.description_detaillee || it.description || it.summary || '';
                const specificLocation = it.specificLocation || it.location || it.city || '';
                const validation_notes = it.validation_notes || null;
                const ev = {
                    titre,
                    year: y,
                    type,
                    region,
                    specificLocation,
                    description: description_detaillee,
                    focusType: EVENT_FOCUS_TYPES.MIXED,
                    validation_notes
                };
                try {
                    const res = await processEventWithHybridStrategy(ev, progressBar, i);
                    if (res && res.ok !== false) created++; else failed++;
                } catch (e) {
                    console.warn('SEVENT item failed:', titre, e.message);
                    failed++;
                    progressBar.update(i + 1, `✗ "${titre}" error`);
                }
            }
            console.log(`SEVENT done. Created=${created} Failed=${failed}`);
            flushRetryFailures();
            return;
        } catch (e) {
            console.error(`SEVENT error: unable to load events file "${eventsPath}":`, e.message);
            process.exit(1);
        }
    }

    console.log(`\nTypes disponibles: ${getAllEventTypes().length} types différents`);
    console.log("🎨 Styles: 8 styles cinématographiques + 8 styles alternatifs");

    const focusType = EVENT_FOCUS_TYPES.MIXED;
    console.log("✅ Focus sélectionné automatiquement : Mixte (France + Universel)");

    const startYear = parseInt(await askQuestion('Année de DÉBUT : '));
    const endYear = parseInt(await askQuestion('Année de FIN : '));
    const targetCount = parseInt(await askQuestion('Nombre d\'événements : '));

    console.log("\n=== CHARGEMENT DES DONNÉES ===");
    const loadResult = await loadExistingTitles(startYear, endYear);
    console.log(`✅ Optimisation: ${loadResult.loadedEventsCount || 'N/A'} événements chargés (au lieu de ~1000)`);

    console.log("\n=== GÉNÉRATION EN COURS ===");
    const progressBar = new ProgressBar(targetCount, 'Génération événements');

    let createdCount = 0;
    let batchNumber = 0;
    const startTime = Date.now();
    let totalValidationCount = 0;
    let totalValidationScoreSum = 0;
    const allCreatedEvents = [];
    const allCreatedEventsSummary = [];
    const failedEventsSummary = [];

    while (createdCount < targetCount && batchNumber < 75) {
        batchNumber++;
        const remainingEvents = targetCount - createdCount;
        const currentBatchSize = Math.min(BATCH_SIZE, remainingEvents);

        try {
            const completedEvents = await processBatchHybrid(startYear, endYear, currentBatchSize, batchNumber, focusType, progressBar, createdCount, allCreatedEventsSummary, failedEventsSummary);
            createdCount += completedEvents.length;
            allCreatedEvents.push(...completedEvents);

            const batchValidations = completedEvents.filter(e => e.validation_score);
            totalValidationCount += batchValidations.length;
            totalValidationScoreSum += batchValidations.reduce((sum, e) => sum + e.validation_score, 0);

        } catch (error) {
            // Silence
        }

        if (createdCount < targetCount) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    // S'assurer que la barre de progression atteint 100%
    progressBar.update(targetCount, "Terminé");

    const totalTime = (Date.now() - startTime) / 1000;
    const finalRate = createdCount / (totalTime / 60);
    const realFinalSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
    const globalAvgValidationScore = totalValidationCount > 0 ? (totalValidationScoreSum / totalValidationCount).toFixed(1) : 'N/A';

    // Statistiques des styles
    const styleStats = getStyleStatistics(allCreatedEvents);

    console.log("\n=== RÉSULTATS ===");
    console.log(`Événements créés: ${createdCount}/${targetCount} (${realFinalSuccessRate}%)`);
    console.log(`Temps total: ${Math.floor(totalTime / 60)}min ${(totalTime % 60).toFixed(0)}s`);
    console.log(`Vitesse: ${finalRate.toFixed(1)} événements/min`);
    console.log(`Focus: ${focusType.toUpperCase()}`);
    console.log(`Validation IA: ${totalValidationCount}/${createdCount} événements (${globalAvgValidationScore}/10)`);

    console.log("\n=== RÉCAPITULATIF DES ÉVÉNEMENTS ===");
    if (allCreatedEventsSummary.length) {
        console.log(`Succès (${allCreatedEventsSummary.length}) :`);
        allCreatedEventsSummary.forEach((ev, idx) => {
            const base = `${idx + 1}. ${ev.titre} (${ev.year || 'année ?'})`;
            const extras = [ev.style ? `style=${ev.style}` : null, ev.id ? `id=${ev.id}` : null].filter(Boolean);
            console.log(`  ${base}${extras.length ? ' [' + extras.join(', ') + ']' : ''}`);
        });
    } else {
        console.log('Aucun événement validé.');
    }

    if (failedEventsSummary.length) {
        console.log(`\nÉchecs (${failedEventsSummary.length}) :`);
        failedEventsSummary.forEach((ev, idx) => {
            console.log(`  ${idx + 1}. ${ev.titre || 'Titre inconnu'} (${ev.year || 'année ?'}) — ${ev.reason}`);
        });
    } else {
        console.log('\nAucun échec signalé.');
    }

    console.log("\n=== STATISTIQUES STYLES ===");
    console.log(`Distribution: ${styleStats.distribution}`);
    console.log(`Styles cinématographiques: ${styleStats.categoryCount.cinematic || 0} événements`);
    console.log(`Styles alternatifs: ${styleStats.categoryCount.alternative || 0} événements`);

    if (Object.keys(styleStats.styleCount).length > 0) {
        console.log("\nDétail par style:");
        Object.entries(styleStats.styleCount).forEach(([style, count]) => {
            console.log(`  ${style}: ${count} événement(s)`);
        });
    }

    flushRetryFailures();
    rl.close();
}

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Lancement du script
main().catch(error => {
    console.error("Erreur fatale:", error);
    flushRetryFailures();
    rl.close();
});
