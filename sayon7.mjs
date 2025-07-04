// ==============================================================================
// sayon7_optimized.mjs - VERSION HYBRIDE OPTIMALE CLAUDE + GEMINI (ÉPURÉE)
// GÉNÉRATION PROMPTS : Claude 3.5 Sonnet
// AUTRES FONCTIONS : Gemini 2.0 Flash
// 
// SYSTÈME DE DÉTECTION DOUBLONS GÉNÉRIQUE ET ROBUSTE
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import readline from 'readline';
import 'dotenv/config';

// Configuration HYBRIDE
const AI_CONFIG = {
    promptGeneration: "claude-3-5-sonnet-20241022",
    eventGeneration: "gemini-2.0-flash",
    historicalVerification: "gemini-2.0-flash", 
    contextEnrichment: "gemini-2.0-flash",
    imageValidation: "gemini-2.0-flash"
};

// Configuration des types d'événements
const EVENT_FOCUS_TYPES = {
    FRANCE: "france",
    UNIVERSAL: "universal",
    MIXED: "mixed"
};

// Types d'événements étendus par catégories
const EVENT_TYPES = {
    cultural: [
        "Arts", "Littérature", "Musique", "Théâtre", "Cinéma", "Peinture", 
        "Sculpture", "Architecture", "Photographie", "Danse", "Opéra", 
        "Mode", "Design", "Artisanat", "Festivals", "Expositions"
    ],
    political: [
        "Militaire", "Politique", "Diplomatie", "Guerre", "Bataille", 
        "Révolution", "Coup d'État", "Traité", "Alliance", "Indépendance", 
        "Unification", "Colonisation", "Décolonisation", "Résistance", "Paix"
    ],
    scientific: [
        "Science", "Invention", "Découverte", "Innovation", "Médecine", 
        "Physique", "Chimie", "Biologie", "Astronomie", "Mathématiques", 
        "Technologie", "Informatique", "Transport", "Communication", "Énergie"
    ],
    sports: [
        "Sport", "Olympiques", "Football", "Athlétisme", "Tennis", "Cyclisme", 
        "Natation", "Boxe", "Course", "Gymnastique", "Sports d'hiver", 
        "Rugby", "Basketball", "Baseball", "Golf", "Compétition"
    ],
    social: [
        "Institution", "Société", "Éducation", "Université", "Loi", "Justice", 
        "Droits humains", "Mouvement social", "Syndicalisme", "Féminisme", 
        "Égalité", "Liberté", "Démocratisation", "Réforme", "Abolition"
    ],
    economic: [
        "Économie", "Commerce", "Industrie", "Finance", "Banque", "Monnaie", 
        "Bourse", "Crise économique", "Croissance", "Innovation économique", 
        "Capitalisme", "Socialisme", "Mondialisation", "Agriculture", "Marché"
    ],
    religious: [
        "Religion", "Spiritualité", "Christianisme", "Islam", "Judaïsme", 
        "Bouddhisme", "Hindouisme", "Réforme religieuse", "Concile", "Pèlerinage", 
        "Missionnaire", "Monastère", "Temple", "Cathédrale", "Secte"
    ],
    exploration: [
        "Exploration", "Voyage", "Navigation", "Expédition", "Géographie", 
        "Cartographie", "Colonisation", "Découverte géographique", "Route commerciale", 
        "Immigration", "Migration", "Frontière", "Territoire", "Conquête", "Expansion"
    ],
    environmental: [
        "Catastrophe", "Tremblement de terre", "Volcan", "Tsunami", "Inondation", 
        "Sécheresse", "Épidémie", "Pandémie", "Famine", "Incendie", "Ouragan", 
        "Météorologie", "Climat", "Écologie", "Environnement"
    ],
    daily: [
        "Vie quotidienne", "Coutumes", "Tradition", "Festivité", "Célébration", 
        "Mode de vie", "Gastronomie", "Habitat", "Famille", "Mariage", 
        "Naissance", "Mort", "Folklore", "Langue", "Communication"
    ],
    media: [
        "Médias", "Presse", "Journal", "Radio", "Télévision", "Internet", 
        "Publication", "Livre", "Magazine", "Journalisme", "Censure", 
        "Propagande", "Information", "Diffusion", "Communication de masse"
    ],
    transport: [
        "Transport", "Infrastructure", "Chemin de fer", "Route", "Pont", 
        "Canal", "Port", "Aéroport", "Aviation", "Automobile", "Navigation", 
        "Urbanisme", "Construction", "Génie civil", "Logistique"
    ]
};

function getAllEventTypes() {
    const allTypes = [];
    Object.values(EVENT_TYPES).forEach(category => {
        allTypes.push(...category);
    });
    return [...new Set(allTypes)];
}

function getTypesForFocus(focusType) {
    return getAllEventTypes();
}

const MAX_IMAGE_ATTEMPTS = 4; 
const BATCH_SIZE = 4;
const MIN_VALIDATION_SCORE = 4;

// Limites optimisées Flux-schnell
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

// Initialisation APIs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Barre de progression
class ProgressBar {
    constructor(total, label = 'Progression') {
        this.total = total;
        this.current = 0;
        this.label = label;
        this.startTime = Date.now();
        this.barLength = 40;
    }

    update(current, info = '') {
        // S'assurer que current ne dépasse jamais total et ne recule jamais
        this.current = Math.min(Math.max(current, this.current), this.total);
        const percentage = Math.round((this.current / this.total) * 100);
        const filledLength = Math.round((this.barLength * this.current) / this.total);
        const bar = '█'.repeat(filledLength) + '░'.repeat(this.barLength - filledLength);
        
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = this.current / (elapsed / 60);
        
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(
            `${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total}) - ${rate.toFixed(1)}/min ${info}`
        );
        
        if (this.current >= this.total) {
            process.stdout.write('\n');
        }
    }
}

