import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getProdDb } from './tempete/supabase.mjs';
import { assertEnv, ensureDir, extractJsonFromText, fetchWithRetry } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MODEL_NAME = 'gemini-2.0-flash';
const OUTPUT_DIR = path.join(__dirname, '..', 'reports');
const CACHE_DIR = path.join(OUTPUT_DIR, 'historical-quality-pipeline-cache');
const DEFAULT_INPUT_REPORT = path.join(OUTPUT_DIR, 'historical-date-audit-3015-full-audit-2026-03-07.json');
const DEFAULT_MAX_BATCH_SIZE = 10;
const DEFAULT_BATCH_PAUSE_MS = 1500;
const DEFAULT_EVENT_PAUSE_MS = 0;
const DEFAULT_CHECKPOINT_EVERY = 5;
const DEFAULT_GEMINI_RETRIES = 4;
const DEFAULT_GEMINI_RETRY_BASE_MS = 2500;
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_RESUME = false;
const DEFAULT_LIMIT = 0;
const memoryCache = new Map();

function readEnvInt(name, fallback) {
    const raw = process.env[name];
    if (raw == null || String(raw).trim() === '') return fallback;
    const value = Number.parseInt(String(raw), 10);
    return Number.isFinite(value) ? value : fallback;
}

function readEnvBool(name, fallback = false) {
    const raw = process.env[name];
    if (raw == null || String(raw).trim() === '') return fallback;
    return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function safeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max = 700) {
    const s = safeText(value);
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}

function now() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRunStamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

function formatPercent(value) {
    return `${(Math.max(0, Math.min(1, value)) * 100).toFixed(1)}%`;
}

