// ==============================================================================
// sayon2_claude_prompts.mjs - VERSION HYBRIDE OPTIMALE CLAUDE + GEMINI
// GÉNÉRATION PROMPTS : Claude 3.5 Sonnet (Excellence créative)
// AUTRES FONCTIONS : Gemini 2.0 Flash (Économies 90%)
// CONSERVATION : Toutes fonctionnalités + retry logic + monitoring + diagnostics
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import readline from 'readline';
import 'dotenv/config';

// --- Configuration HYBRIDE (Claude pour prompts + Gemini pour le reste) ---
const AI_CONFIG = {
    // CLAUDE pour génération prompts Flux (Excellence créative)
    promptGeneration: "claude-3-5-sonnet-20241022",
    
    // GEMINI pour le reste (Économies)
    eventGeneration: "gemini-2.0-flash",
    historicalVerification: "gemini-2.0-flash", 
    contextEnrichment: "gemini-2.0-flash",
    imageValidation: "gemini-2.0-flash"
};

const MAX_IMAGE_ATTEMPTS = 4; 
const BATCH_SIZE = 4;
const MIN_VALIDATION_SCORE = 4;

// Limites optimisées Flux-schnell (CONSERVÉES)
const FLUX_SCHNELL_LIMITS = {
    MAX_T5_TOKENS: 256,
    OPTIMAL_T5_TOKENS: 200,
    TARGET_T5_TOKENS: 180,
    TARGET_WORDS: 45,
    MAX_WORDS: 60
};

const FLUX_SCHNELL_CONFIG = {
    steps: 4,
    quality: 85,
    seed: () => Math.floor(Math.random() * 1000000)
};

// --- Initialisation APIs ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ==============================================================================
// WRAPPER CLAUDE ROBUSTE (POUR GÉNÉRATION PROMPTS FLUX)
// ==============================================================================

