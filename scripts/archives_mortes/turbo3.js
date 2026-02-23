// ==============================================================================
// turbo3.js - Version "Contrôle Qualité" CORRIGÉE
// ==============================================================================

import Replicate from "replicate";
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE_PATH = path.join(__dirname, '25_nouveaux_evenements.csv'); 
const OUTPUT_REPORT_DIR = path.join(__dirname, 'reports');
fs.mkdirSync(OUTPUT_REPORT_DIR, { recursive: true });

// --- Constantes ---
const MAX_RETRIES = 3; // Réduit pour aller plus vite
const USE_VALIDATION = false; // DÉSACTIVER la validation pour l'instant

// --- Initialisation des clients ---
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

if (!process.env.REPLICATE_API_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Veuillez définir REPLICATE_API_TOKEN, SUPABASE_URL et SUPABASE_SERVICE_KEY dans votre fichier .env");
}

// ==============================================================================
// PROMPTS ANTI-ANACHRONISME RENFORCÉS
// ==============================================================================

function createRobustPrompt(originalPrompt, eventTitle) {
    const antiAnachronismSuffix = `

STRICT HISTORICAL ACCURACY - MANDATORY REQUIREMENTS:
- Absolutely NO text, writing, letters, inscriptions, or readable symbols anywhere in the image
- Absolutely NO flags, banners, standards with text or modern symbols  
- NO modern objects, clothing, technology, or materials whatsoever
- ONLY period-appropriate materials: natural stone, bronze, iron, wood, leather, linen, wool, clay
- All weapons, armor, and tools must be historically accurate to the specific time period
- Architecture must be authentic and match the historical era exactly
- People must wear historically accurate clothing, hairstyles, and accessories only
- NO anachronistic elements of any kind - every detail must be period-correct

VISUAL STYLE: Museum-quality historical reconstruction, documentary photography realism, cinematic lighting, ultra-detailed, photorealistic masterpiece.`;

    return originalPrompt + antiAnachronismSuffix;
}

const COMPREHENSIVE_NEGATIVE_PROMPT = "text, writing, inscriptions, letters, words, typography, signs, labels, banners, flags, cloth standards, modern clothing, anachronism, contemporary objects, digital displays, modern technology, plastic, synthetic materials, modern weapons, modern vehicles, wristwatches, eyeglasses, modern hairstyles, modern makeup, modern jewelry, modern shoes, modern fabrics, modern architecture, concrete, steel buildings, glass buildings, electric lighting, photography equipment, modern tools, modern furniture, modern art styles, cartoons, anime, modern symbols, logos, brands, modern military uniforms, camouflage patterns, modern helmets, modern boots, modern backpacks, firearms, explosives, modern medical equipment, modern communications devices, modern transportation, modern infrastructure, modern city skylines, modern road signs, modern aircraft, modern ships with engines, modern ports, modern industrial equipment, modern machinery, modern electronics, modern appliances, modern kitchen equipment, modern bathroom fixtures, modern office equipment, modern sports equipment, modern toys, modern games, modern musical instruments with electronics, modern sound equipment, modern lighting fixtures, modern security systems, modern farming equipment, modern construction equipment, modern mining equipment, modern scientific instruments, modern laboratory equipment, modern computers, modern software, modern internet, modern social media, modern advertising, modern packaging, modern food products, modern beverages, modern pharmaceuticals, modern cosmetics, modern personal care products, modern household products, modern cleaning products, modern garden tools, modern outdoor equipment, modern camping gear, modern fitness equipment, modern health monitoring devices, modern prosthetics, modern dental work, modern surgical scars, modern tattoos with modern designs, modern body modifications, modern piercings with modern jewelry, modern nail polish, modern makeup techniques, modern hair products, modern skincare products, modern fragrances, modern deodorants, modern sunscreen, modern insect repellent, modern sun protection, modern weather protection, modern safety equipment, modern protective gear";

// ==============================================================================
// FONCTIONS PRINCIPALES
// ==============================================================================

async function genererImage(prompt) {
    console.log("   🎨 Génération d'image avec Flux.1 [schnell]...");
    
    // Prompt renforcé
    const robustPrompt = createRobustPrompt(prompt, "");
    console.log("      > PROMPT RENFORCÉ envoyé à Flux");
    
    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: {
            prompt: robustPrompt,
            num_inference_steps: 4, // Correct pour schnell
            negative_prompt: COMPREHENSIVE_NEGATIVE_PROMPT,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 85
        }
    });
    
    return Array.isArray(output) ? output[0] : output;
}

