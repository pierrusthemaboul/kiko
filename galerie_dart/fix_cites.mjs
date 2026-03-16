import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

const ART_SCHOOL_FILE = path.join(__dirname, 'ecole_d_art.md');
const ARCHIVISTE_FILE = path.join(__dirname, 'archiviste.md');

async function fixCites() {
    console.log("🐘 Correction de l'événement CITES - Transformation Administrative...");
    
    const ecoleArtRules = fs.readFileSync(ART_SCHOOL_FILE, 'utf-8');
    const archivisteRules = fs.readFileSync(ARCHIVISTE_FILE, 'utf-8');
    
    const archivisteModel = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        systemInstruction: archivisteRules 
    });
    
    const peintreModel = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", 
        systemInstruction: `Tu es le Grand Maître de l'École d'Art Timalaus. 
        MISSION : CORRIGER UNE IMAGE DE RÉUNION ENNUYEUSE.
        
        RÈGLE D'OR (Métamorphose Administrative) : 
        Ne jamais illustrer le "papier", mais le "domaine" qu'il protège.
        Pour la CITES (1973) : INTERDICTION de montrer des gens dans un bureau ou une salle de conférence. 
        OBLIGATION de montrer la faune sauvage menacée (éléphants, tigres, tortues), la nature puissante, ou les saisies d'ivoire/écailles illégales.
        
        RAPPEL ÉCOLE D'ART :
        ${ecoleArtRules}`
    });

    const eventTitre = "Adoption de la Convention CITES";
    
    // 1. Archiviste
    console.log("🔍 L'Archiviste cherche l'essence visuelle...");
    const archResult = await archivisteModel.generateContent(`Événement : ${eventTitre}. Sors un rapport focalisé sur les ESPÈCES protégées et les TEXTURES (ivoire, fourrure, jungle).`);
    const archivisteReport = archResult.response.text();

    // 2. Peintre
    console.log("🎨 Le Peintre crée le nouveau concept...");
    const paintingQuery = `RAPPORT ARCHIVISTE : ${archivisteReport}\n\nÉvénement : ${eventTitre}. \n\nApplique la METAMORPHOSE ADMINISTRATIVE. Crée une image épique, contrastée, scannable en 1s. \n\nIMPORTANT : Sujet dominant à 40%. \n\nDonne ta réflexion puis ton prompt Flux entre <prompt></prompt>.`;
    const result = await peintreModel.generateContent(paintingQuery);
    const responseText = result.response.text();
    const fluxPrompt = responseText.match(/<prompt>([\s\S]*?)<\/prompt>/i)[1].trim();

    console.log(`\n💡 RÉFLEXION DU PEINTRE :\n${responseText.replace(/<prompt>[\s\S]*?<\/prompt>/i, '').trim()}`);
    console.log(`\n🖊️ PROMPT GÉNÉRÉ :\n${fluxPrompt}`);

    // 3. Flux
    console.log("\n🖌️ Flux Schnell génère l'image...");
    const output = await replicate.run("black-forest-labs/flux-schnell", { 
        input: { prompt: fluxPrompt, aspect_ratio: "16:9" } 
    });
    const tempUrl = Array.isArray(output) ? output[0] : output;

    // 4. Save
    const imageResponse = await fetch(tempUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const fileName = "cites_fix_result.png";
    const filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, buffer);

    console.log(`\n✅ Image générée et sauvegardée : ${filePath}`);
}

fixCites().catch(console.error);
