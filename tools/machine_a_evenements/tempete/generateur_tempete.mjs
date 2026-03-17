console.log('🚀 Lancement immédiat du fichier generateur_tempete.mjs');

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

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
    } catch (e) {
        console.error('❌ ERREUR IMPORT/SYNTAXE (avant main):');
        console.error(e?.stack || e?.message || e);
        process.exit(1);
    }
}

function now() {
    return new Date().toISOString();
}

async function assertRatoireQuickCheck() {
    try {
        const { error } = await localDb.from('ratoire').select('*').limit(1);
        if (error) throw error;
    } catch (e) {
        console.error(`[${now()}] ERREUR : La table ratoire n'existe pas !`);
        throw e;
    }
}

function parseYearArg(argv) {
    const raw = argv?.[2];
    const year = Number.parseInt(String(raw || ''), 10);
    if (!Number.isFinite(year)) return null;
    return year;
}

async function countRatoire() {
    const { count, error } = await localDb
        .from('ratoire')
        .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
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

async function testWriteBlankRow() {
    const title = `__TEST_RATOIRE_${Date.now()}`;
    const payload = {
        titre: title,
        year: 1969,
        description: 'Test écriture à blanc (debug tempête)',
        notoriete: 1,
        type: 'TEST',
        region: 'TEST',
        status: 'pending',
        validation_notes: { test: true },
    };

    const { data, error } = await localDb
        .from('ratoire')
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return { id: data?.id, title };
}

async function expertHistoriqueGemini(titreWikipedia, year, options = {}) {
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);

    const model = options.model || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const gemini = genAI.getGenerativeModel({ model });

    const prompt = `Tu n'es plus un historien classique : tu es un Game Designer de génie.
Ton but est de maximiser la rétention des joueurs en dénichant des « pépites d'endorphine » : insolite, fun, surprenant (« C'est pas vrai ? »), et proche de la vie quotidienne.
Tu restes factuel et daté (à l'année), mais tu optimises pour le plaisir de jeu.

RÈGLE ÉTHIQUE ABSOLUE:
- Interdiction des sujets tragiques ou traumatiques (Shoah, massacres, génocides, attentats, tortures, famines, catastrophes avec morts en masse, etc.).
- Si l'événement implique des victimes, une violence ou une oppression notable, REJETTE.

Wikipedia (FR) mentionne ce fait/puce pour l'année ${year} : "${titreWikipedia}".

RÈGLE D'OR: si l'année est floue, débattue, imprécise, ou si l'événement n'est pas clairement rattachable à l'année ${year}, REJETTE.

STYLE DE TITRE « JEU DE CHRONOLOGIE » (OBLIGATOIRE):
- Interdiction formelle des titres de type presse / clickbait / narratif.
- Interdit: deux-points ":" ; points d'exclamation "!".
- Interdit: adjectifs mélodramatiques ou sensationnalistes (ex: "mystérieux", "incroyable", "SOS", "drame", "terrifiant", "scandale").
- Modèle: [Sujet] + [Action précise] + [Lieu/Acteurs].
- Interdit: titres génériques du type "Coup d'État", "Incident", "Invention", "Traité", "Crise" sans précision.
- Test d'unicité: chaque titre doit être unique dans l'histoire universelle. Il doit donc inclure les parties prenantes / le lieu / le contexte qui le distinguent.
- Le titre doit être compréhensible par un joueur sans avoir besoin de lire la description.
- Si tu n'arrives pas à produire un titre auto-porteur et non ambigu, REJETTE.

Instruction de satiété:
- Préfère la précision historique à l'effet de manche. Un joueur doit pouvoir placer la carte en comprenant exactement de quoi on parle.

RÈGLE DU POINT vs DURÉE (IMPÉRATIF):
- Rejette systématiquement les phénomènes lents, continus ou "ambiances" (ex: "La piraterie augmente", "Le commerce fleurit", "L'art se développe", "La crise persiste").

TEST DE L'ANNÉE UNIQUE (IMPÉRATIF):
- Si la phrase peut être datée d'une autre année sans changer le sens, REJETTE.

PRIORITÉ AUX TITRES OFFICIELS (IMPÉRATIF):
- Utilise le nom historiographique consacré quand il existe (ex: "Paix de Tournai", "Bataille de Kosovo Polje", "Élection du pape ...").
- Si l'événement n'a pas de nom officiel, crée un titre basé sur un acte ponctuel: [Sujet] + [Verbe d'action précis] + [Complément].

VERBES INTERDITS (dans le titre):
- "sévir", "briller", "persister", "augmenter", "fleurir".

VERBES RECOMMANDÉS (préférer):
- "signer", "fonder", "décréter", "découvrir", "détrôner", "publier".

Exemples de style:
- Mauvais: "Invention du chewing-gum". Bon: "Thomas Adams commercialise le premier chewing-gum moderne".
- Mauvais: "Coup d'État". Bon: "Coup d'État de Mouammar Kadhafi en Libye".

Exemples "Jeu de Chronologie":
- Mauvais: "Le SOS du Negus : l'Éthiopie cherche des alliés".
- Bon: "Appel à l'aide du Negus Dawit II d'Éthiopie aux Portugais contre l'invasion d'Ahmed Gragne".
- Mauvais: "Mutinerie et Découverte : l'Odyssée des Îles".
- Bon: "Découverte des îles Christmas par l'équipage mutiné du navire de Grijalva".

CRITÈRES DE SÉLECTION PRIORITAIRES:
- Insolite / fun: anecdotes surprenantes, records, premières fois, inventions du quotidien, divertissement.
- « C'est pas vrai ? »: faits méconnus mais géniaux à apprendre.
- Vie quotidienne: mode, nourriture, loisirs, transports, spectacles, objets.

RÉÉQUILIBRAGE MONDE/FRANCE:
- Favoriser France / francophonie quand c'est fun.
- Mais si un événement a changé la face du monde (révolution majeure, traité fondateur, invention majeure), il reste prioritaire même hors France.

FILTRAGE QUALITATIF (REJET SYSTÉMATIQUE):
- Naissances
- Décès
- Nominations / élections administratives sans portée historique majeure
- Faits divers / crimes sans portée historique
- Sport (sauf événement absolument mondial et culturel)
- Événements non datables précisément ou trop vagues

DATE:
- On ignore les jours et les mois.
- Le champ date_precise ne doit contenir que l'année, au format "YYYY".

Si tu rejettes, renvoie STRICTEMENT ce JSON:
{ "rejet": true, "raison": "..." }

SCORING (NOUVEAU SYSTÈME):
- Tu dois fournir deux notes:
  - notoriete_historique (1-10)
  - potentiel_fun (1-10)
- Un événement est une pépite si notoriete_historique >= 6 OU potentiel_fun >= 7.

Sinon, renvoie STRICTEMENT un JSON compatible table public.labo, avec ces champs:
{
  "rejet": false,
  "raison_du_choix": "Pourquoi c'est une carte pertinente pour un jeu français (1-2 phrases, factuel)",
  "titre": "Appellation officielle, auto-porteuse, SANS DATE NI ANNÉE dans le texte",
  "year": ${year},
  "date_precise": "${year}",
  "description": "Courte phrase de contexte",
  "notoriete_historique": 1,
  "potentiel_fun": 1,
  "type": "Thème vendeur et précis (ex: 'Pionniers de l'aviation', 'Gastronomie insolite', 'Mystères de l'histoire')",
  "tags": ["mot-clé1", "mot-clé2"],
  "region": "Région"
}

Contraintes:
- year doit être un integer > 0.
- date_precise doit être exactement "${year}".
- notoriete_historique et potentiel_fun doivent être des entiers 1-10.
- Le titre ne doit PAS contenir l'année ni une date.`;

    const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
        },
    });

    const text = result?.response?.text?.() || '{}';
    const parsed = extractJsonFromText(text);

    if (!parsed || typeof parsed !== 'object') {
        return { rejet: true, raison: 'LLM_INVALID_JSON' };
    }

    if (parsed.rejet === true) {
        return { rejet: true, raison: String(parsed.raison || 'REJET_SANS_RAISON') };
    }

    const out = {
        rejet: false,
        raison_du_choix: typeof parsed.raison_du_choix === 'string' ? parsed.raison_du_choix.trim() : '',
        titre: String(parsed.titre || '').trim(),
        year: Number.parseInt(String(parsed.year), 10),
        date_precise: String(parsed.date_precise || '').trim(),
        description: String(parsed.description || '').trim(),
        notoriete_historique: Number.parseInt(String(parsed.notoriete_historique), 10),
        potentiel_fun: Number.parseInt(String(parsed.potentiel_fun), 10),
        type: typeof parsed.type === 'string' ? parsed.type.trim() : null,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12) : [],
        region: typeof parsed.region === 'string' ? parsed.region.trim() : null,
    };

    if (!out.titre || out.titre.length < 3) return { rejet: true, raison: 'TITRE_INVALIDE' };
    if (!Number.isFinite(out.year) || out.year <= 0) return { rejet: true, raison: 'YEAR_INVALIDE' };
    if (out.year !== year) return { rejet: true, raison: 'YEAR_DIFFERENTE' };
    if (!/^\d{4}$/.test(out.date_precise)) return { rejet: true, raison: 'DATE_PRECISE_INVALIDE' };
    if (out.date_precise !== String(year)) return { rejet: true, raison: 'DATE_PRECISE_DIFFERENTE' };
    if (!out.description || out.description.length < 10) return { rejet: true, raison: 'DESCRIPTION_INSUFFISANTE' };
    if (!Number.isFinite(out.notoriete_historique) || out.notoriete_historique < 1 || out.notoriete_historique > 10) return { rejet: true, raison: 'NOTORIETE_HISTORIQUE_INVALIDE' };
    if (!Number.isFinite(out.potentiel_fun) || out.potentiel_fun < 1 || out.potentiel_fun > 10) return { rejet: true, raison: 'POTENTIEL_FUN_INVALIDE' };

    const titreLower = out.titre.toLowerCase();
    if (titreLower.includes(String(year))) return { rejet: true, raison: 'TITRE_CONTIENT_ANNEE' };

    if (out.titre.includes(':')) return { rejet: true, raison: 'TITRE_INTERDIT_DEUX_POINTS' };
    if (out.titre.includes('!')) return { rejet: true, raison: 'TITRE_INTERDIT_EXCLAMATION' };

    const forbidden = ['mystérieux', 'mysterieux', 'incroyable', 'sos', 'drame', 'terrifiant', 'scandale'];
    if (forbidden.some((w) => titreLower.includes(w))) return { rejet: true, raison: 'TITRE_STYLE_PRESSE_INTERDIT' };

    const forbiddenVerbs = ['sévir', 'sevir', 'briller', 'persister', 'augmenter', 'fleurir'];
    if (forbiddenVerbs.some((w) => titreLower.includes(w))) return { rejet: true, raison: 'TITRE_VERBE_INTERDIT' };

    return out;
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
            date_precise: validated.date_precise,
            source: 'tempete_wikipedia',
            raison_du_choix: validated.raison_du_choix || null,
            notoriete_historique: validated.notoriete_historique,
            potentiel_fun: validated.potentiel_fun,
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

