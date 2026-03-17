import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_FAST || "gemini-2.0-flash",
    // Configuration requise pour obtenir un retour structuré JSON strict
    generationConfig: { responseMimeType: "application/json" }
});

const systemInstruction = `
Tu es l'Agent RIVIERE, l'Éditeur en Chef intraitable d'un jeu de culture générale chronologique.
On te soumet une liste d'événements historiques bruts (souvent issus de Wikidata).
Ta mission est de les FILTRER et de les REFORMULER selon des règles éditoriales drastiques (Multi-Check Validation) pour garantir une expérience de jeu parfaite, sans aucun travail manuel en aval.

RÈGLES DE REJET (Si un événement correspond à UNE SEULE de ces règles, tu DOIS le rejeter) :
1. MANQUE DE SINGULARITÉ : Rejette tout ce qui n'est pas "datable" à une année exacte (ex: "Moyen Âge", "Guerre de Cent Ans", un siècle, une dynastie, invention d'un objet si pas d'année canonique).
2. MORT BANALE / TRAGÉDIE MODERNE : Rejette les camps de concentration, massacres, génocides (WW2/Rwanda/Shoah), attentats récents ou fusillades. Rejette la mort "naturelle" d'artistes. (Exception : Assassinat politique majeur comme JFK ou Lincoln).
3. HORS PÉRIMÈTRE (Avant JC) : Rejette TOUT ce qui s'est passé avant l'an 1. L'année minimale est 1.

RÈGLES DE REFORMULATION (Pour les événements acceptés - TITRE UNIVOQUE ET CLAIR) :
1. Univoque : Le titre final DOIT être parfaitement clair (ex: "dollar américain" devient "Création du dollar américain"). Les événements génériques comme "élection présidentielle" doivent devenir "Élection de X".
2. Événements récurrents ou multiples : Si l'événement est récurrent (ex: "Coupe du Monde de Football") ou qu'il y en a eu plusieurs du même nom (ex: "Traité de Versailles", "Constitution française"), IL FAUT AJOUTER LE CONTEXTE (Lieu, Guerre, ou Personnage). Exemples : "Coupe du Monde de Football en Russie", "Traité de Versailles (Première Guerre mondiale)".
2. Célèbre : Ne garde QUE les entités très connues (ou reformule-les pour les lier à leur oeuvre/produit majeur).
3. Pas de date dans le titre : Supprime toute mention d'année ou de date explicite du titre (!).
4. Précis : Ne garde pas les titres flous (ex: "Bataille de..." s'il y en a 40 de ce nom, ajoute le protagoniste majeur).
5. Langue : Français de qualité, concis (maximum ~60 caractères).

Traitement des dates (ISO 8601 strict) :
- L'année doit être strictement > 0.
- Assure-toi que la date retournée est ISO stricte: "YYYY-MM-DD" ou a minima l'année entière "YYYY".

Données d'entrée pour chaque événement : { "id", "titre_brut", "description_brute", "date_iso" }

FORMAT DE TA RÉPONSE UN OBJET JSON avec "results", où chaque élément contient :
{
  "id": "identifiant_fourni",
  "decision": "ACCEPT" ou "REJECT",
  "check_singularite": true ou false,
  "check_title_univoque": true ou false,
  "check_tragedie": true ou false (true s'il s'agit d'une tragédie ou un mort),
  "titre_final": "Le titre corrigé (null si rejeté)",
  "annee": "Année en entier (null si rejeté)",
  "raison": "Explication de ton choix"
}
`;

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Nettoyage ultra basique de la date pour éviter YYYY-MM-00 ou YYYY-00-00 (qui fait planter Postgres)
function cleanDateIso(dateIso, year) {
    if (!dateIso) return `${year}-01-01`;
    let clean = dateIso.substring(0, 10);
    clean = clean.replace(/-00-00$/, '-01-01').replace(/-00$/, '-01');
    return clean;
}

