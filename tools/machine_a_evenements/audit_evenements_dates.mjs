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

const DEFAULT_SAMPLE_SIZE = 50;
const MODEL_NAME = 'gemini-2.0-flash';
const OUTPUT_DIR = path.join(__dirname, '..', 'reports');
const CACHE_DIR = path.join(OUTPUT_DIR, 'historical-date-audit-cache');
const DEFAULT_PERIOD_BUCKETS = 5;
const DEFAULT_MAX_BATCH_SIZE = 10;
const DEFAULT_BATCH_PAUSE_MS = 1500;
const DEFAULT_EVENT_PAUSE_MS = 0;
const DEFAULT_CHECKPOINT_EVERY = 5;
const DEFAULT_GEMINI_RETRIES = 4;
const DEFAULT_GEMINI_RETRY_BASE_MS = 2500;
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_RESUME = false;
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

function getRuntimeOptions() {
    return {
        sampleSize: Math.max(1, readEnvInt('AUDIT_SAMPLE_SIZE', DEFAULT_SAMPLE_SIZE)),
        periodBuckets: Math.max(1, readEnvInt('AUDIT_PERIOD_BUCKETS', DEFAULT_PERIOD_BUCKETS)),
        maxBatchSize: Math.max(1, readEnvInt('AUDIT_MAX_BATCH_SIZE', DEFAULT_MAX_BATCH_SIZE)),
        batchPauseMs: Math.max(0, readEnvInt('AUDIT_BATCH_PAUSE_MS', DEFAULT_BATCH_PAUSE_MS)),
        eventPauseMs: Math.max(0, readEnvInt('AUDIT_EVENT_PAUSE_MS', DEFAULT_EVENT_PAUSE_MS)),
        checkpointEvery: Math.max(1, readEnvInt('AUDIT_CHECKPOINT_EVERY', DEFAULT_CHECKPOINT_EVERY)),
        geminiRetries: Math.max(1, readEnvInt('AUDIT_GEMINI_RETRIES', DEFAULT_GEMINI_RETRIES)),
        geminiRetryBaseMs: Math.max(250, readEnvInt('AUDIT_GEMINI_RETRY_BASE_MS', DEFAULT_GEMINI_RETRY_BASE_MS)),
        wikiSearchLimit: Math.max(1, readEnvInt('AUDIT_WIKI_SEARCH_LIMIT', DEFAULT_SEARCH_LIMIT)),
        resume: readEnvBool('AUDIT_RESUME', DEFAULT_RESUME),
    };
}

function buildRunStamp() {
    const iso = new Date().toISOString().replace(/[:.]/g, '-');
    return iso;
}

function now() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function yearFromDateValue(value) {
    if (!value) return null;
    const s = String(value).trim();
    const match = s.match(/^(\d{1,4})-/);
    if (!match) return null;
    const year = Number.parseInt(match[1], 10);
    return Number.isFinite(year) ? year : null;
}

function safeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, max = 700) {
    const s = safeText(value);
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}

function escapeCsv(value) {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsv(rows) {
    const headers = [
        'id',
        'titre',
        'date_in_db',
        'date_candidate',
        'precision',
        'status',
        'result_bucket',
        'confidence',
        'needs_human_review',
        'recommendation',
        'matched_article_fr',
        'matched_article_en',
        'wikidata_id',
    ];
    const lines = [headers.join(',')];
    for (const row of rows) {
        const values = headers.map((key) => escapeCsv(row[key] ?? ''));
        lines.push(values.join(','));
    }
    return lines.join('\n');
}

function cleanWikipediaTitle(raw) {
    return String(raw || '').replace(/_/g, ' ').trim();
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

function countRelevantSharedTokens(eventTitle, candidateTitle) {
    const stopWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'par', 'sur', 'with', 'the', 'of', 'for', 'a', 'an']);
    const eventTokens = tokenize(eventTitle).filter((token) => token.length >= 4 && !stopWords.has(token));
    const candidateTokens = new Set(tokenize(candidateTitle).filter((token) => token.length >= 4 && !stopWords.has(token)));
    return eventTokens.filter((token) => candidateTokens.has(token)).length;
}

function isGenericWikipediaTitle(title) {
    const normalized = normalizeCompareText(title);
    return /^(paris|france|alexandrie|blois|toulouse|rouen|orvieto|kilwa|chartres|danemark|allemagne|egypte|rwanda)$/.test(normalized)
        || /^(chronologie de|history of|timeline of)/.test(normalized)
        || /(liste de|list of|chronologie|geographie|géographie|commune|ville|personnalite|personnalité|royaume|empire)$/.test(normalized);
}

