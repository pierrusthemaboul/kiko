
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

/**
 * Normalise un titre pour comparaison simple
 */
function normalize(text) {
    if (!text) return "";
    return text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlever accents
        .replace(/^(le|la|les|l'|un|une|des|la bataille de|bataille de|l'assassinat de|assassinat de|mort de|le sacre de|sacre de|la prise de|prise de|fondation de|la fondation de)\s+/i, "")
        .replace(/[^\w\s]/gi, '') // Enlever ponctuation
        .trim();
}

/**
 * Extrait l'année d'une string (ex: "27 juillet 1214" -> 1214)
 */
function extractYear(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{3,4}/);
    return match ? parseInt(match[0]) : null;
}

async function checkRobustDuplicate(inputTitre, inputYear) {
    console.log(`\n🛡️  VÉRIFICATION ROBUSTE : "${inputTitre}" (${inputYear})`);

    const normalizedInput = normalize(inputTitre);
    const targetYear = parseInt(inputYear);

    // --- ÉTAPE 1 : Recherche par fourchette d'années ---
    // On prend +/- 4 ans pour être large sur les approximations historiques
    const yearsToSearch = [];
    for (let i = -4; i <= 4; i++) {
        yearsToSearch.push((targetYear + i).toString());
    }
    const orFilter = yearsToSearch.map(y => `date_formatee.ilike.%${y}%`).join(',');

    const { data: candidates, error } = await supabase
        .from('evenements')
        .select('titre, date_formatee, description_detaillee')
        .or(orFilter);

    if (error) {
        throw new Error(`Erreur Supabase: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
        console.log("✅ Aucun événement trouvé dans cette fourchette. Unique !");
        return { isDuplicate: false };
    }

    // --- ÉTAPE 2 : Comparaison Normalisée (Rapide) ---
    for (const cand of candidates) {
        const normCand = normalize(cand.titre);
        if (normCand === normalizedInput) {
            console.log(`🛑 DOUBLON EXACT DÉTECTÉ (Normalisé) : "${cand.titre}" (${cand.date_formatee})`);
            return { isDuplicate: true, match: cand.titre };
        }
    }

    // --- ÉTAPE 3 : Analyse Sémantique IA ---
    console.log(`🤔 ${candidates.length} candidats proches trouvés. Appel à l'IA pour analyse sémantique...`);

    const prompt = `
Tu es un expert historien spécialisé dans le dédoublonnage de bases de données.
On veut savoir si l'événement suivant est déjà présent, même sous un nom différent.

ÉVÉNEMENT À VÉRIFIER :
Titre : "${inputTitre}"
Année : ${inputYear}

CANDIDATS EXISTANTS (Période proche) :
${candidates.map(c => `- "${c.titre}" (${c.date_formatee}) : ${c.description_detaillee || 'Pas de description'}`).join('\n')}

MISSION :
Compare l'événement à vérifier avec CHAQUE candidat.
S'agit-il du même fait historique (même si le titre est différent) ?
Ex: "Bataille de Bouvines" et "Victoire de Philippe Auguste à Bouvines" sont des DOUBLONS.

FORMAT DE RÉPONSE JSON :
{
  "isDuplicate": true/false,
  "matchTitre": "Titre du doublon trouvé",
  "reason": "Explication courte de pourquoi c'est la même chose ou pas"
}
`;

    try {
        const result = await model.generateContent(prompt);
        let finalResult = JSON.parse(result.response.text());

        // Si l'IA renvoie un tableau de comparaisons, on cherche s'il y a au moins un doublon
        if (Array.isArray(finalResult)) {
            const duplicate = finalResult.find(r => r.isDuplicate === true);
            if (duplicate) {
                finalResult = duplicate;
            } else {
                finalResult = { isDuplicate: false, reason: "Aucune correspondance trouvée parmi les candidats." };
            }
        }

        if (finalResult.isDuplicate) {
            console.log(`🛑 DOUBLON SÉMANTIQUE : "${finalResult.matchTitre}"`);
            console.log(`💡 Raison : ${finalResult.reason}`);
            return { isDuplicate: true, match: finalResult.matchTitre };
        } else {
            console.log("✨ UNIQUE : L'IA confirme que c'est un nouvel événement.");
            console.log(`💡 Analyse : ${finalResult.reason}`);
            return { isDuplicate: false };
        }
    } catch (e) {
        console.error("❌ Erreur pendant l'analyse IA :", e.message);
        return { error: e.message };
    }
}

import { fileURLToPath } from 'url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
    const [, , titre, year] = process.argv;
    if (titre && year) {
        checkRobustDuplicate(titre, year);
    }
}

export { checkRobustDuplicate };
