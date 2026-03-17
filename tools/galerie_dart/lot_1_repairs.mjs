import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const ECOLE_ART_FILE = path.join(__dirname, 'ecole_d_art_essentiels.md');

// On sélectionne 5 "Carnages" iconiques
const LOT_1 = [
    { titre: "Création de l’OAS", date: "1961", id: "0fb2f694-8173-4f9e-9964-67f70b776f82" },
    { titre: "Fondation du Ku Klux Klan", date: "1865", id: "538f9836-e630-4e7a-9a00-349f25757d54" },
    { titre: "Édit d'Amboise", date: "1563", id: "16f735c0-058b-498b-9694-3cb18df32f80" },
    { titre: "Loi Gayssot sur le négationnisme", date: "1990", id: "28e7a08b-59d9-4d04-8742-563b060d2d34" },
    { titre: "Création du CNRS", date: "1939", id: "0628e833-875f-4740-9a4f-506925920f69" }
];

async function brainstormAndShip(event) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const ecoleArt = await fs.readFile(ECOLE_ART_FILE, 'utf-8');

    const year = parseInt(event.date);
    const noPlasticRule = year < 1920 ? "STRICT BAN on modern plastics, polymer glasses, and modern textures. Use wood, metal, glass, and period-accurate fabrics." : "";

    const prompt = `
    Tu es un COLLECTIF de création (Archiviste, Directeur Artistique, et Critique) pour Timalaus.
    PROJET : Illustration d'un événement historique pour un jeu de cartes.

    ÉVÉNEMENT : "${event.titre}" (${event.date})
    
    RÈGLES ÉCOLE D'ART (STRICT) :
    ${ecoleArt}
    ${noPlasticRule}

    MISSION DU COLLECTIF :
    1. **Archiviste** : Donne 3 détails techniques ou matériels 'hard-coded' qui servira d'ancrage visuel (Ex: type d'uniforme, matière d'un outil, style d'architecture précis).
    2. **Directeur Artistique** : Conçois une scène de TENSION DRAMATIQUE sans réunion. Préfère l'action ou la métonymie viscérale. 
    3. **Critique** : Vérifie l'absence de 'PowerPoint style'. Fusille toute idée de 'gens assis discutant'. Assure-toi que le sujet principal occupe 40% du cadre.
    4. **Prompt Final** : Rédige le prompt Flux Schnell en anglais.

    RÈGLE D'OR : "Gritty and Tangible". On veut de la sueur, de la poussière, de la texture. On veut du cinéma de vérité.

    Réponse JSON :
    {
        "thought_process": "...",
        "critic_veto": "...",
        "final_prompt": "..."
    }
    `;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text().replace(/```json|```/g, ''));

    console.log(`🤖 Pensée Collective pour "${event.titre}"...`);
    console.log(`⚠️ Critique : ${response.critic_veto}`);

    // Génération
    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt: response.final_prompt, aspect_ratio: "16:9" }
    });
    const imageUrl = Array.isArray(output) ? output[0] : output;

    // Upload Supabase
    const res = await fetch(imageUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `lot1_${event.id.slice(0,8)}_${Date.now()}.webp`;
    
    await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
    const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

    // Update DB
    await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', event.id);

    return { titre: event.titre, url: publicUrl, prompt: response.final_prompt };
}

async function runLot1() {
    console.log("🚀 Lancement du Lot 1 (5 carnages)...");
    const results = [];
    for (const event of LOT_1) {
        try {
            const res = await brainstormAndShip(event);
            results.push(res);
            console.log(`✅ Lot 1 - Terminé : ${event.titre} -> ${res.url}`);
        } catch (e) {
            console.error(`❌ Erreur Lot 1 pour ${event.titre}:`, e);
        }
    }
    console.log("\n📊 RÉCAPITULATIF LOT 1 :");
    console.table(results.map(r => ({ Titre: r.titre, URL: r.url })));
}

runLot1().catch(console.error);