function inferResultBucket(status, audit, sources, dbDate) {
    const hasRelevantSource = sources.some((item) => {
        const shared = countRelevantSharedTokens(audit.event_identity || '', item.title || '');
        return shared >= 2 || Boolean(item.date_iso);
    });
    const matches = compareDbDateWithCandidate(dbDate, audit.proposed_date_iso, audit.precision);

    if (status === 'AMBIGUOUS_TITLE') return 'titre_ambigu_ou_collision';
    if (status === 'DISPUTED_DATE') return 'date_disputee';
    if (status === 'POTENTIAL_DATE_ERROR') return 'divergence_date';
    if (status === 'CONFIRMED') return 'confirme';
    if (status === 'LIKELY_CORRECT') {
        if (!hasRelevantSource) return 'preuve_externe_faible';
        if (matches === true) return 'probable_mais_a_confirmer';
        return 'a_revoir';
    }
    if (audit.is_time_span || audit.is_period_based || audit.is_not_singular_event) return 'absence_de_singularite';
    if (!audit.exact_year_supported) return 'annee_exacte_introuvable';
    if (!hasRelevantSource) return 'retrieval_insuffisant';
    return 'preuve_insuffisante';
}

function isLikelyPeriodTitle(title) {
    const normalized = normalizeCompareText(title);
    return /(crise|croisade|guerre|regne|r[eè]gne|dynastie|empire|epoque|[eè]re|periode|p[eé]riode|siecle|si[eè]cle|campagne|voyages|reconquete|reconqu[eê]te)/.test(normalized);
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
    const genericTitle = isGenericWikipediaTitle(title);

    if (eventNorm === titleNorm) score += 15;
    if (titleNorm.includes(eventNorm) || eventNorm.includes(titleNorm)) score += 6;

    const sharedTokens = eventTokens.filter((token) => token.length >= 4 && titleTokens.includes(token));
    score += sharedTokens.length * 2;

    if (year && titleNorm.includes(year)) score += 4;
    if (year && snippetNorm.includes(year)) score += 3;

    if (snippetNorm.includes(eventNorm)) score += 5;
    if (/battle|bataille|catastrophe|inauguration|front populaire|nil|vajont|petronas|malplaquet|noyon|toulouse/.test(titleNorm)) score += 2;
    if (/\b(siege|si[eè]ge|bataille|battle|trait[eé]|treaty|accord|inauguration|publication|capture|arrestation|occupation|attaque|assaut|opening|ouverture)\b/.test(titleNorm)) score += 2;

    if (titleTokens.length > 0 && sharedTokens.length === 0) score -= 8;
    if (eventYear && /\b\d{4}\b/.test(titleNorm) && !titleNorm.includes(year)) score -= 6;
    if (eventYear && /\b\d{4}\b/.test(snippetNorm) && !snippetNorm.includes(year) && sharedTokens.length < 2) score -= 2;
    if (genericTitle) score -= 9;
    if (/\b(birth|death|naissance|mort|gare|station|commune|city|ville|royaume|kingdom|person|personne|museum|mus[eé]e)\b/.test(titleNorm) && sharedTokens.length < 2) score -= 6;
    if (/\b(first|premiere|première|debut|début)\b/.test(eventNorm) && !/\b(first|premiere|première|debut|début|start)\b/.test(titleNorm) && sharedTokens.length < 2) score -= 4;

    return score;
}

function buildSearchVariants(title) {
    const base = safeText(title);
    const variants = [base];
    variants.push(base.replace(/[()\[\]]/g, ' ').replace(/\s+/g, ' ').trim());
    variants.push(base.replace(/\b(début|fin|traité|bataille|prise|signature|fondation|invention|publication|naissance|mort)\b/gi, '').replace(/\s+/g, ' ').trim());
    return Array.from(new Set(variants.filter(Boolean)));
}

