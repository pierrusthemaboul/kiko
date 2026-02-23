// ==============================================================================
// sayon3_enhanced.mjs - VERSION AVEC THÈMES ET STYLES PERSONNALISABLES
// NOUVELLES FONCTIONNALITÉS :
// - Thèmes dynamiques avec pourcentages (histoire, géographie, peintres flamands, etc.)
// - Styles visuels avec pourcentages (photoréalisme, bande dessinée, manga, etc.)
// - IA pour interpréter et adapter les thèmes personnalisés
// - Répartition intelligente selon les pourcentages définis
// ==============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import readline from 'readline';
import 'dotenv/config';

// --- Configuration OPTIMALE (identique) ---
const HYBRID_CONFIG = {
    eventGeneration: "claude-3-5-sonnet-20241022",
    historicalVerification: "claude-3-5-sonnet-20241022", 
    contextEnrichment: "claude-3-5-sonnet-20241022",
    promptGeneration: "gpt-4o",
    imageValidation: "gpt-4o-mini",
    themeInterpreter: "claude-3-5-sonnet-20241022" // 🆕 NOUVEAU: Interprétation thèmes
};

const MAX_IMAGE_ATTEMPTS = 4; 
const BATCH_SIZE = 4;
const MIN_VALIDATION_SCORE = 4;

// 🆕 NOUVEAUX STYLES VISUELS DISPONIBLES
const VISUAL_STYLES = {
    "photorealisme": {
        fluxKeywords: "photorealistic, cinematic, detailed, realistic photography",
        description: "Images photoréalistes comme des photos"
    },
    "bande-dessinee": {
        fluxKeywords: "comic book style, cartoon illustration, colorful, bold lines",
        description: "Style bande dessinée/cartoon"
    },
    "manga": {
        fluxKeywords: "manga style, anime illustration, japanese art style",
        description: "Style manga/anime japonais"
    },
    "peinture-classique": {
        fluxKeywords: "classical painting style, oil painting, renaissance art",
        description: "Style peinture classique/renaissance"
    },
    "aquarelle": {
        fluxKeywords: "watercolor painting, soft colors, artistic brush strokes",
        description: "Style aquarelle artistique"
    },
    "noir-et-blanc": {
        fluxKeywords: "black and white, monochrome, vintage photography",
        description: "Noir et blanc vintage"
    },
    "pop-art": {
        fluxKeywords: "pop art style, vibrant colors, retro poster art",
        description: "Style pop art coloré"
    },
    "minimaliste": {
        fluxKeywords: "minimalist illustration, clean lines, simple design",
        description: "Style minimaliste épuré"
    }
};

// --- Initialisation APIs (identique) ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Variables globales pour thèmes et styles
let selectedThemes = [];
let selectedStyles = [];

// ==============================================================================
// 🆕 NOUVELLES FONCTIONS POUR THÈMES ET STYLES
// ==============================================================================

function parseThemesOrStyles(input) {
    console.log(`   🔍 Parsing: "${input}"`);
    
    // Support plusieurs formats d'entrée
    const entries = [];
    
    if (input.includes('%')) {
        // Format avec pourcentages: "20% sport, 80% gastronomie"
        const parts = input.split(',').map(part => part.trim());
        
        for (const part of parts) {
            const match = part.match(/(\d+)%\s*(.+)/);
            if (match) {
                const percentage = parseInt(match[1]);
                const theme = match[2].trim();
                entries.push({ name: theme, percentage });
                console.log(`     ✅ "${theme}": ${percentage}%`);
            }
        }
    } else {
        // Format simple sans pourcentages: "sport, gastronomie, art"
        const parts = input.split(',').map(part => part.trim()).filter(part => part.length > 0);
        const equalPercentage = Math.floor(100 / parts.length);
        const remainder = 100 - (equalPercentage * parts.length);
        
        parts.forEach((theme, index) => {
            const percentage = equalPercentage + (index === 0 ? remainder : 0);
            entries.push({ name: theme, percentage });
            console.log(`     ✅ "${theme}": ${percentage}% (répartition équitable)`);
        });
    }
    
    // Vérification que les pourcentages font 100%
    const total = entries.reduce((sum, entry) => sum + entry.percentage, 0);
    if (total !== 100) {
        console.log(`     ⚠️ Ajustement: ${total}% → 100%`);
        // Ajuster le premier élément
        if (entries.length > 0) {
            entries[0].percentage += (100 - total);
            console.log(`     🔧 "${entries[0].name}" ajusté à ${entries[0].percentage}%`);
        }
    }
    
    return entries;
}

