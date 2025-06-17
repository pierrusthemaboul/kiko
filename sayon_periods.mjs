// ==============================================================================
// sayon_full_pipeline.mjs - VERSION FINALE v2 (AVEC ROGNAGE AUTOMATIQUE)
// Génération, Vérification & Illustration avec conformité BDD et nettoyage d'image
// ==============================================================================

import OpenAI from 'openai';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import readline from 'readline';
import 'dotenv/config';

// --- Initialisation des Clients ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

if (!process.env.OPENAI_API_KEY || !process.env.REPLICATE_API_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Vérifiez que OPENAI_API_KEY, REPLICATE_API_TOKEN, SUPABASE_URL et SUPABASE_SERVICE_KEY sont dans votre fichier .env");
}

// ==============================================================================
// ÉTAPE 1: GÉNÉRATION DE L'ÉVÉNEMENT (TEXTE)
// ==============================================================================
async function generateEventText(startYear, endYear, existingTitles) {
    console.log("   🧠 1. Génération du texte de l'événement avec GPT-4o-mini...");
    const exclusionSample = existingTitles.slice(-30).join('\n- ');
    const prompt = `Tu es un historien. Génère 1 événement historique pour un jeu éducatif.

PÉRIODE: entre ${startYear} et ${endYear}.

EXIGENCES:
1.  **Précision Factuelle**: L'année doit être 100% correcte.
2.  **Originalité**: Évite les faits trop célèbres. Trouve des pépites (politique, science, culture).
3.  **Exclusions**: Évite ces titres déjà utilisés:
    ${exclusionSample || 'Aucune'}

FORMAT DE SORTIE (JSON uniquement):
{
  "year": integer,
  "titre": "string (titre court)",
  "description": "string (brève description d'une phrase)",
  "type": "string (Politique, Science, etc.)",
  "region": "string (Europe, Asie, etc.)"
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });
        const eventData = JSON.parse(completion.choices[0].message.content);
        console.log(`      ✅ Candidat généré: "${eventData.titre}" (${eventData.year})`);
        return eventData;
    } catch (error) {
        console.error("      ❌ Erreur de génération texte:", error.message);
        return null;
    }
}

// ==============================================================================
// ÉTAPE 2: VÉRIFICATION DE LA DATE
// ==============================================================================
async function verifyEventDate(event) {
    console.log(`   🕵️  2. Contre-vérification de la date pour "${event.titre}"...`);
    const prompt = `Vérifie cette affirmation historique. Réponds uniquement par 'true' si l'événement "${event.titre}" a bien eu lieu en ${event.year}, sinon 'false'. Ne fournis aucune autre explication.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: "Réponds uniquement par 'true' ou 'false'." }, { role: "user", content: prompt }],
            temperature: 0,
        });
        const response = completion.choices[0].message.content.trim().toLowerCase();
        console.log(`      🤖 Réponse du vérificateur: ${response}`);
        return response === 'true';
    } catch (error) {
        console.error("      ❌ Erreur de vérification:", error.message);
        return false;
    }
}

// ==============================================================================
// ÉTAPE 3: CRÉATION DU PROMPT D'ILLUSTRATION
// ==============================================================================
async function createIllustrationPrompt(event) {
    console.log(`   🎨 3. Création du prompt d'illustration...`);
    const prompt = `Tu es un directeur artistique. Crée un prompt pour un générateur d'images pour l'événement suivant:
- Titre: ${event.titre}
- Année: ${event.year}
- Description: ${event.description}
Le prompt doit être en anglais, descriptif, et se concentrer sur une scène visuelle. Style: Photographie de documentaire historique, ultra-réaliste, qualité musée.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const illustrationPrompt = completion.choices[0].message.content.trim();
        console.log(`      ✅ Prompt d'illustration généré.`);
        return illustrationPrompt;
    } catch (error) {
        console.error("      ❌ Erreur création prompt illustration:", error.message);
        return `Historical scene: ${event.titre}. ${event.description}`;
    }
}

// ==============================================================================
// ÉTAPE 4: GÉNÉRATION DE L'IMAGE
// ==============================================================================
const COMPREHENSIVE_NEGATIVE_PROMPT = "text, writing, inscriptions, letters, words, flags, banners, anachronism, modern objects, modern clothing, eyeglasses, plastic, ugly, deformed";

async function generateImage(prompt) {
    console.log(`   🖼️  4. Génération de l'image avec Flux...`);
    try {
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: {
                prompt: prompt,
                negative_prompt: COMPREHENSIVE_NEGATIVE_PROMPT,
                aspect_ratio: "16:9",
                output_format: "webp",
                output_quality: 85,
            }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        if (!imageUrl) throw new Error("Replicate n'a pas retourné d'URL.");
        console.log(`      ✅ Image brute générée.`);
        return imageUrl;
    } catch (error) {
        console.error("      ❌ Erreur génération image:", error.message);
        return null;
    }
}