async function fetchWikipediaSearch(query, lang, options = {}) {
    const searchLimit = Number.isFinite(options.searchLimit) ? options.searchLimit : DEFAULT_SEARCH_LIMIT;
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

async function fetchWikipediaSearchSet(queries, lang, options = {}) {
    const all = [];
    for (const query of queries) {
        const results = await fetchWikipediaSearch(query, lang, options);
        all.push(...results);
    }
    return all;
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

async function resolveWikipediaSource(eventTitle, lang, options = {}) {
    const eventYear = options.eventYear ? String(options.eventYear) : '';
    const variants = buildSearchVariants(eventTitle);
    const searchQueries = [...variants];
    if (eventYear) {
        searchQueries.push(...variants.map((variant) => `${variant} ${eventYear}`));
    }
    let best = null;
    let bestScore = -1;
    const results = await fetchWikipediaSearchSet(Array.from(new Set(searchQueries)), lang, options);

    for (const result of results) {
        const score = scoreWikipediaCandidate(eventTitle, eventYear, result);
        if (score < 0) continue;
        if (score > bestScore) {
            bestScore = score;
            best = cleanWikipediaTitle(result?.title);
        }
    }

    if (bestScore < 2) {
        return null;
    }

    if (!best && variants[0]) {
        best = variants[0];
    }

    try {
        return best ? await fetchWikipediaPage(best, lang) : null;
    } catch {
        return null;
    }
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
            const time = claim?.mainsnak?.datavalue?.value?.time;
            const precision = claim?.mainsnak?.datavalue?.value?.precision;
            const normalized = normalizeWikidataTime(time, precision);
            if (!normalized) continue;
            evidence.push({
                source_type: 'wikidata',
                source_id: property,
                source_label: label,
                quote: `${label}: ${normalized.iso}`,
                date_iso: normalized.iso,
                precision: normalized.precision,
            });
        }
    }

    return evidence;
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
    if (precision >= 11) {
        return { iso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, precision: 'day' };
    }
    if (precision === 10) {
        return { iso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`, precision: 'month' };
    }
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

function dedupeEvidence(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        const key = `${item.source_type}|${item.source_id}|${item.quote}|${item.date_iso}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

function extractYear(value) {
    const match = String(value || '').match(/^(\d{4})/);
    return match?.[1] || null;
}

function compareDbDateWithCandidate(dbDate, candidateIso, precision) {
    const dbYear = extractYear(dbDate);
    const candidateYear = extractYear(candidateIso);
    if (!dbYear || !candidateYear || !precision) return null;
    return dbYear === candidateYear;
}

function finalizeStatus(audit, dbDate) {
    if (audit.needs_human_review && audit.status && audit.status !== 'CONFIRMED') {
        return audit.status;
    }
    if (audit.is_disputed) return 'DISPUTED_DATE';
    if (audit.ambiguous_identity || audit.title_not_self_sufficient || !audit.title_self_sufficient) return 'AMBIGUOUS_TITLE';
    if (!audit.proposed_date_iso) return 'INSUFFICIENT_EVIDENCE';
    const matches = compareDbDateWithCandidate(dbDate, audit.proposed_date_iso, audit.precision);
    if (matches === false) return 'POTENTIAL_DATE_ERROR';
    if (audit.is_time_span || audit.is_period_based || audit.is_not_singular_event) return 'INSUFFICIENT_EVIDENCE';
    if (!audit.exact_year_supported) return 'INSUFFICIENT_EVIDENCE';
    if (matches === true && audit.confidence >= 0.85) return 'CONFIRMED';
    if (matches === true) return 'LIKELY_CORRECT';
    return 'INSUFFICIENT_EVIDENCE';
}

function normalizeAuditForStatus(audit, status) {
    const normalized = {
        ...audit,
        confidence: Number.isFinite(audit?.confidence) ? audit.confidence : 0,
    };

    if (status === 'INSUFFICIENT_EVIDENCE' || status === 'AMBIGUOUS_TITLE') {
        normalized.proposed_date_iso = null;
        normalized.precision = null;
        normalized.confidence = 0;
        normalized.evidence_used = [];
    }

    if (status === 'INSUFFICIENT_EVIDENCE') {
        normalized.needs_human_review = true;
    }

    return normalized;
}

function buildEventContext(event) {
    return {
        id: event.id,
        titre: safeText(event.titre),
        year_in_db: extractYear(event.date),
        langue: safeText(event.langue),
        region: safeText(event.region),
        epoque: safeText(event.epoque),
        description_detaillee: truncate(event.description_detaillee, 900),
        types_evenement: Array.isArray(event.types_evenement) ? event.types_evenement.slice(0, 8) : [],
        mots_cles: Array.isArray(event.mots_cles) ? event.mots_cles.slice(0, 10) : [],
    };
}

function buildHeuristicFlags(event) {
    const title = safeText(event.titre);
    const description = safeText(event.description_detaillee);
    const combined = `${title} ${description}`;
    const titleNorm = normalizeCompareText(title);
    const combinedNorm = normalizeCompareText(combined);

    const periodLike = isLikelyPeriodTitle(title) || /(plusieurs annees|plusieurs années|entre \d{4} et \d{4}|du \d{4} au \d{4}|a la fin du|à la fin du|au debut du|au début du|xie|xiie|xiiie|xive|xve|xvie|xviie|xviiie|xixe|xxe)/.test(combinedNorm);
    const ambiguousLike = /(creation de|création de|debut de|début de|commence|adoption de|invention de|publication de)/.test(titleNorm) && titleNorm.split(' ').length < 6;

    return {
        heuristic_period_or_theme: periodLike,
        heuristic_title_needs_precision: ambiguousLike,
    };
}

function isRetryableGeminiError(error) {
    const text = safeText(error?.message || error);
    return /(429|quota|rate limit|temporar|timeout|unavailable|overloaded|503|500|fetch failed|network)/i.test(text);
}

async function runGeminiWithRetry(model, prompt, options = {}) {
    const retries = Number.isFinite(options.retries) ? options.retries : DEFAULT_GEMINI_RETRIES;
    const baseMs = Number.isFinite(options.baseMs) ? options.baseMs : DEFAULT_GEMINI_RETRY_BASE_MS;
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
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
            if (attempt >= retries || !isRetryableGeminiError(error)) break;
            const waitMs = baseMs * attempt;
            console.log(`[${now()}] Gemini retry ${attempt}/${retries} dans ${waitMs}ms: ${safeText(error?.message || error)}`);
            await sleep(waitMs);
        }
    }

    throw lastError;
}

async function auditWithGemini(event, sources, modelName = MODEL_NAME, runtimeOptions = {}) {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    const heuristics = buildHeuristicFlags(event);

    const prompt = `Tu es un auditeur historique ultra-prudent.

Mission:
- Identifier l'événement historique à partir du titre et du contexte.
- Déduire l'année exacte candidate à partir des sources externes fournies.
- Ne jamais utiliser une date provenant de la base comme preuve.
- Si les sources sont insuffisantes, ambiguës ou contradictoires, le signaler.
- Rejeter les événements décrivant une période, une plage, une guerre longue, un règne, une ère, une décennie, ou tout fait non rattachable à une année unique exacte.
- Rejeter les titres non auto-porteurs ou non univoques.
- Répondre uniquement en JSON strict.

Règles:
- N'invente aucune source ni aucune date.
- Dans ce jeu, seule l'année compte. Tu dois donc valider uniquement une année exacte.
- Si la meilleure information ne permet pas d'établir une année exacte unique, renvoie proposed_date_iso=null.
- Si la meilleure information donne une année unique exacte, renvoie une date ISO avec mois et jour à 01 et precision="year".
- Même si une source fournit jour et mois, renvoie quand même precision="year" car l'audit porte sur l'année exacte uniquement.
- Si les heuristiques ci-dessous signalent un thème, une période ou un titre à préciser, prends-les au sérieux et ne confirme pas à la légère.
- confidence est un nombre entre 0 et 1.
- evidence_used doit contenir des références à des source_id présentes dans les sources.
- status doit être l'un de: CONFIRMED, LIKELY_CORRECT, POTENTIAL_DATE_ERROR, AMBIGUOUS_TITLE, DISPUTED_DATE, INSUFFICIENT_EVIDENCE.

Événement à auditer:
${JSON.stringify(buildEventContext(event), null, 2)}

Heuristiques locales:
${JSON.stringify(heuristics, null, 2)}

Sources externes:
${JSON.stringify(sources, null, 2)}

Réponds strictement avec ce JSON:
{
  "event_identity": "...",
  "matched_article_fr": "... ou null",
  "matched_article_en": "... ou null",
  "wikidata_id": "... ou null",
  "proposed_date_iso": "YYYY-MM-DD ou null",
  "precision": "year|null",
  "confidence": 0.0,
  "is_disputed": false,
  "ambiguous_identity": false,
  "title_self_sufficient": true,
  "title_not_self_sufficient": false,
  "is_not_singular_event": false,
  "is_time_span": false,
  "is_period_based": false,
  "exact_year_supported": true,
  "needs_human_review": false,
  "status": "CONFIRMED|LIKELY_CORRECT|POTENTIAL_DATE_ERROR|AMBIGUOUS_TITLE|DISPUTED_DATE|INSUFFICIENT_EVIDENCE",
  "reasoning_short": "...",
  "recommendation": "...",
  "evidence_used": ["source_id_1", "source_id_2"]
}`;

    const result = await runGeminiWithRetry(model, prompt, {
        retries: runtimeOptions.geminiRetries,
        baseMs: runtimeOptions.geminiRetryBaseMs,
    });

    const text = result?.response?.text?.() || '{}';
    const parsed = extractJsonFromText(text);
    const confidence = Number(parsed?.confidence);

    return {
        event_identity: safeText(parsed?.event_identity),
        matched_article_fr: parsed?.matched_article_fr ? safeText(parsed.matched_article_fr) : null,
        matched_article_en: parsed?.matched_article_en ? safeText(parsed.matched_article_en) : null,
        wikidata_id: parsed?.wikidata_id ? safeText(parsed.wikidata_id) : null,
        proposed_date_iso: parsed?.proposed_date_iso ? safeText(parsed.proposed_date_iso) : null,
        precision: parsed?.precision ? safeText(parsed.precision) : null,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        is_disputed: parsed?.is_disputed === true,
        ambiguous_identity: parsed?.ambiguous_identity === true,
        title_self_sufficient: parsed?.title_self_sufficient !== false,
        title_not_self_sufficient: parsed?.title_not_self_sufficient === true,
        is_not_singular_event: parsed?.is_not_singular_event === true,
        is_time_span: parsed?.is_time_span === true,
        is_period_based: parsed?.is_period_based === true,
        exact_year_supported: parsed?.exact_year_supported !== false,
        needs_human_review: parsed?.needs_human_review === true,
        status: safeText(parsed?.status),
        reasoning_short: truncate(parsed?.reasoning_short, 300),
        recommendation: truncate(parsed?.recommendation, 240),
        evidence_used: Array.isArray(parsed?.evidence_used) ? parsed.evidence_used.map((x) => safeText(x)).filter(Boolean) : [],
    };
}

async function buildSourcesForEvent(event, runtimeOptions = {}) {
    const sources = [];
    const eventYear = extractYear(event.date);
    const fr = await resolveWikipediaSource(event.titre, 'fr', { eventYear, searchLimit: runtimeOptions.wikiSearchLimit });
    if (fr) {
        sources.push({
            source_id: 'wikipedia_fr_article',
            source_type: 'wikipedia_fr',
            title: fr.title,
            url: fr.url,
            quote: truncate(fr.extract, 900),
            wikidata_id: fr.wikidataId,
        });
    }

    const en = await resolveWikipediaSource(event.titre, 'en', { eventYear, searchLimit: runtimeOptions.wikiSearchLimit });
    if (en) {
        sources.push({
            source_id: 'wikipedia_en_article',
            source_type: 'wikipedia_en',
            title: en.title,
            url: en.url,
            quote: truncate(en.extract, 900),
            wikidata_id: en.wikidataId,
        });
    }

    const wikidataId = fr?.wikidataId || en?.wikidataId || null;
    if (wikidataId) {
        const entity = await fetchWikidataEntity(wikidataId);
        const wikidataEvidence = extractWikidataEvidence(entity).map((item, index) => ({
            source_id: `wikidata_${index + 1}`,
            source_type: item.source_type,
            title: wikidataId,
            url: `https://www.wikidata.org/wiki/${wikidataId}`,
            quote: item.quote,
            date_iso: item.date_iso,
            precision: item.precision,
            wikidata_id: wikidataId,
        }));
        sources.push(...wikidataEvidence);
    }

    return dedupeEvidence(sources.map((item) => ({
        source_id: item.source_id,
        source_type: item.source_type,
        title: item.title,
        url: item.url,
        quote: item.quote,
        date_iso: item.date_iso || null,
        precision: item.precision || null,
        wikidata_id: item.wikidata_id || item.wikidataId || null,
    })));
}

async function fetchAllEvents() {
    const db = getProdDb();
    const all = [];
    let from = 0;

    while (true) {
        const { data, error } = await db
            .from('evenements')
            .select('id,titre,date,langue,region,epoque,mots_cles,types_evenement,description_detaillee,source_goju2_id')
            .order('date', { ascending: true })
            .range(from, from + 999);

        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) break;
        all.push(...data);
        from += 1000;
    }

    return all.filter((event) => yearFromDateValue(event.date) !== null && safeText(event.titre));
}