// Wrapper Claude robuste
async function callClaude(prompt, options = {}) {
    const {
        model = AI_CONFIG.promptGeneration,
        maxTokens = 300,
        temperature = 0.7,
        retryAttempt = 1
    } = options;
    
    const maxRetries = 5;
    
    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }]
        });
        
        return response.content[0].text;
        
    } catch (error) {
        const isTemporaryError = error.message.includes('rate_limit') || 
                                error.message.includes('overloaded') ||
                                error.message.includes('Overloaded') ||
                                error.message.includes('timeout') ||
                                error.message.includes('529') ||
                                error.status === 529;
        
        if (isTemporaryError && retryAttempt < maxRetries) {
            let waitTime;
            if (error.message.includes('overloaded') || error.message.includes('Overloaded') || error.message.includes('529') || error.status === 529) {
                waitTime = Math.min(retryAttempt * 15000, 60000);
            } else {
                waitTime = retryAttempt * 5000;
            }
            
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callClaude(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

// Wrappers Gemini robustes
async function callGemini(prompt, options = {}) {
    const {
        model = AI_CONFIG.eventGeneration,
        maxOutputTokens = 1000,
        temperature = 0.3,
        responseFormat = null,
        retryAttempt = 1
    } = options;
    
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
        
        return response;
        
    } catch (error) {
        if ((error.message.includes('quota') || 
             error.message.includes('rate_limit') || 
             error.message.includes('overloaded') ||
             error.message.includes('timeout')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 5000;
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
    
    try {
        const geminiModel = genAI.getGenerativeModel({ 
            model,
            generationConfig: {
                maxOutputTokens,
                temperature,
                responseMimeType: "application/json"
            }
        });
        
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
        
        return response;
        
    } catch (error) {
        if ((error.message.includes('quota') || 
             error.message.includes('rate_limit')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 3000;
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callGeminiWithImage(prompt, imageUrl, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

// Détection intelligente des doublons
let existingNormalizedTitles = new Set();
let titleMappings = new Map();
let existingEventsData = [];

function extractYear(dateString) {
    if (!dateString) return null;
    const yearMatch = dateString.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

function normalizeTitle(titre) {
    if (!titre) return '';
    
    let normalized = titre.toLowerCase().trim();
    
    // Normalisation unicode COMPLÈTE
    normalized = normalized
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime tous les accents
        .replace(/['']/g, "'") // Normalise les apostrophes
        .replace(/[""]/g, '"') // Normalise les guillemets
        .replace(/[–—]/g, '-') // Normalise les tirets
        .replace(/\s*\(?\d{4}\)?$/g, '') // Supprime années à la fin
        .replace(/\s+\d{4}\s*$/g, '')
        .replace(/\s*\([^)]*\)\s*/g, ' ') // Supprime contenu entre parenthèses
        .replace(/\s*\[[^\]]*\]\s*/g, ' ') // Supprime contenu entre crochets
        
    // Normalisation des termes équivalents (GÉNÉRIQUE)
    const equivalences = [
        [/^(traité|traite|accord|pacte|convention|contrat)\s+(de\s+|du\s+|des\s+|d')?/g, 'traite de '],
        [/^(partage|division|répartition)\s+(de\s+|du\s+|des\s+|d')?/g, 'traite de '],
        [/^(bataille|combat|affrontement)\s+(de\s+|du\s+|des\s+|d')?/g, 'bataille de '],
        [/^(guerre|conflit)\s+(de\s+|du\s+|des\s+|d')?/g, 'guerre de '],
        [/^(révolution|soulèvement|révolte)\s+(de\s+|du\s+|des\s+|d')?/g, 'revolution de '],
        [/^(découverte|invention)\s+(de\s+|du\s+|des\s+|d')?/g, 'decouverte de '],
        [/^(fondation|création|établissement)\s+(de\s+|du\s+|des\s+|d')?/g, 'fondation de '],
        [/^(construction|édification|bâtiment)\s+(de\s+|du\s+|des\s+|d')?/g, 'construction de '],
        [/^(mort|décès|disparition)\s+(de\s+|du\s+|des\s+|d')?/g, 'mort de '],
        [/^(naissance|venue au monde)\s+(de\s+|du\s+|des\s+|d')?/g, 'naissance de '],
        [/^(couronnement|sacre|intronisation)\s+(de\s+|du\s+|des\s+|d')?/g, 'couronnement de '],
        [/^(élection|nomination)\s+(de\s+|du\s+|des\s+|d')?/g, 'election de ']
    ];
    
    equivalences.forEach(([pattern, replacement]) => {
        normalized = normalized.replace(pattern, replacement);
    });
    
    // Suppression des mots vides
    normalized = normalized
        .replace(/\s+(le|la|les|du|de|des|en|et|ou|dans|pour|avec|par|sur|sous|vers|chez|sans|contre|depuis|pendant)\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    return normalized;
}

function calculateSimilarity(str1, str2) {
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);
    
    let commonWords = 0;
    words1.forEach(word1 => {
        if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
            commonWords++;
        }
    });
    
    return commonWords / Math.max(words1.length, words2.length);
}

// Détection doublons avec Gemini Flash
async function detectDuplicatesWithGemini(newEvent, existingEvents) {
    const newEventYear = newEvent.year;
    const candidatesNearDate = existingEvents.filter(existing => {
        const existingYear = extractYear(existing.date || existing.date_formatee);
        return existingYear && newEventYear && Math.abs(existingYear - newEventYear) <= 5;
    });
    
    if (candidatesNearDate.length === 0) {
        return { isDuplicate: false, reason: "Aucun événement dans la période temporelle" };
    }
    
    const normalizedNewTitle = normalizeTitle(newEvent.titre);
    const candidatesNearTitle = candidatesNearDate.filter(existing => {
        const normalizedExisting = normalizeTitle(existing.titre);
        const similarity = calculateSimilarity(normalizedNewTitle, normalizedExisting);
        return similarity > 0.3;
    });
    
    if (candidatesNearTitle.length === 0) {
        return { isDuplicate: false, reason: "Aucun titre similaire trouvé" };
    }
    
    const candidatesText = candidatesNearTitle.map((existing, index) => 
        `${index + 1}. "${existing.titre}" (${extractYear(existing.date || existing.date_formatee)}) - ${existing.description_detaillee || 'Pas de description'}`
    ).join('\n');
    
    const prompt = `Tu es un expert historien chargé de détecter les VRAIS doublons d'événements historiques.

NOUVEL ÉVÉNEMENT À ANALYSER :
- Titre: "${newEvent.titre}"
- Année: ${newEvent.year}
- Description: ${newEvent.description || 'Pas de description'}
- Type: ${newEvent.type || 'Non spécifié'}

ÉVÉNEMENTS EXISTANTS POTENTIELLEMENT SIMILAIRES :
${candidatesText}

MISSION CRITIQUE : Détermine s'il y a un VRAI doublon (même événement historique) parmi les existants.

RÈGLES DE DÉTECTION :
1. **DOUBLON CONFIRMÉ** si c'est EXACTEMENT le même événement historique (même fait, même date approximative)
2. **PAS DE DOUBLON** si ce sont des événements DIFFÉRENTS même s'ils sont liés
3. **TOLÉRANCE TEMPORELLE** : ±2 ans acceptable pour variations de datation historique

SOIS STRICT : Un vrai doublon = EXACTEMENT le même fait historique, pas juste la même période/thème.

FORMAT JSON OBLIGATOIRE :
{
  "isDuplicate": true/false,
  "duplicateTitle": "Titre de l'événement dupliqué si trouvé ou null",
  "confidence": "high|medium|low",
  "reason": "Explication détaillée de ta décision",
  "analysis": "Comparaison précise entre le nouvel événement et le(s) candidat(s)"
}

PRIORITÉ ABSOLUE : Éviter les faux positifs tout en détectant les vrais doublons.`;

    try {
        const responseText = await callGemini(prompt, {
            model: AI_CONFIG.eventGeneration,
            maxOutputTokens: 600,
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
        
        const analysis = JSON.parse(jsonText);
        return analysis;
        
    } catch (error) {
        return { 
            isDuplicate: false, 
            reason: `Erreur d'analyse Gemini: ${error.message}`,
            confidence: "low"
        };
    }
}

async function loadExistingTitles(startYear, endYear) {
    console.log("Chargement optimisé pour période demandée...");
    
    try {
        // Stratégie optimisée : charger seulement la zone étendue (±10 ans)
        const extendedStartYear = Math.max(startYear - 10, 0);
        const extendedEndYear = endYear + 10;
        
        console.log(`Chargement zone ${extendedStartYear}-${extendedEndYear} (au lieu de tout charger)`);
        
        // Chargement avec filtres optimisés par table
        const [gojuResult, eventsResult] = await Promise.all([
            // Table goju : date_formatee est Integer
            supabase.from('goju')
                .select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
                .gte('date_formatee', extendedStartYear)
                .lte('date_formatee', extendedEndYear),
            // Table evenements : date_formatee est String, on filtre par extraction d'année
            supabase.from('evenements')
                .select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
        ]);
        
        // Filtrage manuel pour evenements (car date_formatee est string)
        const filteredEvents = (eventsResult.data || []).filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= extendedStartYear && eventYear <= extendedEndYear;
        });
        
        const extendedEvents = [
            ...(gojuResult.data || []),
            ...filteredEvents
        ];
        
        // Séparer les événements de la période exacte
        const periodEvents = extendedEvents.filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= startYear && eventYear <= endYear;
        });
        
        console.log(`📊 Période ${startYear}-${endYear}: ${periodEvents.length} événements`);
        console.log(`📊 Zone étendue ${extendedStartYear}-${extendedEndYear}: ${extendedEvents.length} événements (vs ~1000 avant)`);
        
        // Cache de détection basé sur la zone étendue
        const allNormalizedTitles = new Set();
        const allMappings = new Map();
        
        extendedEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            allNormalizedTitles.add(normalized);
            if (!allMappings.has(normalized)) {
                allMappings.set(normalized, []);
            }
            allMappings.get(normalized).push(event.titre);
        });
        
        // Données pour Gemini limitées à la zone étendue
        existingEventsData = extendedEvents.map(event => ({
            ...event,
            year: extractYear(event.date || event.date_formatee)
        }));
        
        existingNormalizedTitles = allNormalizedTitles;
        titleMappings = allMappings;
        
        console.log(`📊 Cache doublons: ${allNormalizedTitles.size} titres (optimisé vs 998 avant)`);
        
        // Diagnostic léger des conflits dans la zone
        const conflicts = [];
        const seen = new Map();
        extendedEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            if (seen.has(normalized)) {
                conflicts.push([normalized, seen.get(normalized), event.titre]);
            } else {
                seen.set(normalized, event.titre);
            }
        });
        
        if (conflicts.length > 0) {
            console.log(`⚠️  ${conflicts.length} conflit(s) dans zone étendue`);
            conflicts.slice(0, 2).forEach(([normalized, first, second]) => {
                console.log(`  "${normalized}" ← [${first}, ${second}]`);
            });
        }
        
        return { 
            allNormalizedTitles, 
            periodEvents: periodEvents.map(e => e.titre),
            loadedEventsCount: extendedEvents.length
        };
        
    } catch (error) {
        console.error("❌ Erreur chargement optimisé:", error.message);
        console.log("🔄 Fallback vers chargement complet...");
        
        // Fallback : chargement complet
        const [gojuResult, eventsResult] = await Promise.all([
            supabase.from('goju').select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee'),
            supabase.from('evenements').select('titre, date, date_formatee, types_evenement, pays, region, description_detaillee')
        ]);
        
        const allEvents = [
            ...(gojuResult.data || []),
            ...(eventsResult.data || [])
        ];
        
        const periodEvents = allEvents.filter(event => {
            const eventYear = extractYear(event.date || event.date_formatee);
            return eventYear >= startYear && eventYear <= endYear;
        });
        
        const allNormalizedTitles = new Set();
        const allMappings = new Map();
        
        allEvents.forEach(event => {
            const normalized = normalizeTitle(event.titre);
            allNormalizedTitles.add(normalized);
            if (!allMappings.has(normalized)) {
                allMappings.set(normalized, []);
            }
            allMappings.get(normalized).push(event.titre);
        });
        
        existingEventsData = allEvents.map(event => ({
            ...event,
            year: extractYear(event.date || event.date_formatee)
        }));
        
        existingNormalizedTitles = allNormalizedTitles;
        titleMappings = allMappings;
        
        console.log(`📊 Fallback: ${allEvents.length} événements chargés, ${periodEvents.length} dans période`);
        
        return { 
            allNormalizedTitles, 
            periodEvents: periodEvents.map(e => e.titre),
            loadedEventsCount: allEvents.length
        };
    }
}

async function isDuplicate(titre, eventData = null) {
    // 1. VÉRIFICATION EXACTE par titre normalisé
    const normalized = normalizeTitle(titre);
    const exists = existingNormalizedTitles.has(normalized);
    
    if (exists) {
        const existingVersions = titleMappings.get(normalized) || [];
        // Log discret pour diagnostic
        if (process.env.DEBUG_DUPLICATES === 'true') {
            console.log(`❌ Doublon exact: "${titre}" -> "${normalized}"`);
            console.log(`   Versions existantes: [${existingVersions.slice(0, 2).join(', ')}]`);
        }
        return true;
    }
    
    // 2. VÉRIFICATION SIMILARITÉ AVANCÉE
    // Recherche de titres très similaires (même si pas exactement identiques)
    for (const existingNormalized of existingNormalizedTitles) {
        const similarity = calculateAdvancedSimilarity(normalized, existingNormalized);
        if (similarity > 0.85) { // Seuil de similarité élevé
            if (process.env.DEBUG_DUPLICATES === 'true') {
                console.log(`⚠️  Similarité élevée (${(similarity*100).toFixed(0)}%): "${normalized}" ≈ "${existingNormalized}"`);
            }
            return true;
        }
    }
    
    // 3. VÉRIFICATION GEMINI FLASH (si données disponibles et pas de doublon évident)
    if (eventData) {
        const geminiAnalysis = await detectDuplicatesWithGemini(eventData, existingEventsData);
        if (geminiAnalysis.isDuplicate) {
            if (process.env.DEBUG_DUPLICATES === 'true') {
                console.log(`🤖 Doublon IA détecté: "${titre}"`);
                console.log(`   Raison: ${geminiAnalysis.reason}`);
            }
            return true;
        }
    }
    
    return false;
}

// Fonction de similarité améliorée
function calculateAdvancedSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    
    const words1 = str1.split(' ').filter(w => w.length > 2);
    const words2 = str2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Mots communs
    let commonWords = 0;
    words1.forEach(word1 => {
        if (words2.some(word2 => 
            word2.includes(word1) || 
            word1.includes(word2) || 
            levenshteinDistance(word1, word2) <= 1
        )) {
            commonWords++;
        }
    });
    
    // Score de Jaccard amélioré
    const jaccard = commonWords / Math.max(words1.length, words2.length);
    
    // Bonus si la longueur est similaire
    const lengthSimilarity = 1 - Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);
    
    return (jaccard * 0.7) + (lengthSimilarity * 0.3);
}

// Distance de Levenshtein simplifiée pour mots courts
function levenshteinDistance(str1, str2) {
    if (str1.length > 10 || str2.length > 10) return 999; // Éviter calculs lourds
    
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

function addToCache(titre, eventData = null) {
    const normalized = normalizeTitle(titre);
    existingNormalizedTitles.add(normalized);
    
    if (!titleMappings.has(normalized)) {
        titleMappings.set(normalized, []);
    }
    titleMappings.get(normalized).push(titre);
    
    if (eventData) {
        existingEventsData.push({
            ...eventData,
            year: extractYear(eventData.date || eventData.date_formatee)
        });
    }
}

// Génération d'événements optimisée
async function generateEventBatchWithGemini(startYear, endYear, count, focusType = "mixed", attemptNumber = 1) {
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
    
    const focusPrompts = {
        france: {
            description: "événements de l'HISTOIRE DE FRANCE exclusivement",
            constraints: `
🇫🇷 FOCUS SPÉCIALISÉ HISTOIRE DE FRANCE :
- UNIQUEMENT des événements qui se sont déroulés EN FRANCE ou impliquant directement la France
- Rois de France, batailles françaises, révolutions françaises, politique française
- Constructions françaises, découvertes françaises, personnalités françaises
- Traités signés par la France, guerres françaises, réformes françaises
- Villes françaises, régions françaises, institutions françaises

🚫 INTERDICTIONS POUR FOCUS FRANCE :
- Événements purement étrangers sans lien direct avec la France
- Guerres sans participation française significative
- Découvertes/inventions non françaises
- Politique étrangère sans impact français

🎯 GÉOGRAPHIE : France métropolitaine, colonies françaises, territoires sous influence française`,
            regions: ["France", "Europe"],
            universalField: false
        },
        universal: {
            description: "événements UNIVERSELLEMENT CONNUS dans le monde entier",
            constraints: `
🌍 FOCUS SPÉCIALISÉ ÉVÉNEMENTS UNIVERSELS :
- Événements connus et enseignés DANS LE MONDE ENTIER
- Grandes découvertes, inventions majeures, révolutions mondiales
- Personnalités de renommée mondiale, œuvres universelles
- Catastrophes naturelles majeures, phénomènes astronomiques
- Traités internationaux majeurs, guerres mondiales
- Fondations de grandes civilisations, empires mondiaux

🎯 CRITÈRES UNIVERSALITÉ :
- Enseigné dans les manuels scolaires internationaux
- Impact sur plusieurs continents
- Connu par les populations éduquées globalement
- Importance historique reconnue mondialement

🌎 GÉOGRAPHIE : Diversité maximale (Asie, Afrique, Amérique, Europe, Océanie)`,
            regions: ["Asie", "Afrique", "Amérique", "Europe", "Océanie"],
            universalField: true
        },
        mixed: {
            description: "événements mixtes (France + Universels)",
            constraints: `
🌍🇫🇷 FOCUS MIXTE ÉQUILIBRÉ :
- 50% événements d'histoire de France
- 50% événements universellement connus
- Diversité géographique et thématique
- Équilibre entre local français et global mondial`,
            regions: ["France", "Europe", "Asie", "Afrique", "Amérique"],
            universalField: "mixed"
        }
    };

    const currentFocus = focusPrompts[focusType] || focusPrompts.mixed;
    const availableTypes = getTypesForFocus(focusType);
    const typesString = availableTypes.join('|');
    
    const promptVariations = {
        france: [
            "batailles et guerres de France",
            "rois et reines de France", 
            "révolutions et réformes françaises",
            "constructions et monuments français",
            "traités et alliances de la France",
            "découvertes et inventions françaises",
            "fondations de villes françaises",
            "personnalités politiques françaises",
            "mouvements artistiques français",
            "institutions françaises",
            "explorations françaises",
            "réformes religieuses en France",
            "développements économiques français",
            "innovations techniques françaises",
            "événements juridiques français",
            "sports et compétitions françaises",
            "art et culture française",
            "gastronomie et traditions françaises",
            "mode et design français",
            "littérature et théâtre français"
        ],
        universal: [
            "grandes découvertes mondiales documentées",
            "inventions révolutionnaires universelles",
            "empires et civilisations majeures",
            "catastrophes naturelles historiques",
            "traités internationaux majeurs",
            "guerres mondiales et conflits globaux",
            "personnalités de renommée mondiale",
            "révolutions qui ont changé le monde",
            "fondations de grandes religions",
            "explorations géographiques majeures",
            "innovations scientifiques universelles",
            "phénomènes astronomiques historiques",
            "fondations de grandes universités",
            "mouvements artistiques mondiaux",
            "développements commerciaux globaux",
            "jeux olympiques et sports internationaux",
            "épidémies et pandémies historiques",
            "inventions médicales révolutionnaires",
            "découvertes archéologiques majeures",
            "événements culturels universels",
            "innovations en transport et communication",
            "mouvements sociaux mondiaux",
            "créations artistiques emblématiques",
            "révolutions technologiques",
            "événements astronomiques historiques"
        ],
        mixed: [
            "événements historiques majeurs France et monde",
            "personnalités françaises et mondiales",
            "découvertes françaises et inventions universelles",
            "batailles françaises et conflits mondiaux",
            "constructions françaises et monuments universels",
            "sports français et compétitions internationales",
            "art français et mouvements artistiques mondiaux",
            "innovations françaises et révolutions technologiques",
            "traditions françaises et coutumes mondiales",
            "littérature française et œuvres universelles"
        ]
    };
    
    const focusArea = promptVariations[focusType][attemptNumber % promptVariations[focusType].length];
    
    const prompt = `Tu es un historien expert reconnu. Génère EXACTEMENT ${count} événements historiques DOCUMENTÉS et VÉRIFIABLES entre ${startYear}-${endYear}.

🚫 ÉVÉNEMENTS STRICTEMENT INTERDITS (TOUS ceux de la période ${startYear}-${endYear}) :
"${allExistingInPeriod}"

${currentFocus.constraints}

🎯 FOCUS SPÉCIALISÉ : ${focusArea}

🔧 STRATÉGIE ANTI-DOUBLONS : Privilégie des événements MOINS CONNUS mais historiquement vérifiables.

RÈGLES CRITIQUES :
1. DATES EXACTES obligatoires - VÉRIFIE CHAQUE DATE avec précision absolue
2. ÉVÉNEMENTS DOCUMENTÉS uniquement - Sources historiques vérifiables
3. ZÉRO DOUBLON avec les ${periodExistingTitles.length} événements interdits ci-dessus
4. RESPECT ABSOLU DU FOCUS ${focusType.toUpperCase()}
5. TITRES précis (max 60 caractères) SANS l'année

CONSIGNE QUALITÉ :
- Privilégie des événements MOINS connus mais historiquement importants
- ${focusType === 'france' ? 'UNIQUEMENT France/territoires français' : focusType === 'universal' ? 'DIVERSITÉ GÉOGRAPHIQUE MAXIMALE' : 'ÉQUILIBRE France/Monde'}
- Assure-toi de la précision des dates (±0 tolérance d'erreur)
- Évite les "grands classiques" probablement déjà pris

FORMAT JSON STRICT :
{
  "events": [
    {
      "year": number (année exacte vérifiée),
      "titre": "Titre factuel précis SANS année",
      "description": "Contexte historique bref", 
      "type": "${typesString}",
      "region": "${currentFocus.regions.join('|')}",
      "specificLocation": "Pays/région précise",
      "confidence": "high|medium" (niveau de certitude historique),
      "focusType": "${focusType}",
      "universel": ${currentFocus.universalField}
    }
  ]
}

PRIORITÉ ABSOLUE : Précision historique + RESPECT DU FOCUS ${focusType.toUpperCase()} + ZÉRO ressemblance avec les ${periodExistingTitles.length} événements interdits.`;

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
        
        const batchData = JSON.parse(jsonText);
        
        if (!batchData.events || !Array.isArray(batchData.events)) {
            if (attemptNumber < 3) {
                return await generateEventBatchWithGemini(startYear, endYear, count, focusType, attemptNumber + 1);
            }
            return [];
        }
        
        const validEvents = [];
        const rejectedEvents = [];
        
        for (const event of batchData.events) {
            if (!event.titre || !event.year || event.titre.length >= 100) {
                rejectedEvents.push({ event: event.titre, reason: 'Format invalide' });
                continue;
            }
            
            if (!event.titre.match(/^[a-zA-Z0-9\s\-àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ'():.,]+$/) || event.titre.includes('undefined')) {
                rejectedEvents.push({ event: event.titre, reason: 'Caractères invalides' });
                continue;
            }
            
            if (focusType === 'france' && event.region && !['France', 'Europe'].includes(event.region)) {
                rejectedEvents.push({ event: event.titre, reason: 'Pas conforme au focus France' });
                continue;
            }
            
            if (focusType === 'universal' && event.region && event.region === 'France') {
                rejectedEvents.push({ event: event.titre, reason: 'Trop spécifique France pour focus universel' });
                continue;
            }
            
            const eventForDuplicateCheck = {
                titre: event.titre,
                year: event.year,
                date: `${event.year}-01-01`,
                type: event.type,
                region: event.region,
                specificLocation: event.specificLocation,
                description: event.description
            };
            
            if (await isDuplicate(event.titre, eventForDuplicateCheck)) {
                rejectedEvents.push({ event: event.titre, reason: 'Doublon détecté' });
                continue;
            }
            
            validEvents.push(event);
        }
        
        return validEvents;
        
    } catch (error) {
        if (attemptNumber < 3) {
            return await generateEventBatchWithGemini(startYear, endYear, count, focusType, attemptNumber + 1);
        }
        return [];
    }
}

// Vérification historique optimisée
async function verifyEventBatchWithGemini(events) {
    const eventsText = events.map(e => `"${e.titre}" (${e.year})`).join('\n');
    
    const prompt = `Tu es un historien expert. VÉRIFIE RIGOUREUSEMENT ces événements historiques :

${eventsText}

Pour chaque événement, VALIDE :
1. EXISTENCE dans l'histoire documentée (sources primaires/secondaires)
2. DATE EXACTE (tolérance ±1 an maximum) - VÉRIFIE CHAQUE DATE avec précision absolue
3. TITRE cohérent avec les faits historiques

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
            } else {
                invalidEvents.push({ event, reason: validation?.reason || 'Non vérifié par Gemini' });
            }
        });
        
        return { validEvents, invalidEvents };
        
    } catch (error) {
        return { validEvents: events, invalidEvents: [] };
    }
}

// Enrichissement contextuel robuste
async function enrichEventWithGemini(event, attemptNumber = 1) {
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
        
        return {
            ...event,
            enrichissement: enrichedData
        };
        
    } catch (error) {
        if (error.message.includes('Connection error') && attemptNumber < 2) {
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

// Génération prompts optimisée pour Flux-schnell
function countWords(text) {
    return text.trim().split(/\s+/).length;
}

function optimizePromptIntelligently(prompt) {
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
    
    if (yearMatch && !optimized.includes(yearMatch[0])) {
        optimized = `${optimized}, ${yearMatch[0]}`;
    }
    
    if (periodMatch && !optimized.toLowerCase().includes(periodMatch[0].toLowerCase())) {
        optimized = `${optimized}, ${periodMatch[0]}`;
    }
    
    return optimized;
}

async function generateOptimizedFluxPromptWithClaude(enrichedEvent) {
    const enrichissement = enrichedEvent.enrichissement;
    const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                  enrichedEvent.year < 1492 ? 'medieval' : 
                  enrichedEvent.year < 1789 ? 'renaissance' : 
                  enrichedEvent.year < 1914 ? 'industrial' : 'modern';
    
    const promptForClaude = `Tu es l'expert mondial en prompts pour Flux-schnell. Ta mission : créer le prompt PARFAIT pour illustrer cet événement historique.

ÉVÉNEMENT À ILLUSTRER :
- Titre : "${enrichedEvent.titre}"
- Année : ${enrichedEvent.year} (période ${epoch})
- Contexte : ${enrichissement.contextHistorique}
- Scène idéale : ${enrichissement.sceneIdeale}
- Éléments visuels : ${enrichissement.elementsVisuelsEssentiels.join(', ')}
- Atmosphère : ${enrichissement.atmosphere}

EXCELLENCE CLAUDE : Utilise ta créativité légendaire pour créer un prompt qui génère une illustration ÉPOUSTOUFLANTE de cet événement.

CONTRAINTES TECHNIQUES FLUX-SCHNELL (CRITIQUES) :
1. INCLURE OBLIGATOIREMENT : "${enrichedEvent.year}" ET "${epoch} period" dans le prompt
2. ZÉRO TEXTE dans l'image : Aucun mot, chiffre, panneau, inscription visible
3. MAXIMUM ${FLUX_SCHNELL_LIMITS.TARGET_WORDS} mots (limite T5 : ${FLUX_SCHNELL_LIMITS.TARGET_T5_TOKENS} tokens)
4. Mots-clés CONCRETS et visuellement PRÉCIS
5. Structure optimale : [Personnages période] [action] [objets époque] [environnement] [style]

OPTIMISATIONS FLUX-SCHNELL :
- Utiliser "cinematic", "detailed", "realistic" (mots-clés Flux performants)
- Éviter articles (the, a, an) et prépositions inutiles  
- Prioriser : VÊTEMENTS ÉPOQUE + OBJETS + ACTION + COULEURS
- Spécifier matériaux (wood, stone, metal, fabric)

INTERDICTIONS STRICTES :
- text, writing, letters, numbers, signs, inscriptions, words
- wings, angel, flying, supernatural, god, deity, magical, glowing, divine
- modern objects, cars, phones, contemporary clothing

EXCELLENCE CRÉATIVE CLAUDE :
- Trouve des détails visuels uniques et saisissants
- Crée une composition qui raconte l'histoire
- Utilise ta compréhension nuancée pour des choix visuels parfaits
- Équilibre historique + impact visuel maximal

RÉPONDS UNIQUEMENT avec le prompt Flux-schnell PARFAIT incluant "${enrichedEvent.year}" et "${epoch} period", MAXIMUM ${FLUX_SCHNELL_LIMITS.TARGET_WORDS} MOTS.`;

    try {
        const fluxPrompt = await callClaude(promptForClaude, {
            model: AI_CONFIG.promptGeneration,
            maxTokens: 150,
            temperature: 0.8
        });
        
        let cleanPrompt = fluxPrompt.trim().replace(/^["']|["']$/g, '');
        
        const hasYear = cleanPrompt.includes(enrichedEvent.year.toString());
        const hasPeriod = cleanPrompt.includes('period') || cleanPrompt.includes(epoch);
        
        if (!hasYear || !hasPeriod) {
            let corrections = [];
            if (!hasYear) corrections.push(enrichedEvent.year.toString());
            if (!hasPeriod) corrections.push(`${epoch} period`);
            cleanPrompt = `${cleanPrompt}, ${corrections.join(', ')}`;
        }
        
        if (countWords(cleanPrompt) > FLUX_SCHNELL_LIMITS.TARGET_WORDS) {
            cleanPrompt = optimizePromptIntelligently(cleanPrompt);
            
            if (!cleanPrompt.includes(enrichedEvent.year.toString())) {
                cleanPrompt = `${cleanPrompt}, ${enrichedEvent.year}`;
            }
            if (!cleanPrompt.includes('period') && !cleanPrompt.includes(epoch)) {
                cleanPrompt = `${cleanPrompt}, ${epoch} period`;
            }
        }
        
        const finalWords = countWords(cleanPrompt);
        const remainingWords = FLUX_SCHNELL_LIMITS.TARGET_WORDS - finalWords;
        
        let enhancers = [];
        if (remainingWords >= 2) enhancers.push("cinematic");
        if (remainingWords >= 3) enhancers.push("detailed");
        if (remainingWords >= 4) enhancers.push("realistic");
        
        const finalPrompt = enhancers.length > 0 ? `${cleanPrompt}, ${enhancers.join(', ')}` : cleanPrompt;
        
        return finalPrompt;
        
    } catch (error) {
        const epoch = enrichedEvent.year < 476 ? 'ancient' : 
                     enrichedEvent.year < 1492 ? 'medieval' : 
                     enrichedEvent.year < 1789 ? 'renaissance' : 
                     enrichedEvent.year < 1914 ? 'industrial' : 'modern';
        
        let fallbackElements = [];
        
        if (enrichissement.motsClesVisuels && enrichissement.motsClesVisuels.length > 0) {
            fallbackElements.push(...enrichissement.motsClesVisuels.slice(0, 3));
        }
        
        if (enrichedEvent.type) {
            const typeMap = {
                'Arts': 'artistic scene', 'Littérature': 'literary scene', 'Musique': 'musical scene',
                'Théâtre': 'theatrical scene', 'Cinéma': 'cinema scene', 'Peinture': 'painting scene',
                'Sculpture': 'sculpture scene', 'Architecture': 'architectural scene', 'Danse': 'dance scene',
                'Opéra': 'opera scene', 'Mode': 'fashion scene', 'Festivals': 'festival scene',
                'Militaire': 'battle scene', 'Politique': 'political scene', 'Guerre': 'war scene',
                'Bataille': 'battle scene', 'Révolution': 'revolution scene', 'Traité': 'treaty scene',
                'Alliance': 'diplomatic scene', 'Indépendance': 'independence scene',
                'Science': 'scientific scene', 'Invention': 'invention scene', 'Découverte': 'discovery scene',
                'Médecine': 'medical scene', 'Astronomie': 'astronomical scene', 'Technologie': 'technological scene',
                'Sport': 'sports scene', 'Olympiques': 'olympic scene', 'Football': 'football scene',
                'Tennis': 'tennis scene', 'Athlétisme': 'athletic scene', 'Compétition': 'competition scene',
                'Institution': 'institutional scene', 'Éducation': 'educational scene', 'Université': 'university scene',
                'Loi': 'legal scene', 'Justice': 'judicial scene', 'Réforme': 'reform scene',
                'Économie': 'economic scene', 'Commerce': 'trade scene', 'Industrie': 'industrial scene',
                'Finance': 'financial scene', 'Agriculture': 'agricultural scene',
                'Religion': 'religious scene', 'Christianisme': 'christian scene', 'Temple': 'temple scene',
                'Cathédrale': 'cathedral scene', 'Pèlerinage': 'pilgrimage scene',
                'Exploration': 'exploration scene', 'Voyage': 'travel scene', 'Navigation': 'navigation scene',
                'Expédition': 'expedition scene', 'Découverte géographique': 'geographic discovery scene',
                'Catastrophe': 'disaster scene', 'Tremblement de terre': 'earthquake scene',
                'Épidémie': 'epidemic scene', 'Inondation': 'flood scene', 'Incendie': 'fire scene',
                'Transport': 'transport scene', 'Chemin de fer': 'railway scene', 'Aviation': 'aviation scene',
                'Automobile': 'automotive scene', 'Navigation': 'maritime scene',
                'Médias': 'media scene', 'Presse': 'press scene', 'Radio': 'radio scene',
                'Télévision': 'television scene', 'Publication': 'publication scene'
            };
            fallbackElements.push(typeMap[enrichedEvent.type] || 'historical scene');
        }
        
        if (enrichissement.atmosphere) {
            fallbackElements.push(enrichissement.atmosphere);
        }
        
        const baseFallback = fallbackElements.join(', ');
        const fallbackPrompt = `${baseFallback}, ${enrichedEvent.year}, ${epoch} period, cinematic, detailed, realistic`;
        
        let optimizedFallback = fallbackPrompt;
        if (countWords(fallbackPrompt) > FLUX_SCHNELL_LIMITS.TARGET_WORDS) {
            optimizedFallback = optimizePromptIntelligently(fallbackPrompt);
            
            if (!optimizedFallback.includes(enrichedEvent.year.toString())) {
                optimizedFallback = `${optimizedFallback}, ${enrichedEvent.year}`;
            }
            if (!optimizedFallback.includes('period')) {
                optimizedFallback = `${optimizedFallback}, ${epoch} period`;
            }
        }
        
        return optimizedFallback;
    }
}

// Génération d'image optimisée Flux-schnell
async function generateImageEnhanced(prompt, event) {
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
    
    try {
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: fluxConfig
        });

        if (Array.isArray(output) && output[0] && typeof output[0] === 'string' && output[0].startsWith('http')) {
            return output[0];
        }

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
        }

        if (finalPrediction.status === 'succeeded' && finalPrediction.output?.[0]) {
            return finalPrediction.output[0];
        }

        return null;

    } catch (error) {
        return null;
    }
}

// Validation intelligente Gemini Vision
async function validateImageWithGemini(event, imageUrl) {
    const prompt = `Évalue cette image pour l'événement "${event.titre}" (${event.year}).

VALIDATION HISTORIQUE INTELLIGENTE :

CRITÈRES DE REJET AUTOMATIQUE UNIQUEMENT SI :
1. TEXTE INTERDIT : Date "${event.year}" visible ou titre "${event.titre}" écrit dans l'image
2. TEXTE PROÉMINENT : Gros titre, panneau principal, inscription majeure au premier plan
3. ANACHRONISMES MYTHOLOGIQUES : ailes, créatures volantes, anges, dieux, pouvoirs surnaturels
4. ANACHRONISMES MODERNES : voitures, smartphones, vêtements contemporains
5. ANATOMIE IMPOSSIBLE : humains volants, créatures fantastiques
6. ÉPOQUE INCORRECTE : différence >50 ans avec ${event.year}

TEXTE ACCEPTABLE (ne pas rejeter) :
- Texte sur livres, manuscrits, parchemins (arrière-plan)
- Inscriptions sur bannières, blasons, architecture
- Texte flou, illisible ou décoratif
- Écritures anciennes sur objets d'époque

ACCEPTER SI :
1. Aucun texte interdit (date ${event.year} ou titre "${event.titre}")
2. Texte éventuel reste discret et d'époque
3. PERSONNAGES HUMAINS NORMAUX avec anatomie réaliste
4. VÊTEMENTS cohérents avec l'époque (tolérance ±25 ans)
5. OBJETS/OUTILS d'époque appropriés
6. ÉVOQUE l'événement historique sans fantaisie

ATTENTION SPÉCIALE :
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
        
        const isValid = !result.hasForbiddenText && 
                       !result.hasWingsOrSupernatural && 
                       !result.hasModernObjects && 
                       result.anatomyRealistic && 
                       result.periodClothing && 
                       result.score >= MIN_VALIDATION_SCORE && 
                       result.overallValid && 
                       result.historicalAccuracy && 
                       result.representsEvent;

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

// Traitement stratégie hybride optimale
async function processEventWithHybridStrategy(event, progressBar, globalIndex) {
    const enrichedEvent = await enrichEventWithGemini(event);
    
    let successfullyCreated = false;
    let validationData = null;
    
    for (let attempt = 1; attempt <= MAX_IMAGE_ATTEMPTS && !successfullyCreated; attempt++) {
        try {
            const optimizedPrompt = await generateOptimizedFluxPromptWithClaude(enrichedEvent);
            const imageUrl = await generateImageEnhanced(optimizedPrompt, enrichedEvent);
            
            if (!imageUrl) {
                continue;
            }
            
            const validationResult = await validateImageWithGemini(enrichedEvent, imageUrl);
            validationData = validationResult;
            
            if (validationResult.isValid) {
                try {
                    const uploadedUrl = await uploadImageToSupabase(imageUrl, event.titre);
                    const finalEvent = enrichAndFinalizeEvent(enrichedEvent, uploadedUrl, optimizedPrompt, validationData, event.focusType);
                    await insertValidatedEvent(finalEvent);
                    
                    addToCache(event.titre, finalEvent);
                    progressBar.update(globalIndex + 1, `✓ "${event.titre}" créé`);
                    successfullyCreated = true;
                    return finalEvent;
                    
                } catch (uploadError) {
                    if (attempt === MAX_IMAGE_ATTEMPTS) {
                        try {
                            const finalEvent = enrichAndFinalizeEvent(enrichedEvent, imageUrl, optimizedPrompt, validationData, event.focusType);
                            await insertValidatedEvent(finalEvent);
                            addToCache(event.titre, finalEvent);
                            progressBar.update(globalIndex + 1, `✓ "${event.titre}" créé (URL directe)`);
                            return finalEvent;
                        } catch (directError) {
                            // Silence
                        }
                    }
                }
            }
            
        } catch (error) {
            // Silence
        }
        
        if (attempt < MAX_IMAGE_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // Fallback
    try {
        const defaultImageUrl = `https://via.placeholder.com/800x450/8B4513/FFFFFF?text=${encodeURIComponent(event.year + ' - ' + event.type)}`;
        const finalEvent = enrichAndFinalizeEvent(enrichedEvent, defaultImageUrl, "Image par défaut", validationData, event.focusType);
        await insertValidatedEvent(finalEvent);
        
        addToCache(event.titre, finalEvent);
        progressBar.update(globalIndex + 1, `○ "${event.titre}" créé (fallback)`);
        return finalEvent;
        
    } catch (fallbackError) {
        progressBar.update(globalIndex + 1, `✗ "${event.titre}" échec`);
        return null;
    }
}

// Fonctions utilitaires
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

function enrichAndFinalizeEvent(enrichedEvent, imageUrl, illustrationPrompt, validationData = null, focusType = "mixed") {
    const year = parseInt(enrichedEvent.year);
    const epoch = year < 476 ? 'Antiquité' : 
                  year < 1492 ? 'Moyen Âge' : 
                  year < 1789 ? 'Moderne' : 
                  year < 1914 ? 'Contemporaine' : 'XXe';
    
    let universelValue;
    if (focusType === 'france') {
        universelValue = false;
    } else if (focusType === 'universal') {
        universelValue = true;
    } else {
        universelValue = enrichedEvent.region?.toLowerCase() !== 'france' && 
                        enrichedEvent.region?.toLowerCase() !== 'europe';
    }
                  
    const finalEvent = {
        date: `${enrichedEvent.year.toString().padStart(4, '0')}-01-01`,
        titre: enrichedEvent.titre,
        universel: universelValue,
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
        prompt_flux: illustrationPrompt,
        focus_type: focusType
    };

    if (validationData) {
        finalEvent.validation_score = validationData.score;
        finalEvent.validation_explanation = validationData.explanation;
        finalEvent.validation_detailed_analysis = validationData.detailedAnalysis;
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

// Traitement principal hybride optimal
async function processBatchHybrid(startYear, endYear, batchSize, batchNumber, focusType, progressBar, globalCreatedCount) {
    const events = await generateEventBatchWithGemini(startYear, endYear, batchSize, focusType, batchNumber);
    if (events.length === 0) {
        return [];
    }
    
    const { validEvents } = await verifyEventBatchWithGemini(events);
    if (validEvents.length === 0) {
        return [];
    }
    
    const completedEvents = [];
    
    for (let i = 0; i < validEvents.length; i++) {
        const event = validEvents[i];
        const globalIndex = globalCreatedCount + completedEvents.length;
        const result = await processEventWithHybridStrategy(event, progressBar, globalIndex);
        if (result) {
            completedEvents.push(result);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return completedEvents;
}

// Script principal optimal
async function main() {
    console.log("=== SAYON HYBRIDE CLAUDE+GEMINI ===");
    console.log("Configuration: Claude (prompts) + Gemini (reste) + Détection doublons IA");
    
    // Vérification APIs
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
    
    // Choix du type d'événements
    console.log("\n=== CHOIX DU TYPE D'ÉVÉNEMENTS ===");
    console.log("1. 🇫🇷 Histoire de France uniquement");
    console.log("2. 🌍 Événements universellement connus");
    console.log("3. 🌍🇫🇷 Mixte (France + Universel)");
    console.log(`\nTypes disponibles: ${getAllEventTypes().length} types différents`);
    
    const focusChoice = await askQuestion('Choisissez le type (1/2/3) : ');
    
    let focusType;
    switch(focusChoice.trim()) {
        case '1':
            focusType = EVENT_FOCUS_TYPES.FRANCE;
            console.log("✅ Focus sélectionné : Histoire de France");
            break;
        case '2':
            focusType = EVENT_FOCUS_TYPES.UNIVERSAL;
            console.log("✅ Focus sélectionné : Événements universels");
            break;
        case '3':
        default:
            focusType = EVENT_FOCUS_TYPES.MIXED;
            console.log("✅ Focus sélectionné : Mixte");
            break;
    }
    
    const startYear = parseInt(await askQuestion('Année de DÉBUT : '));
    const endYear = parseInt(await askQuestion('Année de FIN : '));
    const targetCount = parseInt(await askQuestion('Nombre d\'événements : '));
    
    console.log("\n=== CHARGEMENT DES DONNÉES ===");
    const loadResult = await loadExistingTitles(startYear, endYear);
    console.log(`✅ Optimisation: ${loadResult.loadedEventsCount || 'N/A'} événements chargés (au lieu de ~1000)`);
    
    console.log("\n=== GÉNÉRATION EN COURS ===");
    const progressBar = new ProgressBar(targetCount, 'Génération événements');
    
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
            const completedEvents = await processBatchHybrid(startYear, endYear, currentBatchSize, batchNumber, focusType, progressBar, createdCount);
            createdCount += completedEvents.length;
            
            const batchValidations = completedEvents.filter(e => e.validation_score);
            totalValidationCount += batchValidations.length;
            totalValidationScoreSum += batchValidations.reduce((sum, e) => sum + e.validation_score, 0);
            
        } catch (error) {
            // Silence
        }
        
        if (createdCount < targetCount) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    // S'assurer que la barre de progression atteint 100%
    progressBar.update(targetCount, "Terminé");
    
    const totalTime = (Date.now() - startTime) / 1000;
    const finalRate = createdCount / (totalTime / 60);
    const realFinalSuccessRate = ((createdCount / targetCount) * 100).toFixed(1);
    const globalAvgValidationScore = totalValidationCount > 0 ? (totalValidationScoreSum / totalValidationCount).toFixed(1) : 'N/A';
    
    console.log("\n=== RÉSULTATS ===");
    console.log(`Événements créés: ${createdCount}/${targetCount} (${realFinalSuccessRate}%)`);
    console.log(`Temps total: ${Math.floor(totalTime/60)}min ${(totalTime%60).toFixed(0)}s`);
    console.log(`Vitesse: ${finalRate.toFixed(1)} événements/min`);
    console.log(`Focus: ${focusType.toUpperCase()}`);
    console.log(`Validation IA: ${totalValidationCount}/${createdCount} événements (${globalAvgValidationScore}/10)`);
    
    rl.close();
}

function askQuestion(query) { 
    return new Promise(resolve => rl.question(query, resolve)); 
}

// Lancement du script
main().catch(error => { 
    console.error("Erreur fatale:", error); 
    rl.close(); 
});