function renderProgressBar(completed, total, width = 24) {
    const safeTotal = Math.max(1, total);
    const ratio = Math.max(0, Math.min(1, completed / safeTotal));
    const filled = Math.round(ratio * width);
    return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

function logProgress(completed, total, extra = '') {
    const suffix = extra ? ` | ${extra}` : '';
    console.log(`[${now()}] Progression ${renderProgressBar(completed, total)} ${completed}/${total} (${formatPercent(completed / Math.max(1, total))})${suffix}`);
}

function extractYear(value) {
    const match = String(value || '').match(/^(\d{4})/);
    return match?.[1] || null;
}

function normalizeCompareText(raw) {
    return String(raw || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(raw) {
    return normalizeCompareText(raw).split(' ').filter(Boolean);
}

function cleanWikipediaTitle(raw) {
    return String(raw || '').replace(/_/g, ' ').trim();
}

function scoreWikipediaCandidate(eventTitle, eventYear, result) {
    const title = cleanWikipediaTitle(result?.title);
    const snippet = safeText(String(result?.snippet || '').replace(/<[^>]+>/g, ' '));
    const eventNorm = normalizeCompareText(eventTitle);
    const titleNorm = normalizeCompareText(title);
    const eventTokens = tokenize(eventTitle);
    const titleTokens = tokenize(title);
    const snippetNorm = normalizeCompareText(snippet);
    const year = eventYear ? String(eventYear) : '';
    let score = 0;

    if (eventNorm === titleNorm) score += 15;
    if (titleNorm.includes(eventNorm) || eventNorm.includes(titleNorm)) score += 6;
    const sharedTokens = eventTokens.filter((token) => token.length >= 4 && titleTokens.includes(token));
    score += sharedTokens.length * 2;
    if (year && titleNorm.includes(year)) score += 4;
    if (year && snippetNorm.includes(year)) score += 3;
    if (snippetNorm.includes(eventNorm)) score += 5;
    if (/\b(siege|si[eè]ge|bataille|battle|trait[eé]|treaty|accord|inauguration|publication|capture|arrestation|occupation|attaque|assaut|opening|ouverture)\b/.test(titleNorm)) score += 2;
    if (titleTokens.length > 0 && sharedTokens.length === 0) score -= 8;
    if (eventYear && /\b\d{4}\b/.test(titleNorm) && !titleNorm.includes(year)) score -= 6;
    return score;
}

function buildSearchVariants(title) {
    const base = safeText(title);
    const variants = [base];
    variants.push(base.replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim());
    variants.push(base.replace(/\b(début|fin|traité|bataille|prise|signature|fondation|invention|publication|naissance|mort|construction|création|creation)\b/gi, '').replace(/\s+/g, ' ').trim());
    return Array.from(new Set(variants.filter(Boolean)));
}

function isPeriodLikeTitle(title) {
    const normalized = normalizeCompareText(title);
    return /\b(regne|regence|ere|periode|age|dynastie|royaume|empire|civilisation)\b/.test(normalized);
}

function makeCacheKey(parts) {
    return JSON.stringify(parts);
}

function safeFileKey(key) {
    return Buffer.from(key).toString('base64url');
}

function getCacheFilePath(parts) {
    const key = makeCacheKey(parts);
    return path.join(CACHE_DIR, `${safeFileKey(key)}.json`);
}

function readJsonFileIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readPersistentCache(parts) {
    const key = makeCacheKey(parts);
    if (memoryCache.has(key)) return memoryCache.get(key);
    const filePath = getCacheFilePath(parts);
    const value = readJsonFileIfExists(filePath);
    memoryCache.set(key, value);
    return value;
}

function writePersistentCache(parts, value) {
    const key = makeCacheKey(parts);
    memoryCache.set(key, value);
    fs.writeFileSync(getCacheFilePath(parts), JSON.stringify(value, null, 2), 'utf8');
}

async function fetchWikipediaSearch(query, lang, searchLimit) {
    const cacheKey = ['wiki_search', lang, query, searchLimit];
    const cached = readPersistentCache(cacheKey);
    if (cached) return cached;
    const api = `https://${lang}.wikipedia.org/w/api.php`;
    const url = `${api}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${encodeURIComponent(searchLimit)}&utf8=1&format=json&origin=*`;
    const res = await fetchWithRetry(url, { method: 'GET' }, 3, 20000);
    const json = await res.json();
    const results = Array.isArray(json?.query?.search) ? json.query.search : [];
    writePersistentCache(cacheKey, results);
    return results;
}

async function fetchWikipediaPage(title, lang) {
    const cacheKey = ['wiki_page', lang, title];
    const cached = readPersistentCache(cacheKey);
    if (cached !== null) return cached;
    const api = `https://${lang}.wikipedia.org/w/api.php`;
    const url = `${api}?action=query&titles=${encodeURIComponent(title)}&prop=extracts|pageprops|info&inprop=url&exintro=1&explaintext=1&redirects=1&format=json&origin=*`;
    const res = await fetchWithRetry(url, { method: 'GET' }, 3, 20000);
    const json = await res.json();
    const pages = json?.query?.pages ? Object.values(json.query.pages) : [];
    const page = pages.find((item) => item && !item.missing);
    if (!page) {
        writePersistentCache(cacheKey, null);
        return null;
    }
    const resolved = {
        title: cleanWikipediaTitle(page.title),
        extract: safeText(page.extract),
        url: page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(cleanWikipediaTitle(page.title).replace(/\s+/g, '_'))}`,
        wikidataId: typeof page?.pageprops?.wikibase_item === 'string' ? page.pageprops.wikibase_item.trim() : null,
    };
    writePersistentCache(cacheKey, resolved);
    return resolved;
}

async function resolveWikipediaSource(eventTitle, lang, eventYear, searchLimit) {
    const variants = buildSearchVariants(eventTitle);
    const queries = [...variants, ...variants.map((variant) => `${variant} ${eventYear || ''}`.trim())].filter(Boolean);
    let best = null;
    let bestScore = -1;
    for (const query of Array.from(new Set(queries))) {
        const results = await fetchWikipediaSearch(query, lang, searchLimit);
        for (const result of results) {
            const score = scoreWikipediaCandidate(eventTitle, eventYear, result);
            if (score > bestScore) {
                bestScore = score;
                best = cleanWikipediaTitle(result?.title);
            }
        }
    }
    if (!best || bestScore < 2) return null;
    try {
        return await fetchWikipediaPage(best, lang);
    } catch {
        return null;
    }
}

function normalizeWikidataTime(timeValue, precisionValue) {
    const time = String(timeValue || '');
    const precision = Number.parseInt(String(precisionValue || ''), 10);
    const match = time.match(/^([+-])(\d{4})-(\d{2})-(\d{2})T/);
    if (!match) return null;
    const sign = match[1];
    const year = Number.parseInt(match[2], 10);
    const month = Number.parseInt(match[3], 10);
    const day = Number.parseInt(match[4], 10);
    if (!Number.isFinite(year) || sign === '-') return null;
    if (precision >= 11) return { iso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, precision: 'day' };
    if (precision === 10) return { iso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`, precision: 'month' };
    return { iso: `${String(year).padStart(4, '0')}-01-01`, precision: 'year' };
}

async function fetchWikidataEntity(entityId) {
    if (!entityId) return null;
    const cacheKey = ['wikidata_entity', entityId];
    const cached = readPersistentCache(cacheKey);
    if (cached !== null) return cached;
    const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(entityId)}.json`;
    const res = await fetchWithRetry(url, { method: 'GET' }, 3, 20000);
    const json = await res.json();
    const entity = json?.entities?.[entityId] || null;
    writePersistentCache(cacheKey, entity);
    return entity;
}

function extractWikidataEvidence(entity) {
    if (!entity) return [];
    const claims = entity?.claims || {};
    const properties = [
        ['P585', 'point in time'],
        ['P580', 'start time'],
        ['P571', 'inception'],
        ['P577', 'publication date'],
        ['P569', 'date of birth'],
        ['P570', 'date of death'],
    ];
    const evidence = [];
    for (const [property, label] of properties) {
        const claimList = Array.isArray(claims[property]) ? claims[property] : [];
        for (const claim of claimList.slice(0, 2)) {
            const normalized = normalizeWikidataTime(claim?.mainsnak?.datavalue?.value?.time, claim?.mainsnak?.datavalue?.value?.precision);
            if (!normalized) continue;
            evidence.push({
                source_id: `${property}_${evidence.length + 1}`,
                source_type: 'wikidata',
                title: entity.id,
                url: `https://www.wikidata.org/wiki/${entity.id}`,
                quote: `${label}: ${normalized.iso}`,
                date_iso: normalized.iso,
                precision: normalized.precision,
                wikidata_id: entity.id,
            });
        }
    }
    return evidence;
}

