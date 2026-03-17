export async function getCandidates(ctx) {
    const year = ctx.year;
    const threshold = ctx.threshold;
    const lang = ctx.lang || 'fr';
    const limit = ctx.wikipediaLimit ?? 40;

    const { trouverNouveauxEvenements } = await import('../comparateur.mjs');

    const holes = await trouverNouveauxEvenements(year, { threshold, lang, limit });
    const arr = Array.isArray(holes) ? holes : [];
    return arr
        .map((h) => ({
            titre: h?.titre,
            source: 'wikipedia',
            meta: { year },
        }))
        .filter((c) => typeof c.titre === 'string' && c.titre.trim().length > 0);
}

