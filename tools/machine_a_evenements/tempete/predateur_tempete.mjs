console.log('🦁 Lancement immédiat du fichier predateur_tempete.mjs');

let dotenv;
let path;
let fileURLToPath;
let extractJsonFromText;
let assertEnv;
let trouverNouveauxEvenements;
let localDb;
let embedText;
let getOpenAIClient;
let GoogleGenerativeAI;
let pickRandomSource;
let getCandidatesForSource;
let getAnnualPageviews;
let pageviewsToNotorieteScore;
let getTopviewsFR;

async function bootstrapImports() {
    try {
        ({ default: dotenv } = await import('dotenv'));
        ({ default: path } = await import('path'));
        ({ fileURLToPath } = await import('url'));

        ({ extractJsonFromText, assertEnv } = await import('./utils.mjs'));
        ({ trouverNouveauxEvenements } = await import('./comparateur.mjs'));
        ({ localDb } = await import('./supabase.mjs'));
        ({ embedText, getOpenAIClient } = await import('./openai.mjs'));
        ({ GoogleGenerativeAI } = await import('@google/generative-ai'));
        ({ pickRandomSource, getCandidatesForSource } = await import('./extracteurs/index.mjs'));
        ({ getAnnualPageviews, pageviewsToNotorieteScore, getTopviewsFR } = await import('./metrics_service.mjs'));

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
    } catch (e) {
        console.error('❌ ERREUR IMPORT/SYNTAXE (avant main):');
        console.error(e?.stack || e?.message || e);
        process.exit(1);
    }
}

async function isDuplicateByEmbedding(text, options = {}) {
    const q = String(text || '').trim();
    if (!q) return { duplicate: false, similarity: null };

    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.70;
    const client = options.openaiClient || getOpenAIClient();
    const vector = await embedText(q, { client, model: 'text-embedding-3-small' });

    const { data: matches, error: rpcError } = await localDb.rpc('match_ratoire_embeddings', {
        query_embedding: vector,
        match_count: 1,
    });
    if (rpcError) throw rpcError;

    const top = Array.isArray(matches) && matches.length > 0 ? matches[0] : null;
    const similarity = typeof top?.similarity === 'number' ? top.similarity : null;
    const duplicate = typeof similarity === 'number' ? similarity >= threshold : false;
    return { duplicate, similarity };
}