function stratifiedSample(events, sampleSize = DEFAULT_SAMPLE_SIZE, bucketsCount = DEFAULT_PERIOD_BUCKETS) {
    const sorted = [...events].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (sorted.length <= sampleSize) return shuffle(sorted);

    const bucketSize = Math.ceil(sorted.length / bucketsCount);
    const buckets = [];
    for (let i = 0; i < bucketsCount; i += 1) {
        const chunk = sorted.slice(i * bucketSize, (i + 1) * bucketSize);
        if (chunk.length > 0) buckets.push(chunk);
    }

    const baseTake = Math.floor(sampleSize / buckets.length);
    let remainder = sampleSize - (baseTake * buckets.length);
    const selected = [];

    for (const bucket of buckets) {
        const take = Math.min(bucket.length, baseTake + (remainder > 0 ? 1 : 0));
        if (remainder > 0) remainder -= 1;
        selected.push(...shuffle(bucket).slice(0, take));
    }

    if (selected.length < sampleSize) {
        const selectedIds = new Set(selected.map((event) => event.id));
        const remaining = shuffle(sorted.filter((event) => !selectedIds.has(event.id)));
        selected.push(...remaining.slice(0, sampleSize - selected.length));
    }

    return shuffle(selected).slice(0, sampleSize);
}