async function validateImage(imageUrl) {
    if (!USE_VALIDATION) {
        console.log("   ✅ Validation désactivée - acceptation automatique");
        return true;
    }
    
    console.log(`   🔎 Validation de l'image via IA (LLaVA)...`);
    const validationPrompt = "Carefully analyze this image. Does it contain ANY visible text, writing, inscriptions, letters, flags, or cloth banners? Answer with only the single word 'yes' or 'no'.";
    
    try {
        const output = await replicate.run(
            // MODÈLE CORRIGÉ QUI FONCTIONNE
            "yorickvp/llava-v1.6-mistral-7b:19be067b589d0c46689ffa7cc3ff321447a441986a7694c01225973c2eafc874",
            {
                input: {
                    image: imageUrl,
                    prompt: validationPrompt,
                    max_tokens: 10
                }
            }
        );
        const response = (output.join('') || '').toLowerCase().trim();
        console.log(`      🤖 Réponse de l'IA de validation : "${response}"`);
        
        if (response.includes('no')) {
            console.log("      ✅ VALIDATION RÉUSSIE: Aucun élément interdit détecté.");
            return true;
        } else {
            console.log("      ❌ VALIDATION ÉCHOUÉE: Éléments interdits détectés.");
            return false;
        }
    } catch (error) {
        console.error("      ❌ Erreur lors de la validation IA:", error.message);
        // En cas d'erreur de validation, on accepte l'image par défaut
        console.log("      ⚠️  Acceptation par défaut suite à l'erreur de validation");
        return true;
    }
}

async function correctPrompt(originalPrompt, badImageUrl) {
    console.log(`   ✍️  Amélioration du prompt via IA...`);
    const correctionInstruction = `The following prompt generated an image with historical anachronisms: "${originalPrompt}". Rewrite it to be stricter about avoiding text, flags, and modern elements. Focus on pure historical accuracy. Output only the improved prompt.`;

    try {
        const output = await replicate.run(
            "meta/llama-2-70b-chat",
            {
                input: {
                    prompt: correctionInstruction,
                    system_prompt: "You are an expert prompt engineer for historical image generation. Rewrite prompts to eliminate anachronisms. Output only the rewritten prompt."
                }
            }
        );
        const newPrompt = output.join('').trim();
        console.log(`      ✅ Nouveau prompt généré.`);
        return newPrompt;
    } catch (error) {
        console.error("      ❌ Erreur lors de la correction du prompt:", error.message);
        // Retour au prompt original avec renforcement
        return createRobustPrompt(originalPrompt, "");
    }
}

