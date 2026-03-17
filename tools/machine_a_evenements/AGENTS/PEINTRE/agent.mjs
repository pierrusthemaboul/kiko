import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import Replicate from 'replicate';

import { getSupabase, uploadImageToSupabase } from '../shared_utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement du .env à la racine
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_FAST || "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const supabaseProd = getSupabase('prod');

// 🎨 Événements validés par l'USER : Ne pas régénérer
const VALIDATED_IDS = [
    "Q79859",   // CM 2014
    "Q284163",  // CM 2022
    "Q8577",    // JO Londres
    "Q8613",    // JO Rio
    "Q8093",    // Nintendo
    "Q35637",   // Nobel
    "Q7888194", // Brexit
    "Q25173",   // Titanic (Validé v5.2)
    "Q83279",   // Bob l'éponge (Validé v5.2)
    "Q171"      // Wiki (Restauration de la version préférée)
];

const TRICKY_TOPICS = ["Simpson", "Star Wars", "South Park", "Trône de fer"];

const SPECIFIC_FIXES = {
    "Q13947": {
        "prompt": "Macro cinematic photograph of a detailed fleur-de-lys heart carved into ancient white tuffeau limestone. Warm golden hour sunlight grazing the stone texture, highlighting every grain and chisel mark. Royal atmosphere, elegant and timeless, no text, minimalist composition, professional quality, high contrast, blank solid background",
        "reasoning": "Évite la carte géographique et le texte en se concentrant sur le symbole héraldique et architectural des châteaux de la Loire."
    }
};

// 🚦 Stratégies de dispatching v7.1 (Vibrations d'Ambiances)
const STRATEGIES = {
    EPIC: "GRANDIOSE HISTORY: Focus on the iconic place and ambiance. Cinematic 35mm photography, deep historical atmosphere (fog, dust, luxury). HERO scene centered.",
    ANCIENT: "TIMELESS KNOWLEDGE: Focus on the material essence (Stone, wax, parchment). Period medium. Sacred or formal lighting. Material reality.",
    POP: "STILL LIFE METAPHOR: Focus on a single iconic object. Macro photography. NO characters. NO text. Perfect product aesthetic.",
    SYMBOL: "HÉRALDIX & POWER: Sculpted symbols, seals, or architectural textures. High craftsmanship style. Elegant and minimalist."
};

async function getCategory(event) {
    const prompt = `Classifie l'essence de "${event.titre}" (${event.annee}) dans une de ces ambiances :
    - EPIC: Moment grandiose, solennel, historique (Traités, couronnements, victoires, tragédies).
    - ANCIENT: Savoir antique, documents sacrés, début science (Papyrus, parchemins, tablettes).
    - POP: Culture populaire, divertissement (Focus sur l'objet métaphore).
    - SYMBOL: Acte administratif purement territorial (Régions, décret moderne).

    Réponds uniquement par le code : EPIC, ANCIENT, POP ou SYMBOL.`;
    const result = await model.generateContent(prompt);
    const cat = result.response.text().trim().split('\n')[0].replace(/[^A-Z]/g, '');
    return ["EPIC", "ANCIENT", "POP", "SYMBOL"].includes(cat) ? cat : "EPIC";
}

async function enrichIconographicContext(event, category) {
    const prompt = `
Tu es un EXPERT en Histoire et Direction Artistique.
Événement : "${event.titre}" (${event.annee}). Ambiance : ${category}.

Ta mission : Identifie le "POINT DE POUVOIR" visuel de ce moment.
- Si c'est EPIC : Décris le décor grandiose (ex: "The Hall of Mirrors, Versailles", "A Roman Forum") et la lumière (lustres, reflets, brume).
- Si c'est ANCIENT : Décris le support gravé ou écrit (tablette de pierre, parchemin) et les symboles (chiffres romains, glyphes). BANNIS LES CHIFFRES ARABES (123).
- Si c'est POP : L'objet macro iconique qui représente l'essence de l'oeuvre.

CONSIGNE STRICTE : PAS DE CHANTIER. BANNIS TOUT TEXTE LISIBLE. 
Réponds en anglais pour un prompt IA (liste de 5-6 détails visuels très précis).
`;
    const result = await model.generateContent(prompt);
    return result.response.text();
}