// ==============================================================================
// ÉTAPE 5 & 6: UPLOAD ET INSERTION
// ==============================================================================
async function uploadImageToSupabase(imageUrl) {
    console.log("   📤 5. Traitement et Upload de l'image...");
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    
    // --- MODIFICATION CLÉ ---
    // On enchaîne la compression ET le rognage
    console.log("      - Compression et rognage des bandes noires...");
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
        .webp({ quality: 80 }) // Compression
        .trim()                 // Rognage des bordures
        .toBuffer();
    // -----------------------

    const fileName = `event_${Date.now()}.webp`;
    
    const { error } = await supabase.storage.from('evenements-image').upload(fileName, processedBuffer, { contentType: 'image/webp', upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('evenements-image').getPublicUrl(fileName);
    console.log(`      ✅ Image finale uploadée: ${publicUrl}`);
    return publicUrl;
}

function enrichAndFinalizeEvent(event, imageUrl, illustrationPrompt) {
    const year = parseInt(event.year);
    const epoch = year < 476 ? 'Antiquité' : year < 1492 ? 'Moyen Âge' : year < 1789 ? 'Moderne' : year < 1914 ? 'Contemporaine' : 'XXe';
    const isUniversel = event.region?.toLowerCase() !== 'europe';

    return {
        date: `${event.year.toString().padStart(4, '0')}-01-01`,
        titre: event.titre,
        universel: isUniversel,
        langue: 'fr',
        ecart_temps_max: 300,
        facteur_variation: 1.5,
        illustration_url: imageUrl,
        region: event.region,
        niveau_difficulte: 4,
        types_evenement: [event.type],
        pays: [event.region],
        epoque: epoch,
        mots_cles: event.titre.toLowerCase().replace(/[^\w\s]/g, '').split(' ').filter(w => w.length > 3),
        date_formatee: event.year.toString(),
        code: `gpt${Date.now().toString().slice(-5)}`,
        date_precision: 'year',
        ecart_temps_min: 50,
        frequency_score: 0,
        description_detaillee: event.description,
        prompt_flux: illustrationPrompt
    };
}

async function insertFinalEvent(finalEvent) {
    console.log("   💾 6. Insertion de l'événement complet dans 'goju'...");
    const { data, error } = await supabase.from('goju').insert([finalEvent]).select();
    if (error) throw error;
    console.log(`      🎉 SUCCÈS ! Événement inséré avec l'ID: ${data[0].id}`);
    return data[0];
}

// ==============================================================================
// ORCHESTRATEUR PRINCIPAL
// ==============================================================================
async function main() {
    console.log("\n🚀 === DÉMARRAGE DE LA CHAÎNE COMPLÈTE (GÉNÉRATION + ILLUSTRATION + ROGNAGE) ===");
    
    console.log("🗑️  Nettoyage de la table 'goju'...");
    await supabase.from('goju').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log("✅ Table 'goju' prête.");

    const startYear = await askQuestion('📅 Année de DÉBUT : ');
    const endYear = await askQuestion('📅 Année de FIN : ');
    const targetCount = parseInt(await askQuestion('🎯 Combien d\'événements complets voulez-vous créer ? (1-5) : '));
    
    if (isNaN(targetCount) || targetCount < 1 || targetCount > 5) {
        console.log("Nombre invalide. Arrêt.");
        rl.close();
        return;
    }

    let createdCount = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = targetCount * 5;
    const existingTitles = [];

    while (createdCount < targetCount && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`\n\n--- Tentative ${attempts}/${MAX_ATTEMPTS} (Objectif: ${createdCount}/${targetCount}) ---`);
        try {
            const eventText = await generateEventText(startYear, endYear, existingTitles);
            if (!eventText) continue;

            const isVerified = await verifyEventDate(eventText);
            if (!isVerified) {
                console.log(`   ❌ REJETÉ: Date non vérifiée.`);
                continue;
            }

            const illustrationPrompt = await createIllustrationPrompt(eventText);
            if (!illustrationPrompt) continue;

            const tempImageUrl = await generateImage(illustrationPrompt);
            if (!tempImageUrl) continue;

            const finalImageUrl = await uploadImageToSupabase(tempImageUrl);
            if (!finalImageUrl) continue;
            
            const finalEvent = enrichAndFinalizeEvent(eventText, finalImageUrl, illustrationPrompt);
            await insertFinalEvent(finalEvent);
            
            createdCount++;
            existingTitles.push(finalEvent.titre);

        } catch (error) {
            console.error(`\n🚨 ERREUR CRITIQUE lors de la tentative ${attempts}: ${error.message}`);
            console.log("   Passage à la tentative suivante...");
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n\n🏁 === OPÉRATION TERMINÉE ===`);
    console.log(`✅ ${createdCount} événements complets ont été créés et insérés dans 'goju'.`);
    console.log(`Faites un "Refresh" sur l'interface Supabase pour voir les résultats.`);
    rl.close();
}

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

main().catch(error => {
    console.error("\n\n💥 Une erreur non gérée a arrêté le script:", error);
    rl.close();
});