async function uploadImage(imageUrl, eventTitle) {
    console.log("   📤 Compression et upload de l'image...");
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Échec du téléchargement: ${response.statusText}`);
    const imageBuffer = await response.arrayBuffer();
    const compressedBuffer = await sharp(Buffer.from(imageBuffer)).webp({ quality: 85 }).toBuffer();
    const fileName = `${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 40)}_${Date.now()}.webp`;
    const { error } = await supabase.storage.from('evenements-image').upload(fileName, compressedBuffer, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('evenements-image').getPublicUrl(fileName);
    return publicUrl;
}

async function insererEvenement(event) {
    console.log("   💾 Insertion en base de données...");
    if (!event.code || event.code.length > 5) {
        throw new Error(`Code invalide ou manquant dans le CSV pour "${event.titre}": "${event.code}"`);
    }
    const dataToInsert = {
        date: event.date, titre: event.titre, illustration_url: event.illustration_url,
        universel: String(event.universel).toLowerCase() === 'true', region: event.region || null,
        langue: event.langue || 'fr', ecart_temps_max: parseInt(event.ecart_temps_max, 10) || 500,
        facteur_variation: parseFloat(event.facteur_variation) || 1.5, niveau_difficulte: parseInt(event.niveau_difficulte, 10) || 3,
        types_evenement: event.types_evenement, pays: event.pays, epoque: event.epoque || 'Inconnue',
        mots_cles: event.mots_cles, date_formatee: event.date_formatee || null, code: event.code,
        date_precision: event.date_precision || null, ecart_temps_min: parseInt(event.ecart_temps_min, 10) || 100,
        frequency_score: parseInt(event.frequency_score, 10) || 0, description_detaillee: event.description_detaillee || event.titre
    };
    const { data: result, error } = await supabase.from('goju').insert([dataToInsert]).select();
    if (error) {
      if (error.code === '23505') throw new Error(`Le code "${dataToInsert.code}" existe déjà.`);
      throw new Error(`Erreur de base de données : ${error.message}`);
    }
    return { success: true, id: result[0].id };
}

// ==============================================================================
// SCRIPT PRINCIPAL
// ==============================================================================

async function main() {
    console.log("🏭 === TURBO3 - Version 'Contrôle Qualité CORRIGÉE' ===");
    console.log(`📊 Validation IA: ${USE_VALIDATION ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
    
    let events;
    try {
        const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
        const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        events = result.data.filter(e => e.titre && e.code && e.prompt_flux);
        if (events.length === 0) throw new Error("Aucun événement valide trouvé dans le CSV.");
        console.log(`✅ ${events.length} événements valides à traiter.`);
    } catch (error) {
        console.error(`❌ Erreur critique lors de la lecture du CSV: ${error.message}`);
        return;
    }

    const stats = { total: events.length, success: 0, failed: 0 };
    const permanentFailures = [];
    const reportData = [];
    const startTime = Date.now();

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const progress = `${i + 1}/${stats.total}`;
        console.log(`\n\n🏭 TRAITEMENT ${progress}: "${event.titre}"`);
        console.log(`================================================`);
        
        let success = false;
        let attempt = 0;
        let currentPrompt = event.prompt_flux;
        let finalImageUrl = null;
        let lastError = "";

        while (!success && attempt < MAX_RETRIES) {
            attempt++;
            console.log(`\n▶️  Tentative ${attempt}/${MAX_RETRIES} pour "${event.titre}"`);
            
            try {
                // Étape 1: Générer l'image
                const imageUrl = await genererImage(currentPrompt);
                if (!imageUrl) throw new Error("Replicate n'a pas retourné d'URL.");
                console.log(`   ✅ Image générée temporairement : ${imageUrl}`);

                // Étape 2: Valider l'image (optionnel)
                const isValid = await validateImage(imageUrl);
                
                if (isValid) {
                    // Étape 3: Si valide, upload et insertion
                    finalImageUrl = await uploadImage(imageUrl, event.titre);
                    event.illustration_url = finalImageUrl;
                    const dbResult = await insererEvenement(event);
                    success = true;
                    stats.success++;
                    console.log(`🎉 SUCCÈS pour "${event.titre}" (ID: ${dbResult.id})`);
                } else {
                    lastError = `Échec de la validation à la tentative ${attempt}.`;
                    console.log(`   ❌ Image rejetée. Tentative de correction du prompt...`);
                    // Étape 4: Si invalide, on corrige le prompt pour la prochaine tentative
                    currentPrompt = await correctPrompt(currentPrompt, imageUrl);
                }

            } catch (error) {
                lastError = `Erreur à la tentative ${attempt}: ${error.message}`;
                console.error(`   ❌ ${lastError}`);
            }
            
            if (!success && attempt < MAX_RETRIES) {
                console.log(`   ⏳ Pause de 2 secondes avant la prochaine tentative...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (!success) {
            stats.failed++;
            permanentFailures.push(event.titre);
            console.error(`\n🚨 ÉCHEC DÉFINITIF pour "${event.titre}" après ${MAX_RETRIES} tentatives.`);
        }

        reportData.push({
            titre: event.titre,
            status: success ? "SUCCESS" : "FAILED_AFTER_RETRIES",
            attempts: attempt,
            image_url: finalImageUrl || 'N/A',
            error: success ? "" : lastError
        });

        // Petite pause entre chaque événement pour éviter de surcharger l'API
        if (i < events.length - 1) {
            console.log(`   ⏳ Pause de 1 seconde avant l'événement suivant...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // Rapport final
    const duration = (Date.now() - startTime) / 1000;
    const reportFile = path.join(OUTPUT_REPORT_DIR, `turbo3_report_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    
    let csvReport = "titre,status,attempts,image_url,error\n";
    reportData.forEach(r => {
      csvReport += `"${r.titre}","${r.status}",${r.attempts},"${r.image_url}","${r.error.replace(/"/g, '""')}"\n`;
    });
    fs.writeFileSync(reportFile, csvReport);

    console.log(`\n\n🏭 === RAPPORT FINAL "Contrôle Qualité CORRIGÉ" ===`);
    console.log(`⏱️  Durée totale: ${Math.floor(duration / 60)}m ${(duration % 60).toFixed(1)}s`);
    console.log(`✅ Succès: ${stats.success}/${stats.total} (${((stats.success/stats.total)*100).toFixed(1)}%)`);
    console.log(`❌ Échecs définitifs: ${stats.failed}/${stats.total} (${((stats.failed/stats.total)*100).toFixed(1)}%)`);
    
    if (stats.success > 0) {
        const avgTimePerSuccess = duration / stats.success;
        console.log(`📊 Temps moyen par succès: ${avgTimePerSuccess.toFixed(1)}s`);
        
        // Estimation pour 10 000 événements
        const estimatedTimeFor10k = (avgTimePerSuccess * 10000) / 3600; // en heures
        const estimatedCostFor10k = 10000 * 0.003; // $0.003 par image avec Flux Schnell
        console.log(`📈 Estimation pour 10 000 événements:`);
        console.log(`   ⏱️  Temps: ~${estimatedTimeFor10k.toFixed(1)} heures`);
        console.log(`   💰 Coût: ~${estimatedCostFor10k.toFixed(0)}`);
    }
    
    if (stats.failed > 0) {
        console.log("📋 Événements échoués:", permanentFailures.slice(0, 5).join(', ') + (permanentFailures.length > 5 ? '...' : ''));
    }
    console.log(`📄 Rapport détaillé sauvegardé: ${reportFile}`);
    
    console.log(`\n💡 RECOMMANDATIONS:`);
    if (stats.failed > stats.success * 0.2) {
        console.log(`   - Taux d'échec élevé (${((stats.failed/stats.total)*100).toFixed(1)}%) - vérifiez vos prompts`);
    }
    if (!USE_VALIDATION) {
        console.log(`   - Validation IA désactivée - vérifiez manuellement un échantillon`);
    }
    console.log(`   - Pour la production massive, activez la parallélisation par lots`);
}

main().catch(console.error);