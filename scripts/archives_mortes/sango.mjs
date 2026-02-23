// ==============================================================================
// sango.mjs - TRANSFERT INTELLIGENT GOJU → EVENEMENTS
// Système de vérification IA pour éviter les doublons intelligemment
// Vérifie: titre, date, contexte pour détecter les vrais doublons
// ==============================================================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import 'dotenv/config';

// --- Configuration ---
const DETECTION_MODEL = "claude-3-5-sonnet-20241022"; // Modèle pour détecter les doublons
const BATCH_SIZE = 5; // Traiter 5 événements à la fois
const DATE_TOLERANCE_YEARS = 2; // Tolérance de ±2 ans pour considérer les dates similaires

// --- Initialisation APIs ---
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ==============================================================================
// WRAPPER API ROBUSTE
// ==============================================================================

async function callClaude(prompt, options = {}) {
    const {
        model = DETECTION_MODEL,
        max_tokens = 1000,
        temperature = 0.1, // Très précis pour détection doublons
        retryAttempt = 1
    } = options;
    
    console.log(`      🤖 [CLAUDE] Analyse doublons${retryAttempt > 1 ? ` - Retry ${retryAttempt}/3` : ''}`);
    
    try {
        const response = await anthropic.messages.create({
            model,
            max_tokens,
            temperature,
            messages: [{ role: "user", content: prompt }]
        });
        
        return response.content[0].text;
        
    } catch (error) {
        console.error(`      ❌ [CLAUDE] Erreur:`, error.message);
        
        // Retry automatique pour erreurs temporaires
        if ((error.message.includes('Connection error') || 
             error.message.includes('rate_limit') || 
             error.message.includes('overloaded')) && retryAttempt < 3) {
            const waitTime = retryAttempt * 5000;
            console.log(`      🔄 [CLAUDE] Retry dans ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return await callClaude(prompt, { ...options, retryAttempt: retryAttempt + 1 });
        }
        
        throw error;
    }
}

// ==============================================================================
// UTILITAIRES DATE ET NORMALISATION
// ==============================================================================

function extractYear(dateString) {
    if (!dateString) return null;
    const yearMatch = dateString.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
}

function normalizeTitle(titre) {
    if (!titre) return '';
    
    return titre.toLowerCase()
        .trim()
        .replace(/\s*\(?\d{4}\)?$/g, '') // Supprime l'année à la fin
        .replace(/^(la|le|les|du|de|des|en|et|ou|dans|pour|avec|par|sur)\s+/g, '')
        .replace(/\s+(la|le|les|du|de|des|en|et|ou|dans|pour|avec|par|sur)\s+/g, ' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/\s+/g, ' ')
        .trim();
}

function isDateSimilar(date1, date2, toleranceYears = DATE_TOLERANCE_YEARS) {
    const year1 = extractYear(date1);
    const year2 = extractYear(date2);
    
    if (!year1 || !year2) return false;
    
    return Math.abs(year1 - year2) <= toleranceYears;
}

// ==============================================================================
// RÉCUPÉRATION DES DONNÉES
// ==============================================================================

async function getValidatedEventsFromGoju() {
    console.log(`🔍 Récupération événements validés de 'goju'...`);
    
    const { data, error } = await supabase
        .from('goju')
        .select('*')
        .eq('validation_status', 'validated') // Seulement les validés
        .eq('transferred', false) // Pas encore transférés
        .order('created_at', { ascending: true });
    
    if (error) {
        throw new Error(`Erreur récupération goju: ${error.message}`);
    }
    
    console.log(`   📊 Trouvé ${data.length} événements validés à traiter`);
    return data;
}

async function getAllExistingEvents() {
    console.log(`🔍 Chargement de TOUS les événements existants dans 'evenements'...`);
    
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, date, date_formatee, description_detaillee, epoque, types_evenement')
        .order('date', { ascending: true });
    
    if (error) {
        throw new Error(`Erreur récupération evenements: ${error.message}`);
    }
    
    console.log(`   📊 Chargé ${data.length} événements existants`);
    return data;
}

// ==============================================================================
// DÉTECTION INTELLIGENTE DES DOUBLONS AVEC IA
// ==============================================================================

async function detectDuplicatesWithAI(newEvent, existingEvents) {
    console.log(`   🕵️ [IA] Analyse doublons pour: "${newEvent.titre}" (${extractYear(newEvent.date)})`);
    
    // Pré-filtrage intelligent par date (±5 ans) pour réduire le nombre de comparaisons
    const newEventYear = extractYear(newEvent.date || newEvent.date_formatee);
    const candidatesNearDate = existingEvents.filter(existing => {
        const existingYear = extractYear(existing.date || existing.date_formatee);
        return existingYear && newEventYear && Math.abs(existingYear - newEventYear) <= 5;
    });
    
    console.log(`      📅 Pré-filtre par date: ${candidatesNearDate.length}/${existingEvents.length} candidats potentiels`);
    
    // Si pas de candidats proches en date, pas de doublon
    if (candidatesNearDate.length === 0) {
        console.log(`      ✅ Aucun événement proche en date, pas de doublon`);
        return { isDuplicate: false, reason: "Aucun événement dans la période temporelle" };
    }
    
    // Pré-filtrage par titre normalisé
    const normalizedNewTitle = normalizeTitle(newEvent.titre);
    const candidatesNearTitle = candidatesNearDate.filter(existing => {
        const normalizedExisting = normalizeTitle(existing.titre);
        // Vérification de similarité basique
        const similarity = calculateSimilarity(normalizedNewTitle, normalizedExisting);
        return similarity > 0.3; // Seuil de similarité
    });
    
    console.log(`      📝 Pré-filtre par titre: ${candidatesNearTitle.length}/${candidatesNearDate.length} candidats similaires`);
    
    // Si pas de candidats similaires en titre, probablement pas de doublon
    if (candidatesNearTitle.length === 0) {
        console.log(`      ✅ Aucun titre similaire, probablement pas de doublon`);
        return { isDuplicate: false, reason: "Aucun titre similaire trouvé" };
    }
    
    // Analyse IA approfondie pour les candidats restants
    const candidatesText = candidatesNearTitle.map((existing, index) => 
        `${index + 1}. "${existing.titre}" (${extractYear(existing.date || existing.date_formatee)}) - ${existing.description_detaillee || 'Pas de description'}`
    ).join('\n');
    
    const prompt = `Tu es un expert historien chargé de détecter les VRAIS doublons d'événements historiques.

NOUVEL ÉVÉNEMENT À ANALYSER :
- Titre: "${newEvent.titre}"
- Année: ${extractYear(newEvent.date || newEvent.date_formatee)}
- Description: ${newEvent.description_detaillee || 'Pas de description'}
- Contexte: ${newEvent.contexte_historique || 'Pas de contexte'}
- Époque: ${newEvent.epoque || 'Non spécifiée'}

ÉVÉNEMENTS EXISTANTS POTENTIELLEMENT SIMILAIRES :
${candidatesText}

🎯 MISSION CRITIQUE : Détermine s'il y a un VRAI doublon (même événement historique) parmi les existants.

📋 RÈGLES DE DÉTECTION :
1. **DOUBLON CONFIRMÉ** si c'est EXACTEMENT le même événement historique (même fait, même date approximative)
   - Exemples: "Seconde Guerre mondiale" = "Deuxième Guerre mondiale"
   - "Bataille de Waterloo" = "Défaite de Napoléon à Waterloo"
   - "Chute du mur de Berlin" = "Destruction du mur de Berlin"

2. **PAS DE DOUBLON** si ce sont des événements DIFFÉRENTS même s'ils sont liés :
   - "Début de la Première Guerre mondiale" ≠ "Fin de la Première Guerre mondiale"
   - "Couronnement de Napoléon" ≠ "Sacre de Napoléon empereur" (peuvent être différents)
   - "Découverte de l'Amérique" ≠ "Premier voyage de Christophe Colomb"

3. **TOLÉRANCE TEMPORELLE** : ±2 ans acceptable pour variations de datation historique

⚡ SOIS STRICT : Un vrai doublon = EXACTEMENT le même fait historique, pas juste la même période/thème.

FORMAT JSON OBLIGATOIRE :
{
  "isDuplicate": true/false,
  "duplicateId": "ID de l'événement dupliqué si trouvé ou null",
  "duplicateTitle": "Titre de l'événement dupliqué si trouvé ou null",
  "confidence": "high|medium|low",
  "reason": "Explication détaillée de ta décision",
  "analysis": "Comparaison précise entre le nouvel événement et le(s) candidat(s)"
}

PRIORITÉ ABSOLUE : Éviter les faux positifs tout en détectant les vrais doublons.`;

    try {
        const responseText = await callClaude(prompt, {
            model: DETECTION_MODEL,
            max_tokens: 800,
            temperature: 0.1
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
        
        const analysis = JSON.parse(jsonText);
        
        console.log(`      📊 [IA] Résultat analyse:`);
        console.log(`         🎯 Doublon: ${analysis.isDuplicate ? '❌ OUI' : '✅ NON'}`);
        console.log(`         🎲 Confiance: ${analysis.confidence}`);
        console.log(`         💭 Raison: "${analysis.reason}"`);
        
        if (analysis.isDuplicate) {
            console.log(`         🔗 Doublon détecté: "${analysis.duplicateTitle}"`);
        }
        
        return analysis;
        
    } catch (error) {
        console.error(`      ❌ [IA] Erreur analyse:`, error.message);
        // En cas d'erreur, on considère qu'il n'y a pas de doublon (sécurité)
        return { 
            isDuplicate: false, 
            reason: `Erreur d'analyse IA: ${error.message}`,
            confidence: "low"
        };
    }
}

// Fonction utilitaire de calcul de similarité simple
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

// ==============================================================================
// TRANSFERT DES ÉVÉNEMENTS
// ==============================================================================

async function transferEventToEvenements(gojuEvent) {
    console.log(`   📤 Transfert: "${gojuEvent.titre}"...`);
    
    // Préparation des données pour la table evenements (sans les colonnes spécifiques à goju)
    const eventData = {
        date: gojuEvent.date,
        titre: gojuEvent.titre,
        illustration_url: gojuEvent.illustration_url,
        universel: gojuEvent.universel,
        region: gojuEvent.region,
        langue: gojuEvent.langue,
        ecart_temps_max: gojuEvent.ecart_temps_max,
        facteur_variation: gojuEvent.facteur_variation,
        niveau_difficulte: gojuEvent.niveau_difficulte,
        types_evenement: gojuEvent.types_evenement,
        pays: gojuEvent.pays,
        epoque: gojuEvent.epoque,
        mots_cles: gojuEvent.mots_cles,
        date_formatee: gojuEvent.date_formatee,
        code: `san${Date.now().toString().slice(-6)}${Math.floor(Math.random()*1000)}`, // 🎯 Code Sango unique
        date_precision: gojuEvent.date_precision,
        ecart_temps_min: gojuEvent.ecart_temps_min,
        frequency_score: gojuEvent.frequency_score || 0,
        last_used: null, // Reset pour nouvel événement
        description_detaillee: gojuEvent.description_detaillee
    };
    
    try {
        // Insertion dans la table evenements
        const { data: insertedEvent, error: insertError } = await supabase
            .from('evenements')
            .insert([eventData])
            .select('id')
            .single();
        
        if (insertError) {
            throw new Error(`Erreur insertion evenements: ${insertError.message}`);
        }
        
        // Marquer comme transféré dans goju
        const { error: updateError } = await supabase
            .from('goju')
            .update({ 
                transferred: true, 
                transferred_at: new Date().toISOString()
            })
            .eq('id', gojuEvent.id);
        
        if (updateError) {
            console.error(`      ⚠️ Erreur marquage transfert goju: ${updateError.message}`);
            // On continue quand même, l'événement est dans evenements
        }
        
        console.log(`      ✅ Transféré avec succès (ID: ${insertedEvent.id})`);
        return { success: true, eventId: insertedEvent.id };
        
    } catch (error) {
        console.error(`      ❌ Erreur transfert: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// ==============================================================================
// UTILITAIRES DE PROGRESSION
// ==============================================================================

function createProgressBar(current, total, width = 30) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
}

function formatTimeRemaining(elapsed, current, total) {
    if (current === 0) return 'Calcul en cours...';
    
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    
    if (remaining < 60) {
        return `~${Math.round(remaining)}s restantes`;
    } else {
        const minutes = Math.round(remaining / 60);
        return `~${minutes}min restantes`;
    }
}

// ==============================================================================
// TRAITEMENT PRINCIPAL
// ==============================================================================

async function processBatchTransfer(gojuEvents, existingEvents, batchNumber = 1, totalBatches = 1, globalProgress = { processed: 0, total: 0, startTime: Date.now() }) {
    console.log(`\n📦 === LOT ${batchNumber}/${totalBatches} - ${gojuEvents.length} ÉVÉNEMENTS ===`);
    
    const results = {
        transferred: [],
        duplicates: [],
        errors: []
    };
    
    let eventNumber = 0;
    
    for (const gojuEvent of gojuEvents) {
        eventNumber++;
        globalProgress.processed++;
        
        const elapsed = (Date.now() - globalProgress.startTime) / 1000;
        const progressBar = createProgressBar(globalProgress.processed, globalProgress.total);
        const timeRemaining = formatTimeRemaining(elapsed, globalProgress.processed, globalProgress.total);
        
        console.log(`\n   📊 ${progressBar}`);
        console.log(`   ⏱️  ${timeRemaining} | Traitement événement ${eventNumber}/${gojuEvents.length} du lot ${batchNumber}`);
        console.log(`   🔍 "${gojuEvent.titre}" (${extractYear(gojuEvent.date)})`);
        
        try {
            // Détection de doublons avec IA
            const duplicateAnalysis = await detectDuplicatesWithAI(gojuEvent, existingEvents);
            
            if (duplicateAnalysis.isDuplicate) {
                console.log(`      ❌ DOUBLON DÉTECTÉ - Ignoré`);
                results.duplicates.push({
                    gojuEvent: gojuEvent.titre,
                    duplicateOf: duplicateAnalysis.duplicateTitle,
                    reason: duplicateAnalysis.reason,
                    confidence: duplicateAnalysis.confidence
                });
            } else {
                console.log(`      ✅ Pas de doublon - Transfert en cours...`);
                const transferResult = await transferEventToEvenements(gojuEvent);
                
                if (transferResult.success) {
                    results.transferred.push({
                        title: gojuEvent.titre,
                        gojuId: gojuEvent.id,
                        evenementsId: transferResult.eventId
                    });
                    
                    // Ajouter à la liste des existants pour éviter doublons dans le même lot
                    existingEvents.push({
                        id: transferResult.eventId,
                        titre: gojuEvent.titre,
                        date: gojuEvent.date,
                        date_formatee: gojuEvent.date_formatee,
                        description_detaillee: gojuEvent.description_detaillee,
                        epoque: gojuEvent.epoque,
                        types_evenement: gojuEvent.types_evenement
                    });
                } else {
                    results.errors.push({
                        title: gojuEvent.titre,
                        error: transferResult.error
                    });
                }
            }
            
        } catch (error) {
            console.error(`      ❌ Erreur traitement: ${error.message}`);
            results.errors.push({
                title: gojuEvent.titre,
                error: error.message
            });
        }
        
        // Pause entre les événements pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

// ==============================================================================
// FONCTION PRINCIPALE
// ==============================================================================

async function main() {
    console.log("\n🚀 === SANGO - TRANSFERT INTELLIGENT GOJU → EVENEMENTS ===");
    console.log("🎯 Objectif: Transférer les événements validés sans créer de doublons");
    console.log("🤖 IA: Claude 3.5 Sonnet pour détection intelligente des doublons");
    console.log("📊 Vérifications: Titre + Date + Contexte pour précision maximale");
    
    // Vérification API
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("❌ ANTHROPIC_API_KEY manquante dans .env");
        process.exit(1);
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
        console.error("❌ Variables Supabase manquantes dans .env");
        process.exit(1);
    }
    console.log("✅ APIs configurées: Claude + Supabase");
    
    try {
        // Récupération des données
        const [gojuEvents, existingEvents] = await Promise.all([
            getValidatedEventsFromGoju(),
            getAllExistingEvents()
        ]);
        
        if (gojuEvents.length === 0) {
            console.log("\n🎉 Aucun événement validé à transférer. Tout est à jour !");
            rl.close();
            return;
        }
        
        console.log(`\n📋 ÉTAT INITIAL:`);
        console.log(`   📥 Événements à traiter (goju): ${gojuEvents.length}`);
        console.log(`   📚 Événements existants (evenements): ${existingEvents.length}`);
        
        // Affichage des événements à traiter
        console.log(`\n📝 ÉVÉNEMENTS À TRAITER:`);
        gojuEvents.slice(0, 10).forEach((event, index) => {
            console.log(`   ${index + 1}. "${event.titre}" (${extractYear(event.date || event.date_formatee)})`);
        });
        if (gojuEvents.length > 10) {
            console.log(`   ... et ${gojuEvents.length - 10} autres`);
        }
        
        // Demande confirmation
        const proceed = await askQuestion('\n🤔 Procéder au transfert ? (oui/non): ');
        if (!proceed.toLowerCase().startsWith('o')) {
            console.log("❌ Transfert annulé par l'utilisateur");
            rl.close();
            return;
        }
        
        const startTime = Date.now();
        
        // Initialisation du système de progression
        const globalProgress = {
            processed: 0,
            total: gojuEvents.length,
            startTime: startTime
        };
        
        console.log(`\n🚀 === DÉMARRAGE DU TRANSFERT ===`);
        console.log(`📊 Total à traiter: ${gojuEvents.length} événements`);
        console.log(`📦 Traitement par lots de ${BATCH_SIZE} événements`);
        console.log(`⏰ Début: ${new Date().toLocaleTimeString('fr-FR')}`);
        
        // Traitement par lots
        const allResults = {
            transferred: [],
            duplicates: [],
            errors: []
        };
        
        for (let i = 0; i < gojuEvents.length; i += BATCH_SIZE) {
            const batch = gojuEvents.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(gojuEvents.length / BATCH_SIZE);
            
            const batchResults = await processBatchTransfer(batch, existingEvents, batchNumber, totalBatches, globalProgress);
            
            // Agrégation des résultats
            allResults.transferred.push(...batchResults.transferred);
            allResults.duplicates.push(...batchResults.duplicates);
            allResults.errors.push(...batchResults.errors);
            
            // Progression globale après le lot
            const globalElapsed = (Date.now() - startTime) / 1000;
            const globalProgressBar = createProgressBar(globalProgress.processed, globalProgress.total, 40);
            const globalTimeRemaining = formatTimeRemaining(globalElapsed, globalProgress.processed, globalProgress.total);
            
            console.log(`\n   📊 PROGRESSION GLOBALE:`);
            console.log(`   ${globalProgressBar}`);
            console.log(`   ⏱️  Temps écoulé: ${Math.floor(globalElapsed/60)}min ${(globalElapsed%60).toFixed(0)}s | ${globalTimeRemaining}`);
            console.log(`   ✅ Transférés: ${allResults.transferred.length} | ❌ Doublons: ${allResults.duplicates.length} | 💥 Erreurs: ${allResults.errors.length}`);
            
            // Rapport de lot
            console.log(`\n   📋 BILAN LOT ${batchNumber}/${totalBatches}:`);
            console.log(`      ✅ Transférés: ${batchResults.transferred.length}/${batch.length}`);
            console.log(`      ❌ Doublons évités: ${batchResults.duplicates.length}/${batch.length}`);
            console.log(`      💥 Erreurs: ${batchResults.errors.length}/${batch.length}`);
            
            if (i + BATCH_SIZE < gojuEvents.length) {
                console.log("   ⏳ Pause 3s avant lot suivant...");
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        
        // RAPPORT FINAL AVEC PROGRESSION
        const totalTime = (Date.now() - startTime) / 1000;
        const successRate = ((allResults.transferred.length / gojuEvents.length) * 100).toFixed(1);
        const finalProgressBar = createProgressBar(gojuEvents.length, gojuEvents.length, 50);
        
        console.log(`\n🎉 === TRANSFERT TERMINÉ ===`);
        console.log(`📊 ${finalProgressBar}`);
        console.log(`✅ Événements transférés: ${allResults.transferred.length}/${gojuEvents.length} (${successRate}%)`);
        console.log(`❌ Doublons évités: ${allResults.duplicates.length}`);
        console.log(`💥 Erreurs: ${allResults.errors.length}`);
        console.log(`⏱️ Temps total: ${Math.floor(totalTime/60)}min ${(totalTime%60).toFixed(0)}s`);
        console.log(`📈 Vitesse: ${(gojuEvents.length / (totalTime / 60)).toFixed(1)} événements/min`);
        
        // Barre de répartition visuelle
        const transferredPct = Math.round((allResults.transferred.length / gojuEvents.length) * 30);
        const duplicatesPct = Math.round((allResults.duplicates.length / gojuEvents.length) * 30);
        const errorsPct = Math.round((allResults.errors.length / gojuEvents.length) * 30);
        const remainingPct = 30 - transferredPct - duplicatesPct - errorsPct;
        
        const resultBar = '✅'.repeat(transferredPct) + '❌'.repeat(duplicatesPct) + '💥'.repeat(errorsPct) + '⬜'.repeat(Math.max(0, remainingPct));
        console.log(`📊 Répartition: [${resultBar}]`);
        console.log(`   ✅ Transférés  ❌ Doublons  💥 Erreurs`);
        
        // Détails des doublons
        if (allResults.duplicates.length > 0) {
            console.log(`\n📋 DOUBLONS DÉTECTÉS ET ÉVITÉS:`);
            allResults.duplicates.forEach((dup, index) => {
                console.log(`   ${index + 1}. "${dup.gojuEvent}" ≈ "${dup.duplicateOf}" (${dup.confidence})`);
                console.log(`      Raison: ${dup.reason}`);
            });
        }
        
        // Détails des erreurs
        if (allResults.errors.length > 0) {
            console.log(`\n💥 ERREURS RENCONTRÉES:`);
            allResults.errors.forEach((err, index) => {
                console.log(`   ${index + 1}. "${err.title}": ${err.error}`);
            });
        }
        
        // Résumé des transferts réussis
        if (allResults.transferred.length > 0) {
            console.log(`\n✅ NOUVEAUX ÉVÉNEMENTS DANS LE JEU:`);
            allResults.transferred.slice(0, 10).forEach((transfer, index) => {
                console.log(`   ${index + 1}. "${transfer.title}"`);
            });
            if (allResults.transferred.length > 10) {
                console.log(`   ... et ${allResults.transferred.length - 10} autres`);
            }
        }
        
        console.log(`\n🎮 Votre jeu Quandi contient maintenant ${existingEvents.length + allResults.transferred.length} événements !`);
        
    } catch (error) {
        console.error(`\n💥 Erreur fatale:`, error);
    } finally {
        rl.close();
    }
}

function askQuestion(query) { 
    return new Promise(resolve => rl.question(query, resolve)); 
}

// ==============================================================================
// LANCEMENT DU SCRIPT
// ==============================================================================

main().catch(error => { 
    console.error("\n💥 Erreur fatale:", error); 
    rl.close(); 
});