async function loadRecentPistes(limit = 80) {
    const { data, error } = await localDb
        .from('ratoire_pistes')
        .select('id,nom_sujet,type_sujet,annee_origine,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

async function loadRandomThemeFromRatoire(limit = 250, options = {}) {
    const { data, error } = await localDb
        .from('ratoire')
        .select('type')
        .not('type', 'is', null)
        .order('id', { ascending: false })
        .limit(limit);

    if (error) throw error;

    const types = (Array.isArray(data) ? data : [])
        .map((r) => (typeof r?.type === 'string' ? r.type.trim() : ''))
        .filter(Boolean);

    const unique = Array.from(new Set(types));

    const preferNonMilitary = options?.preferNonMilitary === true;
    if (!preferNonMilitary) {
        return pickOne(unique);
    }

    const excluded = [
        /\bmilitair/i,
        /\bguerre/i,
        /\bbataill/i,
        /\bintervention/i,
        /\bconflit/i,
        /\bdiplomat/i,
        /\bpolit/i,
        /\bsuccession/i,
        /\b(r|R)oi(s)?\b/i,
        /\breine(s)?\b/i,
    ];

    const filtered = unique.filter((t) => !excluded.some((rx) => rx.test(t)));
    return pickOne(filtered.length > 0 ? filtered : unique);
}

function weightedPick(items) {
    const list = Array.isArray(items) ? items.filter((x) => x && Number.isFinite(x.weight) && x.weight > 0) : [];
    if (list.length === 0) return null;
    const total = list.reduce((acc, x) => acc + x.weight, 0);
    let roll = Math.random() * total;
    for (const it of list) {
        roll -= it.weight;
        if (roll <= 0) return it;
    }
    return list[list.length - 1];
}

function clampYear(y, minYear, maxYear) {
    return Math.min(maxYear, Math.max(minYear, y));
}

function now() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaOr429Error(e) {
    const msg = String(e?.message || e || '').toLowerCase();
    return msg.includes('429')
        || msg.includes('quota')
        || msg.includes('rate limit')
        || msg.includes('resource has been exhausted')
        || msg.includes('too many requests');
}

async function sleepOnQuota(e) {
    if (!isQuotaOr429Error(e)) return false;
    console.error(`[${now()}] 😴 Quota atteint, repos de 60s...`);
    await sleep(60 * 1000);
    return true;
}

function looksPoliticalOrMilitary(text) {
    const base = String(text || '').toLowerCase();

    // Exception "Royal Fun": si le texte parle clairement de vie quotidienne / mœurs / commerce,
    // on ne veut PAS bloquer même si des mots royaux (roi, décret, etc.) apparaissent.
    const daily = /\b(foire|foires|march[ée]s?|commerce|corporation|m[œoe]urs?|gastronom|cuisin|recette|banquet|vin|fromage|pain|mode|v[êe]tement|costume|coiffure|parfum|invention|brev(et|ets)|prototype|objet|machine|f[êe]te|carnaval|bal|spectacle|th[ée]atre|op[ée]ra|jeux?|loterie|loi\s+insolite|d[ée]cret\s+insolite)\b/i;
    if (daily.test(base)) return false;

    // Politique/militaire "pur" (souveraineté): guerres/traités/frontières/successions/alliances.
    // On évite volontairement de déclencher sur "roi/reine/décret/loi" seuls.
    const sovereign = /\b(guerre|bataill|si[eè]ge|campagne\s+milit|conflit\s+arm[ée]e|intervention\s+militaire|arm[ée]e|attaque|invasion|annexion|cession|fronti[èe]re|trait[ée]s?\b|trait[ée]s?\s+de|armistice|capitulation|alliance\s+militaire|coalition|succession\s+(au\s+tr[ôo]ne|dynastique)|abdication|couronnement|coup\s+d[’']etat|r[ée]volution\b|insurrection\b)\b/i;
    return sovereign.test(base);
}

function randInt(minInclusive, maxInclusive) {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr[randInt(0, arr.length - 1)];
}

async function assertLocalTablesExist() {
    const checks = [
        { table: 'ratoire' },
        { table: 'ratoire_embeddings' },
        { table: 'ratoire_pistes' },
    ];

    for (const c of checks) {
        const { error } = await localDb.from(c.table).select('id').limit(1);
        if (error) {
            throw new Error(`Table locale manquante ou inaccessible: ${c.table} (${error.message})`);
        }
    }
}

async function insertIntoRatoire(validated) {
    const payload = {
        titre: validated.titre,
        year: validated.year,
        description: validated.description,
        notoriete: validated.notoriete_historique,
        type: validated.type,
        region: validated.region,
        status: 'pending',
        validation_notes: {
            potentiel_fun: validated.potentiel_fun,
            notoriete_historique: validated.notoriete_historique,
            tags: Array.isArray(validated.tags) ? validated.tags : [],
        },
    };

    const { data, error } = await localDb
        .from('ratoire')
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return data?.id;
}

async function embedAndStoreRatoireId(id, titre, options = {}) {
    const client = options.openaiClient || getOpenAIClient();
    const vector = await embedText(titre, { client, model: 'text-embedding-3-small' });

    const { error } = await localDb
        .from('ratoire_embeddings')
        .upsert({
            id,
            titre_vector: vector,
            metadata: { sourceTable: 'ratoire', titre },
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

    if (error) throw error;
}

async function vectorCompassFromText(text, options = {}) {
    const q = String(text || '').trim();
    if (!q) return null;

    const client = options.openaiClient || getOpenAIClient();
    const vector = await embedText(q, { client, model: 'text-embedding-3-small' });

    const { data: matches, error: rpcError } = await localDb.rpc('match_ratoire_embeddings', {
        query_embedding: vector,
        match_count: 5,
    });
    if (rpcError) throw rpcError;

    const ids = Array.isArray(matches) ? matches.map((m) => m?.id).filter((x) => x !== null && x !== undefined) : [];
    if (ids.length === 0) return null;

    const { data: rows, error: selError } = await localDb
        .from('ratoire')
        .select('id,type,validation_notes')
        .in('id', ids);
    if (selError) throw selError;

    const byId = new Map((rows || []).map((r) => [r.id, r]));
    for (const m of matches) {
        const row = byId.get(m?.id);
        const type = row?.type;
        if (typeof type === 'string' && type.trim().length > 0) {
            const fun = row?.validation_notes?.potentiel_fun;
            return { type: type.trim(), sourceId: row.id, similarity: m?.similarity, fun };
        }
    }

    return null;
}

async function insertIntoRatoirePistes(piste) {
    const payload = {
        nom_sujet: String(piste?.nom_sujet || '').trim(),
        type_sujet: String(piste?.type_sujet || '').trim(),
        annee_origine: Number.isFinite(piste?.annee_origine) ? piste.annee_origine : null,
    };

    if (!payload.nom_sujet || !payload.type_sujet) {
        return null;
    }

    const { data, error } = await localDb
        .from('ratoire_pistes')
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return data?.id;
}

async function expertHistorienGemini(titreWikipedia, year, options = {}) {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);

    const model = options.model || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const gemini = genAI.getGenerativeModel({ model });

    const lead = options?.lead && typeof options.lead === 'object' ? options.lead : null;
    const leadHint = lead?.label ? `\n\nCONTEXTE DE CHASSE (piste à privilégier): ${lead.label}` : '';
    const mission = typeof options?.mission === 'string' ? options.mission : null;
    const missionHint = mission === 'endorphine'
        ? `\n\nMISSION ENDORPHINE (20 cycles):\n- Rejette les incendies génériques, les successions de rois, les batailles mineures.\n- Cherche EXCLUSIVEMENT des pépites sur: vie quotidienne, technologie, premières mondiales, gastronomie, lois insolites, découvertes scientifiques.\n- Si la puce Wikipedia est "scolaire" (guerre/succession/feu) sans angle quotidien/tech/science: REJETTE.\n- SCORING FUN: si l'événement touche quotidien/objet/technique/loi insolite/découverte, vise potentiel_fun entre 7 et 10.`
        : '';

    const prompt = `Tu es un horloger de l'histoire, d'une précision chirurgicale.

Ta mission:
- Identifier l'événement EXACT et PONCTUEL rattachable à l'année ${year}.
- Rejeter les "ambiances"/phénomènes continus.
- Rejeter mythes/légendes/non-avéré.
- Être pertinent pour un public français (France/francophonie prioritaire, ou événement mondial majeur).

TEST DE SINGULARITÉ (RÈGLE D'OR):
- INTERDICTION ABSOLUE de générer des événements décrivant une durée, une tendance ou une époque.
- Interdit: "L'essor de...", "Le développement de...", "L'apparition progressive de...", "La diffusion de...", "L'âge de...", "La période...".

RÈGLE DU POINT (ANCRAGE OBLIGATOIRE):
- Chaque pépite doit être un point unique dans le temps.
- Si le sujet est un objet, une mode ou une pratique, tu DOIS trouver un point d'ancrage daté en ${year}: commande, ordonnance, décret, première mention écrite datée, inauguration, ouverture officielle, publication, dépôt de brevet, première démonstration, première vente documentée.
- Si tu ne peux pas fournir un ancrage ponctuel spécifique à ${year}, REJETTE.

NOBLESSE DU STYLE ≠ IMPORTANCE DU SUJET:
- Un sujet trivial (gastronomie, mode, commerce, invention mineure, loisirs) DOIT être traité avec un style noble et solennel.
- Interdiction de confondre « petit sujet » et « sujet sans intérêt ».

PÉCHÉ DE SNOBISME (INTERDIT):
- Interdiction de rejeter un événement sous prétexte qu'il est "mineur" si le potentiel_fun est là.
- La « petite histoire » et la vie des gens sont au cœur du jeu.

QUÊTE DU FUN (QUALITÉ MAXIMALE):
- Priorité absolue aux faits non-militaires et non-politiques: société, inventions, techniques, gastronomie, mœurs, économie du quotidien, sciences, premières mondiales.
- Si tu vois un événement lié au commerce (foires, marchés, corporations), aux mœurs ou à la vie des gens, considère-le comme PRIORITAIRE.
- Rejette successions de rois, batailles mineures, incendies génériques, discours et diplomatie sans détail concret.
- Un événement avec potentiel_fun de 1 ou 2 doit être REJETÉ, même s'il est vrai.

DENSITÉ (MARATHON):
- Pour tout ce qui n'est PAS politique ou militaire, accepte dès que potentiel_fun >= 3/10, même si la notoriété est faible.

RÈGLE DU POINT vs DURÉE (IMPÉRATIF):
- Rejette les phénomènes lents/continus: "piraterie augmente", "commerce fleurit", "crise persiste", "art se développe".

TEST DE L'ANNÉE UNIQUE:
- Si la phrase peut être datée d'une autre année sans changer le sens, REJETTE.

Instruction « Zéro Légende »:
- Rejette mythes, légendes, faits non avérés.
- Si c'est débattu, sois prudent ou rejette.

ENTRÉE:
Wikipedia (FR) mentionne pour l'année ${year}: "${titreWikipedia}".${leadHint}
${missionHint}

SORTIE:
Si tu rejettes, renvoie STRICTEMENT:
{ "rejet": true, "raison": "...", "pistes": [{"nom_sujet":"...","type_sujet":"personnage|lieu|theme","annee_origine":${year}}] }

Sinon renvoie STRICTEMENT:
{
  "rejet": false,
  "fait": "Description factuelle courte (1-2 phrases) du point historique ponctuel",
  "year": ${year},
  "date_precise": "${year}",
  "article_principal": "Titre exact de l'article Wikipédia principal (sans URL)",
  "notoriete_historique": 7,
  "potentiel_fun": 1,
  "type": "Thème vendeur et précis",
  "tags": ["mot-clé1", "mot-clé2"],
  "region": "Région"
}`;

    const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
        },
    });

    const text = result?.response?.text?.() || '{}';
    const parsed = extractJsonFromText(text);

    if (!parsed || typeof parsed !== 'object') {
        return { rejet: true, raison: 'LLM_INVALID_JSON' };
    }

    if (parsed.rejet === true) {
        const pistesRaw = Array.isArray(parsed.pistes) ? parsed.pistes : [];
        const pistes = pistesRaw
            .map((p) => ({
                nom_sujet: typeof p?.nom_sujet === 'string' ? p.nom_sujet.trim() : '',
                type_sujet: typeof p?.type_sujet === 'string' ? p.type_sujet.trim() : '',
                annee_origine: year,
            }))
            .filter((p) => p.nom_sujet && p.type_sujet);

        return {
            rejet: true,
            raison: String(parsed.raison || 'REJET_SANS_RAISON'),
            pistes,
        };
    }

    const out = {
        rejet: false,
        fait: String(parsed.fait || '').trim(),
        year: Number.parseInt(String(parsed.year), 10),
        date_precise: String(parsed.date_precise || '').trim(),
        article_principal: typeof parsed.article_principal === 'string' ? parsed.article_principal.trim() : '',
        notoriete_historique: Number.parseInt(String(parsed.notoriete_historique), 10),
        potentiel_fun: Number.parseInt(String(parsed.potentiel_fun), 10),
        type: typeof parsed.type === 'string' ? parsed.type.trim() : null,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12) : [],
        region: typeof parsed.region === 'string' ? parsed.region.trim() : null,
    };

    if (!Number.isFinite(out.year) || out.year < 0) return { rejet: true, raison: 'YEAR_INVALIDE' };
    if (out.year !== year) return { rejet: true, raison: 'YEAR_DIFFERENTE' };
    if (!/^[0-9]{1,4}$/.test(out.date_precise)) return { rejet: true, raison: 'DATE_PRECISE_INVALIDE' };
    if (out.date_precise !== String(year)) return { rejet: true, raison: 'DATE_PRECISE_DIFFERENTE' };
    if (!out.fait || out.fait.length < 15) return { rejet: true, raison: 'FAIT_INSUFFISANT' };
    if (!Number.isFinite(out.notoriete_historique) || out.notoriete_historique < 1 || out.notoriete_historique > 10) return { rejet: true, raison: 'NOTORIETE_HISTORIQUE_INVALIDE' };
    if (!Number.isFinite(out.potentiel_fun) || out.potentiel_fun < 1 || out.potentiel_fun > 10) return { rejet: true, raison: 'POTENTIEL_FUN_INVALIDE' };

    if (!out.article_principal) {
        out.article_principal = String(titreWikipedia || '').replace(/^\d{1,4}\s*:\s*/i, '').trim();
    }

    const singularityBan = /\b(essor|d[ée]veloppement|apparition\s+progressive|progressivement|diffusion|mise\s+en\s+place|p[ée]riode|[ée]poque|[aâ]ge\s+de|tendance|se\s+d[ée]veloppe|se\s+g[ée]n[ée]ralise|augmente|diminue|fleurit|persist(e|ant))\b/i;
    if (singularityBan.test(out.fait)) return { rejet: true, raison: 'SINGULARITE_DUREE_TENDANCE_INTERDITE' };

    const yearMatches = String(out.fait || '').match(/\b(\d{3,4})\b/g) || [];
    for (const ym of yearMatches) {
        const yv = Number.parseInt(ym, 10);
        if (Number.isFinite(yv) && yv !== year) {
            return { rejet: true, raison: 'SINGULARITE_ANNEE_MENTIONNEE_DIFFERENTE' };
        }
    }

    if (out.notoriete_historique < 7) {
        const txt = `${titreWikipedia} ${out.fait} ${out.type || ''} ${(out.tags || []).join(' ')}`;
        const political = looksPoliticalOrMilitary(txt);
        if (out.potentiel_fun >= 3 && !political) {
            // Tolérance fun (non-politique/non-militaire) pour le marathon.
        } else {
            return { rejet: true, raison: 'NOTORIETE_STRICTE_INF_7' };
        }
    }

    return out;
}

async function expertTitreGameDesignerGemini(historien, options = {}) {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);

    const model = options.model || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const gemini = genAI.getGenerativeModel({ model });

    const prompt = `Tu es un Game Designer ET éditeur.

Tu reçois un fait historique validé par un historien. Ta mission UNIQUE: produire le TITRE PARFAIT pour une carte.

FAIT VALIDÉ (à respecter, pas d'invention):
${JSON.stringify(historien, null, 2)}

RÈGLE DE PONCTUALITÉ:
- Le titre doit désigner un point précis dans le temps (acte/cri/signature/décret/découverte/bataille/paix).
- Interdiction totale: "structuration", "évolution", "développement", "essor", "mise en place".

RÈGLE D'UNICITÉ:
- Le titre doit être auto-porteur et non ambigu.
- Préfère le NOM HISTORIOGRAPHIQUE OFFICIEL s'il existe (ex: "Édit de Milan", "Paix de Westphalie").

RÈGLE DU FLASH:
- Le joueur doit pouvoir visualiser la scène.

STYLE FRANÇAIS COMPLET:
- Français correct, articles naturels (Le/La/Les/L').
- Interdit style télégraphique.
- Interdit ":" et "!".

CORRECTION ANTI-POÉSIE / ANTI-NARRATIF (IMPÉRATIF):
- Interdiction des titres de moins de 5 mots qui cherchent à faire une image poétique.
- Le titre doit être une étiquette administrative ou historique précise (encyclopédique), pas une scène romanesque.
- Exemple à bannir: "Strasbourg en flammes".
- Exemple à suivre: "Destruction par incendie de la cité d'Argentoratum lors des invasions barbares".

Renvoie STRICTEMENT:
{ "titre": "..." }`;

    const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.15,
            responseMimeType: 'application/json',
        },
    });

    const text = result?.response?.text?.() || '{}';
    const parsed = extractJsonFromText(text);
    const titre = typeof parsed?.titre === 'string' ? parsed.titre.trim() : '';
    if (!titre || titre.length < 6) throw new Error('TITRE_GAME_DESIGNER_INVALIDE');
    if (titre.split(/\s+/).filter(Boolean).length < 5) throw new Error('TITRE_GAME_DESIGNER_TROP_COURT_5_MOTS');
    if (titre.includes(':')) throw new Error('TITRE_GAME_DESIGNER_DEUX_POINTS');
    if (titre.includes('!')) throw new Error('TITRE_GAME_DESIGNER_EXCLAMATION');
    if (/\ben\s+flammes\b/i.test(titre)) throw new Error('TITRE_GAME_DESIGNER_POETIQUE_EN_FLAMMES');
    if (!/^(Le|La|Les|L')\b/.test(titre) && !/^(Paix|Édit|Edit|Traité|Fondation|Décret|Ordonnance)\b/.test(titre)) {
        throw new Error('TITRE_GAME_DESIGNER_PAS_NOBLE');
    }
    return { titre };
}