async function main() {
    const inputPath = path.join(__dirname, 'STORAGE/INPUT/candidates.json');
    const outputPath = path.join(__dirname, 'STORAGE/OUTPUT/approved.json');
    const rejectedPath = path.join(__dirname, 'STORAGE/OUTPUT/rejected.json');

    // Pour l'intégration, on relie au filtre sémantique précédent si l'input est manquant
    let sourcePath = inputPath;
    if (!fs.existsSync(inputPath) && fs.existsSync('c:/Users/Pierre/kiko/tmp/wikidata_novel_candidates.json')) {
        sourcePath = 'c:/Users/Pierre/kiko/tmp/wikidata_novel_candidates.json';
    }

    if (!fs.existsSync(sourcePath)) {
        console.error("Fichier d'entrée introuvable :", sourcePath);
        process.exit(1);
    }

    const candidates = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    console.log(`🌊 AGENT RIVIERE : Début de l'analyse (Mode Multi-Check) pour ${candidates.length} candidats...`);

    const batches = chunkArray(candidates, 25);
    const approvedEvents = [];
    const rejectedEvents = [];
    let processed = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const promptData = batch.map(c => ({
            id: c.wikidata_id,
            titre_brut: c.titre,
            description_brute: c.description,
            date_iso: c.date_iso
        }));

        const prompt = `${systemInstruction}\n\nVoici le lot à analyser (JSON) :\n${JSON.stringify(promptData, null, 2)}`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            const parsed = JSON.parse(responseText);
            const results = parsed.results || [];

            for (const res of results) {
                const origin = batch.find(b => b.wikidata_id === res.id);
                if (!origin) continue;

                // Application du multi-check absolu : Si accept mais check failed -> On override en Reject
                let finalDecision = res.decision;
                if (res.decision === "ACCEPT" && (res.check_singularite !== true || res.check_title_univoque !== true || res.check_tragedie === true)) {
                    finalDecision = "REJECT";
                    res.raison = res.raison + " (Override RIVIERE: Un des critères a échoué. " +
                        `Singularite: ${res.check_singularite}, ` +
                        `Univoque: ${res.check_title_univoque}, ` +
                        `Tragedie: ${res.check_tragedie})`;
                }

                if (finalDecision === "ACCEPT" && res.annee && res.annee > 0) {
                    approvedEvents.push({
                        wikidata_id: res.id,
                        titre: res.titre_final,
                        annee: res.annee,
                        date_iso: cleanDateIso(origin.date_iso, res.annee),
                        notoriete_wikidata: origin.notoriete_wikidata,
                        description_wikidata: origin.description,
                        notes_riviere: res.raison
                    });
                } else {
                    rejectedEvents.push({
                        wikidata_id: res.id,
                        titre_brut: origin.titre,
                        raison: res.raison || "Rejeté (hors scope ou multi-check failli)"
                    });
                }
            }

            processed += batch.length;
            console.log(`... Lot ${i + 1}/${batches.length} terminé (${processed}/${candidates.length} traités).`);
        } catch (error) {
            console.error(`❌ Erreur sur le lot ${i + 1} :`, error.message);
        }
    }

    console.log(`\n✅ RIVIERE : Analyse terminée.`);
    console.log(`🟢 Événements parfaits approuvés (PRÊTS POUR KIKO) : ${approvedEvents.length}`);
    console.log(`🔴 Événements rejetés : ${rejectedEvents.length}`);

    fs.writeFileSync(outputPath, JSON.stringify(approvedEvents, null, 2));
    fs.writeFileSync(rejectedPath, JSON.stringify(rejectedEvents, null, 2));

    // Pour une preview immédiate au joueur de ce qui a passé :
    console.log(`\nAperçu du Top 10 des survivants RIVIERE :`);
    approvedEvents.slice(0, 10).forEach(e => {
        console.log(` -> ${e.titre} (${e.annee}) - [Wikidata #${e.wikidata_id}]`);
    });
}

main().catch(console.error);