async function generatePrompt(event) {
    if (SPECIFIC_FIXES[event.wikidata_id]) {
        console.log(`   🎯 Correctif spécifique appliqué pour : ${event.titre}`);
        return SPECIFIC_FIXES[event.wikidata_id];
    }

    console.log(`   🚦 Dispatching catégorie...`);
    const category = await getCategory(event);
    console.log(`   🔍 Recherche (Mode ${category}) : ${event.titre}...`);
    const iconContext = await enrichIconographicContext(event, category);

    const strategy = STRATEGIES[category];

    const prompt = `
Tu es un DIRECTEUR ARTISTIQUE. Créé un PROMPT pour illustrer : "${event.titre}" (${event.annee}).

CONTEXTE STRATÉGIQUE : ${strategy}
DÉTAILS RECHERCHÉS : ${iconContext}

CONSIGNES :
1. LE SUJET EST LE HÉROS. Minimalisme, impact fort.
2. AUCUN PERSONNAGE SOUS DROITS. PAS DE TEXTE.
3. STYLE KIKO : Termine par ", professional quality, vibrant colors, clean composition, high contrast, minimalist, blank solid background, no text".

Format JSON :
{
  "selected_category": "${category}",
  "prompt": "Le prompt technique complet en anglais pour Flux Schnell",
  "reasoning": "Pourquoi cet angle est le plus pertinent ?"
}
    `;

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Format JSON introuvable");
        return JSON.parse(match[0]);
    } catch (e) {
        console.warn(`   ⚠️ Échec prompt Gemini pour ${event.titre}, utilisation du fallback.`);
        return {
            prompt: `${event.titre}, elegant minimalist illustration, high quality`,
            reasoning: "Fallback dû à un échec de génération ou censure."
        };
    }
}

async function main() {
    console.log("🎨 Agent PEINTRE v5.3 - Reset du biais de construction");
    const championsPath = path.join(__dirname, '../../../tmp/vrais_champions.json');
    const outputPath = path.join(__dirname, 'STORAGE/OUTPUT/painting_results.json');

    const champions = JSON.parse(fs.readFileSync(championsPath, 'utf8'));

    let finalResults = [];
    if (fs.existsSync(outputPath)) {
        try {
            finalResults = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        } catch (e) { finalResults = []; }
    }

    // Cible les événements demandés par l'utilisateur pour refonte
    const targetIds = ["Q8567", "Q171", "Q13917", "Q9091", "Q104750296"];
    const toProcess = champions.filter(c => targetIds.includes(c.wikidata_id));
    console.log(`🚀 ${toProcess.length} correctifs demandés par l'USER.`);

    for (let i = 0; i < toProcess.length; i++) {
        const event = toProcess[i];

        // On force la régénération pour ceux qui étaient des "chantiers"
        finalResults = finalResults.filter(r => r.wikidata_id !== event.wikidata_id);

        console.log(`\n🎬 [${i + 1}/${toProcess.length}] ${event.titre}`);

        try {
            const scenario = await generatePrompt(event);
            console.log(`   📝 Prompt : ${scenario.prompt.substring(0, 50)}...`);

            const output = await replicate.run("black-forest-labs/flux-schnell", {
                input: { prompt: scenario.prompt, disable_safety_checker: true }
            });
            const tempUrl = Array.isArray(output) ? output[0] : output;

            console.log("   ☁️  Upload...");
            const publicUrl = await uploadImageToSupabase(supabaseProd, tempUrl, event.titre, event.wikidata_id);

            console.log("   🧠 Embedding...");
            const clipOutput = await replicate.run(
                "andreasjansson/clip-features:75b33f253f7714a281ad3e9b28f63e3232d583716ef6718f2e46641077ea040a",
                { input: { inputs: String(publicUrl) } }
            );

            const resultItem = {
                ...event,
                generated_image_url: publicUrl,
                image_embedding: clipOutput[0].embedding,
                generation_prompt: scenario.prompt,
                generation_reasoning: scenario.reasoning,
                status: 'PENDING_VERIFICATION'
            };

            // Sauvegarde immédiate
            const idx = finalResults.findIndex(r => r.wikidata_id === event.wikidata_id);
            if (idx > -1) finalResults[idx] = resultItem;
            else finalResults.push(resultItem);

            fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
            console.log(`   ✅ Terminé.`);

        } catch (e) {
            console.error(`   ❌ Échec critique sur ${event.titre} : ${e.message}`);
            // On marque comme échoué pour ne pas boucler indéfiniment
            finalResults.push({ ...event, status: 'FAILED' });
            fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));
    console.log(`\n📦 Tous les résultats sont dans : ${outputPath}`);
}

// Lancement direct
import { argv } from 'process';
const isDirectRun = argv[1].includes('agent.mjs');

if (isDirectRun) {
    main().catch(console.error);
}

export { generatePrompt };