function endorphineRejectReason(hist, titreWikipedia) {
    const base = `${titreWikipedia || ''} ${hist?.fait || ''} ${hist?.type || ''} ${(hist?.tags || []).join(' ')}`.toLowerCase();
    const bad = [
        { rx: /\bincendi|\bincendie|\bfeu\b|\bbr[ûu]l|\bflamm|\bembras/i, reason: 'ENDORPHINE_REJET_INCENDIE_GENERIQUE' },
        { rx: /\bsuccession\b|\bsucc[eè]de\b|\bav[eè]nement\b|\bcouronn|\broi\b|\breine\b/i, reason: 'ENDORPHINE_REJET_SUCCESSION' },
        { rx: /\bbataill|\bcombat\b|\bguerre\b|\bsi[eè]ge\b|\bescarmouch/i, reason: 'ENDORPHINE_REJET_BATAILLE_GUERRE' },
    ];

    const good = [
        /\bv(ie|ies)\s+quotid/i,
        /\btechniqu|\binvent|\bprototype|\bm(oulin|oulins)\b|\beau\b.*\bmoulin/i,
        /\bscientif|\bd[ée]couver|\bexp[ée]rien|\bchimie|\bphysique|\bm[ée]decine|\bmath[ée]m|\bastronom/i,
        /\bgastronom|\bcuisine|\bpain\b|\bvin\b|\bfromage|\bbi[èe]re|\brece(tte|ttes)/i,
        /\bloi\b|\b[dé]cret\b|\bordonnance\b|\bprix\b.*\bpain/i,
        /\bpremi[eè]re\b.*\b(mondiale|document[ée]e|attest[ée]e)/i,
    ];

    const hasGood = good.some((rx) => rx.test(base));
    if (!hasGood) {
        for (const b of bad) {
            if (b.rx.test(base)) return b.reason;
        }
        return 'ENDORPHINE_REJET_PAS_ASSEZ_ENDORPHINE';
    }

    return null;
}