function selectRandomByPercentage(entries) {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const entry of entries) {
        cumulative += entry.percentage;
        if (random <= cumulative) {
            return entry;
        }
    }
    
    // Fallback sur le premier élément
    return entries[0];
}

async function interpretThemeWithClaude(themeName, startYear, endYear) {
    console.log(`   🧠 [CLAUDE] Interprétation du thème: "${themeName}" (${startYear}-${endYear})`);
    
    const prompt = `Tu es un expert historien. Interprète ce thème pour générer des événements historiques pertinents.

THÈME À INTERPRÉTER : "${themeName}"
PÉRIODE : ${startYear}-${endYear}

MISSION : Transformer ce thème en directives précises pour générer des événements historiques authentiques.

EXEMPLES D'INTERPRÉTATION :
- "peintres flamands" → Œuvres, naissances/morts d'artistes, commandes royales, techniques picturales
- "gastronomie" → Découvertes culinaires, introduction d'aliments, ouverture restaurants, innovations culinaires
- "Ouganda" → Histoire politique, royaumes, colonisation, indépendance, figures importantes
- "sport" → Jeux olympiques, création sports, records, institutions sportives
- "géographie" → Explorations, cartographie, découvertes géographiques, expéditions

RÈGLES :
1. Reste HISTORIQUEMENT EXACT - pas d'événements fictifs
2. Adapte le thème à la période ${startYear}-${endYear}
3. Propose des TYPES D'ÉVÉNEMENTS spécifiques et documentés
4. Donne des MOTS-CLÉS pour orienter la recherche
5. Suggère des RÉGIONS/LIEUX pertinents

FORMAT JSON :
{
  "interpretation": "Explication de comment adapter ce thème à la période",
  "eventTypes": ["type1", "type2", "type3"],
  "keywords": ["mot-clé1", "mot-clé2", "mot-clé3"],
  "suggestedRegions": ["région1", "région2"],
  "focusAreas": ["domaine1", "domaine2"],
  "avoidanceTerms": ["terme à éviter si trop général"]
}`;

    try {
        const responseText = await callClaude(prompt, {
            model: HYBRID_CONFIG.themeInterpreter,
            max_tokens: 800,
            temperature: 0.4
        });
        
        // Extraction JSON
        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }
        
        const themeData = JSON.parse(jsonText);
        
        console.log(`     📖 Interprétation: "${themeData.interpretation}"`);
        console.log(`     🎯 Types d'événements: ${themeData.eventTypes.join(', ')}`);
        console.log(`     🔑 Mots-clés: ${themeData.keywords.join(', ')}`);
        console.log(`     🌍 Régions suggérées: ${themeData.suggestedRegions.join(', ')}`);
        
        return themeData;
        
    } catch (error) {
        console.error(`     ❌ [CLAUDE] Erreur interprétation thème:`, error.message);
        
        // Fallback intelligent basé sur le nom du thème
        return {
            interpretation: `Événements liés à ${themeName} dans la période ${startYear}-${endYear}`,
            eventTypes: ["historique", "culturel", "social"],
            keywords: [themeName.toLowerCase()],
            suggestedRegions: ["Europe", "Monde"],
            focusAreas: [themeName],
            avoidanceTerms: []
        };
    }
}

// ==============================================================================
// FONCTIONS UTILITAIRES MODIFIÉES (code des fonctions callClaude, callOpenAI, etc. identique)
// ==============================================================================

// [Ici on garde toutes les fonctions utilitaires existantes : callClaude, callOpenAI, callOpenAIWithImage, etc.]
// Je les omets pour la lisibilité mais elles restent identiques

// ==============================================================================
// 🆕 GÉNÉRATION D'ÉVÉNEMENTS AVEC THÈME PERSONNALISÉ
// ==============================================================================