function dedupeEvidence(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        const key = `${item.source_type}|${item.title}|${item.date_iso || ''}|${item.url || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

async function buildSourcesForEvent(event, runtimeOptions) {
    const eventYear = extractYear(event.date);
    const sources = [];
    const fr = await resolveWikipediaSource(event.titre, 'fr', eventYear, runtimeOptions.wikiSearchLimit);
    if (fr) {
        sources.push({ source_id: 'wikipedia_fr_article', source_type: 'wikipedia_fr', title: fr.title, url: fr.url, quote: truncate(fr.extract, 900), wikidata_id: fr.wikidataId || null, date_iso: null, precision: null });
    }
    const en = await resolveWikipediaSource(event.titre, 'en', eventYear, runtimeOptions.wikiSearchLimit);
    if (en) {
        sources.push({ source_id: 'wikipedia_en_article', source_type: 'wikipedia_en', title: en.title, url: en.url, quote: truncate(en.extract, 900), wikidata_id: en.wikidataId || null, date_iso: null, precision: null });
    }
    const wikidataId = fr?.wikidataId || en?.wikidataId || null;
    if (wikidataId) {
        const entity = await fetchWikidataEntity(wikidataId);
        sources.push(...extractWikidataEvidence(entity));
    }
    return dedupeEvidence(sources);
}

function escapeCsv(value) {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function toCsv(rows) {
    const headers = [
        'id',
        'current_title',
        'current_date',
        'decision',
        'final_decision',
        'proposed_title',
        'proposed_date_iso',
        'review_required',
        'evidence_level',
        'confidence',
        'status',
        'result_bucket',
        'reasoning_short',
        'recommendation',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map((header) => escapeCsv(row[header] ?? '')).join(','));
    }
    return lines.join('\n');
}

function writeDecisionCsvExports(outputBaseName, rows) {
    const groups = new Map();
    for (const row of rows) {
        const key = safeText(row?.final_decision || 'UNKNOWN').toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }
    for (const [decision, items] of groups.entries()) {
        const filePath = path.join(OUTPUT_DIR, `${outputBaseName}.${decision}.csv`);
        fs.writeFileSync(filePath, toCsv(items), 'utf8');
    }
}

function classifyOperationalBucket(row) {
    if (safeText(row?.final_decision).toUpperCase() === 'DELETE') return 'delete';
    if (safeText(row?.final_decision).toUpperCase() === 'REVIEW') return 'review';
    if (safeText(row?.final_decision).toUpperCase() === 'KEEP_ACCEPTABLE') return 'keep_acceptable';
    if (
        safeText(row?.final_decision).toUpperCase() === 'UPDATE_DATE'
        && safeText(row?.status).toUpperCase() === 'POTENTIAL_DATE_ERROR'
        && safeText(row?.evidence_level).toUpperCase() === 'A'
        && Number(row?.confidence || 0) >= 0.9
    ) {
        return 'safe_updates';
    }
    return 'review';
}

function writeOperationalExports(outputBaseName, rows) {
    const groups = new Map([
        ['safe_updates', []],
        ['keep_acceptable', []],
        ['review', []],
        ['delete', []],
    ]);
    for (const row of rows) {
        const bucket = classifyOperationalBucket(row);
        groups.get(bucket).push(row);
    }
    for (const [bucket, items] of groups.entries()) {
        const csvPath = path.join(OUTPUT_DIR, `${outputBaseName}.${bucket}.csv`);
        const jsonPath = path.join(OUTPUT_DIR, `${outputBaseName}.${bucket}.json`);
        fs.writeFileSync(csvPath, toCsv(items), 'utf8');
        fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
    }
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getRuntimeOptions() {
    const requestedInput = safeText(process.env.QUALITY_INPUT_REPORT);
    const requestedStatuses = safeText(process.env.QUALITY_INCLUDE_STATUSES);
    return {
        inputReport: requestedInput || DEFAULT_INPUT_REPORT,
        limit: Math.max(0, readEnvInt('QUALITY_LIMIT', DEFAULT_LIMIT)),
        maxBatchSize: Math.max(1, readEnvInt('QUALITY_MAX_BATCH_SIZE', DEFAULT_MAX_BATCH_SIZE)),
        batchPauseMs: Math.max(0, readEnvInt('QUALITY_BATCH_PAUSE_MS', DEFAULT_BATCH_PAUSE_MS)),
        eventPauseMs: Math.max(0, readEnvInt('QUALITY_EVENT_PAUSE_MS', DEFAULT_EVENT_PAUSE_MS)),
        checkpointEvery: Math.max(1, readEnvInt('QUALITY_CHECKPOINT_EVERY', DEFAULT_CHECKPOINT_EVERY)),
        geminiRetries: Math.max(1, readEnvInt('QUALITY_GEMINI_RETRIES', DEFAULT_GEMINI_RETRIES)),
        geminiRetryBaseMs: Math.max(250, readEnvInt('QUALITY_GEMINI_RETRY_BASE_MS', DEFAULT_GEMINI_RETRY_BASE_MS)),
        wikiSearchLimit: Math.max(1, readEnvInt('QUALITY_WIKI_SEARCH_LIMIT', DEFAULT_SEARCH_LIMIT)),
        resume: readEnvBool('QUALITY_RESUME', DEFAULT_RESUME),
        includeStatuses: requestedStatuses ? requestedStatuses.split(',').map((item) => safeText(item)).filter(Boolean) : [],
    };
}

async function fetchEventsByIds(ids) {
    const db = getProdDb();
    const out = [];
    for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { data, error } = await db
            .from('evenements')
            .select('id,titre,date,description_detaillee,langue,region,epoque,mots_cles,types_evenement,source_goju2_id')
            .in('id', chunk);
        if (error) throw error;
        out.push(...(data || []));
    }
    return out;
}

function summarizeByField(rows, field) {
    const summary = {};
    for (const row of rows) {
        const key = safeText(row?.[field]) || 'UNKNOWN';
        summary[key] = (summary[key] || 0) + 1;
    }
    return summary;
}

function runGeminiClient() {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
}

function isRetryableGeminiError(error) {
    return /(429|quota|rate limit|temporar|timeout|unavailable|overloaded|503|500|fetch failed|network)/i.test(safeText(error?.message || error));
}

async function runGeminiWithRetry(model, prompt, runtimeOptions) {
    let lastError = null;
    for (let attempt = 1; attempt <= runtimeOptions.geminiRetries; attempt += 1) {
        try {
            return await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                },
            });
        } catch (error) {
            lastError = error;
            if (attempt >= runtimeOptions.geminiRetries || !isRetryableGeminiError(error)) break;
            const waitMs = runtimeOptions.geminiRetryBaseMs * attempt;
            console.log(`[${now()}] Gemini retry ${attempt}/${runtimeOptions.geminiRetries} dans ${waitMs}ms: ${safeText(error?.message || error)}`);
            await sleep(waitMs);
        }
    }
    throw lastError;
}

function looksFrenchEnough(title) {
    const normalized = normalizeCompareText(title);
    return /\b(de|du|des|la|le|les|et|sur|contre|pour|dans|avec|premiere|première|trait[eé]|bataille|prise|mort|naissance|fondation|inauguration|publication|siege|si[eè]ge|guerre|r[eè]gne)\b/.test(normalized) || /[àâçéèêëîïôûùüÿœæ]/i.test(title);
}

function titleHasDate(title) {
    return /\b\d{3,4}\b/.test(String(title || ''));
}

function validateDecision(proposal, event) {
    const normalized = {
        ...proposal,
        proposed_title: proposal?.proposed_title ? safeText(proposal.proposed_title) : null,
        proposed_date_iso: proposal?.proposed_date_iso ? safeText(proposal.proposed_date_iso) : null,
        confidence: Number.isFinite(Number(proposal?.confidence)) ? Math.max(0, Math.min(1, Number(proposal.confidence))) : 0,
        review_required: proposal?.review_required === true,
    };
    const decision = safeText(normalized.decision).toUpperCase();
    const mutating = ['UPDATE_TITLE', 'UPDATE_DATE', 'UPDATE_BOTH', 'DELETE'].includes(decision);
    let finalDecision = decision || 'REVIEW';
    const eventStatus = safeText(event?.status).toUpperCase();
    const currentTitle = safeText(event?.current_title || event?.titre || '');
    const periodLikeTitle = isPeriodLikeTitle(currentTitle);

    if (!['KEEP', 'KEEP_ACCEPTABLE', 'UPDATE_TITLE', 'UPDATE_DATE', 'UPDATE_BOTH', 'DELETE', 'REVIEW'].includes(finalDecision)) {
        finalDecision = 'REVIEW';
    }
    if (['UPDATE_TITLE', 'UPDATE_BOTH'].includes(finalDecision) && !normalized.proposed_title) {
        finalDecision = 'REVIEW';
    }
    if (['UPDATE_DATE', 'UPDATE_BOTH'].includes(finalDecision) && !/^\d{4}-\d{2}-\d{2}$/.test(normalized.proposed_date_iso || '')) {
        finalDecision = 'REVIEW';
    }
    if (['UPDATE_TITLE', 'UPDATE_BOTH'].includes(finalDecision) && titleHasDate(normalized.proposed_title)) {
        finalDecision = 'REVIEW';
    }
    if (['UPDATE_TITLE', 'UPDATE_BOTH'].includes(finalDecision) && !looksFrenchEnough(normalized.proposed_title)) {
        finalDecision = 'REVIEW';
    }
    if (mutating && normalized.evidence_level === 'C') {
        finalDecision = 'REVIEW';
    }
    if (finalDecision === 'DELETE' && normalized.evidence_level !== 'A') {
        finalDecision = 'REVIEW';
    }
    if (finalDecision === 'DELETE' && normalized.confidence < 0.9) {
        finalDecision = 'REVIEW';
    }
    if (finalDecision === 'DELETE' && ['DISPUTED_DATE', 'POTENTIAL_DATE_ERROR'].includes(eventStatus)) {
        finalDecision = 'REVIEW';
    }
    if (periodLikeTitle) {
        finalDecision = 'DELETE';
    }
    if (eventStatus === 'DISPUTED_DATE' && finalDecision !== 'DELETE') {
        finalDecision = 'REVIEW';
    }
    if (eventStatus === 'AMBIGUOUS_TITLE' && finalDecision !== 'DELETE' && !['UPDATE_TITLE', 'UPDATE_BOTH'].includes(finalDecision)) {
        finalDecision = 'REVIEW';
    }
    if (eventStatus === 'INSUFFICIENT_EVIDENCE' && finalDecision === 'KEEP' && normalized.confidence >= 0.7) {
        finalDecision = 'KEEP_ACCEPTABLE';
    }
    if (eventStatus === 'INSUFFICIENT_EVIDENCE' && finalDecision === 'KEEP_ACCEPTABLE' && normalized.confidence < 0.65) {
        finalDecision = 'REVIEW';
    }
    if (eventStatus === 'INSUFFICIENT_EVIDENCE' && finalDecision === 'KEEP_ACCEPTABLE' && normalized.title_unambiguous === false) {
        finalDecision = 'REVIEW';
    }
    if (eventStatus === 'INSUFFICIENT_EVIDENCE' && finalDecision === 'KEEP_ACCEPTABLE' && normalized.event_is_singular === false) {
        finalDecision = 'DELETE';
    }
    if (['UPDATE_TITLE', 'UPDATE_DATE', 'UPDATE_BOTH'].includes(finalDecision) && normalized.evidence_level !== 'A') {
        finalDecision = 'REVIEW';
    }
    if (['UPDATE_TITLE', 'UPDATE_DATE', 'UPDATE_BOTH'].includes(finalDecision) && normalized.confidence < 0.85) {
        finalDecision = 'REVIEW';
    }
    if (normalized.description_consistent === false || normalized.title_unambiguous === false || normalized.event_is_singular === false) {
        if (finalDecision !== 'DELETE') finalDecision = 'REVIEW';
    }
    if (finalDecision === 'KEEP' && normalized.confidence < 0.75 && event.status !== 'CONFIRMED') {
        finalDecision = 'REVIEW';
    }
    if (finalDecision === 'KEEP_ACCEPTABLE' && normalized.confidence < 0.65) {
        finalDecision = 'REVIEW';
    }

    return {
        ...normalized,
        final_decision: finalDecision,
        review_required: normalized.review_required || finalDecision === 'REVIEW' || finalDecision === 'DELETE' || finalDecision === 'UPDATE_BOTH',
    };
}

function buildPrompt(event, auditResult, sources) {
    return `Tu es un réviseur historique ultra-strict chargé de préparer une base d'événements propre à 100%.

Objectif:
- Décider si l'événement doit être conservé, corrigé ou supprimé.
- Le titre final doit être en français, univoque, sans date, et correspondre à l'appellation la plus officielle ou standard possible.
- Si tu modifies le titre ou la date, tu dois absolument vérifier la cohérence avec la description détaillée.
- Si la fiche n'est pas récupérable proprement, il faut proposer DELETE.
- Ne jamais inventer de source ni d'information.
- Répondre strictement en JSON.

Décisions autorisées:
- KEEP
- KEEP_ACCEPTABLE
- UPDATE_TITLE
- UPDATE_DATE
- UPDATE_BOTH
- DELETE
- REVIEW

Niveaux de preuve:
- A: au moins 2 signaux forts concordants
- B: assez bon mais pas irréprochable
- C: fragile ou ambigu

Événement actuel:
${JSON.stringify({
    id: event.id,
    current_title: safeText(event.titre),
    current_date: safeText(event.date),
    current_description: truncate(event.description_detaillee, 1500),
    langue: safeText(event.langue),
    region: safeText(event.region),
    epoque: safeText(event.epoque),
    mots_cles: Array.isArray(event.mots_cles) ? event.mots_cles.slice(0, 12) : [],
    types_evenement: Array.isArray(event.types_evenement) ? event.types_evenement.slice(0, 12) : [],
}, null, 2)}

Résultat d'audit précédent:
${JSON.stringify(auditResult, null, 2)}

Sources externes:
${JSON.stringify(sources, null, 2)}

Réponds strictement avec ce JSON:
{
  "decision": "KEEP|KEEP_ACCEPTABLE|UPDATE_TITLE|UPDATE_DATE|UPDATE_BOTH|DELETE|REVIEW",
  "proposed_title": "... ou null",
  "proposed_date_iso": "YYYY-MM-DD ou null",
  "delete_reason": "... ou null",
  "confidence": 0.0,
  "evidence_level": "A|B|C",
  "official_name_respected": true,
  "title_in_french": true,
  "title_unambiguous": true,
  "title_has_no_date": true,
  "event_is_singular": true,
  "description_consistent": true,
  "reasoning_short": "...",
  "recommendation": "...",
  "key_sources": ["source_id_1", "source_id_2"],
  "review_required": false
}`;
}

async function reviewEvent(model, event, auditResult, runtimeOptions) {
    const sources = await buildSourcesForEvent(event, runtimeOptions);
    const prompt = buildPrompt(event, auditResult, sources);
    const raw = await runGeminiWithRetry(model, prompt, runtimeOptions);
    const parsed = extractJsonFromText(raw?.response?.text?.() || '{}');
    const proposal = validateDecision({
        decision: parsed?.decision,
        proposed_title: parsed?.proposed_title,
        proposed_date_iso: parsed?.proposed_date_iso,
        delete_reason: parsed?.delete_reason ? truncate(parsed.delete_reason, 240) : null,
        confidence: parsed?.confidence,
        evidence_level: safeText(parsed?.evidence_level).toUpperCase() || 'C',
        official_name_respected: parsed?.official_name_respected === true,
        title_in_french: parsed?.title_in_french === true,
        title_unambiguous: parsed?.title_unambiguous === true,
        title_has_no_date: parsed?.title_has_no_date === true,
        event_is_singular: parsed?.event_is_singular === true,
        description_consistent: parsed?.description_consistent === true,
        reasoning_short: truncate(parsed?.reasoning_short, 320),
        recommendation: truncate(parsed?.recommendation, 240),
        key_sources: Array.isArray(parsed?.key_sources) ? parsed.key_sources.map((item) => safeText(item)).filter(Boolean) : [],
        review_required: parsed?.review_required === true,
    }, {
        ...auditResult,
        current_title: event.titre,
    });

    return {
        id: event.id,
        current_title: event.titre,
        current_date: event.date,
        current_description: event.description_detaillee,
        status: auditResult.status,
        result_bucket: auditResult.result_bucket,
        date_candidate: auditResult.date_candidate,
        matched_article_fr: auditResult.matched_article_fr,
        matched_article_en: auditResult.matched_article_en,
        wikidata_id: auditResult.wikidata_id,
        sources_checked: sources,
        ...proposal,
    };
}

function buildOutputPayload(results, selectedAuditRows, runStamp, runtimeOptions, meta = {}) {
    return {
        generated_at: now(),
        run_stamp: runStamp,
        model_name: MODEL_NAME,
        runtime_options: runtimeOptions,
        selected_event_ids: selectedAuditRows.map((row) => row.id),
        summary_by_decision: summarizeByField(results, 'decision'),
        summary_by_final_decision: summarizeByField(results, 'final_decision'),
        summary_by_status: summarizeByField(results, 'status'),
        summary_by_result_bucket: summarizeByField(results, 'result_bucket'),
        checkpoint: meta.checkpoint === true,
        completed: meta.completed === true,
        interrupted: meta.interrupted === true,
        resumed_count: meta.resumed_count || 0,
        results,
    };
}

function writeOutputs(outputJson, outputCsv, payload) {
    fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(outputCsv, toCsv(payload.results), 'utf8');
    writeDecisionCsvExports(path.basename(outputJson, '.json'), payload.results);
    writeOperationalExports(path.basename(outputJson, '.json'), payload.results);
}

function writeCheckpoint(checkpointPath, payload) {
    fs.writeFileSync(checkpointPath, JSON.stringify(payload, null, 2), 'utf8');
}

function loadCheckpoint(checkpointPath) {
    const checkpoint = readJsonFileIfExists(checkpointPath);
    if (!checkpoint || !Array.isArray(checkpoint.results)) return null;
    return checkpoint;
}

function createInterruptHandler(context) {
    let stopping = false;
    return () => {
        if (stopping) return;
        stopping = true;
        try {
            const payload = buildOutputPayload(context.results, context.selectedAuditRows, context.runStamp, context.runtimeOptions, {
                checkpoint: true,
                completed: false,
                interrupted: true,
                resumed_count: context.resumedCount,
            });
            writeCheckpoint(context.checkpointPath, payload);
            writeOutputs(context.outputJson, context.outputCsv, payload);
            console.log(`[${now()}] Interruption demandée: checkpoint sauvegardé.`);
        } catch (error) {
            console.error(`[${now()}] Erreur pendant la sauvegarde d'interruption: ${error?.stack || error?.message || error}`);
        }
        process.exit(130);
    };
}

