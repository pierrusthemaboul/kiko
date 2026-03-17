function yyyymmdd(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

function safeArticleTitle(title) {
    return encodeURIComponent(String(title || '').trim().replaceAll(' ', '_'));
}

export async function getAnnualPageviews(articleTitle, options = {}) {
    const article = String(articleTitle || '').trim();
    if (!article) return null;

    const project = options.project || 'fr.wikipedia';
    const access = options.access || 'all-access';
    const agent = options.agent || 'user';
    const granularity = options.granularity || 'daily';

    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() - 1);

    const startDate = new Date(endDate);
    startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);
    startDate.setUTCDate(startDate.getUTCDate() + 1);

    const start = `${yyyymmdd(startDate)}00`;
    const end = `${yyyymmdd(endDate)}00`;

    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/${project}/${access}/${agent}/${safeArticleTitle(article)}/${granularity}/${start}/${end}`;

    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`WIKIMEDIA_PAGEVIEWS_HTTP_${res.status} ${msg.slice(0, 120)}`);
    }

    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    const total = items.reduce((acc, it) => acc + (Number.isFinite(it?.views) ? it.views : 0), 0);
    return total;
}

export function pageviewsToNotorieteScore(annualViews) {
    const v = Number(annualViews);
    if (!Number.isFinite(v) || v < 0) return null;
    if (v > 1_000_000) return 10;
    if (v >= 100_000) return 7 + Math.min(2, Math.floor((v - 100_000) / 300_000));
    if (v >= 10_000) return 4 + Math.min(2, Math.floor((v - 10_000) / 30_000));
    return 1 + Math.min(2, Math.floor(v / 3_000));
}

export async function getTopviewsFR(options = {}) {
    const project = 'fr.wikipedia';
    const access = options.access || 'all-access';

    let lastErr = null;
    for (let back = 3; back <= 10; back++) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - back);

        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');

        const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${project}/${access}/${year}/${month}/${day}`;
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) {
            const msg = await res.text().catch(() => '');
            lastErr = new Error(`WIKIMEDIA_TOPVIEWS_HTTP_${res.status} ${msg.slice(0, 120)}`);
            continue;
        }

        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : [];
        const articles = Array.isArray(items?.[0]?.articles) ? items[0].articles : [];
        return articles
            .map((a) => String(a?.article || '').trim())
            .filter((t) => t && t !== 'Main_Page')
            .slice(0, options.limit ?? 50);
    }

    throw lastErr || new Error('WIKIMEDIA_TOPVIEWS_ECHEC');
}

