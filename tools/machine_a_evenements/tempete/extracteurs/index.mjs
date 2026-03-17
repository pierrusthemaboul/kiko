export function pickRandomSource() {
    return Math.random() < 0.5 ? 'wikipedia' : 'onthisday';
}

export async function getCandidatesForSource(source, ctx) {
    if (source === 'wikipedia') {
        const mod = await import('./wikipedia.mjs');
        return mod.getCandidates(ctx);
    }
    if (source === 'onthisday') {
        const mod = await import('./onthisday.mjs');
        return mod.getCandidates(ctx);
    }
    throw new Error(`SOURCE_INCONNUE: ${source}`);
}