async function auditEvent(event, runtimeOptions = {}) {
    const sources = await buildSourcesForEvent(event, runtimeOptions);
    const llm = await auditWithGemini(event, sources, MODEL_NAME, runtimeOptions);
    const status = finalizeStatus(llm, event.date);
    const normalizedAudit = normalizeAuditForStatus(llm, status);
    const resultBucket = inferResultBucket(status, normalizedAudit, sources, event.date);

    return {
        id: event.id,
        titre: event.titre,
        date_in_db: event.date,
        year_in_db: extractYear(event.date),
        date_candidate: normalizedAudit.proposed_date_iso,
        year_candidate: extractYear(normalizedAudit.proposed_date_iso),
        precision: normalizedAudit.precision,
        status,
        result_bucket: resultBucket,
        confidence: normalizedAudit.confidence,
        needs_human_review: normalizedAudit.needs_human_review,
        recommendation: normalizedAudit.recommendation,
        matched_article_fr: normalizedAudit.matched_article_fr,
        matched_article_en: normalizedAudit.matched_article_en,
        wikidata_id: normalizedAudit.wikidata_id || sources.find((item) => item.wikidata_id)?.wikidata_id || null,
        event_identity: normalizedAudit.event_identity,
        is_disputed: normalizedAudit.is_disputed,
        ambiguous_identity: normalizedAudit.ambiguous_identity,
        title_self_sufficient: normalizedAudit.title_self_sufficient,
        title_not_self_sufficient: normalizedAudit.title_not_self_sufficient,
        is_not_singular_event: normalizedAudit.is_not_singular_event,
        is_time_span: normalizedAudit.is_time_span,
        is_period_based: normalizedAudit.is_period_based,
        exact_year_supported: normalizedAudit.exact_year_supported,
        reasoning_short: normalizedAudit.reasoning_short,
        evidence_used: normalizedAudit.evidence_used,
        sources_checked: sources.map((item) => ({
            source_id: item.source_id,
            source_type: item.source_type,
            title: item.title,
            url: item.url,
            date_iso: item.date_iso,
            precision: item.precision,
        })),
        source_quotes: sources.map((item) => ({
            source_id: item.source_id,
            quote: item.quote,
        })),
        conflicts: normalizedAudit.is_disputed ? sources.filter((item) => item.date_iso).map((item) => ({
            source_id: item.source_id,
            date_iso: item.date_iso,
            precision: item.precision,
        })) : [],
    };
}