export async function runGenerateurTempete(year, options = {}) {
    if (!Number.isFinite(year) || year <= 0) {
        throw new Error('Année invalide : year doit être > 0 (pas d\'avant J.-C.)');
    }

    if (options.force1969 === true || process.env.TEMPETE_FORCE_1969 === '1') {
        year = 1969;
    }

    const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.70;
    const model = options.model || 'gemini-2.0-flash';
    const smallMode = options.smallMode === true;

    console.log(`[${now()}] Dénicheur Tempête — année=${year} | seuil=${threshold} | model=${model}`);

    console.log(`[${now()}] Tentative de connexion à la DB...`);
    await assertRatoireQuickCheck();
    console.log(`[${now()}] Connexion DB OK.`);

    console.log(`[${now()}] [DB] Vérification tables locales...`);
    await assertLocalTablesExist();
    console.log(`[${now()}] [DB] OK: ratoire + ratoire_embeddings accessibles.`);

    console.log(`[${now()}] [DB] Test d'écriture à blanc...`);
    const testRow = await testWriteBlankRow();
    console.log(`[${now()}] [DB] Insertion test réussie (ID: ${testRow.id}).`);
    const countBefore = await countRatoire();
    console.log(`[${now()}] [DB] ratoire count(*) après test = ${countBefore}`);

    console.log(`[${now()}] Récupération Wikipedia en cours...`);
    const explorationStats = { titlesCount: 0 };
    const holes = await trouverNouveauxEvenements(year, {
        threshold,
        lang: options.lang || 'fr',
        limit: smallMode ? 5 : (options.limit ?? 60),
        wikipediaDebugRaw: options.wikipediaDebugRaw === true,
        onWikipediaRaw: options.onWikipediaRaw,
        onExploration: ({ titlesCount }) => {
            explorationStats.titlesCount = titlesCount;
            console.log(`[${now()}] [Wikipedia] ${titlesCount} titres récupérés pour l'année ${year}.`);
        },
        onCompare: ({ titre, similarity, threshold: th }) => {
            console.log(`[${now()}] [Comparaison] "${titre}" -> Score de similarité : ${Number(similarity).toFixed(2)}`);
            if (similarity >= th) {
                console.log(`    ↳ ❌ Ignoré (Déjà présent ou trop proche).`);
            } else {
                console.log(`    ↳ 🎯 TROU DÉTECTÉ ! Envoi à Gemini pour validation...`);
            }
        },
    });

    if (explorationStats.titlesCount === 0) {
        console.log(`[${now()}] Fin du scan : Aucun nouvel événement digne d'intérêt trouvé pour cette année.`);
        const countAfter = await countRatoire();
        console.log(`[${now()}] [DB] ratoire count(*) final = ${countAfter}`);
        return { analysed: 0, accepted: 0, rejected: 0 };
    }

    console.log(`[${now()}] ${explorationStats.titlesCount} titres reçus, début de la comparaison...`);
    console.log(`[${now()}] Étape 1 — Trous candidats: ${holes.length}`);

    const openaiClient = getOpenAIClient();

    let analysed = 0;
    let accepted = 0;
    let rejected = 0;

    for (const h of holes) {
        analysed++;
        const titre = h?.titre;

        console.log(`[${now()}] [${analysed}/${holes.length}] Analyse: "${titre}" (simMax=${Number(h?.maxSimilarity || 0).toFixed(3)})`);

        let validated;
        try {
            console.log(`[${now()}] Analyse de l'événement par Gemini...`);
            validated = await expertHistoriqueGemini(titre, year, { model });
        } catch (e) {
            console.error(`[${now()}] ❌ Rejet (erreur LLM): ${e.message}`);
            rejected++;
            continue;
        }

        if (validated.rejet) {
            console.log(`[${now()}] [Gemini] ⛔ REJETÉ : ${validated.raison}`);
            rejected++;
            continue;
        }

        const passesFilter = validated.notoriete_historique >= 6 || validated.potentiel_fun >= 7;
        if (!passesFilter) {
            console.log(`[${now()}] [Refus] "${validated.titre}" -> hist=${validated.notoriete_historique}, fun=${validated.potentiel_fun} | raison=SCORES_TROP_BAS`);
            rejected++;
            continue;
        }

        console.log(`[${now()}] [Gemini] Décision : "${validated.raison_du_choix || 'OK'} / hist=${validated.notoriete_historique}/10 | fun=${validated.potentiel_fun}/10"`);

        let id;
        try {
            id = await insertIntoRatoire(validated);
        } catch (e) {
            console.error(`[${now()}] ❌ Échec insertion ratoire: ${e.message}`);
            rejected++;
            continue;
        }

        console.log(`[${now()}] [Base de données] Insertion dans la table 'ratoire' réussie (ID: ${id}).`);

        try {
            await embedAndStoreRatoireId(id, validated.titre, { openaiClient });
        } catch (e) {
            console.error(`[${now()}] ⚠️ Insertion OK (id=${id}) mais embedding KO: ${e.message}`);
            accepted++;
            continue;
        }

        console.log(`[${now()}] [Embedding] Vecteur généré via OpenAI et stocké dans 'ratoire_embeddings'.`);

        accepted++;
        console.log(`[${now()}] ✅ Ajouté: id=${id} | "${validated.titre}" | ${validated.date_precise}`);
    }

    if (accepted === 0) {
        console.log(`[${now()}] Fin du scan : Aucun nouvel événement digne d'intérêt trouvé pour cette année.`);
    }

    console.log(`[${now()}] Terminé — analysés=${analysed} | acceptés=${accepted} | rejetés=${rejected}`);

    const countAfter = await countRatoire();
    console.log(`[${now()}] [DB] ratoire count(*) final = ${countAfter}`);

    return { analysed, accepted, rejected };
}

async function main() {
    const year = parseYearArg(process.argv);
    if (!year || year <= 0) {
        console.error(`Usage: node tools/machine_a_evenements/tempete/generateur_tempete.mjs 1789`);
        process.exit(1);
    }

    try {
        await runGenerateurTempete(year, {
            model: process.env.TEMPETE_GEMINI_MODEL || process.env.TEMPETE_LLM_MODEL || 'gemini-2.0-flash',
            threshold: process.env.TEMPETE_SIM_THRESHOLD ? Number(process.env.TEMPETE_SIM_THRESHOLD) : 0.70,
            force1969: process.env.TEMPETE_FORCE_1969 === '1',
            wikipediaDebugRaw: true,
            onWikipediaRaw: (raw) => {
                const jsonText = JSON.stringify(raw?.json || {}, null, 2);
                const preview = jsonText.length > 3000 ? jsonText.slice(0, 3000) + '\n...<truncated>' : jsonText;
                console.log(`[${now()}] [Wikipedia RAW] phase=${raw?.phase} url=${raw?.url}`);
                console.log(preview);
            },
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

        if (argvNorm.endsWith('/generateur_tempete.mjs') && metaNorm.endsWith('/generateur_tempete.mjs')) {
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