function chooseMode(state) {
    const modes = [];

    if (state.leads.length > 0) {
        modes.push({ mode: 'lead', weight: 8 });
        modes.push({ mode: 'theme', weight: state.themes.length > 0 ? 3 : 0.5 });
        modes.push({ mode: 'chrono', weight: 1 });
        modes.push({ mode: 'bond', weight: 0.8 });
    } else if (state.themes.length > 0) {
        modes.push({ mode: 'theme', weight: 6 });
        modes.push({ mode: 'chrono', weight: 2 });
        modes.push({ mode: 'bond', weight: 1 });
    } else {
        modes.push({ mode: 'chrono', weight: 3 });
        modes.push({ mode: 'bond', weight: 2 });
    }

    const total = modes.reduce((acc, m) => acc + m.weight, 0);
    let roll = Math.random() * total;
    for (const m of modes) {
        roll -= m.weight;
        if (roll <= 0) return m.mode;
    }
    return 'chrono';
}

function pickYearForMode(mode, state, range, lead) {
    const minYear = Number.isFinite(range?.minYear) ? range.minYear : 0;
    const maxYear = Number.isFinite(range?.maxYear) ? range.maxYear : 2026;

    if (mode === 'chrono') {
        const candidate = state.currentYear + 1;
        if (candidate > maxYear) return maxYear;
        if (candidate < minYear) return minYear;
        return candidate;
    }

    if (mode === 'bond') {
        return randInt(minYear, maxYear);
    }

    if (mode === 'theme') {
        return randInt(minYear, maxYear);
    }

    if (mode === 'lead') {
        const origin = Number.isFinite(lead?.annee_origine) ? lead.annee_origine : state.currentYear;
        const span = 60;
        return clampYear(origin + randInt(-span, span), minYear, maxYear);
    }

    return randInt(minYear, maxYear);
}