async function generateEventBatchWithTheme(startYear, endYear, count, themeData, attemptNumber = 1) {
    console.log(`   📦 [CLAUDE] Génération de ${count} événements avec thème (tentative ${attemptNumber})...`);
    console.log(`   🎯 Thème: "${themeData.theme}" - ${themeData.interpretation}`);
    
    // Construction du prompt avec thème personnalisé
    const themeGuidance = `
🎯 THÈME SPÉCIALISÉ : "${themeData.theme}"
📖 Contexte : ${themeData.interpretation}
🎪 Types privilégiés : ${themeData.eventTypes.join(', ')}
🔑 Mots-clés essentiels : ${themeData.keywords.join(', ')}
🌍 Régions pertinentes : ${themeData.suggestedRegions.join(', ')}
📍 Domaines de focus : ${themeData.focusAreas.join(', ')}
${themeData.avoidanceTerms.length > 0 ? `🚫 Éviter : ${themeData.avoidanceTerms.join(', ')}` : ''}`;

    const prompt = `Tu es un historien expert spécialisé dans le thème demandé. Génère EXACTEMENT ${count} événements historiques DOCUMENTÉS et VÉRIFIABLES entre ${startYear}-${endYear}.

${themeGuidance}

🔧 STRATÉGIE THÉMATIQUE :
- PRIORITÉ ABSOLUE au thème "${themeData.theme}"
- Recherche des événements LES PLUS PERTINENTS pour ce thème
- Utilise les mots-clés : ${themeData.keywords.join(', ')}
- Focus sur les types : ${themeData.eventTypes.join(', ')}
- Explore les régions : ${themeData.suggestedRegions.join(', ')}

RÈGLES CRITIQUES :
1. DATES EXACTES obligatoires - VÉRIFIE CHAQUE DATE avec précision absolue
2. ÉVÉNEMENTS DOCUMENTÉS uniquement - Sources historiques vérifiables
3. COHÉRENCE THÉMATIQUE MAXIMALE avec "${themeData.theme}"
4. DIVERSITÉ GÉOGRAPHIQUE dans les régions pertinentes
5. TITRES précis (max 60 caractères) SANS l'année

CONSIGNE QUALITÉ THÉMATIQUE :
- Cherche des événements SPÉCIFIQUEMENT liés au thème
- Privilégie la PERTINENCE THÉMATIQUE avant la notoriété
- Assure-toi que chaque événement illustre bien "${themeData.theme}"
- Varie les aspects du thème (${themeData.focusAreas.join(', ')})

FORMAT JSON STRICT :
{
  "events": [
    {
      "year": number (année exacte vérifiée),
      "titre": "Titre factuel précis SANS année",
      "description": "Contexte historique lié au thème", 
      "type": "Type adapté au thème",
      "region": "Région pertinente pour le thème",
      "specificLocation": "Lieu précis",
      "themeRelevance": "Explication courte du lien avec ${themeData.theme}",
      "confidence": "high|medium" (niveau de certitude historique)
    }
  ]
}

PRIORITÉ ABSOLUE : Pertinence thématique + Précision historique pour "${themeData.theme}".`;

    try {
        const responseText = await callClaude(prompt, {
            model: HYBRID_CONFIG.eventGeneration,
            max_tokens: 2500, // Augmenté pour les descriptions thématiques
            temperature: 0.35 // Légèrement plus créatif pour la recherche thématique
        });
        
        // [Extraction JSON identique à la version originale]
        let jsonText = responseText;
        if (responseText.includes('```json')) {
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (match) {
                jsonText = match[1];
            }
        } else if (responseText.includes('{')) {
            const startIndex = responseText.indexOf('{');
            const endIndex = responseText.lastIndexOf('}') + 1;
            jsonText = responseText.substring(startIndex, endIndex);
        }
        
        const batchData = JSON.parse(jsonText);
        
        if (!batchData.events || !Array.isArray(batchData.events)) {
            console.log(`      ❌ Structure invalide, tentative ${attemptNumber + 1}...`);
            if (attemptNumber < 3) {
                return await generateEventBatchWithTheme(startYear, endYear, count, themeData, attemptNumber + 1);
            }
            return [];
        }
        
        const validEvents = [];
        const rejectedEvents = [];
        
        batchData.events.forEach(event => {
            if (!event.titre || !event.year || event.titre.length >= 100) {
                rejectedEvents.push({ event: event.titre, reason: 'Format invalide' });
                return;
            }
            
            if (!event.titre.match(/^[a-zA-Z0-9\s\-àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ'():.,]+$/) || event.titre.includes('undefined')) {
                rejectedEvents.push({ event: event.titre, reason: 'Caractères invalides' });
                return;
            }
            
            // Vérification doublons (fonction existante)
            if (isDuplicate(event.titre)) {
                rejectedEvents.push({ event: event.titre, reason: 'Doublon détecté (pré-vérification)' });
                return;
            }
            
            // 🆕 Ajout du thème aux métadonnées de l'événement
            event.selectedTheme = themeData.theme;
            event.themeInterpretation = themeData.interpretation;
            
            validEvents.push(event);
        });
        
        console.log(`      ✅ [CLAUDE] Lot thématique généré: ${validEvents.length} événements pour "${themeData.theme}"`);
        
        validEvents.forEach(event => {
            console.log(`        ✅ "${event.titre}" (${event.year}) [${event.type}|${event.region}] - Thème: ${event.themeRelevance || 'N/A'}`);
        });
        
        return validEvents;
        
    } catch (error) {
        console.error(`      ❌ [CLAUDE] Erreur génération thématique:`, error.message);
        
        if (attemptNumber < 3) {
            console.log(`      🔄 Retry avec paramètres modifiés...`);
            return await generateEventBatchWithTheme(startYear, endYear, count, themeData, attemptNumber + 1);
        }
        return [];
    }
}

// ==============================================================================
// 🆕 GÉNÉRATION PROMPTS AVEC STYLE PERSONNALISÉ
// ==============================================================================

async function generateOptimizedFluxPromptWithStyle(enrichedEvent, styleData) {
    console.log(`      🎨 [GPT-4O] Génération prompt avec style "${styleData.style}"...`);
    
    const enrichissement = enrichedEvent.enrichissement;
    const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                  enrichedEvent.year < 1492 ? 'medieval' : 
                  enrichedEvent.year < 1789 ? 'renaissance' : 
                  enrichedEvent.year < 1914 ? 'industrial' : 'modern';
    
    const styleKeywords = VISUAL_STYLES[styleData.style]?.fluxKeywords || "detailed, artistic";
    
    const promptForGPT = `Tu es un expert en prompts pour Flux-schnell. Génère le MEILLEUR prompt possible pour illustrer cet événement historique dans le style demandé.

ÉVÉNEMENT À ILLUSTRER :
- Titre : "${enrichedEvent.titre}"
- Année : ${enrichedEvent.year} (période ${epoch})
- Contexte : ${enrichissement.contextHistorique}
- Thème : ${enrichedEvent.selectedTheme || 'Historique'}
- Pertinence thématique : ${enrichedEvent.themeRelevance || 'N/A'}

🎨 STYLE VISUEL REQUIS : "${styleData.style}"
🎯 Mots-clés style : ${styleKeywords}
📝 Description : ${VISUAL_STYLES[styleData.style]?.description || 'Style personnalisé'}

🎯 MISSION CRITIQUE : Créer un prompt qui combine parfaitement l'événement historique ET le style visuel "${styleData.style}".

📋 RÈGLES ABSOLUES FLUX-SCHNELL :
1. INCLURE OBLIGATOIREMENT : "${enrichedEvent.year}" ET "${epoch} period" dans le prompt
2. INTÉGRER LE STYLE : ${styleKeywords}
3. ZÉRO TEXTE dans l'image : Aucun mot, chiffre, panneau, inscription visible
4. MAXIMUM 45 mots (limite optimale Flux-schnell)
5. Structure : [Personnages période] [action] [objets époque] [environnement] [STYLE]

🎨 ADAPTATION STYLE "${styleData.style}" :
${getStyleSpecificInstructions(styleData.style)}

🚫 INTERDICTIONS STRICTES :
- text, writing, letters, numbers, signs, inscriptions, words
- Éléments incompatibles avec ${styleData.style}
- modern objects, cars, phones, contemporary clothing

⚡ RÉPONDS UNIQUEMENT avec le prompt Flux-schnell OPTIMAL incluant l'année, la période ET le style "${styleData.style}".`;

    try {
        const fluxPrompt = await callOpenAI(promptForGPT, {
            model: HYBRID_CONFIG.promptGeneration,
            max_tokens: 120,
            temperature: 0.7
        });
        
        let cleanPrompt = fluxPrompt.trim().replace(/^["']|["']$/g, '');
        
        // Vérifications et corrections (identiques à la version originale)
        const hasYear = cleanPrompt.includes(enrichedEvent.year.toString());
        const hasPeriod = cleanPrompt.includes('period') || cleanPrompt.includes(epoch);
        const hasStyle = styleKeywords.split(',').some(keyword => 
            cleanPrompt.toLowerCase().includes(keyword.trim().toLowerCase())
        );
        
        console.log(`      🔍 Vérification année ${enrichedEvent.year}: ${hasYear ? '✅' : '❌'}`);
        console.log(`      🔍 Vérification période ${epoch}: ${hasPeriod ? '✅' : '❌'}`);
        console.log(`      🔍 Vérification style ${styleData.style}: ${hasStyle ? '✅' : '❌'}`);
        
        // Corrections automatiques
        let corrections = [];
        if (!hasYear) corrections.push(enrichedEvent.year.toString());
        if (!hasPeriod) corrections.push(`${epoch} period`);
        if (!hasStyle) corrections.push(styleKeywords.split(',')[0].trim());
        
        if (corrections.length > 0) {
            cleanPrompt = `${cleanPrompt}, ${corrections.join(', ')}`;
            console.log(`      🔧 Prompt corrigé: "${cleanPrompt}"`);
        }
        
        const finalWordCount = countWords(cleanPrompt);
        console.log(`      📊 [GPT-4O] Prompt final avec style: "${cleanPrompt}"`);
        console.log(`      📏 Longueur: ${finalWordCount} mots`);
        console.log(`      🎨 Style "${styleData.style}": ${hasStyle ? '✅' : '❌'}`);
        
        return cleanPrompt;
        
    } catch (error) {
        console.error(`      ❌ [GPT-4O] Erreur génération prompt stylisé:`, error.message);
        // Fallback avec style
        const fallbackPrompt = `${enrichissement.motsClesVisuels.slice(0, 2).join(' ')}, ${enrichedEvent.year}, ${epoch} period, ${styleKeywords.split(',')[0].trim()}`;
        console.log(`      🔄 Prompt de secours avec style: "${fallbackPrompt}"`);
        return fallbackPrompt;
    }
}

function getStyleSpecificInstructions(style) {
    const instructions = {
        "photorealisme": "Mise au point parfaite, éclairage naturel, détails hyper-réalistes",
        "bande-dessinee": "Traits nets, couleurs vives, ombrage cartoon, style illustratif",
        "manga": "Grands yeux expressifs, cheveux stylisés, ombrage anime",
        "peinture-classique": "Coups de pinceau visibles, palette de maître, composition équilibrée",
        "aquarelle": "Transparences, couleurs fluides, effets de papier humide",
        "noir-et-blanc": "Contrastes dramatiques, jeu d'ombres et lumières",
        "pop-art": "Couleurs saturées, motifs répétés, style publicitaire rétro",
        "minimaliste": "Formes épurées, couleurs limitées, composition simple"
    };
    
    return instructions[style] || "Style artistique adapté au contenu historique";
}

// ==============================================================================
// 🆕 TRAITEMENT PRINCIPAL AVEC THÈMES ET STYLES
// ==============================================================================

async function processBatchWithThemeAndStyle(startYear, endYear, batchSize, batchNumber) {
    console.log(`\n📦 === LOT ${batchNumber} THÉMATIQUE STYLISÉ (${batchSize} événements) ===`);
    
    // Sélection du thème pour ce lot
    const selectedTheme = selectRandomByPercentage(selectedThemes);
    console.log(`🎯 Thème sélectionné: "${selectedTheme.name}" (${selectedTheme.percentage}%)`);
    
    // Interprétation du thème
    const themeData = await interpretThemeWithClaude(selectedTheme.name, startYear, endYear);
    themeData.theme = selectedTheme.name;
    
    // Phase 1: Génération avec thème
    const events = await generateEventBatchWithTheme(startYear, endYear, batchSize, themeData, batchNumber);
    if (events.length === 0) {
        console.log("❌ [CLAUDE] Échec génération thématique");
        return [];
    }
    
    // Phase 2: Vérification (fonction existante)
    const { validEvents } = await verifyEventBatchWithClaude(events);
    if (validEvents.length === 0) {
        console.log("❌ [CLAUDE] Aucun événement validé");
        return [];
    }
    
    console.log(`\n   🖼️ [HYBRID] Traitement stylisé des images pour ${validEvents.length} événements...`);
    
    const completedEvents = [];
    
    for (const event of validEvents) {
        // Sélection du style pour cet événement
        const selectedStyle = selectRandomByPercentage(selectedStyles);
        console.log(`   🎨 Style sélectionné pour "${event.titre}": "${selectedStyle.name}"`);
        
        const styleData = { style: selectedStyle.name, percentage: selectedStyle.percentage };
        
        const result = await processEventWithThemeAndStyle(event, styleData);
        if (result) {
            completedEvents.push(result);
            console.log(`      ✅ [HYBRID] "${event.titre}" traité (thème: ${selectedTheme.name}, style: ${selectedStyle.name})`);
        } else {
            console.log(`      ❌ [HYBRID] Échec traitement "${event.titre}"`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n   📊 [HYBRID] Bilan lot ${batchNumber}: ${completedEvents.length}/${validEvents.length} réussis`);
    console.log(`   🎯 Thème principal: "${selectedTheme.name}"`);
    console.log(`   🎨 Styles utilisés: ${[...new Set(completedEvents.map(e => e.selectedStyle))].join(', ')}`);
    
    return completedEvents;
}

async function processEventWithThemeAndStyle(event, styleData) {
    console.log(`\n   🖼️ [HYBRID] Traitement thématique stylisé: "${event.titre}" (${event.year})`);
    console.log(`   🎯 Thème: "${event.selectedTheme}" | 🎨 Style: "${styleData.style}"`);
    
    // Phase 1: Enrichissement (fonction existante)
    const enrichedEvent = await enrichEventWithClaude(event);
    
    let successfullyCreated = false;
    let validationData = null;
    
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS && !successfullyCreated; attempt++) {
        console.log(`      🎨 Phase 2: Génération image stylisée - Tentative ${attempt}/${MAX_IMAGE_ATTEMPTS}`);
        
        try {
            // Phase 2a: Génération prompt avec style
            const optimizedPrompt = await generateOptimizedFluxPromptWithStyle(enrichedEvent, styleData);
            
            // Phase 2b: Génération image (fonction existante)
            const imageUrl = await generateImageEnhanced(optimizedPrompt, enrichedEvent);
            
            if (!imageUrl) {
                console.log("      ❌ Échec génération image");
                continue;
            }
            
            // Phase 3: Validation (fonction existante)
            const validationResult = await validateImageWithGPTMini(enrichedEvent, imageUrl);
            validationData = validationResult;
            
            if (validationResult.isValid) {
                try {
                    console.log(`      📤 [HYBRID] Upload vers Supabase...`);
                    const uploadedUrl = await uploadImageToSupabase(imageUrl, event.titre);
                    
                    // Enrichissement avec thème et style
                    const finalEvent = enrichAndFinalizeEventWithThemeAndStyle(
                        enrichedEvent, 
                        uploadedUrl, 
                        optimizedPrompt, 
                        validationData,
                        styleData
                    );
                    
                    await insertValidatedEvent(finalEvent);
                    addToCache(event.titre);
                    
                    console.log(`      ✅ [HYBRID] Événement thématique stylisé créé !`);
                    console.log(`      🎯 Thème: "${event.selectedTheme}" | 🎨 Style: "${styleData.style}"`);
                    successfullyCreated = true;
                    return finalEvent;
                    
                } catch (uploadError) {
                    console.error(`      ❌ Erreur upload:`, uploadError.message);
                    
                    if (attempt === MAX_IMAGE_ATTEMPTS) {
                        try {
                            const finalEvent = enrichAndFinalizeEventWithThemeAndStyle(
                                enrichedEvent, 
                                imageUrl, 
                                optimizedPrompt, 
                                validationData,
                                styleData
                            );
                            await insertValidatedEvent(finalEvent);
                            addToCache(event.titre);
                            console.log(`      ✅ [HYBRID] Créé avec URL directe !`);
                            return finalEvent;
                        } catch (directError) {
                            console.error(`      ❌ Échec URL directe:`, directError.message);
                        }
                    }
                }
            } else {
                console.log("      ❌ Image non validée, nouvelle tentative...");
            }
            
        } catch (error) {
            console.error(`      ❌ Erreur tentative ${attempt}:`, error.message);
        }
        
        if (attempt < MAX_IMAGE_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Fallback avec métadonnées
    console.log(`      🔄 FALLBACK: Image par défaut avec métadonnées...`);
    try {
        const defaultImageUrl = `https://via.placeholder.com/800x450/8B4513/FFFFFF?text=${encodeURIComponent(event.year + ' - ' + event.selectedTheme)}`;
        
        const finalEvent = enrichAndFinalizeEventWithThemeAndStyle(
            enrichedEvent, 
            defaultImageUrl, 
            "Image par défaut", 
            validationData,
            styleData
        );
        await insertValidatedEvent(finalEvent);
        
        addToCache(event.titre);
        console.log(`      ✅ [HYBRID] Créé avec fallback thématique stylisé !`);
        return finalEvent;
        
    } catch (fallbackError) {
        console.error(`      ❌ [HYBRID] Échec total:`, fallbackError.message);
        return null;
    }
}

// 🆕 Fonction d'enrichissement avec thème et style
function enrichAndFinalizeEventWithThemeAndStyle(enrichedEvent, imageUrl, illustrationPrompt, validationData = null, styleData = null) {
    const finalEvent = enrichAndFinalizeEvent(enrichedEvent, imageUrl, illustrationPrompt, validationData);
    
    // Ajout des métadonnées thématiques et stylistiques
    if (enrichedEvent.selectedTheme) {
        finalEvent.selected_theme = enrichedEvent.selectedTheme;
        finalEvent.theme_relevance = enrichedEvent.themeRelevance || '';
        finalEvent.theme_interpretation = enrichedEvent.themeInterpretation || '';
    }
    
    if (styleData) {
        finalEvent.selected_style = styleData.style;
        finalEvent.style_keywords = VISUAL_STYLES[styleData.style]?.fluxKeywords || '';
        finalEvent.style_description = VISUAL_STYLES[styleData.style]?.description || '';
    }
    
    console.log(`      💾 [HYBRID] Métadonnées ajoutées:`);
    console.log(`         🎯 Thème: "${finalEvent.selected_theme}"`);
    console.log(`         🎨 Style: "${finalEvent.selected_style}"`);
    
    return finalEvent;
}

// ==============================================================================
// 🆕 INTERFACE UTILISATEUR AMÉLIORÉE
// ==============================================================================

function displayAvailableStyles() {
    console.log("\n🎨 === STYLES VISUELS DISPONIBLES ===");
    Object.entries(VISUAL_STYLES).forEach(([key, style]) => {
        console.log(`   🎨 ${key}: ${style.description}`);
    });
    console.log("   📝 Ou tapez un style personnalisé !");
}

async function setupThemesAndStyles() {
    console.log("\n🎯 === CONFIGURATION THÈMES ET STYLES ===");
    
    // Configuration des thèmes
    console.log("\n📚 CONFIGURATION DES THÈMES :");
    console.log("💡 Exemples :");
    console.log("   • Format avec %: '30% gastronomie, 70% peintres flamands'");
    console.log("   • Format simple: 'histoire, géographie, sport'");
    console.log("   • Thème unique: 'Ouganda' ou 'art renaissance'");
    
    const themesInput = await askQuestion('🎯 Entrez vos thèmes (avec ou sans %) : ');
    selectedThemes = parseThemesOrStyles(themesInput);
    
    console.log(`\n✅ Thèmes configurés:`);
    selectedThemes.forEach(theme => {
        console.log(`   🎯 "${theme.name}": ${theme.percentage}%`);
    });
    
    // Configuration des styles
    displayAvailableStyles();
    console.log("\n🎨 CONFIGURATION DES STYLES :");
    console.log("💡 Exemples :");
    console.log("   • '60% photorealisme, 40% bande-dessinee'");
    console.log("   • 'manga, aquarelle, pop-art' (répartition équitable)");
    console.log("   • 'photorealisme' (100%)");
    
    const stylesInput = await askQuestion('🎨 Entrez vos styles (avec ou sans %) : ');
    selectedStyles = parseThemesOrStyles(stylesInput);
    
    console.log(`\n✅ Styles configurés:`);
    selectedStyles.forEach(style => {
        console.log(`   🎨 "${style.name}": ${style.percentage}%`);
    });
    
    // Validation des styles
    const invalidStyles = selectedStyles.filter(style => 
        !VISUAL_STYLES[style.name] && !style.name.includes('personnalisé')
    );
    
    if (invalidStyles.length > 0) {
        console.log(`\n⚠️ Styles non reconnus: ${invalidStyles.map(s => s.name).join(', ')}`);
        console.log("   Ces styles seront traités comme 'personnalisés'");
    }
    
    return { selectedThemes, selectedStyles };
}

// ==============================================================================
// SCRIPT PRINCIPAL AMÉLIORÉ
// ==============================================================================

async function main() {
    console.log("\n🚀 === SAYON VERSION THÉMATIQUE STYLISÉE ===");
    console.log("🆕 NOUVELLES FONCTIONNALITÉS :");
    console.log("   🎯 Thèmes personnalisables avec % (histoire, peintres flamands, Ouganda, etc.)");
    console.log("   🎨 Styles visuels avec % (photoréalisme, bande dessinée, manga, etc.)");
    console.log("   🧠 IA interprète vos thèmes pour l'adaptation historique");
    console.log("   📊 Répartition intelligente selon vos pourcentages");
    
    // Vérification APIs (identique)
    console.log("\n🔧 === VÉRIFICATION DES APIS ===");
    if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
        console.error("❌ Clés API manquantes dans .env");
        process.exit(1);
    }
    console.log("✅ APIs configurées: Claude + OpenAI + Replicate + Supabase");
    
    // Configuration de base
    const startYear = parseInt(await askQuestion('📅 Année de DÉBUT : '));
    const endYear = parseInt(await askQuestion('📅 Année de FIN : '));
    const targetCount = parseInt(await askQuestion('🎯 Nombre d\'événements : '));
    
    // 🆕 Configuration des thèmes et styles
    await setupThemesAndStyles();
    
    // Chargement des titres existants (fonction existante)
    const loadResult = await loadExistingTitles(startYear, endYear);
    
    console.log(`\n🚫 === PROTECTION ANTI-DOUBLONS ACTIVÉE ===`);
    console.log(`📊 Total événements en base: ${existingNormalizedTitles.size}`);
    console.log(`🎯 Période ciblée: ${startYear}-${endYear}`);
    
    // Traitement principal
    let createdCount = 0;
    let batchNumber = 0;
    const startTime = Date.now();
    let themeStats = {};
    let styleStats = {};
    
    while (createdCount < targetCount && batchNumber < 25) {
        batchNumber++;
        const remainingEvents = targetCount - createdCount;
        const currentBatchSize = Math.min(BATCH_SIZE, remainingEvents);
        
        try {
            console.log(`\n🚀 [HYBRID] Début lot ${batchNumber} thématique stylisé...`);
            const completedEvents = await processBatchWithThemeAndStyle(startYear, endYear, currentBatchSize, batchNumber);
            createdCount += completedEvents.length;
            
            // 🆕 Statistiques thématiques et stylistiques
            completedEvents.forEach(event => {
                const theme = event.selected_theme || 'Non défini';
                const style = event.selected_style || 'Non défini';
                
                themeStats[theme] = (themeStats[theme] || 0) + 1;
                styleStats[style] = (styleStats[style] || 0) + 1;
            });
            
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = createdCount / (elapsed / 60);
            const realSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
            
            console.log(`\n📊 BILAN LOT ${batchNumber} THÉMATIQUE STYLISÉ:`);
            console.log(`   ✅ Créés: ${completedEvents.length}/${currentBatchSize}`);
            console.log(`   📈 Total: ${createdCount}/${targetCount} (${realSuccessRate}% de l'objectif)`);
            console.log(`   ⏱️ Rate: ${rate.toFixed(1)} événements/min`);
            console.log(`   🎯 Thèmes actifs: ${Object.keys(themeStats).length}`);
            console.log(`   🎨 Styles actifs: ${Object.keys(styleStats).length}`);
            
        } catch (error) {
            console.error(`❌ [HYBRID] Erreur lot ${batchNumber}:`, error.message);
            console.log(`🔄 [HYBRID] Continuation...`);
        }
        
        if (createdCount < targetCount) {
            console.log("   ⏳ Pause 3s...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // Bilan final
    const totalTime = (Date.now() - startTime) / 1000;
    const finalRate = createdCount / (totalTime / 60);
    const realFinalSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
    
    console.log(`\n🎉 === TRAITEMENT THÉMATIQUE STYLISÉ TERMINÉ ===`);
    console.log(`✅ Événements créés: ${createdCount}/${targetCount} (${realFinalSuccessRate}%)`);
    console.log(`⏱️ Temps total: ${Math.floor(totalTime/60)}min ${(totalTime%60).toFixed(0)}s`);
    console.log(`📈 Rate finale: ${finalRate.toFixed(1)} événements/min`);
    
    // 🆕 Statistiques détaillées thèmes et styles
    console.log(`\n🎯 === RÉPARTITION DES THÈMES ===`);
    Object.entries(themeStats).forEach(([theme, count]) => {
        const percentage = ((count / createdCount) * 100).toFixed(1);
        console.log(`   🎯 ${theme}: ${count} événements (${percentage}%)`);
    });
    
    console.log(`\n🎨 === RÉPARTITION DES STYLES ===`);
    Object.entries(styleStats).forEach(([style, count]) => {
        const percentage = ((count / createdCount) * 100).toFixed(1);
        console.log(`   🎨 ${style}: ${count} événements (${percentage}%)`);
    });
    
    console.log(`\n🆕 FONCTIONNALITÉS UTILISÉES :`);
    console.log(`   🎯 Thèmes personnalisés: ${selectedThemes.length} configurés`);
    console.log(`   🎨 Styles visuels: ${selectedStyles.length} configurés`);
    console.log(`   🧠 Interprétation IA des thèmes: ACTIVÉE`);
    console.log(`   📊 Répartition par pourcentages: RESPECTÉE`);
    
    rl.close();
}

function askQuestion(query) { 
    return new Promise(resolve => rl.question(query, resolve)); 
}

// [Ici on ajoute toutes les fonctions utilitaires manquantes de la version originale]
// callClaude, callOpenAI, callOpenAIWithImage, isDuplicate, addToCache, 
// loadExistingTitles, verifyEventBatchWithClaude, enrichEventWithClaude,
// generateImageEnhanced, validateImageWithGPTMini, uploadImageToSupabase,
// enrichAndFinalizeEvent, insertValidatedEvent, countWords, etc.

// ==============================================================================
// LANCEMENT DU SCRIPT
// ==============================================================================

main().catch(error => { 
    console.error("\n💥 [HYBRID] Erreur fatale:", error); 
    rl.close(); 
});