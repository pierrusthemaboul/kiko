import { fetchWithRetry } from './utils.mjs';

function normalizeTitle(raw) {
    return String(raw || '').replace(/_/g, ' ').trim();
}

function cleanLine(line) {
    let t = String(line || '').trim();
    t = t.replace(/^\*\s*/, '');
    t = t.replace(/'''+/g, '');
    t = t.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
    t = t.replace(/\[\[([^\]]+)\]\]/g, '$1');
    t = t.replace(/\[[a-z]+:\/\/[^\s\]]+(\s+[^\]]+)?\]/gi, (m) => {
        const inner = m.replace(/^\[/, '').replace(/\]$/, '');
        const parts = inner.split(/\s+/);
        if (parts.length >= 2) return parts.slice(1).join(' ');
        return '';
    });
    t = t.replace(/\[https?:\/\/[^\s\]]+(\s+[^\]]+)?\]/gi, (m) => {
        const inner = m.replace(/^\[/, '').replace(/\]$/, '');
        const parts = inner.split(/\s+/);
        if (parts.length >= 2) return parts.slice(1).join(' ');
        return '';
    });
    t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '');
    t = t.replace(/<[^>]+>/g, '');
    t = t.replace(/\{\{[^}]*\}\}/g, '');
    t = t.replace(/\([^)]*\bref\b[^)]*\)/gi, '');
    t = t.replace(/\[[^\]]*\]/g, (m) => {
        if (/^\[(?:citation needed|cn|dead link|clarification)\]$/i.test(m)) return '';
        return m;
    });
    t = t.replace(/\s+/g, ' ').trim();
    return t;
}

function stripDiacritics(s) {
    return String(s || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
}

function normalizeHeader(s) {
    return stripDiacritics(String(s || '').trim().toLowerCase());
}

function htmlToText(html) {
    let t = String(html || '');
    t = t.replace(/<br\s*\/?>/gi, ' ');
    t = t.replace(/<sup[^>]*>[^<]*<\/sup>/gi, '');
    t = t.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
    t = t.replace(/<[^>]+>/g, ' ');
    t = t
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#039;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>');
    t = t
        .replace(/&#\d+;/g, ' ')
        .replace(/\[\s*\d+\s*\]/g, ' ')
        .replace(/\[\s*note\s*\d+\s*\]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return t;
}

function extractLiTexts(html) {
    const out = [];
    const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = re.exec(String(html || '')))) {
        const txt = htmlToText(m[1]);
        if (txt) out.push(txt);
    }
    return out;
}

export async function getWikipediaEvents(year, options = {}) {
    const lang = options.lang || 'en';
    const limit = Number.isFinite(options.limit) ? options.limit : 50;
    const debugRaw = options.debugRaw === true;
    const onRaw = typeof options.onRaw === 'function' ? options.onRaw : null;

    const page = String(year);
    const api = `https://${lang}.wikipedia.org/w/api.php`;

    const sectionsUrl = `${api}?action=parse&page=${encodeURIComponent(page)}&prop=sections&format=json&origin=*`;
    const sectionsRes = await fetchWithRetry(sectionsUrl, { method: 'GET' });
    const sectionsJson = await sectionsRes.json();

    if (debugRaw && onRaw) {
        onRaw({ phase: 'sections', year, lang, url: sectionsUrl, json: sectionsJson });
    }

    const sections = sectionsJson?.parse?.sections;
    if (!Array.isArray(sections)) return [];

    const headerEvents = lang === 'fr' ? 'evenements' : 'events';
    let eventsSection = sections.find(s => normalizeHeader(s?.line) === headerEvents);

    const out = [];

    if (lang === 'fr') {
        const thematicHeaders = new Set([
            'politique',
            'france',
            'economie',
            'économie',
            'societe',
            'société',
            'culture',
            'arts',
            'litterature',
            'littérature',
            'sciences',
            'techniques',
            'vie quotidienne',
            'vie_quotidienne',
            'divertissement',
            'spectacles',
            'mode',
            'alimentation',
            'nourriture',
            'transports',
            'religion',
            'demographie',
            'démographie',
        ].map(normalizeHeader));

        const candidateRoots = [];
        if (eventsSection?.index) candidateRoots.push(eventsSection);

        for (const s of sections) {
            const h = normalizeHeader(s?.line);
            if (thematicHeaders.has(h)) {
                candidateRoots.push(s);
            }
        }

        const indices = [];
        for (const root of candidateRoots) {
            const rootNumber = String(root?.number || '').trim();
            if (!rootNumber) continue;

            const relevant = sections.filter((s) => {
                const num = String(s?.number || '').trim();
                if (!num) return false;
                return num === rootNumber || num.startsWith(rootNumber + '.');
            });

            for (const s of relevant) {
                const idx = String(s?.index || '').trim();
                if (idx) indices.push(idx);
            }
        }

        if (indices.length === 0) return [];

        for (const idx of indices) {
            const textUrl = `${api}?action=parse&page=${encodeURIComponent(page)}&prop=text&section=${encodeURIComponent(idx)}&format=json&origin=*`;
            const textRes = await fetchWithRetry(textUrl, { method: 'GET' });
            const textJson = await textRes.json();

            if (debugRaw && onRaw) {
                onRaw({ phase: 'text', year, lang, url: textUrl, json: textJson });
            }

            const html = textJson?.parse?.text?.['*'];
            if (typeof html !== 'string' || html.length === 0) continue;

            const items = extractLiTexts(html);
            for (const item of items) {
                const title = normalizeTitle(item);
                if (!title) continue;
                out.push(title);
                if (out.length >= limit) return out;
            }
        }

        return out;
    }

    const wikitextUrl = `${api}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&section=${encodeURIComponent(eventsSection.index)}&format=json&origin=*`;
    const wikitextRes = await fetchWithRetry(wikitextUrl, { method: 'GET' });
    const wikitextJson = await wikitextRes.json();

    if (debugRaw && onRaw) {
        onRaw({ phase: 'wikitext', year, lang, url: wikitextUrl, json: wikitextJson });
    }

    const wikitext = wikitextJson?.parse?.wikitext?.['*'];
    if (typeof wikitext !== 'string') return [];

    const lines = wikitext.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('*')) continue;
        const cleaned = cleanLine(trimmed);
        if (!cleaned) continue;

        const withoutDatePrefix = cleaned
            .replace(/^\d{1,2}\s+\w+\s*[–-]\s*/u, '')
            .replace(/^\w+\s+\d{1,2}\s*[–-]\s*/u, '');

        const title = normalizeTitle(withoutDatePrefix);
        if (title.length === 0) continue;
        out.push(title);
        if (out.length >= limit) break;
    }

    return out;
}

