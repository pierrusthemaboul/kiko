import fs from 'fs';
import { getSupabase } from '../shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const supabase = getSupabase('prod');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function loadRules() {
    try {
        return fs.readFileSync('c:/Users/Pierre/kiko/rules_evenements.md', 'utf8');
    } catch (err) {
        console.error("❌ CATASTROPHE : Impossible de lire rules_evenements.md !", err.message);
        process.exit(1);
    }
}

// Nouvelle fonction d'investigation : Recherche Wikipédia du résumé pur
async function investigatorSearch(query) {
    try {
        // Recherche du titre de la page la plus proche
        const urlSearch = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`;
        const resSearch = await fetch(urlSearch);
        const dataSearch = await resSearch.json();

        if (!dataSearch.query || !dataSearch.query.search || dataSearch.query.search.length === 0) {
            return "Aucune information encyclopédique trouvée.";
        }

        const bestTitle = dataSearch.query.search[0].title;

        // Extraction du résumé (1 à 2 premières phrases)
        const urlExtract = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exsentences=3&explaintext=1&titles=${encodeURIComponent(bestTitle)}&format=json`;
        const resExtract = await fetch(urlExtract);
        const dataExtract = await resExtract.json();

        const pages = dataExtract.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === "-1") return "Aucun résumé précis trouvé.";

        return pages[pageId].extract;

    } catch (err) {
        return "Erreur d'investigation réseau.";
    }
}

async function factCheckEvent(titre, date, description, rules) {
    // Phase 1 : Investigation par l'Agent Veritas
    process.stdout.write(`🕵️ Recherche Wikipédia sur "${titre} ${date}"... `);
    const wikiContext = await investigatorSearch(`${titre} ${date}`);
    process.stdout.write(`ℹ️ Trouvé: ${wikiContext.substring(0, 50)}... `);

    // Phase 2 : Jugement par Gemini
    const prompt = `
Tu es l'Agent VERITAS, le Juge Suprême et le Fact-Checker d'un jeu de frise chronologique historique (Timalaus).
Voici tes tables de la loi absolues (La Constitution) :
"""
${rules}
"""

Tâche : Analyser l'événement candidat suivant tiré du SAS de décontamination :
- TITRE BRUT : "${titre}"
- ANNÉE : "${date}"
- DESCRIPTION BRUTE : "${description}"

L'Enquêteur VERITAS a trouvé CECI sur Wikipédia pour clarifier le contexte caché du titre :
- ENQUÊTE WIKI : "${wikiContext}"

MISSIONS INTRANSIGEANTES :
1. HISTORICITÉ & "BULLSHIT CHECK" : Cette année est-elle historiquement la plus juste pour cet événement ? Est-ce un fait avéré mondialement ? Si c'est un mythe ou une légende urbaine -> REJETER.
2. TITULATURE KIKO (DÉSANGIGUÏSATION) : Grâce à l'enquête Wiki, corrige impitoyablement le TITRE pour qu'il soit parfaitement clair pour le joueur (Mets l'auteur si c'est un livre/film, mets le créateur, etc.). Pas d'année dans le titre, pas d'article défini "Le/La" en début de phrase sauf nécessité, style descriptif tranché. ("Métier Jacquard" -> "Invention du Métier à tisser Jacquard").
3. CONCIS : Nettoie la description pour intégrer les faits de l'enquête Wiki.

Tu DOIS répondre UNIQUEMENT par un JSON valide avec cette structure :
{
  "statut": "VALIDE" ou "REJETE",
  "titre_corrige": "Nouveau titre strict Kiko complet",
  "annee_corrigee": "1945",
  "description_propre": "[Extrait Veritas] ...",
  "raison_rejet": "S'il est REJETE, explique pourquoi (ex: Mythe). Sinon laisse vide."
}
`;

    try {
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        const match = text.match(/\{[\s\S]*\}/s);
        if (!match) return { statut: "REJETE", raison_rejet: "Le modèle a perdu le cap du JSON." };
        return JSON.parse(match[0]);
    } catch (e) {
        console.error("\n❌ Crash IA Veritas :", e.message);
        return { statut: "ERREUR", raison_rejet: "Crash API." };
    }
}

async function runVeritas() {
    console.log("⚖️ [AGENT VERITAS V2: INVESTIGATEUR] - Démarrage de l'Auditoire Suprême...");
    const rules = await loadRules();
    console.log("📜 Constitution Kiko (rules_evenements.md) chargée avec succès.");

    const limit = 1000;
    const { data: events, error } = await supabase
        .from('sas')
        .select('*')
        .eq('statut', 'A_HABILLER')
        .limit(limit);

    if (error) {
        console.error("❌ Erreur accès au Sas :", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("🛌 Le Sas est vide, VERITAS n'a aucun dossier sur son bureau aujourd'hui.");
        return;
    }

    console.log(`📁 ${events.length} événements réclament un jugement investigatoire.\n`);

    let valides = 0;
    let rejetes = 0;

    for (const ev of events) {
        console.log(`\n---------------------------------`);

        const verdict = await factCheckEvent(ev.titre, ev.date, ev.description, rules);

        if (verdict.statut === "VALIDE") {
            const { error: updErr } = await supabase
                .from('sas')
                .update({
                    titre: verdict.titre_corrige,
                    date: verdict.annee_corrigee,
                    description: verdict.description_propre,
                    statut: 'VALIDE' // Prêt pour l'Agent Habilleur (Artisan)
                })
                .eq('id', ev.id);

            if (updErr) console.log("❌ Erreur SQL maj:", updErr);
            else {
                console.log(`\n✅ APPRORUVÉ (Titre Final: "${verdict.titre_corrige}")`);
                valides++;
            }
        } else {
            // Rejet
            const { error: updErr } = await supabase
                .from('sas')
                .update({
                    statut: 'REFUZE_VERITAS',
                    description: `[REJET] ${verdict.raison_rejet}`
                })
                .eq('id', ev.id);

            console.log(`\n❌ FRAPPÉ DE NULLITÉ - Cause: ${verdict.raison_rejet}`);
            rejetes++;
        }

        await new Promise(r => setTimeout(r, 1500));
    }

    console.log("\n==================================");
    console.log("⚖️ LA COUR KIKO A RENDU SON VERDICT FINAL");
    console.log(`✅ Validations contextuelles : ${valides}`);
    console.log(`❌ Rejets impitoyables : ${rejetes}`);
    console.log("==================================\n");
}

runVeritas();