async function main() {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    assertEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    assertEnv('SUPABASE_PROD_SERVICE_ROLE_KEY', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
    ensureDir(OUTPUT_DIR);
    ensureDir(CACHE_DIR);

    const runtimeOptions = getRuntimeOptions();
    const report = loadJson(runtimeOptions.inputReport);
    const requestedRunStamp = safeText(process.env.QUALITY_RUN_STAMP);
    const runStamp = requestedRunStamp || buildRunStamp();
    const outputBaseName = `historical-quality-pipeline-${runStamp}`;
    const outputJson = path.join(OUTPUT_DIR, `${outputBaseName}.json`);
    const outputCsv = path.join(OUTPUT_DIR, `${outputBaseName}.csv`);
    const checkpointPath = path.join(OUTPUT_DIR, `${outputBaseName}.checkpoint.json`);

    let selectedAuditRows = Array.isArray(report?.results) ? report.results : [];
    if (runtimeOptions.includeStatuses.length > 0) {
        const included = new Set(runtimeOptions.includeStatuses);
        selectedAuditRows = selectedAuditRows.filter((row) => included.has(row.status));
    }
    if (runtimeOptions.limit > 0) {
        selectedAuditRows = selectedAuditRows.slice(0, runtimeOptions.limit);
    }

    const checkpoint = runtimeOptions.resume ? loadCheckpoint(checkpointPath) : null;
    if (checkpoint?.selected_event_ids?.length) {
        const selectedById = new Map(selectedAuditRows.map((row) => [row.id, row]));
        const reconstructed = checkpoint.selected_event_ids.map((id) => selectedById.get(id)).filter(Boolean);
        if (reconstructed.length === checkpoint.selected_event_ids.length) {
            selectedAuditRows = reconstructed;
        }
    }

    const eventIds = selectedAuditRows.map((row) => row.id);
    const events = await fetchEventsByIds(eventIds);
    const eventsById = new Map(events.map((event) => [event.id, event]));

    const results = checkpoint?.results || [];
    const processedIds = new Set(results.map((row) => row.id));
    const resumedCount = results.length;

    console.log(`[${now()}] Pipeline qualité historique — démarrage`);
    console.log(`[${now()}] Rapport source: ${runtimeOptions.inputReport}`);
    console.log(`[${now()}] Événements sélectionnés: ${selectedAuditRows.length}`);
    if (runtimeOptions.resume && resumedCount > 0) {
        console.log(`[${now()}] Reprise activée: ${resumedCount} dossiers rechargés depuis ${checkpointPath}`);
    }
    logProgress(results.length, selectedAuditRows.length, resumedCount > 0 ? 'état initial après reprise' : 'état initial');

    const model = runGeminiClient();
    const interruptHandler = createInterruptHandler({ checkpointPath, outputCsv, outputJson, results, resumedCount, runStamp, runtimeOptions, selectedAuditRows });
    process.on('SIGINT', interruptHandler);
    process.on('SIGTERM', interruptHandler);

    try {
        for (let i = 0; i < selectedAuditRows.length; i += 1) {
            const auditRow = selectedAuditRows[i];
            const event = eventsById.get(auditRow.id);
            if (!event) {
                throw new Error(`Événement introuvable pour id=${auditRow.id}`);
            }
            if (processedIds.has(event.id)) {
                console.log(`[${now()}] [${i + 1}/${selectedAuditRows.length}] ${event.titre} -> SKIP déjà traité`);
                logProgress(results.length, selectedAuditRows.length, 'skip déjà traité');
                continue;
            }
            console.log(`[${now()}] [${i + 1}/${selectedAuditRows.length}] ${event.titre} (${event.date}) | ${auditRow.status}/${auditRow.result_bucket}`);
            const reviewed = await reviewEvent(model, event, auditRow, runtimeOptions);
            results.push(reviewed);
            processedIds.add(event.id);
            console.log(`[${now()}] -> ${reviewed.final_decision} | decision=${reviewed.decision} | confidence=${reviewed.confidence} | evidence=${reviewed.evidence_level}`);
            logProgress(results.length, selectedAuditRows.length);

            if (results.length % runtimeOptions.checkpointEvery === 0 || i === selectedAuditRows.length - 1) {
                const checkpointPayload = buildOutputPayload(results, selectedAuditRows, runStamp, runtimeOptions, {
                    checkpoint: true,
                    completed: results.length >= selectedAuditRows.length,
                    resumed_count: resumedCount,
                });
                writeCheckpoint(checkpointPath, checkpointPayload);
                writeOutputs(outputJson, outputCsv, checkpointPayload);
                console.log(`[${now()}] Checkpoint sauvegardé (${results.length}/${selectedAuditRows.length}).`);
            }
            if (runtimeOptions.eventPauseMs > 0) {
                await sleep(runtimeOptions.eventPauseMs);
            }
            if ((i + 1) % runtimeOptions.maxBatchSize === 0 && runtimeOptions.batchPauseMs > 0) {
                console.log(`[${now()}] Pause batch ${runtimeOptions.batchPauseMs}ms après ${i + 1} éléments parcourus.`);
                await sleep(runtimeOptions.batchPauseMs);
            }
        }

        const finalPayload = buildOutputPayload(results, selectedAuditRows, runStamp, runtimeOptions, {
            checkpoint: false,
            completed: true,
            resumed_count: resumedCount,
        });
        writeOutputs(outputJson, outputCsv, finalPayload);
        writeCheckpoint(checkpointPath, finalPayload);
        console.log(`[${now()}] Pipeline qualité terminé.`);
        console.log('Résumé par décision initiale:');
        console.log(finalPayload.summary_by_decision);
        console.log('Résumé par décision finale:');
        console.log(finalPayload.summary_by_final_decision);
        console.log(`JSON: ${outputJson}`);
        console.log(`CSV: ${outputCsv}`);
    } finally {
        process.off('SIGINT', interruptHandler);
        process.off('SIGTERM', interruptHandler);
    }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
    main().catch((error) => {
        console.error(`[${now()}] FATAL: ${error?.stack || error?.message || error}`);
        process.exit(1);
    });
}

export {
    buildOutputPayload,
    buildSearchVariants,
    buildSourcesForEvent,
    classifyOperationalBucket,
    isPeriodLikeTitle,
    looksFrenchEnough,
    titleHasDate,
    writeDecisionCsvExports,
    writeOperationalExports,
    validateDecision,
};