function makeCacheKey(parts) {
    return parts.map((part) => String(part ?? '')).join('::');
}

function safeFileKey(parts) {
    return makeCacheKey(parts)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .slice(0, 180);
}

function readJsonFileIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

function getCacheFilePath(parts) {
    return path.join(CACHE_DIR, `${safeFileKey(parts)}.json`);
}

function readPersistentCache(parts) {
    const key = makeCacheKey(parts);
    if (memoryCache.has(key)) {
        const cached = memoryCache.get(key);
        return cached?.hit ? cached.value : null;
    }
    const filePath = getCacheFilePath(parts);
    const payload = readJsonFileIfExists(filePath);
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'value')) return null;
    const wrapped = { hit: true, value: payload.value };
    memoryCache.set(key, wrapped);
    return wrapped.value;
}

function writePersistentCache(parts, value) {
    const key = makeCacheKey(parts);
    const filePath = getCacheFilePath(parts);
    memoryCache.set(key, { hit: true, value });
    fs.writeFileSync(filePath, JSON.stringify({ saved_at: now(), value }, null, 2), 'utf8');
}

function summarizeResults(results) {
    return results.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
    }, {});
}

function summarizeBuckets(results) {
    return results.reduce((acc, item) => {
        acc[item.result_bucket] = (acc[item.result_bucket] || 0) + 1;
        return acc;
    }, {});
}

