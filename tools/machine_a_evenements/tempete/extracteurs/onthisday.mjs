function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomDay() {
    const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
    ];
    const monthIndex = randInt(0, 11);
    const month = monthNames[monthIndex];
    const day = randInt(1, 28);
    return { month, day };
}

function decodeHtml(s) {
    return String(s || '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
}

function stripTags(s) {
    return decodeHtml(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function extractEventsFromHtml(html) {
    const out = [];
    const liRx = /<li[^>]*class="event"[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRx.exec(html)) !== null) {
        const block = m[1];
        const yearMatch = block.match(/<a[^>]*>(\d{1,4})<\/a>/i);
        const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : null;
        const text = stripTags(block);
        if (!text) continue;
        out.push({ year, text });
    }
    return out;
}

function extractYearPageBullets(html) {
    const out = [];
    const liRx = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = liRx.exec(html)) !== null) {
        const txt = stripTags(m[1]);
        if (!txt) continue;
        if (txt.length < 20) continue;
        out.push(txt);
        if (out.length >= 40) break;
    }
    return out;
}

export async function getCandidates(ctx) {
    const targetYear = ctx.year;

    const urlYear = `https://www.onthisday.com/year/${targetYear}`;
    const resYear = await fetch(urlYear, {
        headers: {
            'user-agent': 'predateur-tempete/1.0 (+https://example.local)',
            'accept': 'text/html,application/xhtml+xml',
        },
    });

    if (resYear.ok) {
        const html = await resYear.text();
        const bullets = extractYearPageBullets(html);
        return bullets
            .slice(0, ctx.maxOnThisDayPerCycle ?? 12)
            .map((t) => ({
                titre: `${targetYear} : ${t}`,
                source: 'onthisday',
                meta: { url: urlYear },
            }));
    }

    const { month, day } = pickRandomDay();
    const url = `https://www.onthisday.com/day/${month}/${day}`;

    const res = await fetch(url, {
        headers: {
            'user-agent': 'predateur-tempete/1.0 (+https://example.local)',
            'accept': 'text/html,application/xhtml+xml',
        },
    });

    if (!res.ok) {
        throw new Error(`ONTHISDAY_HTTP_${res.status}`);
    }

    const html = await res.text();
    const events = extractEventsFromHtml(html);

    return events
        .filter((e) => Number.isFinite(e.year) && e.year === targetYear)
        .slice(0, ctx.maxOnThisDayPerCycle ?? 12)
        .map((e) => ({
            titre: `${e.year} : ${e.text}`,
            source: 'onthisday',
            meta: { url, month, day },
        }));
}