export async function runPredateurTempete(options = {}) {
    const cycles = Number.isFinite(options.cycles) ? options.cycles : 10;
    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.70;
    const model = options.model || 'gemini-2.0-flash';
    const minYear = Number.isFinite(options.minYear) ? options.minYear : 0;
    const maxYear = Number.isFinite(options.maxYear) ? options.maxYear : 2026;
    const endorphineCycles = Number.isFinite(options.endorphineCycles) ? options.endorphineCycles : 0;

    if (minYear < 0 || maxYear > 2026 || minYear > maxYear) {
        throw new Error(`Plage d'années invalide: minYear=${minYear} maxYear=${maxYear}`);
    }

    console.log(`[${now()}] 🦁 Prédateur Tempête — cycles=${cycles} | seuil=${threshold} | model=${model}`);

    console.log(`[${now()}] [DB] Vérification tables locales...`);
    await assertLocalTablesExist();
    console.log(`[${now()}] [DB] OK: ratoire + ratoire_embeddings + ratoire_pistes accessibles.`);

    let initialYear = Number.isFinite(options.startYear) ? options.startYear : null;
    const startMode = typeof options.startMode === 'string' ? options.startMode : null;

    if (!Number.isFinite(initialYear)) {
        initialYear = randInt(minYear, maxYear);
        console.log(`[${now()}] 🎲 Démarrage aléatoire total: année tirée=${initialYear}`);
    }

    const state = {
        currentYear: initialYear,
        themes: [],
        themesWeights: new Map(),
        leads: [],
        darkYears: new Set(),
        failures: 0,
        endorphineRemaining: endorphineCycles > 0 ? endorphineCycles : 0,
        apiErrorStreak: 0,
    };

    const mainstream = String(process.env.MODE_MAINSTREAM || '').toLowerCase() === 'true';
    if (mainstream) {
        try {
            const top = await getTopviewsFR({ limit: 40 });
            for (const t of top) {
                const label = String(t).replaceAll('_', ' ').trim();
                if (!label) continue;
                state.themes.push(label);
                state.themesWeights.set(label, 2.5);
            }
            console.log(`[${now()}] 📈 MODE_MAINSTREAM: topviews FR chargés=${top.length}`);
        } catch (e) {
            console.error(`[${now()}] ⚠️ MODE_MAINSTREAM topviews KO: ${e.message}`);
            await sleepOnQuota(e);
        }
    }

    state.currentYear = Math.min(maxYear, Math.max(minYear, state.currentYear));
    console.log(`[${now()}] 🧭 Démarrage: année initiale=${state.currentYear} (plage ${minYear}-${maxYear})`);

    const range = { minYear, maxYear };

    const openaiClient = getOpenAIClient();

    let pepites = 0;
    let pistes = 0;

    console.log(`[${now()}] 📒 Chargement des pistes existantes...`);
    try {
        const pistes = await loadRecentPistes(80);
        state.leads = pistes.map((p) => ({
            label: p.nom_sujet,
            type_sujet: p.type_sujet,
            annee_origine: p.annee_origine,
            weight: 1,
        }));
        console.log(`[${now()}] 📒 Pistes chargées: ${state.leads.length}`);
    } catch (e) {
        console.error(`[${now()}] ⚠️ Chargement pistes KO: ${e.message}`);
    }

    for (let i = 1; i <= cycles; i++) {
        const endorphineActive = state.endorphineRemaining > 0;
        if (endorphineActive) {
            console.log(`[${now()}] 🧪 Mission Endorphine active: ${state.endorphineRemaining} cycle(s) restant(s).`);
        }

        const forced = typeof startMode === 'string' && i === 1 ? startMode : null;
        const mode = forced || (state.failures >= 4 ? 'bond' : chooseMode(state));

        const leadPick = mode === 'lead'
            ? weightedPick(state.leads.map((l) => ({ ...l, weight: Math.max(0.2, l.weight) })))
            : null;

        const themePick = mode === 'theme'
            ? weightedPick(state.themes.map((t) => ({
                label: t,
                weight: Number(state.themesWeights.get(t) || 1),
            })))
            : null;

        const stableMode = (mode === 'lead' && !leadPick) || (mode === 'theme' && !themePick) ? 'bond' : mode;

        const year = pickYearForMode(stableMode, state, range, leadPick);
        const lead = leadPick ? { label: leadPick.label, type_sujet: leadPick.type_sujet, annee_origine: leadPick.annee_origine } : null;
        const theme = themePick?.label || null;

        if (state.darkYears.has(year)) {
            console.log(`[${now()}] 🕳️ L'animal évite une zone sombre (${year}) et rebondit.`);
            continue;
        }

        if (stableMode === 'lead') {
            console.log(`[${now()}] 🦁 L'animal suit une piste: "${lead?.label}" (${lead?.type_sujet || 'theme'}) et explore ${year}...`);
        } else if (stableMode === 'theme') {
            console.log(`[${now()}] 🦁 L'animal suit un thème gagnant: "${theme}" et explore ${year}...`);
        } else if (stableMode === 'chrono') {
            console.log(`[${now()}] 🦁 L'animal hume l'air en ${year}... (mode chrono)`);
        } else if (stableMode === 'bond') {
            console.log(`[${now()}] 🦁 L'animal bondit vers ${year}... (mode bond)`);
        }

        state.currentYear = year;

        // Pause systématique entre cycles (anti-429)
        await sleep(3 * 1000);

        const source = typeof pickRandomSource === 'function' ? pickRandomSource() : 'wikipedia';
        let holes;
        try {
            console.log(`[${now()}] 🧪 Source=${source}`);
            holes = await getCandidatesForSource(source, {
                year,
                threshold,
                lang: options.lang || 'fr',
                wikipediaLimit: options.wikipediaLimit ?? 40,
                maxOnThisDayPerCycle: options.maxOnThisDayPerCycle ?? 12,
            });
            state.apiErrorStreak = 0;
        } catch (e) {
            console.error(`[${now()}] ❌ Extracteur KO (${source}): ${e.message}`);
            await sleepOnQuota(e);

            if (source === 'onthisday') {
                try {
                    console.log(`[${now()}] 🔁 Fallback: OnThisDay -> Wikipedia`);
                    holes = await getCandidatesForSource('wikipedia', {
                        year,
                        threshold,
                        lang: options.lang || 'fr',
                        wikipediaLimit: options.wikipediaLimit ?? 40,
                    });
                } catch (e2) {
                    console.error(`[${now()}] ❌ Fallback Wikipedia KO: ${e2.message}`);
                    await sleepOnQuota(e2);
                    state.apiErrorStreak++;
                    if (state.apiErrorStreak >= 10) {
                        console.error(`[${now()}] ⏸️ 10 erreurs API consécutives — pause 2 minutes...`);
                        await sleep(2 * 60 * 1000);
                        state.apiErrorStreak = 0;
                    }
                    continue;
                }
            } else {
                state.apiErrorStreak++;
                if (state.apiErrorStreak >= 10) {
                    console.error(`[${now()}] ⏸️ 10 erreurs API consécutives — pause 2 minutes...`);
                    await sleep(2 * 60 * 1000);
                    state.apiErrorStreak = 0;
                }
                continue;
            }
        }

        if (!Array.isArray(holes) || holes.length === 0) {
            console.log(`[${now()}] 🌫️ Rien d'intéressant détecté en ${year}.`);
            continue;
        }

        const candidates = holes.slice(0, options.maxGeminiPerCycle ?? 10);
        const compassSeed = candidates?.[0]?.titre;

        let found = false;
        for (const h of candidates) {
            const titre = h?.titre;
            if (!titre) continue;

            console.log(`[${now()}] [${String(h?.source || source)}] titre="${titre}"`);

            if (String(h?.source || source) !== 'wikipedia') {
                try {
                    const dup = await isDuplicateByEmbedding(titre, { openaiClient, threshold });
                    if (dup.duplicate) {
                        console.log(`[${now()}] [Doublon] skip similarity=${dup.similarity}`);
                        continue;
                    }
                } catch (e) {
                    console.error(`[${now()}] ⚠️ Check doublon KO: ${e.message}`);
                    await sleepOnQuota(e);
                }
            }

            let hist;
            try {
                hist = await expertHistorienGemini(titre, year, {
                    model,
                    lead: lead || (theme ? { label: theme, type_sujet: 'theme', annee_origine: year } : null),
                    mission: endorphineActive ? 'endorphine' : null,
                });
                state.apiErrorStreak = 0;
            } catch (e) {
                console.error(`[${now()}] ❌ LLM KO: ${e.message}`);
                await sleepOnQuota(e);
                state.apiErrorStreak++;
                if (state.apiErrorStreak >= 10) {
                    console.error(`[${now()}] ⏸️ 10 erreurs API consécutives — pause 2 minutes...`);
                    await sleep(2 * 60 * 1000);
                    state.apiErrorStreak = 0;
                }
                continue;
            }

            if (hist.rejet) {
                const reason = String(hist.raison || '').toLowerCase();
                const isDark = reason.includes('trag') || reason.includes('massacr') || reason.includes('shoah') || reason.includes('genoc') || reason.includes('attent') || reason.includes('tortur') || reason.includes('famine');
                if (isDark) {
                    state.darkYears.add(year);
                }

                if (Array.isArray(hist.pistes)) {
                    for (const p of hist.pistes.slice(0, 3)) {
                        try {
                            const idPiste = await insertIntoRatoirePistes(p);
                            if (idPiste) {
                                pistes++;
                                state.leads.push({ label: p.nom_sujet, type_sujet: p.type_sujet, annee_origine: p.annee_origine, weight: 1 });
                                console.log(`[${now()}] 🧬 Piste ajoutée (#${idPiste}): "${p.nom_sujet}" (${p.type_sujet}) depuis ${year}.`);
                            }
                        } catch (e) {
                            console.error(`[${now()}] ⚠️ Insertion piste KO: ${e.message}`);
                        }
                    }
                }

                continue;
            }

            console.log(`[${now()}] [Historien] OK: notoriété=${hist.notoriete_historique}/10 | fun=${hist.potentiel_fun}/10 | type="${hist.type}"`);

            if (!Number.isFinite(hist.potentiel_fun) || hist.potentiel_fun <= 2) {
                console.log(`[${now()}] [Refus] fun=${hist.potentiel_fun} | raison=FUN_TROP_BAS_INF_3`);
                continue;
            }

            if (endorphineActive) {
                const rej = endorphineRejectReason(hist, titre);
                if (rej) {
                    console.log(`[${now()}] [Endorphine] REJET: ${rej}`);
                    continue;
                }
            }

            try {
                const article = String(hist.article_principal || '').trim();
                if (article) {
                    const views = await getAnnualPageviews(article, { project: 'fr.wikipedia' });
                    const score = pageviewsToNotorieteScore(views);
                    if (Number.isFinite(score)) {
                        hist.notoriete_historique = score;
                        console.log(`[${now()}] [Metrics] article="${article}" | views_12m=${views} | notoriete_reelle=${score}/10`);
                    }
                }
            } catch (e) {
                console.error(`[${now()}] ⚠️ Metrics KO: ${e.message}`);
                await sleepOnQuota(e);
            }

            if (hist.potentiel_fun <= 2 && hist.notoriete_historique <= 2) {
                console.log(`[${now()}] [Refus] fun=${hist.potentiel_fun}, notoriete=${hist.notoriete_historique} | raison=FUN_FAIBLE_ET_NOTORIETE_FAIBLE`);
                continue;
            }

            let gd;
            try {
                gd = await expertTitreGameDesignerGemini(hist, { model });
                state.apiErrorStreak = 0;
            } catch (e) {
                console.error(`[${now()}] ❌ GameDesigner KO: ${e.message}`);
                await sleepOnQuota(e);
                state.apiErrorStreak++;
                if (state.apiErrorStreak >= 10) {
                    console.error(`[${now()}] ⏸️ 10 erreurs API consécutives — pause 2 minutes...`);
                    await sleep(2 * 60 * 1000);
                    state.apiErrorStreak = 0;
                }
                continue;
            }

            console.log(`[${now()}] [Transformation] wiki="${titre}" -> historien="${hist.fait}" -> titre="${gd.titre}"`);

            const validated = {
                titre: gd.titre,
                year: hist.year,
                description: hist.fait,
                notoriete_historique: hist.notoriete_historique,
                potentiel_fun: hist.potentiel_fun,
                type: hist.type,
                tags: Array.isArray(hist.tags) ? hist.tags : [],
                region: hist.region,
            };

            console.log(`[${now()}] [Transformation] wiki="${titre}" -> gemini="${validated.titre}"`);

            const acceptText = `${validated.titre} ${validated.description} ${validated.type || ''} ${(validated.tags || []).join(' ')}`;
            const isPolitical = looksPoliticalOrMilitary(acceptText);
            const passes = validated.notoriete_historique >= 7 || (validated.potentiel_fun >= 3 && !isPolitical);
            if (!passes) {
                console.log(`[${now()}] [Refus] "${validated.titre}" -> hist=${validated.notoriete_historique}, fun=${validated.potentiel_fun} | raison=QUALITE_INSUFFISANTE`);
                continue;
            }
            console.log(`[${now()}] [Validation] OK: ${validated.notoriete_historique >= 7 ? 'NOTORIETE>=7' : 'FUN>=3_NON_POLITIQUE'}`);

            const typeStr = validated.type || 'Thème';
            const fun = validated.potentiel_fun;
            const histScore = validated.notoriete_historique;

            try {
                const id = await insertIntoRatoire(validated);
                pepites++;
                found = true;

                console.log(`[${now()}] 🎯 Pépite ! "${validated.titre}" (Type: ${typeStr}, Fun: ${fun}, Hist: ${histScore}) [id=${id}]`);

                try {
                    await embedAndStoreRatoireId(id, validated.titre, { openaiClient });
                    console.log(`[${now()}] 🧭 Radar à doublons: embedding stocké (id=${id}).`);
                } catch (e) {
                    console.error(`[${now()}] ⚠️ Pépite OK (id=${id}) mais embedding KO: ${e.message}`);
                    await sleepOnQuota(e);
                }

                // Pause après succès (anti-429 / laisser respirer Gemini+OpenAI)
                await sleep(10 * 1000);

                if (typeStr && !state.themes.includes(typeStr)) {
                    state.themes.push(typeStr);
                }

                state.themesWeights.set(typeStr, Number(state.themesWeights.get(typeStr) || 0) + Math.max(1, fun));
                state.failures = 0;

                break;
            } catch (e) {
                console.error(`[${now()}] ❌ Insertion ratoire KO: ${e.message}`);
            }
        }

        if (!found) {
            console.log(`[${now()}] 🐾 L'animal n'a pas trouvé de pépite exploitable en ${year}.`);
            state.failures++;
            console.log(`[${now()}] ❌ Aucune pépite retenue pour ${year}. échecs=${state.failures}`);

            if (state.failures >= 3 && compassSeed) {
                try {
                    const compass = await vectorCompassFromText(compassSeed, { openaiClient });
                    if (compass?.type) {
                        const t = compass.type;
                        if (!state.themes.includes(t)) {
                            state.themes.push(t);
                        }
                        const old = Number(state.themesWeights.get(t) || 1);
                        state.themesWeights.set(t, Math.max(old, Number(compass.fun || 1)));
                        console.log(`[${now()}] 🧭 VectorCompass suggère un thème: "${t}" (similarity=${compass.similarity}, fun=${compass.fun})`);
                    }
                } catch (e) {
                    console.error(`[${now()}] ⚠️ VectorCompass KO: ${e.message}`);
                }
            }
        } else {
            state.failures = 0;
        }

        if (state.endorphineRemaining > 0) {
            state.endorphineRemaining--;
        }

        console.log(`[${now()}] 📊 Cycle ${i}/${cycles} terminé — pépites=${pepites} | pistes=${pistes} | thèmes=${state.themes.length}`);
    }

    state.themes = state.themes.slice(-30);
}