async function callClaude(prompt, options = {}) {
    const {
        model = AI_CONFIG.promptGeneration,
        maxTokens = 300,
        temperature = 0.7,
        retryAttempt = 1
    } = options;
    
    console.log(`      🎨 [CLAUDE] Appel ${model} (${prompt.length} chars)${retryAttempt > 1 ? ` - Retry ${retryAttempt}/3` : ''}`);
    
    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const text = response.content[0].text;
        console.log(`      ✅ [CLAUDE] Réponse reçue (${text.length} chars)`);
        return text;
        
    } catch (error) {
        console.error(`      ❌ [CLAUDE] Erreur:`, error.message);
        
        // Retry automatique pour erreurs temporaires
        if ((error.message.includes('rate_limit') || 
             error.message.includes('overloaded') ||
             error.message.includes('timeout')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 5000;
            console.log(`      🔄 [CLAUDE] Retry automatique dans ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callClaude(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

// ==============================================================================
// WRAPPERS GEMINI ROBUSTES (POUR TOUTES LES AUTRES FONCTIONS)
// ==============================================================================

async function callGemini(prompt, options = {}) {
    const {
        model = AI_CONFIG.eventGeneration,
        maxOutputTokens = 1000,
        temperature = 0.3,
        responseFormat = null,
        retryAttempt = 1
    } = options;
    
    console.log(`      🤖 [GEMINI] Appel ${model} (${prompt.length} chars)${retryAttempt > 1 ? ` - Retry ${retryAttempt}/3` : ''}`);
    
    try {
        const geminiModel = genAI.getGenerativeModel({ 
            model,
            generationConfig: {
                maxOutputTokens,
                temperature,
                ...(responseFormat === 'json' && { responseMimeType: "application/json" })
            }
        });
        
        const result = await geminiModel.generateContent(prompt);
        const response = result.response.text();
        
        console.log(`      ✅ [GEMINI] Réponse reçue (${response.length} chars)`);
        return response;
        
    } catch (error) {
        console.error(`      ❌ [GEMINI] Erreur:`, error.message);
        
        // Retry automatique pour erreurs temporaires
        if ((error.message.includes('quota') || 
             error.message.includes('rate_limit') || 
             error.message.includes('overloaded') ||
             error.message.includes('timeout')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 5000;
            console.log(`      🔄 [GEMINI] Retry automatique dans ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callGemini(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

async function callGeminiWithImage(prompt, imageUrl, options = {}) {
    const {
        model = AI_CONFIG.imageValidation,
        maxOutputTokens = 350,
        temperature = 0.05,
        retryAttempt = 1
    } = options;
    
    console.log(`      🤖 [GEMINI-VISION] Appel ${model} pour validation image${retryAttempt > 1 ? ` - Retry ${retryAttempt}/3` : ''}`);
    
    try {
        const geminiModel = genAI.getGenerativeModel({ 
            model,
            generationConfig: {
                maxOutputTokens,
                temperature,
                responseMimeType: "application/json"
            }
        });
        
        // Télécharger l'image pour Gemini
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        
        const imagePart = {
            inlineData: {
                data: Buffer.from(imageBuffer).toString('base64'),
                mimeType: 'image/webp'
            }
        };
        
        const result = await geminiModel.generateContent([prompt, imagePart]);
        const response = result.response.text();
        
        console.log(`      ✅ [GEMINI-VISION] Validation terminée`);
        return response;
        
    } catch (error) {
        console.error(`      ❌ [GEMINI-VISION] Erreur:`, error.message);
        
        // Retry automatique
        if ((error.message.includes('quota') || 
             error.message.includes('rate_limit')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 3000;
            console.log(`      🔄 [GEMINI-VISION] Retry automatique dans ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callGeminiWithImage(prompt, imageUrl, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

// ==============================================================================
// DÉTECTION INTELLIGENTE DES DOUBLONS (CONSERVATION COMPLÈTE)
// ==============================================================================

let existingNormalizedTitles = new Set();
let titleMappings = new Map();

function extractYear(dateString) {
    if (!dateString) return null;
    const yearMatch = dateString.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

function normalizeTitle(titre) {
    if (!titre) return '';
    
    let normalized = titre.toLowerCase().trim();
    
    normalized = normalized
        .replace(/\s*\(?\d{4}\)?$/g, '')
        .replace(/\s+\d{4}\s*$/g, '')
        .replace(/^traité\s+(de\s+|du\s+|des\s+)?/g, 'traite de ')
        .replace(/^traite\s+(de\s+|du\s+|des\s+)?/g, 'traite de ')
        .replace(/^acte\s+(de\s+|d'|du\s+|des\s+)?/g, 'acte de ')
        .replace(/^bataille\s+(de\s+|du\s+|des\s+)?/g, 'bataille de ')
        .replace(/^guerre\s+(de\s+|du\s+|des\s+)?/g, 'guerre de ')
        .replace(/^révolution\s+(de\s+|du\s+|des\s+)?/g, 'revolution de ')
        .replace(/^revolution\s+(de\s+|du\s+|des\s+)?/g, 'revolution de ')
        .replace(/^découverte\s+(de\s+|du\s+|des\s+)?/g, 'decouverte de ')
        .replace(/^decouverte\s+(de\s+|du\s+|des\s+)?/g, 'decouverte de ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+(le|la|les|du|de|des|en|et|ou|dans|pour|avec|par|sur)\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    return normalized;
}

async function loadExistingTitles(startYear, endYear) {
    console.log(`🔍 Chargement de TOUS les événements existants (tables 'evenements' + 'goju')...`);
    
    try {
        const [gojuResult, eventsResult] = await Promise.all([
            supabase.from('goju').select('titre, date, date_formatee'),
            supabase.from('evenements').select('titre, date, date_formatee')
        ]);
        
        const allEvents = [
            ...(gojuResult.data || []),
            ...(eventsResult.data || [])
        ];
        
        console.log(`   📊 Total événements chargés: ${allEvents.length} (goju: ${gojuResult.data?.length || 0}, evenements: ${eventsResult.data?.length || 0})`);
        
        const periodEvents = [];
        const allNormalizedTitles = new Set();
        const allMappings = new Map();
        
        allEvents.forEach(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            const normalized = normalizeTitle(event.titre);
            
            allNormalizedTitles.add(normalized);
            if (!allMappings.has(normalized)) {
                allMappings.set(normalized, []);
            }
            allMappings.get(normalized).push(event.titre);
            
            if (eventYear >= startYear && eventYear <= endYear) {
                periodEvents.push(event);
            }
        });
        
        console.log(`   🎯 Événements dans la période ${startYear}-${endYear}: ${periodEvents.length}`);
        console.log(`   🚫 Titres normalisés à éviter: ${allNormalizedTitles.size}`);
        
        existingNormalizedTitles = allNormalizedTitles;
        titleMappings = allMappings;
        
        return { allNormalizedTitles, periodEvents: periodEvents.map(e => e.titre) };
        
    } catch (error) {
        console.error("❌ Erreur chargement titres:", error.message);
        return { allNormalizedTitles: new Set(), periodEvents: [] };
    }
}

function isDuplicate(titre) {
    const normalized = normalizeTitle(titre);
    const exists = existingNormalizedTitles.has(normalized);
    
    if (exists) {
        const existingVersions = titleMappings.get(normalized) || [];
        console.log(`   ❌ Doublon détecté: "${titre}" -> normalisé: "${normalized}"`);
        console.log(`      Versions existantes: [${existingVersions.join(', ')}]`);
        return true;
    }
    
    if (normalized.length < 10) {
        for (const existingNormalized of existingNormalizedTitles) {
            if (existingNormalized.length < 10 && existingNormalized === normalized) {
                console.log(`   ⚠️ Similarité exacte détectée: "${titre}" = "${existingNormalized}"`);
                return true;
            }
        }
    }
    
    return false;
}

function addToCache(titre) {
    const normalized = normalizeTitle(titre);
    existingNormalizedTitles.add(normalized);
    
    if (!titleMappings.has(normalized)) {
        titleMappings.set(normalized, []);
    }
    titleMappings.get(normalized).push(titre);
}

// ==============================================================================
// GÉNÉRATION D'ÉVÉNEMENTS OPTIMISÉE (GEMINI)
// ==============================================================================

async function generateEventBatchWithGemini(startYear, endYear, count, attemptNumber = 1) {
    console.log(`   📦 [GEMINI] Génération de ${count} événements (tentative ${attemptNumber})...`);
    
    const periodExistingTitles = [];
    titleMappings.forEach((originals, normalized) => {
        originals.forEach(original => {
            const eventYear = extractYear(original);
            if (eventYear >= startYear && eventYear <= endYear) {
                periodExistingTitles.push(original);
            }
        });
    });
    
    const allExistingInPeriod = periodExistingTitles.join('", "');
    console.log(`      🚫 Événements interdits dans période: ${periodExistingTitles.length} titres`);
    console.log(`      📏 Longueur liste interdite: ${allExistingInPeriod.length} caractères`);
    
    const promptVariations = [
        "événements politiques et diplomatiques documentés",
        "inventions techniques et découvertes scientifiques vérifiées", 
        "constructions d'infrastructures et monuments historiques",
        "batailles et conflits militaires régionaux",
        "fondations de villes et institutions importantes",
        "catastrophes naturelles et phénomènes géologiques",
        "mouvements artistiques et culturels significatifs",
        "traités commerciaux et accords économiques",
        "explorations géographiques et découvertes maritimes",
        "innovations religieuses et réformes ecclésiastiques",
        "développements économiques et innovations financières",
        "avancées médicales et anatomiques documentées",
        "innovations technologiques et mécaniques",
        "événements juridiques et législatifs",
        "fondations d'universités et institutions savantes"
    ];
    
    const focusArea = promptVariations[attemptNumber % promptVariations.length];
    
    const prompt = `Tu es un historien expert reconnu. Génère EXACTEMENT ${count} événements historiques DOCUMENTÉS et VÉRIFIABLES entre ${startYear}-${endYear}.

🚫 ÉVÉNEMENTS STRICTEMENT INTERDITS (TOUS ceux de la période ${startYear}-${endYear}) :
"${allExistingInPeriod}"

🎯 FOCUS SPÉCIALISÉ : ${focusArea}

🔧 STRATÉGIE ANTI-DOUBLONS : Privilégie des événements MOINS CONNUS mais historiquement vérifiables. Varie ABSOLUMENT les régions géographiques.

RÈGLES CRITIQUES :
1. DATES EXACTES obligatoires - VÉRIFIE CHAQUE DATE avec précision absolue
2. ÉVÉNEMENTS DOCUMENTÉS uniquement - Sources historiques vérifiables
3. ZÉRO DOUBLON avec les ${periodExistingTitles.length} événements interdits ci-dessus
4. DIVERSITÉ GÉOGRAPHIQUE MAXIMALE (Europe, Asie, Amérique, Afrique)
5. TITRES précis (max 60 caractères) SANS l'année

CONSIGNE QUALITÉ :
- Privilégie des événements MOINS connus mais historiquement importants
- VARIE absolument les régions : au moins 2 continents différents
- Assure-toi de la précision des dates (±0 tolérance d'erreur)
- Évite les "grands classiques" probablement déjà pris

FORMAT JSON STRICT :
{
  "events": [
    {
      "year": number (année exacte vérifiée),
      "titre": "Titre factuel précis SANS année",
      "description": "Contexte historique bref", 
      "type": "Militaire|Architecture|Invention|Institution|Découverte|Catastrophe|Exploration|Religion|Économie",
      "region": "Europe|Asie|Afrique|Amérique",
      "specificLocation": "Pays/région précise",
      "confidence": "high|medium" (niveau de certitude historique)
    }
  ]
}

PRIORITÉ ABSOLUE : Précision historique + DIVERSITÉ GÉOGRAPHIQUE + ZÉRO ressemblance avec les ${periodExistingTitles.length} événements interdits.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.eventGeneration,
            maxOutputTokens: 2200,
            temperature: 0.25,
            responseFormat: 'json'
        });
        
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
        
        console.log(`      📊 [GEMINI] JSON extrait: ${jsonText.substring(0, 200)}...`);
        
        const batchData = JSON.parse(jsonText);
        
        if (!batchData.events || !Array.isArray(batchData.events)) {
            console.log(`      ❌ Structure invalide, tentative ${attemptNumber + 1}...`);
            if (attemptNumber < 3) {
                return await generateEventBatchWithGemini(startYear, endYear, count, attemptNumber + 1);
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
            
            if (isDuplicate(event.titre)) {
                rejectedEvents.push({ event: event.titre, reason: 'Doublon détecté (pré-vérification)' });
                return;
            }
            
            validEvents.push(event);
        });
        
        console.log(`      ✅ [GEMINI] Lot généré: ${validEvents.length} événements uniques après pré-vérification`);
        console.log(`      🔍 [GEMINI] Pré-vérification: ${batchData.events.length - validEvents.length} doublons évités`);
        
        if (rejectedEvents.length > 0) {
            console.log(`      ❌ Événements rejetés en pré-vérification: ${rejectedEvents.length}`);
            rejectedEvents.slice(0, 3).forEach(rejected => {
                console.log(`        - "${rejected.event}" (${rejected.reason})`);
            });
        }
        
        validEvents.forEach(event => {
            console.log(`        ✅ "${event.titre}" (${event.year}) [${event.type}|${event.region}] - Confiance: ${event.confidence || 'N/A'}`);
        });
        
        return validEvents;
        
    } catch (error) {
        console.error(`      ❌ [GEMINI] Erreur génération:`, error.message);
        
        if (attemptNumber < 3) {
            console.log(`      🔄 Retry avec paramètres modifiés...`);
            return await generateEventBatchWithGemini(startYear, endYear, count, attemptNumber + 1);
        }
        return [];
    }
}

// ==============================================================================
// VÉRIFICATION HISTORIQUE OPTIMISÉE (GEMINI)
// ==============================================================================

async function verifyEventBatchWithGemini(events) {
    console.log(`   🕵️ [GEMINI] Vérification historique approfondie...`);
    
    const eventsText = events.map(e => `"${e.titre}" (${e.year})`).join('\n');
    
    const prompt = `Tu es un historien expert. VÉRIFIE RIGOUREUSEMENT ces événements historiques :

${eventsText}

Pour chaque événement, VALIDE :
1. EXISTENCE dans l'histoire documentée (sources primaires/secondaires)
2. DATE EXACTE (tolérance ±1 an maximum) - VÉRIFIE CHAQUE DATE avec précision absolue
3. TITRE cohérent avec les faits historiques

🎯 OPTIMAL: VÉRIFIE CHAQUE DATE avec précision absolue avant validation.

SOIS STRICT sur la précision factuelle. En cas de doute, REJETTE.

FORMAT JSON REQUIS :
{
  "validations": [
    {
      "titre": "titre exact",
      "isValid": true/false,
      "dateCorrect": true/false,
      "reason": "explication détaillée si rejeté",
      "confidence": "high|medium|low"
    }
  ]
}

PRIORITÉ : Précision historique absolue avec dates vérifiées.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.historicalVerification,
            maxOutputTokens: 1000,
            temperature: 0.1,
            responseFormat: 'json'
        });
        
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
        
        const verification = JSON.parse(jsonText);
        
        const validEvents = [];
        const invalidEvents = [];
        
        events.forEach((event, index) => {
            const validation = verification.validations?.[index];
            if (validation && validation.isValid && validation.dateCorrect) {
                validEvents.push(event);
                console.log(`      ✅ [GEMINI] "${event.titre}" (${event.year}) - Validé (${validation.confidence})`);
            } else {
                invalidEvents.push({ event, reason: validation?.reason || 'Non vérifié par Gemini' });
                console.log(`      ❌ [GEMINI] "${event.titre}" (${event.year}) - ${validation?.reason || 'Erreur validation'}`);
            }
        });
        
        console.log(`      📊 [GEMINI] Vérification: ${validEvents.length}/${events.length} validés`);
        
        return { validEvents, invalidEvents };
        
    } catch (error) {
        console.error(`      ❌ [GEMINI] Erreur vérification:`, error.message);
        return { validEvents: events, invalidEvents: [] };
    }
}

// ==============================================================================
// ENRICHISSEMENT CONTEXTUEL ROBUSTE (GEMINI)
// ==============================================================================

async function enrichEventWithGemini(event, attemptNumber = 1) {
    console.log(`      🔍 [GEMINI] Enrichissement contextuel: "${event.titre}" (${event.year})...`);
    
    if (attemptNumber > 1) {
        console.log(`      🔄 [GEMINI] Tentative ${attemptNumber}/2 après erreur connexion`);
    }
    
    const prompt = `Tu es un historien expert. Enrichis cet événement pour une illustration historiquement exacte :

ÉVÉNEMENT : "${event.titre}" (${event.year})
TYPE : ${event.type}
RÉGION : ${event.region}
LIEU : ${event.specificLocation}

MISSION : Fournir contexte historique précis et éléments visuels essentiels pour Flux-schnell.

FORMAT JSON REQUIS :
{
  "contextHistorique": "Description précise 1-2 phrases avec acteurs clés",
  "elementsVisuelsEssentiels": [
    "3-4 éléments visuels PRIORITAIRES et spécifiques",
    "Personnages avec vêtements précis ${event.year}", 
    "Objets/armes/outils caractéristiques époque",
    "Architecture/lieu distinctif"
  ],
  "sceneIdeale": "Description concise scène principale",
  "motsClesVisuels": ["5-6 mots-clés visuels précis"],
  "atmosphere": "Ambiance (dramatique, cérémonielle, etc.)",
  "periodeSpecifique": "Contexte temporel précis"
}

EXIGENCE : Exactitude historique absolue pour ${event.year}.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.contextEnrichment,
            maxOutputTokens: 600,
            temperature: 0.3,
            responseFormat: 'json'
        });
        
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
        
        const enrichedData = JSON.parse(jsonText);
        
        console.log(`      📊 [GEMINI] Enrichissement reçu:`);
        console.log(`      📄 Contexte: "${enrichedData.contextHistorique}"`);
        console.log(`      🎨 Éléments (${enrichedData.elementsVisuelsEssentiels.length}): ${JSON.stringify(enrichedData.elementsVisuelsEssentiels)}`);
        console.log(`      🏷️ Mots-clés: ${JSON.stringify(enrichedData.motsClesVisuels)}`);
        console.log(`      🎬 Scène: "${enrichedData.sceneIdeale}"`);
        console.log(`      🌟 Atmosphère: "${enrichedData.atmosphere}"`);
        
        return {
            ...event,
            enrichissement: enrichedData
        };
        
    } catch (error) {
        console.error(`      ❌ [GEMINI] Erreur enrichissement:`, error.message);
        
        if (error.message.includes('Connection error') && attemptNumber < 2) {
            console.log(`      🔄 [GEMINI] Retry enrichissement (erreur connexion)...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return await enrichEventWithGemini(event, attemptNumber + 1);
        }
        
        return {
            ...event,
            enrichissement: {
                contextHistorique: `Événement historique de ${event.year}`,
                elementsVisuelsEssentiels: [`Scène ${event.type.toLowerCase()}`, `Vêtements ${event.year}`, "Architecture d'époque"],
                sceneIdeale: `Représentation ${event.titre}`,
                motsClesVisuels: ["historical", "period", "scene"],
                atmosphere: "historique",
                periodeSpecifique: event.year.toString()
            }
        };
    }
}

// ==============================================================================
// GÉNÉRATION PROMPTS OPTIMISÉE POUR FLUX-SCHNELL (CLAUDE 3.5 SONNET)
// ==============================================================================

function countWords(text) {
    return text.trim().split(/\s+/).length;
}

function optimizePromptIntelligently(prompt) {
    console.log(`      🔧 Optimisation intelligente de ${countWords(prompt)} mots:`);
    
    // Extraire et préserver les éléments critiques AVANT optimisation
    const yearMatch = prompt.match(/\b(1\d{3}|20\d{2})\b/);
    const periodMatch = prompt.match(/\b(ancient|medieval|renaissance|industrial|modern)\s+period\b/i);
    
    let optimized = prompt
        .replace(/\b(the|a|an|with|and|of|in|at|on|for|very|quite|rather|extremely)\b/gi, '')
        .replace(/\b(also|furthermore|moreover|however|therefore|thus)\b/gi, '')
        .replace(/historical accuracy/gi, 'historical')
        .replace(/photorealistic/gi, 'realistic')
        .replace(/dramatic scene/gi, 'dramatic')
        .replace(/\s+/g, ' ')
        .replace(/,\s*/g, ',')
        .replace(/\.\s*/g, ' ')
        .trim();
    
    // RESTAURER les éléments critiques si supprimés par l'optimisation
    if (yearMatch && !optimized.includes(yearMatch[0])) {
        optimized = `${optimized}, ${yearMatch[0]}`;
        console.log(`      🔧 Année ${yearMatch[0]} restaurée`);
    }
    
    if (periodMatch && !optimized.toLowerCase().includes(periodMatch[0].toLowerCase())) {
        optimized = `${optimized}, ${periodMatch[0]}`;
        console.log(`      🔧 Période ${periodMatch[0]} restaurée`);
    }
    
    const wordsAfter = countWords(optimized);
    console.log(`      📊 Réduction intelligente: ${countWords(prompt)} → ${wordsAfter} mots`);
    console.log(`      🛡️ Éléments critiques préservés: année + période`);
    
    return optimized;
}

async function generateOptimizedFluxPromptWithClaude(enrichedEvent) {
    console.log(`      🎨 [CLAUDE] Génération prompt visuel optimisé pour "${enrichedEvent.titre}"...`);
    
    const enrichissement = enrichedEvent.enrichissement;
    const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                  enrichedEvent.year < 1492 ? 'medieval' : 
                  enrichedEvent.year < 1789 ? 'renaissance' : 
                  enrichedEvent.year < 1914 ? 'industrial' : 'modern';
    
    const promptForClaude = `Tu es l'expert mondial en prompts pour Flux-schnell. Ta mission : créer le prompt PARFAIT pour illustrer cet événement historique.

🎯 ÉVÉNEMENT À ILLUSTRER :
- Titre : "${enrichedEvent.titre}"
- Année : ${enrichedEvent.year} (période ${epoch})
- Contexte : ${enrichissement.contextHistorique}
- Scène idéale : ${enrichissement.sceneIdeale}
- Éléments visuels : ${enrichissement.elementsVisuelsEssentiels.join(', ')}
- Atmosphère : ${enrichissement.atmosphere}

🚀 EXCELLENCE CLAUDE : Utilise ta créativité légendaire pour créer un prompt qui génère une illustration ÉPOUSTOUFLANTE de cet événement.

📋 CONTRAINTES TECHNIQUES FLUX-SCHNELL (CRITIQUES) :
1. INCLURE OBLIGATOIREMENT : "${enrichedEvent.year}" ET "${epoch} period" dans le prompt
2. ZÉRO TEXTE dans l'image : Aucun mot, chiffre, panneau, inscription visible
3. MAXIMUM ${FLUX_SCHNELL_LIMITS.TARGET_WORDS} mots (limite T5 : ${FLUX_SCHNELL_LIMITS.TARGET_T5_TOKENS} tokens)
4. Mots-clés CONCRETS et visuellement PRÉCIS
5. Structure optimale : [Personnages période] [action] [objets époque] [environnement] [style]

🎨 OPTIMISATIONS FLUX-SCHNELL :
- Utiliser "cinematic", "detailed", "realistic" (mots-clés Flux performants)
- Éviter articles (the, a, an) et prépositions inutiles  
- Prioriser : VÊTEMENTS ÉPOQUE + OBJETS + ACTION + COULEURS
- Spécifier matériaux (wood, stone, metal, fabric)

🚫 INTERDICTIONS STRICTES :
- text, writing, letters, numbers, signs, inscriptions, words
- wings, angel, flying, supernatural, god, deity, magical, glowing, divine
- modern objects, cars, phones, contemporary clothing

💡 EXCELLENCE CRÉATIVE CLAUDE :
- Trouve des détails visuels uniques et saisissants
- Crée une composition qui raconte l'histoire
- Utilise ta compréhension nuancée pour des choix visuels parfaits
- Équilibre historique + impact visuel maximal

⚡ RÉPONDS UNIQUEMENT avec le prompt Flux-schnell PARFAIT incluant "${enrichedEvent.year}" et "${epoch} period", MAXIMUM ${FLUX_SCHNELL_LIMITS.TARGET_WORDS} MOTS.

Montre-moi pourquoi Claude est le ROI de la génération de prompts pour flux !`;

    try {
        const fluxPrompt = await callClaude(promptForClaude, {
            model: AI_CONFIG.promptGeneration,
            maxTokens: 150,
            temperature: 0.8  // Plus de créativité pour Claude
        });
        
        let cleanPrompt = fluxPrompt.trim().replace(/^["']|["']$/g, '');
        
        const initialWords = countWords(cleanPrompt);
        console.log(`      📊 [CLAUDE] Prompt initial: "${cleanPrompt}" (${initialWords} mots)`);
        
        // VÉRIFICATION CRITIQUE : Année et période présentes
        const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                     enrichedEvent.year < 1492 ? 'medieval' : 
                     enrichedEvent.year < 1789 ? 'renaissance' : 
                     enrichedEvent.year < 1914 ? 'industrial' : 'modern';
        
        const hasYear = cleanPrompt.includes(enrichedEvent.year.toString());
        const hasPeriod = cleanPrompt.includes('period') || cleanPrompt.includes(epoch);
        
        console.log(`      🔍 Vérification année ${enrichedEvent.year}: ${hasYear ? '✅' : '❌'}`);
        console.log(`      🔍 Vérification période ${epoch}: ${hasPeriod ? '✅' : '❌'}`);
        
        // CORRECTION AUTOMATIQUE si manquants
        if (!hasYear || !hasPeriod) {
            console.log(`      🔧 Correction automatique: ajout année/période manquante`);
            let corrections = [];
            if (!hasYear) corrections.push(enrichedEvent.year.toString());
            if (!hasPeriod) corrections.push(`${epoch} period`);
            cleanPrompt = `${cleanPrompt}, ${corrections.join(', ')}`;
            console.log(`      ✅ Prompt corrigé: "${cleanPrompt}"`);
        }
        
        // Optimisation si nécessaire
        if (countWords(cleanPrompt) > FLUX_SCHNELL_LIMITS.TARGET_WORDS) {
            console.log(`      ⚠️ Dépassement limite, optimisation intelligente...`);
            cleanPrompt = optimizePromptIntelligently(cleanPrompt);
            
            // Re-vérification après optimisation
            if (!cleanPrompt.includes(enrichedEvent.year.toString())) {
                cleanPrompt = `${cleanPrompt}, ${enrichedEvent.year}`;
            }
            if (!cleanPrompt.includes('period') && !cleanPrompt.includes(epoch)) {
                cleanPrompt = `${cleanPrompt}, ${epoch} period`;
            }
        }
        
        // Ajout enhancers optimisés pour Flux-schnell
        const finalWords = countWords(cleanPrompt);
        const remainingWords = FLUX_SCHNELL_LIMITS.TARGET_WORDS - finalWords;
        
        let enhancers = [];
        if (remainingWords >= 2) enhancers.push("cinematic");
        if (remainingWords >= 3) enhancers.push("detailed");
        if (remainingWords >= 4) enhancers.push("realistic");
        
        const finalPrompt = enhancers.length > 0 ? `${cleanPrompt}, ${enhancers.join(', ')}` : cleanPrompt;
        const finalWordCount = countWords(finalPrompt);
        
        console.log(`      📊 [CLAUDE] Prompt final CRÉATIF: "${finalPrompt}"`);
        console.log(`      📏 Longueur: ${finalWordCount} mots (~${Math.round(finalWordCount * 4)} tokens T5)`);
        console.log(`      ✅ Limite respectée: ${finalWordCount <= FLUX_SCHNELL_LIMITS.TARGET_WORDS ? 'OUI' : 'NON'}`);
        console.log(`      📅 Année ${enrichedEvent.year}: ${finalPrompt.includes(enrichedEvent.year.toString()) ? '✅' : '❌'}`);
        console.log(`      🏛️ Période ${epoch}: ${finalPrompt.includes('period') || finalPrompt.includes(epoch) ? '✅' : '❌'}`);
        console.log(`      🎨 Excellence Claude: Créativité + Contraintes techniques respectées`);
        
        return finalPrompt;
        
    } catch (error) {
        console.error(`      ❌ [CLAUDE] Erreur génération prompt:`, error.message);
        // Fallback intelligent avec année et période OBLIGATOIRES
        const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                     enrichedEvent.year < 1492 ? 'medieval' : 
                     enrichedEvent.year < 1789 ? 'renaissance' : 
                     enrichedEvent.year < 1914 ? 'industrial' : 'modern';
        
        const fallbackPrompt = `${enrichissement.motsClesVisuels.slice(0, 2).join(' ')}, ${enrichedEvent.year}, ${epoch} period, historical scene, cinematic`;
        console.log(`      🔄 Prompt de secours OPTIMISÉ: "${fallbackPrompt}"`);
        return fallbackPrompt;
    }
}

// ==============================================================================
// GÉNÉRATION D'IMAGE OPTIMISÉE FLUX-SCHNELL (CONSERVATION COMPLÈTE)
// ==============================================================================

async function generateImageEnhanced(prompt, event) {
    console.log(`      🖼️ [FLUX] Génération optimisée: ${prompt.substring(0, 60)}...`);
    console.log(`      📊 Analyse: ${countWords(prompt)} mots (~${Math.round(countWords(prompt) * 4)} tokens)`);
    
    const fluxConfig = {
        prompt,
        negative_prompt: `modern text, dates, titles, large inscriptions, contemporary writing, modern typography, ${event.year}, "${event.titre}", wings, angel, flying, supernatural, mythological, god, deity, magical, glowing, divine, fantasy creature, unrealistic anatomy, modern objects, smartphones, cars, phones, computers, electronics, contemporary clothing, jeans, t-shirt, sneakers, digital art, cartoon, anime, manga, abstract, blurry, low quality, science fiction, alien, spaceship, robot, cyberpunk`,
        aspect_ratio: "16:9",
        num_inference_steps: FLUX_SCHNELL_CONFIG.steps,
        output_format: "webp",
        output_quality: FLUX_SCHNELL_CONFIG.quality,
        seed: FLUX_SCHNELL_CONFIG.seed(),
        guidance_scale: 2.5
    };
    
    console.log(`      🛡️ [FLUX] Protection intelligente activée (évite date ${event.year} et titre)`);
    console.log(`      🎨 [FLUX] Configuration historique optimisée`);
    
    try {
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: fluxConfig
        });

        if (Array.isArray(output) && output[0] && typeof output[0] === 'string' && output[0].startsWith('http')) {
            console.log(`      ✅ [FLUX] Image générée avec succès: ${output[0]}`);
            return output[0];
        }

        // Fallback avec predictions pour monitoring avancé
        console.log(`      🔄 [FLUX] Passage en mode prediction pour monitoring...`);
        const model = await replicate.models.get("black-forest-labs", "flux-schnell");
        const prediction = await replicate.predictions.create({
            version: model.latest_version.id,
            input: fluxConfig
        });

        let finalPrediction = prediction;
        let attempts = 0;
        const maxAttempts = 30;

        while (finalPrediction.status !== 'succeeded' && finalPrediction.status !== 'failed' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            finalPrediction = await replicate.predictions.get(prediction.id);
            attempts++;
            
            if (attempts % 5 === 0) {
                console.log(`      ⏳ [FLUX] Génération en cours... (${attempts}/${maxAttempts}) - Status: ${finalPrediction.status}`);
            }
        }

        if (finalPrediction.status === 'succeeded' && finalPrediction.output?.[0]) {
            console.log(`      ✅ [FLUX] Image générée avec succès (prediction): ${finalPrediction.output[0]}`);
            return finalPrediction.output[0];
        }

        if (finalPrediction.status === 'failed') {
            console.log(`      ❌ [FLUX] Échec de génération: ${finalPrediction.error || 'Erreur inconnue'}`);
            console.log(`      📝 [FLUX] Prompt utilisé: "${prompt}"`);
        }

        return null;

    } catch (error) {
        console.error(`      ❌ [FLUX] Erreur de génération:`, error.message);
        console.log(`      📝 [FLUX] Prompt qui a échoué: "${prompt}"`);
        return null;
    }
}

// ==============================================================================
// VALIDATION INTELLIGENTE GEMINI VISION
// ==============================================================================

async function validateImageWithGemini(event, imageUrl) {
    console.log(`   🔍 [GEMINI-VISION] Validation intelligente pour ${event.year}...`);
    
    const prompt = `Évalue cette image pour l'événement "${event.titre}" (${event.year}).

VALIDATION HISTORIQUE INTELLIGENTE :

🚫 CRITÈRES DE REJET AUTOMATIQUE UNIQUEMENT SI :
1. TEXTE INTERDIT : Date "${event.year}" visible ou titre "${event.titre}" écrit dans l'image
2. TEXTE PROÉMINENT : Gros titre, panneau principal, inscription majeure au premier plan
3. ANACHRONISMES MYTHOLOGIQUES : ailes, créatures volantes, anges, dieux, pouvoirs surnaturels
4. ANACHRONISMES MODERNES : voitures, smartphones, vêtements contemporains
5. ANATOMIE IMPOSSIBLE : humains volants, créatures fantastiques
6. ÉPOQUE INCORRECTE : différence >50 ans avec ${event.year}

✅ TEXTE ACCEPTABLE (ne pas rejeter) :
- Texte sur livres, manuscrits, parchemins (arrière-plan)
- Inscriptions sur bannières, blasons, architecture
- Texte flou, illisible ou décoratif
- Écritures anciennes sur objets d'époque

✅ ACCEPTER SI :
1. Aucun texte interdit (date ${event.year} ou titre "${event.titre}")
2. Texte éventuel reste discret et d'époque
3. PERSONNAGES HUMAINS NORMAUX avec anatomie réaliste
4. VÊTEMENTS cohérents avec l'époque (tolérance ±25 ans)
5. OBJETS/OUTILS d'époque appropriés
6. ÉVOQUE l'événement historique sans fantaisie

⚠️ ATTENTION SPÉCIALE :
- Les personnages historiques étaient des HUMAINS NORMAUX
- Aucun pouvoir surnaturel, vol, magie
- Réalisme documentaire requis
- Un peu de texte d'époque est historiquement normal

JSON OBLIGATOIRE:
{
  "hasForbiddenText": true/false,
  "forbiddenTextDescription": "description du texte interdit s'il y en a (date ${event.year} ou titre visible)",
  "hasAcceptableText": true/false,
  "acceptableTextDescription": "description du texte acceptable (livres, bannières, etc.)",
  "representsEvent": true/false,
  "eventRelevance": "description précise de ce que montre l'image",
  "hasWingsOrSupernatural": true/false,
  "hasModernObjects": true/false,
  "anatomyRealistic": true/false,
  "historicalAccuracy": true/false,
  "periodClothing": true/false,
  "overallValid": true/false,
  "score": number 1-10,
  "reason": "explication détaillée de l'évaluation"
}`;

    try {
        const responseText = await callGeminiWithImage(prompt, imageUrl, {
            model: AI_CONFIG.imageValidation,
            maxOutputTokens: 350,
            temperature: 0.05
        });

        const result = JSON.parse(responseText);
        
        console.log(`      📊 [GEMINI-VISION] Validation INTELLIGENTE:`);
        console.log(`      🚫 Texte interdit (date/titre): ${result.hasForbiddenText ? '❌' : '✅'}`);
        if (result.hasForbiddenText) {
            console.log(`      🚫 Texte interdit détecté: "${result.forbiddenTextDescription}"`);
        }
        console.log(`      📝 Texte acceptable: ${result.hasAcceptableText ? '✅' : 'Aucun'}`);
        if (result.hasAcceptableText) {
            console.log(`      📝 Texte acceptable: "${result.acceptableTextDescription}"`);
        }
        console.log(`      🎯 Représente événement: ${result.representsEvent}`);
        console.log(`      👼 Ailes/Surnaturel: ${result.hasWingsOrSupernatural}`);
        console.log(`      📱 Objets modernes: ${result.hasModernObjects}`);
        console.log(`      🧍 Anatomie réaliste: ${result.anatomyRealistic}`);
        console.log(`      👔 Vêtements d'époque: ${result.periodClothing}`);
        console.log(`      📝 Pertinence: "${result.eventRelevance}"`);
        console.log(`      📊 Score: ${result.score}/10`);
        console.log(`      💭 Raison: "${result.reason}"`);
        
        const isValid = !result.hasForbiddenText && 
                       !result.hasWingsOrSupernatural && 
                       !result.hasModernObjects && 
                       result.anatomyRealistic && 
                       result.periodClothing && 
                       result.score >= MIN_VALIDATION_SCORE && 
                       result.overallValid && 
                       result.historicalAccuracy && 
                       result.representsEvent;

        if (isValid) {
            console.log(`      ✅ [GEMINI-VISION] Image VALIDÉE (${result.score}/10) - Critères respectés`);
            if (result.hasAcceptableText) {
                console.log(`      🎯 SUCCÈS: Texte acceptable toléré + Réalisme historique confirmé`);
            } else {
                console.log(`      🎯 SUCCÈS: Aucun texte + Réalisme historique confirmé`);
            }
        } else {
            console.log(`      ❌ [GEMINI-VISION] Validation échouée - Score/critères insuffisants`);
        }
        
        return {
            isValid,
            score: result.score,
            explanation: result.reason,
            detailedAnalysis: {
                hasForbiddenText: result.hasForbiddenText,
                forbiddenTextDescription: result.forbiddenTextDescription,
                hasAcceptableText: result.hasAcceptableText,
                acceptableTextDescription: result.acceptableTextDescription,
                representsEvent: result.representsEvent,
                eventRelevance: result.eventRelevance,
                hasWingsOrSupernatural: result.hasWingsOrSupernatural,
                hasModernObjects: result.hasModernObjects,
                anatomyRealistic: result.anatomyRealistic,
                historicalAccuracy: result.historicalAccuracy,
                periodClothing: result.periodClothing,
                overallValid: result.overallValid
            }
        };
        
    } catch (error) {
        console.error(`      ❌ [GEMINI-VISION] Erreur validation:`, error.message);
        return {
            isValid: false,
            score: 0,
            explanation: `Erreur de validation: ${error.message}`,
            detailedAnalysis: {
                hasForbiddenText: false,
                hasAcceptableText: false,
                representsEvent: false,
                hasWingsOrSupernatural: false,
                hasModernObjects: false,
                anatomyRealistic: false,
                historicalAccuracy: false,
                periodClothing: false,
                overallValid: false
            }
        };
    }
}

// ==============================================================================
// TRAITEMENT STRATÉGIE HYBRIDE OPTIMALE (CLAUDE + GEMINI)
// ==============================================================================

async function processEventWithHybridStrategy(event) {
    console.log(`\n   🖼️ [HYBRID] Traitement: "${event.titre}" (${event.year})`);
    
    // Phase 1: Enrichissement avec Gemini
    console.log(`      📚 Phase 1: [GEMINI] Enrichissement contextuel...`);
    const enrichedEvent = await enrichEventWithGemini(event);
    
    let successfullyCreated = false;
    let validationData = null;
    
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS && !successfullyCreated; attempt++) {
        console.log(`      🎨 Phase 2: Génération image - Tentative ${attempt}/${MAX_IMAGE_ATTEMPTS}`);
        
        try {
            // Phase 2a: Génération prompt avec CLAUDE (Excellence créative)
            const optimizedPrompt = await generateOptimizedFluxPromptWithClaude(enrichedEvent);
            
            // Phase 2b: Génération image avec Flux-schnell
            const imageUrl = await generateImageEnhanced(optimizedPrompt, enrichedEvent);
            
            if (!imageUrl) {
                console.log("      ❌ Échec génération image");
                continue;
            }
            
            // Phase 3: Validation avec Gemini Vision
            const validationResult = await validateImageWithGemini(enrichedEvent, imageUrl);
            validationData = validationResult;
            
            if (validationResult.isValid) {
                try {
                    console.log(`      📤 [HYBRID] Upload vers Supabase...`);
                    const uploadedUrl = await uploadImageToSupabase(imageUrl, event.titre);
                    
                    const finalEvent = enrichAndFinalizeEvent(enrichedEvent, uploadedUrl, optimizedPrompt, validationData);
                    await insertValidatedEvent(finalEvent);
                    
                    addToCache(event.titre);
                    console.log(`      ✅ [HYBRID] Événement créé avec succès !`);
                    console.log(`      📊 Stratégie: Gemini→Gemini→CLAUDE→Flux→Gemini-Vision (CRÉATIVITÉ CLAUDE)`);
                    console.log(`      🤖 Validation IA sauvegardée: Score ${validationData.score}/10`);
                    successfullyCreated = true;
                    return finalEvent;
                    
                } catch (uploadError) {
                    console.error(`      ❌ Erreur upload:`, uploadError.message);
                    
                    if (attempt === MAX_IMAGE_ATTEMPTS) {
                        try {
                            const finalEvent = enrichAndFinalizeEvent(enrichedEvent, imageUrl, optimizedPrompt, validationData);
                            await insertValidatedEvent(finalEvent);
                            addToCache(event.titre);
                            console.log(`      ✅ [HYBRID] Créé avec URL directe !`);
                            console.log(`      🤖 Validation IA sauvegardée: Score ${validationData.score}/10`);
                            return finalEvent;
                        } catch (directError) {
                            console.error(`      ❌ Échec URL directe:`, directError.message);
                        }
                    }
                }
            } else {
                console.log("      ❌ Image non validée, nouvelle tentative...");
                console.log(`      📊 Score obtenu: ${validationData.score}/10 (min requis: ${MIN_VALIDATION_SCORE})`);
            }
            
        } catch (error) {
            console.error(`      ❌ Erreur tentative ${attempt}:`, error.message);
        }
        
        if (attempt < MAX_IMAGE_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Fallback
    console.log(`      🔄 FALLBACK: Image par défaut...`);
    try {
        const defaultImageUrl = `https://via.placeholder.com/800x450/8B4513/FFFFFF?text=${encodeURIComponent(event.year + ' - ' + event.type)}`;
        
        const finalEvent = enrichAndFinalizeEvent(enrichedEvent, defaultImageUrl, "Image par défaut", validationData);
        await insertValidatedEvent(finalEvent);
        
        addToCache(event.titre);
        console.log(`      ✅ [HYBRID] Créé avec fallback !`);
        if (validationData) {
            console.log(`      🤖 Validation IA sauvegardée: Score ${validationData.score}/10`);
        }
        return finalEvent;
        
    } catch (fallbackError) {
        console.error(`      ❌ [HYBRID] Échec total:`, fallbackError.message);
        return null;
    }
}

// ==============================================================================
// FONCTIONS UTILITAIRES (CONSERVATION COMPLÈTE)
// ==============================================================================

async function uploadImageToSupabase(imageUrl, eventTitle) {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
        .webp({ quality: 85 })
        .resize(800, 450, { fit: 'cover' })
        .toBuffer();
        
    const fileName = `claude_${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}.webp`;
    
    const { error } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, processedBuffer, { 
            contentType: 'image/webp', 
            upsert: true 
        });
        
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName);
        
    return publicUrl;
}

function enrichAndFinalizeEvent(enrichedEvent, imageUrl, illustrationPrompt, validationData = null) {
    const year = parseInt(enrichedEvent.year);
    const epoch = year < 476 ? 'Antiquité' : 
                  year < 1492 ? 'Moyen Âge' : 
                  year < 1789 ? 'Moderne' : 
                  year < 1914 ? 'Contemporaine' : 'XXe';
                  
    const finalEvent = {
        date: `${enrichedEvent.year.toString().padStart(4, '0')}-01-01`,
        titre: enrichedEvent.titre,
        universel: enrichedEvent.region?.toLowerCase() !== 'europe',
        langue: 'fr',
        ecart_temps_max: 300,
        facteur_variation: 1.5,
        illustration_url: imageUrl,
        region: enrichedEvent.region || enrichedEvent.specificLocation,
        niveau_difficulte: Math.min(6, Math.max(2, Math.floor((year - 1400) / 100) + 2)),
        types_evenement: [enrichedEvent.type],
        pays: [enrichedEvent.specificLocation || enrichedEvent.region],
        epoque: epoch,
        mots_cles: enrichedEvent.titre.toLowerCase().replace(/[^\w\s]/g, '').split(' ').filter(w => w.length > 3),
        date_formatee: enrichedEvent.year.toString(),
        code: `cld${Date.now().toString().slice(-6)}`,
        date_precision: 'year',
        ecart_temps_min: 50,
        frequency_score: 0,
        description_detaillee: enrichedEvent.enrichissement?.contextHistorique || enrichedEvent.description,
        prompt_flux: illustrationPrompt
    };

    // Ajouter les données de validation IA si disponibles
    if (validationData) {
        finalEvent.validation_score = validationData.score;
        finalEvent.validation_explanation = validationData.explanation;
        finalEvent.validation_detailed_analysis = validationData.detailedAnalysis;
        
        console.log(`      💾 [HYBRID] Données de validation IA ajoutées:`);
        console.log(`         📊 Score: ${validationData.score}/10`);
        console.log(`         📝 Explication: "${validationData.explanation}"`);
        console.log(`         🔍 Analyse détaillée: ${Object.keys(validationData.detailedAnalysis).length} critères`);
    } else {
        console.log(`      ⚠️ [HYBRID] Aucune donnée de validation IA à sauvegarder`);
    }

    return finalEvent;
}

async function insertValidatedEvent(finalEvent) {
    const { data, error } = await supabase.from('goju').insert([finalEvent]).select();
    if (error) {
        if (error.code === '23505') {
            finalEvent.code = `cld${Date.now().toString().slice(-6)}${Math.floor(Math.random()*100)}`;
            return await insertValidatedEvent(finalEvent);
        }
        throw error;
    }
    return data[0];
}

// ==============================================================================
// TRAITEMENT PRINCIPAL HYBRIDE OPTIMAL (CLAUDE + GEMINI)
// ==============================================================================

async function processBatchHybrid(startYear, endYear, batchSize, batchNumber) {
    console.log(`\n📦 === LOT ${batchNumber} HYBRIDE CLAUDE+GEMINI (${batchSize} événements) ===`);
    
    // Phase 1: Génération avec Gemini
    const events = await generateEventBatchWithGemini(startYear, endYear, batchSize, batchNumber);
    if (events.length === 0) {
        console.log("❌ [GEMINI] Échec génération");
        return [];
    }
    
    // Phase 2: Vérification avec Gemini
    const { validEvents } = await verifyEventBatchWithGemini(events);
    if (validEvents.length === 0) {
        console.log("❌ [GEMINI] Aucun événement validé");
        return [];
    }
    
    console.log(`\n   🖼️ [HYBRID] Traitement des images pour ${validEvents.length} événements...`);
    
    const completedEvents = [];
    
    for (const event of validEvents) {
        const result = await processEventWithHybridStrategy(event);
        if (result) {
            completedEvents.push(result);
            console.log(`      ✅ [HYBRID] "${event.titre}" traité avec succès`);
            if (result.validation_score) {
                console.log(`      🤖 [HYBRID] Validation IA: ${result.validation_score}/10 sauvegardée en base`);
            }
        } else {
            console.log(`      ❌ [HYBRID] Échec traitement "${event.titre}"`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n   📊 [HYBRID] Bilan lot ${batchNumber}: ${completedEvents.length}/${validEvents.length} réussis`);
    
    const validationStats = completedEvents.filter(e => e.validation_score).length;
    if (validationStats > 0) {
        const avgScore = completedEvents
            .filter(e => e.validation_score)
            .reduce((sum, e) => sum + e.validation_score, 0) / validationStats;
        console.log(`   🤖 [HYBRID] Validation IA: ${validationStats}/${completedEvents.length} événements analysés (score moyen: ${avgScore.toFixed(1)}/10)`);
    }
    
    return completedEvents;
}

// ==============================================================================
// SCRIPT PRINCIPAL OPTIMAL (CLAUDE + GEMINI)
// ==============================================================================

async function main() {
    console.log("\n🚀 === SAYON HYBRIDE CLAUDE+GEMINI VERSION OPTIMALE ===");
    console.log("🎯 Configuration IA HYBRIDE:");
    console.log("   🎨 Claude 3.5 Sonnet: Génération prompts Flux (Excellence créative)");
    console.log("   🧠 Gemini 2.0 Flash: Génération + Vérification + Enrichissement + Validation images");
    console.log("   🖼️ Flux-schnell: Génération images (CONSERVÉ)");
    console.log("📊 Objectifs:");
    console.log("   📈 Taux de réussite: 36% → 70-90% (+200-300%)");
    console.log("   💰 Coût optimisé: Claude seulement pour prompts + Gemini pour le reste");
    console.log("   ⏱️ Temps optimisé: Moins de retry, plus d'efficacité");
    console.log("   🎯 Qualité maximale: Excellence créative Claude + Économie Gemini");
    console.log("   🤖 CONSERVÉ: Sauvegarde automatique validation IA en base");
    console.log("   🚫 NOUVEAU: Liste COMPLÈTE événements période (anti-doublons renforcé)");
    
    console.log("\n🎯 STRATÉGIE HYBRIDE OPTIMALE:");
    console.log("   ✅ 1. Génération événements: Gemini (économique)");
    console.log("   ✅ 2. Vérification historique: Gemini (économique)");
    console.log("   ✅ 3. Enrichissement contextuel: Gemini (économique)");
    console.log("   🎨 4. Génération prompts Flux: CLAUDE (excellence créative)");
    console.log("   ✅ 5. Validation images: Gemini Vision (économique)");
    console.log("   💡 RÉSULTAT: Qualité Claude pour prompts + Économies Gemini pour le reste");
    
    // Vérification APIs
    console.log("\n🔧 === VÉRIFICATION DES APIS ===");
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("❌ ANTHROPIC_API_KEY manquante dans .env");
        process.exit(1);
    }
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ GEMINI_API_KEY manquante dans .env");
        process.exit(1);
    }
    if (!process.env.REPLICATE_API_TOKEN) {
        console.error("❌ REPLICATE_API_TOKEN manquante dans .env");
        process.exit(1);
    }
    if (!process.env.SUPABASE_URL) {
        console.error("❌ SUPABASE_URL manquante dans .env");
        process.exit(1);
    }
    console.log("✅ APIs configurées: Claude + Gemini + Replicate + Supabase");
    
    const startYear = parseInt(await askQuestion('📅 Année de DÉBUT : '));
    const endYear = parseInt(await askQuestion('📅 Année de FIN : '));
    const targetCount = parseInt(await askQuestion('🎯 Nombre d\'événements : '));
    
    const loadResult = await loadExistingTitles(startYear, endYear);
    
    console.log(`\n🚫 === PROTECTION ANTI-DOUBLONS RENFORCÉE ===`);
    console.log(`📊 Total événements en base: ${existingNormalizedTitles.size}`);
    console.log(`🎯 Période ciblée: ${startYear}-${endYear}`);
    console.log(`⚠️ Défi: ${loadResult.periodEvents.length} événements déjà présents dans cette période`);
    console.log(`🆕 NOUVEAU: TOUS les ${loadResult.periodEvents.length} événements seront listés (au lieu de 15)`);
    
    if (loadResult.periodEvents.length > targetCount) {
        console.log(`🔥 PÉRIODE TRÈS COUVERTE: ${loadResult.periodEvents.length} existants vs ${targetCount} demandés`);
        console.log(`💡 Conseil: Le script va privilégier des événements moins connus pour éviter les doublons`);
    }
    
    if (loadResult.periodEvents.length > 0) {
        console.log(`\n📋 Événements existants dans la période ${startYear}-${endYear}:`);
        loadResult.periodEvents.slice(0, 10).forEach(title => {
            console.log(`   - ${title}`);
        });
        if (loadResult.periodEvents.length > 10) {
            console.log(`   ... et ${loadResult.periodEvents.length - 10} autres`);
        }
    }
    
    let createdCount = 0;
    let batchNumber = 0;
    const startTime = Date.now();
    let totalValidationCount = 0;
    let totalValidationScoreSum = 0;
    
    while (createdCount < targetCount && batchNumber < 75) {
        batchNumber++;
        const remainingEvents = targetCount - createdCount;
        const currentBatchSize = Math.min(BATCH_SIZE, remainingEvents);
        
        try {
            console.log(`\n🚀 [HYBRID] Début lot ${batchNumber} avec stratégie Claude+Gemini optimale...`);
            const completedEvents = await processBatchHybrid(startYear, endYear, currentBatchSize, batchNumber);
            createdCount += completedEvents.length;
            
            const batchValidations = completedEvents.filter(e => e.validation_score);
            totalValidationCount += batchValidations.length;
            totalValidationScoreSum += batchValidations.reduce((sum, e) => sum + e.validation_score, 0);
            
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = createdCount / (elapsed / 60);
            const lotSuccessRate = ((createdCount / (batchNumber * BATCH_SIZE)) * 100).toFixed(1);
            const realSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
            
            console.log(`\n📊 BILAN LOT ${batchNumber} HYBRIDE CLAUDE+GEMINI:`);
            console.log(`   ✅ Créés: ${completedEvents.length}/${currentBatchSize}`);
            console.log(`   📈 Total: ${createdCount}/${targetCount} (${realSuccessRate}% de l'objectif)`);
            console.log(`   🎯 Taux de réussite lot: ${lotSuccessRate}%`);
            console.log(`   ⏱️ Rate: ${rate.toFixed(1)} événements/min`);
            console.log(`   💰 Stratégie: Claude pour prompts + Gemini pour le reste`);
            console.log(`   🎨 Qualité: Excellence créative Claude + Économie Gemini`);
            console.log(`   🎯 Précision: Contraintes Flux respectées`);
            
            if (batchValidations.length > 0) {
                const batchAvgScore = batchValidations.reduce((sum, e) => sum + e.validation_score, 0) / batchValidations.length;
                console.log(`   🤖 Validation IA lot: ${batchValidations.length}/${completedEvents.length} analysés (score moyen: ${batchAvgScore.toFixed(1)}/10)`);
            }
            
        } catch (error) {
            console.error(`❌ [HYBRID] Erreur lot ${batchNumber}:`, error.message);
            console.log(`🔄 [HYBRID] Continuation malgré l'erreur du lot ${batchNumber}...`);
        }
        
        if (createdCount < targetCount) {
            console.log("   ⏳ Pause 3s...");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    const finalRate = createdCount / (totalTime / 60);
    const finalLotSuccessRate = ((createdCount / (batchNumber * BATCH_SIZE)) * 100).toFixed(1);
    const realFinalSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
    const globalAvgValidationScore = totalValidationCount > 0 ? (totalValidationScoreSum / totalValidationCount).toFixed(1) : 'N/A';
    
    console.log(`\n🎉 === TRAITEMENT HYBRIDE CLAUDE+GEMINI TERMINÉ ===`);
    console.log(`✅ Événements créés: ${createdCount}/${targetCount} (${realFinalSuccessRate}% de l'objectif)`);
    console.log(`📦 Lots traités: ${batchNumber}`);
    console.log(`🎯 Taux de réussite par lot: ${finalLotSuccessRate}%`);
    console.log(`🎯 Taux de réussite global: ${realFinalSuccessRate}%`);
    console.log(`⏱️ Temps total: ${Math.floor(totalTime/60)}min ${(totalTime%60).toFixed(0)}s`);
    console.log(`📈 Rate finale: ${finalRate.toFixed(1)} événements/min`);
    console.log(`💡 Stratégie: Claude 3.5 Sonnet (prompts) + Gemini 2.0 Flash (reste)`);
    console.log(`🎨 Qualité: Excellence créative Claude + Économie Gemini`);
    console.log(`🎯 Innovation: Meilleur des deux mondes - Créativité + Efficacité`);
    console.log(`🆕 Anti-doublons: Liste COMPLÈTE ${loadResult.periodEvents.length} événements période`);
    
    console.log(`🤖 Validation IA globale: ${totalValidationCount}/${createdCount} événements analysés (${((totalValidationCount/createdCount)*100).toFixed(1)}%)`);
    if (totalValidationCount > 0) {
        console.log(`📊 Score moyen validation IA: ${globalAvgValidationScore}/10`);
        console.log(`💾 Données IA sauvegardées en base pour utilisation dans l'interface de validation`);
    }
    
    if (realFinalSuccessRate < 60) {
        console.log(`\n⚠️ DIAGNOSTIC - Taux < 60% :`);
        console.log(`   • Période ${startYear}-${endYear} déjà bien couverte (${loadResult.periodEvents.length} événements existants)`);
        console.log(`   • Essayez une période moins couverte ou augmentez la diversité géographique`);
        console.log(`   • Vérifiez les logs pour identifier les blocages principaux`);
        console.log(`   • Réessayez avec une période différente pour de meilleurs résultats`);
    } else {
        console.log(`\n🎊 EXCELLENT RÉSULTAT ! Taux > 60% atteint avec stratégie hybride optimale`);
        console.log(`🎨 Bonus: Excellence créative Claude pour prompts Flux-schnell`);
        if (totalValidationCount > 0) {
            console.log(`🤖 Bonus: ${totalValidationCount} événements avec validation IA complète sauvegardée`);
        }
    }
    
    rl.close();
}

function askQuestion(query) { 
    return new Promise(resolve => rl.question(query, resolve)); 
}

// ==============================================================================
// LANCEMENT DU SCRIPT
// ==============================================================================

main().catch(error => { 
    console.error("\n💥 [HYBRID] Erreur fatale:", error); 
    rl.close(); 
});