function buildTechnicalErrorResult(event, error) {
    return {
        id: event.id,
        titre: event.titre,
        date_in_db: event.date,
        year_in_db: extractYear(event.date),
        date_candidate: null,
        year_candidate: null,
        precision: null,
        status: 'INSUFFICIENT_EVIDENCE',
        result_bucket: 'erreur_technique',
        confidence: 0,
        needs_human_review: true,
        recommendation: 'Erreur technique pendant l’audit, relancer ce cas.',
        matched_article_fr: null,
        matched_article_en: null,
        wikidata_id: null,
        event_identity: null,
        is_disputed: false,
        ambiguous_identity: false,
        title_self_sufficient: false,
        title_not_self_sufficient: false,
        is_not_singular_event: false,
        is_time_span: false,
        is_period_based: false,
        exact_year_supported: false,
        reasoning_short: truncate(error?.stack || error?.message || error, 300),
        evidence_used: [],
        sources_checked: [],
        source_quotes: [],
        conflicts: [],
    };
}

function buildOutputPayload(results, sample, runStamp, runtimeOptions, extra = {}) {
    return {
        generated_at: now(),
        sample_size: sample.length,
        model: MODEL_NAME,
        selection: sample.length === runtimeOptions.sampleSize ? 'random_time_stratified' : 'resume_or_custom',
        run_stamp: runStamp,
        runtime_options: runtimeOptions,
        sample_event_ids: sample.map((item) => item.id),
        summary_by_status: summarizeResults(results),
        summary_by_bucket: summarizeBuckets(results),
        ...extra,
        results,
    };
}

