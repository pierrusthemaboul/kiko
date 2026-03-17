import fs from 'fs';
import { getSupabase } from '../shared_utils.mjs';
import { embedText } from '../../tempete/openai.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Analyse des arguments ligne de commande simples
const args = process.argv.slice(2);
let config = { target: 20, theme: "Générique", q: "wd:Q1190554", sitelinks: 40, date_prop: "wdt:P571", start: null, end: null };

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target') config.target = parseInt(args[++i]);
    if (args[i] === '--theme') config.theme = args[++i];
    if (args[i] === '--q') config.q = args[++i];
    if (args[i] === '--sitelinks') config.sitelinks = parseInt(args[++i]);
    if (args[i] === '--date_prop') config.date_prop = args[++i];
    if (args[i] === '--start') config.start = parseInt(args[++i]);
    if (args[i] === '--end') config.end = parseInt(args[++i]);
}

const supabase = getSupabase('prod');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const endpointUrl = 'https://query.wikidata.org/sparql';

async function fetchWikidataPage(offset) {
    const timeFilter = (config.start !== null && config.end !== null) ? `FILTER(YEAR(?date) >= ${config.start} && YEAR(?date) <= ${config.end})` : '';

    // /wdt:P279* permet d'aller chercher dans les sous-classes automatiquement !
    const query = `
    SELECT DISTINCT ?event ?eventLabel ?eventDescription ?date ?sitelinks WHERE {
      ?event wdt:P31/wdt:P279* ${config.q}; ${config.date_prop} ?date; wikibase:sitelinks ?sitelinks.
      ${timeFilter}
      FILTER(?sitelinks > ${config.sitelinks})
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
    } ORDER BY DESC(?sitelinks) LIMIT 20 OFFSET ${offset}
    `;

    const fullUrl = endpointUrl + '?query=' + encodeURIComponent(query);
    const response = await fetch(fullUrl, { headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': 'KikoExpert/1.0' } });
    if (!response.ok) return [];

    const rawData = await response.json();
    return rawData.results.bindings.map(b => ({
        wikidata_id: b.event.value.split('/').pop(),
        titre_brut: b.eventLabel?.value,
        desc_brut: b.eventDescription?.value,
        wikidata_year: parseInt(b.date?.value.split('-')[0]),
        theme: config.theme
    })).filter(r => r.titre_brut && !r.titre_brut.startsWith('Q') && r.wikidata_year > 0);
}

async function agentExtracteurGeneral() {
    console.log(`\n🛡️ Démarrage de l'Extracteur Wikidata (Cible: ${config.target} événements sur [${config.theme}])...`);
    console.log(`⚙️ Filtres : Classe=${config.q}, Sitelinks Minimum=${config.sitelinks}, Période=${config.start || '*'} à ${config.end || '*'}\n`);

    const finalAcquisition = [];
    let seenWikidataIds = new Set();

    let offset = 0;
    let totalAnalyzed = 0;
    const MAX_ANALYSIS = 400; // Disjoncteur 

    while (finalAcquisition.length < config.target && totalAnalyzed < MAX_ANALYSIS) {

        console.log(`📦 Récupération Wikidata Page ${offset / 20 + 1}...`);
        const batch = await fetchWikidataPage(offset);
        offset += 20;

        if (batch.length === 0) {
            console.log(`  Plus rien à explorer pour ce niveau d'exigence (Sitelinks > ${config.sitelinks}).`);
            break;
        }

        for (const raw of batch) {
            if (finalAcquisition.length >= config.target || totalAnalyzed >= MAX_ANALYSIS) break;
            if (seenWikidataIds.has(raw.wikidata_id)) continue;

            seenWikidataIds.add(raw.wikidata_id);
            totalAnalyzed++;

            process.stdout.write(`(${totalAnalyzed}/${MAX_ANALYSIS}) 🔍 [${raw.theme}] ${raw.titre_brut} (${raw.wikidata_year}) `);

            // DÉDOUBLONNAGE HYBRIDE (EMBEDDING + SQL)
            const identityString = `${raw.titre_brut} (${raw.wikidata_year})`;
            const vector = await embedText(identityString);

            const { data: embeddingMatches } = await supabase.rpc('match_evenements_embeddings', { query_embedding: vector, match_count: 5 });

            const keywords = raw.titre_brut.split(' ').filter(w => w.length > 3).slice(0, 2);
            let sqlQuery = supabase.from('evenements').select('id, titre, date');
            if (keywords.length > 0) {
                sqlQuery = sqlQuery.ilike('titre', `%${keywords[0]}%`);
            }
            const { data: sqlMatches } = await sqlQuery.limit(5);

            const candidateDuplicates = [];
            const seenCandidateIds = new Set();

            const processMatches = async (matches, source) => {
                if (!matches) return;
                for (const m of matches) {
                    if (seenCandidateIds.has(m.id)) continue;
                    seenCandidateIds.add(m.id);
                    const { data: info } = await supabase.from('evenements').select('titre, date').eq('id', m.id).single();
                    if (info) {
                        candidateDuplicates.push({
                            id: m.id,
                            titre: info.titre,
                            date: info.date,
                            similarity: m.similarity || 0,
                            source: source
                        });
                    }
                }
            };

            await processMatches(embeddingMatches, 'embedding');
            await processMatches(sqlMatches, 'sql');

            const bestSimilar = candidateDuplicates.length > 0 ? Math.max(...candidateDuplicates.map(d => d.similarity)) : 0;
            if (bestSimilar > 0.82) {
                console.log(`➡️ ❌ DOUBLON BASE EXTREME (${bestSimilar.toFixed(2)}). Rejeté.`);
                continue;
            }

            // GEMINI - LE TEST IMPITOYABLE
            const prompt = `
Tu es l'Expert en Base de Données pour Kiko.

CANDIDAT WIKIDATA (${raw.theme}) :
Titre brut: "${raw.titre_brut}"
Description: "${raw.desc_brut}"
Année: ${raw.wikidata_year}

TA MISSION :
1. LE TEST DE LA MAMAN (NOTORIÉTÉ STRICTE) : Cet événement est-il VRAIMENT connu ? Une bataille mineure, un acteur de seconde zone, une musique régionale obscure que personne ne connait en France ne nous intéresse pas, même s'il y a des traductions factices sur Wikipédia. S'il ne s'agit pas d'un point d'ancrage MAJEUR de l'histoire du monde ou de la culture pop mondiale, tu le REJETTES impitoyablement avec "decision": "OBSCURE".
2. DÉDOUBLONNAGE : Voici les événements existants dans notre base les plus proches:
${embeddingMatches ? embeddingMatches.map(d => `- [ID: ${d.id}] Score: ${d.similarity.toFixed(2)}`).join('\n') : 'Aucun'}
S'ils signifient la MÊME chose à la MÊME époque (même si l'année diffère de peu et que le titre est diffèrent), REJETTE ("decision": "DUPLICATE"). Ne cherche pas à corriger notre base !
3. TITRAGE BÉTON (RÈGLE D'OR ABSOLUE) : 
   - L'événement doit avoir un titre historique parfait, nu, très court (Moins de 50 caractères). Ex: "Bataille d'Azincourt", "Sortie du film Titanic".
   - INTERDICTION ABSOLUE de mettre l'année dans le titre, même entre parenthèses.
   - Si tu as un homonyme (ex: "Bataille de Poitiers"), lève l'ambiguïté avec des mots descriptifs, JAMAIS avec des dates. Ex: "Bataille de Poitiers (Charles Martel)" ou "Bataille de Poitiers (Guerre de Cent Ans)".

Réponds UNIQUEMENT en JSON :
{
  "decision": "VALIDATED" | "DUPLICATE" | "OBSCURE",
  "reason": "Motive ton choix brièvement...",
  "final_event": {
    "titre": "...",
    "year": ${raw.wikidata_year},
    "wikidata_id": "${raw.wikidata_id}",
    "description": "Explication concrète"
  }
}
`;

            let analysis;
            try {
                const result = await model.generateContent(prompt);
                const cleanJson = result.response.text().match(/\{.*\}/s)[0];
                analysis = JSON.parse(cleanJson);
            } catch (e) {
                console.log("➡️ ❌ ERREUR API GEMINI");
                continue;
            }

            if (analysis.decision === "VALIDATED") {
                const fe = analysis.final_event;

                const { error: insErr } = await supabase.from('sas').insert({
                    titre: fe.titre,
                    date: fe.year.toString(),
                    description: fe.description,
                    wikidata_id: fe.wikidata_id,
                    theme: config.theme,
                    statut: 'A_HABILLER'
                });

                if (insErr) {
                    if (insErr.code === '23505') {
                        console.log(`➡️ 🟨 DÉJÀ DANS LE SAS (Wikidata_ID unique).`);
                    } else {
                        console.log(`➡️ ❌ ERREUR SQL SAS : ${insErr.message}`);
                    }
                } else {
                    console.log(`➡️ ✅ VALIDE ET AOUTE AU SAS : "${fe.titre}"`);
                    finalAcquisition.push(fe);
                }
            } else {
                console.log(`➡️ ❌ REJETÉ (${analysis.decision}) : ${analysis.reason}`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }
    }

    fs.writeFileSync('c:/Users/Pierre/kiko/acquisition_ext.json', JSON.stringify({ acquisition: finalAcquisition }, null, 2));
    console.log(`\n🎉 Extraction terminée sur le thème [${config.theme}] !`);
    console.log(`👉 Bilan : ${finalAcquisition.length} pépites ajoutées dans 'c:/Users/Pierre/kiko/acquisition_ext.json'.\n`);
}

agentExtracteurGeneral().catch(console.error);

