function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchJson(url) {
    const res = await fetch(url, {
        headers: {
            'accept': 'application/json',
            'user-agent': 'predateur-tempete/1.0 (+https://example.local)',
        },
    });
    if (!res.ok) throw new Error(`MET_HTTP_${res.status}`);
    return res.json();
}

export async function getCandidates(ctx) {
    const year = ctx.year;

    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&dateBegin=${year}&dateEnd=${year}`;
    const search = await fetchJson(searchUrl);
    const ids = Array.isArray(search?.objectIDs) ? search.objectIDs : [];
    if (ids.length === 0) return [];

    const take = Math.min(ids.length, ctx.maxMetObjectsPerCycle ?? 10);
    const chosen = new Set();
    while (chosen.size < take) {
        chosen.add(ids[randInt(0, ids.length - 1)]);
    }

    const candidates = [];
    for (const id of chosen) {
        const objUrl = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`;
        const obj = await fetchJson(objUrl);

        const title = String(obj?.title || '').trim();
        const objectName = String(obj?.objectName || '').trim();
        const artist = String(obj?.artistDisplayName || '').trim();
        const credit = String(obj?.creditLine || '').trim();
        const objDate = String(obj?.objectDate || '').trim();
        const culture = String(obj?.culture || '').trim();

        const parts = [
            title ? `Titre: ${title}` : null,
            objectName ? `Objet: ${objectName}` : null,
            artist ? `Auteur: ${artist}` : null,
            culture ? `Culture: ${culture}` : null,
            objDate ? `Date objet: ${objDate}` : null,
            credit ? `Provenance: ${credit}` : null,
            `Source: MET Museum (objectID=${id})`,
        ].filter(Boolean);

        candidates.push({
            titre: parts.join(' | '),
            source: 'met',
            meta: { objectID: id, objectURL: objUrl, searchUrl },
        });
    }

    return candidates;
}