function writeOutputs(outputJson, outputCsv, payload) {
    fs.writeFileSync(outputJson, JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(outputCsv, toCsv(payload.results), 'utf8');
}

function writeCheckpoint(checkpointPath, payload) {
    fs.writeFileSync(checkpointPath, JSON.stringify(payload, null, 2), 'utf8');
}

function loadCheckpoint(checkpointPath) {
    const checkpoint = readJsonFileIfExists(checkpointPath);
    if (!checkpoint || !Array.isArray(checkpoint.results)) return null;
    return checkpoint;
}

function buildSampleFromCheckpoint(allEvents, checkpoint) {
    const ids = Array.isArray(checkpoint?.sample_event_ids) ? checkpoint.sample_event_ids : [];
    if (ids.length === 0) return null;
    const byId = new Map(allEvents.map((event) => [event.id, event]));
    const sample = ids.map((id) => byId.get(id)).filter(Boolean);
    return sample.length === ids.length ? sample : null;
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
    const bar = renderProgressBar(completed, total);
    const percent = formatPercent(completed / Math.max(1, total));
    const suffix = extra ? ` | ${extra}` : '';
    console.log(`[${now()}] Progression ${bar} ${completed}/${total} (${percent})${suffix}`);
}

function createInterruptHandler(context) {
    let stopping = false;
    return () => {
        if (stopping) return;
        stopping = true;
        try {
            const payload = buildOutputPayload(context.results, context.sample, context.runStamp, context.runtimeOptions, {
                checkpoint: true,
                completed: false,
                interrupted: true,
                resumed_count: context.resumedCount,
            });
            writeCheckpoint(context.checkpointPath, payload);
            writeOutputs(context.outputJson, context.outputCsv, payload);
            console.log(`[${now()}] Interruption demandée: checkpoint sauvegardé.`);
            console.log(`[${now()}] Pour reprendre: définir AUDIT_RUN_STAMP=${context.runStamp} et AUDIT_RESUME=true`);
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
    const requestedRunStamp = safeText(process.env.AUDIT_RUN_STAMP);
    const runStamp = requestedRunStamp || buildRunStamp();
    const outputBaseName = `historical-date-audit-${runtimeOptions.sampleSize}-${runStamp}`;
    const outputJson = path.join(OUTPUT_DIR, `${outputBaseName}.json`);
    const outputCsv = path.join(OUTPUT_DIR, `${outputBaseName}.csv`);
    const checkpointPath = path.join(OUTPUT_DIR, `${outputBaseName}.checkpoint.json`);

    console.log(`[${now()}] Audit dates historiques — démarrage`);
    const allEvents = await fetchAllEvents();
    console.log(`[${now()}] Événements lisibles: ${allEvents.length}`);

    const checkpoint = runtimeOptions.resume ? loadCheckpoint(checkpointPath) : null;
    const sample = checkpoint
        ? (buildSampleFromCheckpoint(allEvents, checkpoint) || stratifiedSample(allEvents, runtimeOptions.sampleSize, runtimeOptions.periodBuckets))
        : stratifiedSample(allEvents, runtimeOptions.sampleSize, runtimeOptions.periodBuckets);
    const years = sample.map((item) => yearFromDateValue(item.date)).filter(Number.isFinite);
    console.log(`[${now()}] Échantillon retenu: ${sample.length} événements | plage=${Math.min(...years)}-${Math.max(...years)}`);

    const results = checkpoint?.results || [];
    const processedIds = new Set(results.map((item) => item.id));
    const resumedCount = results.length;
    if (runtimeOptions.resume && resumedCount > 0) {
        console.log(`[${now()}] Reprise activée: ${resumedCount} résultats rechargés depuis ${checkpointPath}`);
    }
    logProgress(results.length, sample.length, resumedCount > 0 ? 'état initial après reprise' : 'état initial');

    const interruptHandler = createInterruptHandler({
        checkpointPath,
        outputCsv,
        outputJson,
        results,
        resumedCount,
        runStamp,
        runtimeOptions,
        sample,
    });
    process.on('SIGINT', interruptHandler);
    process.on('SIGTERM', interruptHandler);

    try {
        for (let i = 0; i < sample.length; i += 1) {
            const event = sample[i];
            if (processedIds.has(event.id)) {
                console.log(`[${now()}] [${i + 1}/${sample.length}] ${event.titre} (${event.date}) -> SKIP déjà traité`);
                logProgress(results.length, sample.length, 'skip déjà traité');
                continue;
            }
            console.log(`[${now()}] [${i + 1}/${sample.length}] ${event.titre} (${event.date})`);
            try {
                const result = await auditEvent(event, runtimeOptions);
                results.push(result);
                processedIds.add(event.id);
                console.log(`[${now()}] -> ${result.status} | candidate=${result.date_candidate || 'null'} | confidence=${result.confidence}`);
            } catch (error) {
                results.push(buildTechnicalErrorResult(event, error));
                processedIds.add(event.id);
                console.log(`[${now()}] -> ERREUR ${error?.message || error}`);
            }

            logProgress(results.length, sample.length);

            if (results.length % runtimeOptions.checkpointEvery === 0 || i === sample.length - 1) {
                const checkpointPayload = buildOutputPayload(results, sample, runStamp, runtimeOptions, {
                    checkpoint: true,
                    completed: results.length >= sample.length,
                    resumed_count: resumedCount,
                });
                writeCheckpoint(checkpointPath, checkpointPayload);
                writeOutputs(outputJson, outputCsv, checkpointPayload);
                console.log(`[${now()}] Checkpoint sauvegardé (${results.length}/${sample.length}).`);
            }

            if (runtimeOptions.eventPauseMs > 0) {
                await sleep(runtimeOptions.eventPauseMs);
            }

            if ((i + 1) % runtimeOptions.maxBatchSize === 0 && runtimeOptions.batchPauseMs > 0) {
                console.log(`[${now()}] Pause batch ${runtimeOptions.batchPauseMs}ms après ${i + 1} éléments parcourus.`);
                await sleep(runtimeOptions.batchPauseMs);
            }
        }

        const finalPayload = buildOutputPayload(results, sample, runStamp, runtimeOptions, {
            checkpoint: false,
            completed: true,
            resumed_count: resumedCount,
        });
        writeOutputs(outputJson, outputCsv, finalPayload);
        writeCheckpoint(checkpointPath, finalPayload);

        const summary = summarizeResults(results);
        const summaryByBucket = summarizeBuckets(results);

        console.log(`[${now()}] Audit terminé.`);
        console.log('Résumé par status:');
        console.log(summary);
        console.log('Résumé par sous-catégorie:');
        console.log(summaryByBucket);
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
    buildSampleFromCheckpoint,
    buildTechnicalErrorResult,
    compareDbDateWithCandidate,
    finalizeStatus,
    inferResultBucket,
    normalizeAuditForStatus,
    summarizeBuckets,
    summarizeResults,
    toCsv,
    writeCheckpoint,
    writeOutputs,
};