async function main() {
    const cycles = process.env.TEMPETE_PREDATEUR_CYCLES ? Number(process.env.TEMPETE_PREDATEUR_CYCLES) : 10;
    const startYear = process.env.TEMPETE_PREDATEUR_START_YEAR ? Number(process.env.TEMPETE_PREDATEUR_START_YEAR) : null;
    const minYear = process.env.TEMPETE_PREDATEUR_MIN_YEAR ? Number(process.env.TEMPETE_PREDATEUR_MIN_YEAR) : 0;
    const maxYear = process.env.TEMPETE_PREDATEUR_MAX_YEAR ? Number(process.env.TEMPETE_PREDATEUR_MAX_YEAR) : 2026;
    const startMode = process.env.TEMPETE_PREDATEUR_START_MODE ? String(process.env.TEMPETE_PREDATEUR_START_MODE) : null;
    const endorphineCycles = process.env.TEMPETE_PREDATEUR_ENDORPHINE_CYCLES ? Number(process.env.TEMPETE_PREDATEUR_ENDORPHINE_CYCLES) : 0;

    try {
        await runPredateurTempete({
            cycles,
            startYear,
            minYear,
            maxYear,
            startMode,
            endorphineCycles,
            model: process.env.TEMPETE_GEMINI_MODEL || process.env.TEMPETE_LLM_MODEL || 'gemini-2.0-flash',
            threshold: process.env.TEMPETE_SIM_THRESHOLD ? Number(process.env.TEMPETE_SIM_THRESHOLD) : 0.70,
        });
    } catch (e) {
        console.error(`[${now()}] FATAL: ${e?.stack || e?.message || e}`);
        process.exit(1);
    }
}

function isEntryScript() {
    try {
        const argvPath = String(process.argv?.[1] || '');
        if (!argvPath) return false;

        const argvNorm = argvPath.replace(/\\/g, '/').toLowerCase();
        const metaPath = decodeURIComponent(new URL(import.meta.url).pathname).toLowerCase();

        const metaNorm = metaPath.startsWith('/') && /^[a-z]:\//.test(metaPath.slice(1))
            ? metaPath.slice(1)
            : metaPath;

        if (argvNorm.endsWith('/predateur_tempete.mjs') && metaNorm.endsWith('/predateur_tempete.mjs')) {
            return true;
        }

        return metaNorm.endsWith(argvNorm);
    } catch {
        return false;
    }
}

console.log(`[DEBUG] import.meta.url=${import.meta.url}`);
console.log(`[DEBUG] argv[1]=${process.argv?.[1]}`);
console.log(`[DEBUG] isEntryScript=${isEntryScript()}`);

if (isEntryScript()) {
    (async () => {
        await bootstrapImports();
        console.log('✅ Imports OK, entrée dans main()');
        await main();
    })().catch((e) => {
        console.error('❌ ERREUR TOP-LEVEL:');
        console.error(e?.stack || e?.message || e);
        process.exit(1);
    });
}

