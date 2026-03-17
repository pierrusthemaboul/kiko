import fs from 'fs';

export async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 5000 * attempt));
                if (attempt === maxRetries) throw new Error('Rate limit dépassé');
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

export function extractJsonFromText(rawText) {
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

        if (start === -1) throw new Error('JSON introuvable dans la réponse');
        const candidate = text.slice(start);

        const objMatch = candidate.match(/\{[\s\S]*\}/);
        const arrMatch = candidate.match(/\[[\s\S]*\]/);
        const picked = arrMatch && objMatch
            ? (arrMatch[0].length >= objMatch[0].length ? arrMatch[0] : objMatch[0])
            : (arrMatch?.[0] || objMatch?.[0]);
        if (!picked) throw new Error('JSON introuvable dans la réponse');
        return JSON.parse(picked);
    }
}

export function assertEnv(name, value) {
    if (!value || String(value).trim().length === 0) {
        throw new Error(`Configuration manquante: ${name}`);
    }
}

export function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

