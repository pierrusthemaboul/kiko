
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { getSupabase, logDecision } from '../shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    isExactDuplicate,
    selectBestCandidates,
    generateDetectionStats
} from './duplicate_detector.mjs';

const agentName = "SENTINEL";
const supabaseLocal = getSupabase('local');
const supabaseProd = getSupabase('prod');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    try {
        const inputPath = path.join(process.cwd(), '../GENESIS/STORAGE/OUTPUT/genesis_raw_batch.json');
        if (!fs.existsSync(inputPath)) {
            console.error("[SENTINEL] Erreur: genesis_raw_batch.json absent.");
            process.exit(1);
        }

        const rawEvents = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        console.log(`[SENTINEL] Analyse de ${rawEvents.length} événements...`);

        // --- ÉTAPE 1 : RÉCUPÉRATION DE TOUTE LA BASE ---
        console.log("[SENTINEL] Chargement de l'index complet (Production: evenements | Local: queue, goju)...");
        let allExisting = [];
        let from = 0;
        let step = 1000;
        let hasMore = true;

        while (hasMore) {
            // ON INTERROGE LA PRODUCTION POUR LES ARCHIVES
            const { data, error } = await supabaseProd
                .from('evenements')
                .select('titre, date')
                .range(from, from + step - 1);

            if (error) {
                console.error("[SENTINEL] ⚠️ Erreur lecture Production (table evenements). On bascule sur le Local si possible.");
                // Fallback local si la clé prod est absente ou invalide
                const { data: localData, error: localError } = await supabaseLocal
                    .from('evenements')
                    .select('titre, date')
                    .range(from, from + step - 1);

                if (localError) throw localError;

                const processedLocal = localData.map(e => ({
                    titre: e.titre,
                    year: parseInt(e.date.split('-')[0])
                }));
                allExisting = allExisting.concat(processedLocal);
                if (localData.length < step) hasMore = false;
                else from += step;
            } else {
                const processedData = data.map(e => ({
                    titre: e.titre,
                    year: parseInt(e.date.split('-')[0])
                }));
                allExisting = allExisting.concat(processedData);
                if (data.length < step) hasMore = false;
                else from += step;
            }
        }

        // --- RESTE EN LOCAL ---
        // On ajoute aussi la file d'attente actuelle (ici year existe)
        const { data: queueData } = await supabaseLocal.from('queue_sevent').select('titre, year');
        if (queueData) allExisting = allExisting.concat(queueData);

        // On ajoute aussi la table de staging goju2
        const { data: gojuData } = await supabaseLocal.from('goju2').select('titre, date_formatee');
        if (gojuData) {
            const processedGoju = gojuData.map(e => ({
                titre: e.titre,
                year: parseInt(e.date_formatee)
            }));
            allExisting = allExisting.concat(processedGoju);
        }

        // On ajoute aussi les événements validés au cours de cette session (mémoire inter-cycles)
        const sessionPath = path.join(process.cwd(), '../session_history.json');
        if (fs.existsSync(sessionPath)) {
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            if (sessionData) allExisting = allExisting.concat(sessionData);
        }

        console.log(`[SENTINEL] Index chargé : ${allExisting.length} événements à comparer.`);

        // --- ÉTAPE 2 : FILTRAGE INDIVIDUEL ---
        const filteredEvents = [];
        const rejections = [];
        const currentBatchSeen = new Set(); // Pour détecter les doublons au sein du même batch
        let preFilterRejects = 0;
        let aiRejects = 0;

        // Sujets sensibles — risque d'illustration problématique (conflits religieux/culturels)
        const SENSITIVE_KEYWORDS = [
            'mahomet', 'muhammad', 'mohammed', 'prophete', 'prophet',
            'coran', 'quran', 'hegire', 'hijra',
            'caricatures de mahomet', 'charlie hebdo',
        ];

        function isSensitiveEvent(titre) {
            const norm = titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            return SENSITIVE_KEYWORDS.some(kw => norm.includes(kw));
        }

        // 🚫 FILTRE DES TITRES DE TYPE "PLAGE DE TEMPS" (ex: Règne de...)
        function isRangeTitle(titre) {
            const norm = titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .trim();
            // Liste des mots-clés de "durée" interdits comme titre principal
            const rangeStart = ['regne de ', "regne d'", 'dynastie ', 'epoque de ', 'siecle de '];
            const isRange = rangeStart.some(start => norm.startsWith(start));

            if (isRange) {
                // On autorise si un mot-clé "événementiel" est présent pour préciser
                const eventKeywords = ['debut', 'fin', 'mort', 'sacre', 'couronnement', 'accession', 'avenement', 'chute'];
                const hasEventKeyword = eventKeywords.some(kw => norm.includes(kw));
                return !hasEventKeyword;
            }
            return false;
        }

        // 🚫 FILTRE LES TITRES CONTENANT UNE ANNÉE (ex: Bataille de... (1066))
        function hasYearInTitle(titre) {
            return /\(\d{1,4}/.test(titre) || /\b(1[0-9]|20)[0-9]{2}\b/.test(titre);
        }

        for (const event of rawEvents) {
            console.log(`\n🔍 Vérification : "${event.titre}" (${event.year})`);

            // 🚫 FILTRE ANNÉES DANS LE TITRE
            if (hasYearInTitle(event.titre)) {
                const reason = `Le titre contient une année ou une date ("${event.titre}"). Les dates sont interdites dans les titres pour préserver le gameplay.`;
                console.log(`   ❌ REJETÉ (DATE): ${reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: 'YEAR_IN_TITLE'
                });
                preFilterRejects++;
                continue;
            }

            // 🚫 FILTRE SUJETS SENSIBLES (Religieux/Culturels)
            if (isSensitiveEvent(event.titre)) {
                const reason = `Sujet sensible détecté (risque d'illustration problématique).`;
                console.log(`   ❌ REJETÉ (SENSIBLE): ${reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: 'SENSITIVE_TOPIC'
                });
                preFilterRejects++;
                continue;
            }

            // 🚫 FILTRE TITRES PLAGES DE TEMPS
            if (isRangeTitle(event.titre)) {
                const reason = `Titre de type "durée/plage" détecté ("${event.titre}"). Un événement doit être un point précis dans le temps (ex: "Sacre de...", "Mort de...", "Bataille de...").`;
                console.log(`   ❌ REJETÉ (DURÉE): ${reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: 'RANGE_TITLE'
                });
                preFilterRejects++;
                continue;
            }

            // 🚫 FILTRE DOUBLONS INTRA-BATCH (Même batch incoming)
            const batchKey = `${event.year}_${event.titre.toLowerCase().trim()}`;
            if (currentBatchSeen.has(batchKey)) {
                const reason = `Doublon détecté au sein du même batch.`;
                console.log(`   ❌ REJETÉ (BATCH): ${reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: 'INTRA_BATCH_DUPE'
                });
                preFilterRejects++;
                continue;
            }

            // 🚫 FILTRE ANTI-AVANT-J.-C.
            // Liste noire d'événements connus avant J.-C.
            const BLACKLIST_AVANT_JC = [
                'alesia', 'vercingetorix', 'guerre des gaules', 'cesar', 'jules cesar',
                'bataille de bibracte', 'gergovie', 'uxellodunum'
            ];

            const titreNorm = event.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const isBlacklisted = BLACKLIST_AVANT_JC.some(keyword => titreNorm.includes(keyword));

            // Rejeter si année < 100 (probablement avant J.-C.) OU si dans la liste noire
            if (event.year < 100 || isBlacklisted) {
                const reason = event.year < 100
                    ? `Année ${event.year} trop ancienne (probablement avant J.-C.). Dans ce jeu, seuls les événements après l'an 0 sont acceptés.`
                    : `Événement de la liste noire (connu comme étant avant J.-C.) : contient "${BLACKLIST_AVANT_JC.find(k => titreNorm.includes(k))}"`;

                console.log(`   ❌ REJETÉ (AVANT J.-C.): ${reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: 'BEFORE_CHRIST',
                    matchedWith: null
                });
                preFilterRejects++;
                continue;
            }

            // Recherche de candidats proches (+/- 10 ans pour plus de sécurité)
            const candidates = allExisting.filter(e => Math.abs(e.year - event.year) <= 10);

            if (candidates.length === 0) {
                console.log(`   ✅ Inédit (Aucun événement à +/- 4 ans)`);
                filteredEvents.push(event);
                currentBatchSeen.add(batchKey); // Marquer comme vu pour la suite du batch
                continue;
            }

            console.log(`   📊 ${candidates.length} candidats trouvés dans la fenêtre ±4 ans`);

            // 🆕 ÉTAPE 2A : PRÉ-FILTRE EXACT (avant l'IA)
            console.log(`   🔬 Pré-filtre : recherche de doublons exacts...`);
            const exactCheck = isExactDuplicate(event, candidates);

            if (exactCheck.isDuplicate) {
                console.log(`   ❌ REJETÉ (pré-filtre ${exactCheck.strategy}): ${exactCheck.reason}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: exactCheck.reason,
                    rejectionType: 'PRE_FILTER',
                    strategy: exactCheck.strategy,
                    matchedWith: exactCheck.match?.titre
                });
                preFilterRejects++;
                continue;
            }

            console.log(`   ✓ Pré-filtre OK - Passage à l'analyse IA`);

            // ÉTAPE 2B : ANALYSE IA (seulement si pré-filtre ne trouve rien)
            // Sélectionner les meilleurs candidats (max 20, triés par pertinence)
            const bestCandidates = selectBestCandidates(event, candidates, 20);
            console.log(`   🤖 Analyse IA de ${bestCandidates.length} candidats prioritaires...`);

            const prompt = `
Tu es SENTINEL, un agent de détection de doublons ULTRA-STRICT.

ÉVÉNEMENT À VALIDER : "${event.titre}" (${event.year})

ÉVÉNEMENTS EXISTANTS PROCHES (±4 ans) :
${JSON.stringify(bestCandidates, null, 2)}

⚠️ RÈGLES DE REJET (MODE STRICT) :

1. REJET IMMÉDIAT si le titre est identique ou quasi-identique
   Exemple: "Prise de la Bastille" vs "Prise de la Bastille" → REJET

2. REJET si c'est le MÊME fait historique, même avec un titre différent
   Exemples:
   - "Couronnement de Charlemagne" vs "Charlemagne sacré empereur" → REJET
   - "Bataille de Poitiers" vs "Victoire de Charles Martel" (732) → REJET
   - "Siège d'Orléans" vs "Victoire de Jeanne d'Arc à Orléans" → REJET

3. REJET si c'est un doublon conceptuel (même type d'événement, même lieu, même année)
   Exemple: "Première ligne de chemin de fer Paris-Rouen" vs "Inauguration du train Paris-Rouen" → REJET

4. ACCEPTATION uniquement si c'est un fait TOTALEMENT distinct
   - Événement différent
   - Lieu différent OU année différente
   - Pas de confusion possible

5. REJET si le titre est HISTORIQUEMENT AMBIGU (Homonymie)
   Certains noms (Siège de Constantinople, Bataille de Poitiers, Sac de Rome) sont trop génériques car ils se sont produits plusieurs fois.
   - REJETTE si le titre est l'un de ces noms "nus" sans qualificatif entre parenthèses.
   - EXIGE un titre qualifié (ex: "Siège de Constantinople (Mourad II)").

🎯 EN CAS DE DOUTE, REJETTE. Il vaut mieux rejeter un événement unique que d'accepter un doublon.

Réponds UNIQUEMENT en JSON :
{
  "isDuplicate": true/false,
  "reason": "Explication claire et précise",
  "matchedWith": "Titre de l'événement existant le plus proche (si doublon, sinon null)"
}
`;

            // Fonction de secours pour appeler l'IA avec gestion des quotas
            async function generateWithRetry(prompt, retries = 3, delayMs = 2000) {
                for (let i = 0; i < retries; i++) {
                    try {
                        const result = await model.generateContent(prompt);
                        return JSON.parse(result.response.text());
                    } catch (err) {
                        if (err.message.includes('429') && i < retries - 1) {
                            console.log(`   ⏳ Quota atteint (429). Nouvelle tentative dans ${delayMs / 1000}s...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                            delayMs *= 2; // On double le temps d'attente à chaque fois
                            continue;
                        }
                        throw err;
                    }
                }
            }

            const decision = await generateWithRetry(prompt);

            // ⏳ Pause de sécurité pour le quota global
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (decision.isDuplicate) {
                console.log(`   ❌ REJETÉ (IA): ${decision.reason || 'Doublon détecté'}`);
                rejections.push({
                    titre: event.titre,
                    year: event.year,
                    reason: decision.reason || 'Doublon',
                    rejectionType: 'AI_DECISION',
                    matchedWith: decision.matchedWith
                });
                aiRejects++;
            } else {
                console.log(`   ✅ VALIDÉ (IA): ${decision.reason || 'Événement unique et distinct'}`);
                filteredEvents.push(event);
                currentBatchSeen.add(batchKey);
            }
        }

        console.log(`\n📈 Statistiques de filtrage:`);
        console.log(`   - Total analysés: ${rawEvents.length}`);
        console.log(`   - Rejetés (pré-filtre): ${preFilterRejects}`);
        console.log(`   - Rejetés (IA): ${aiRejects}`);
        console.log(`   - Validés: ${filteredEvents.length}`);

        // --- ÉTAPE 3 : SORTIE ---
        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/sentinel_filtered_ids.json');
        fs.writeFileSync(outputPath, JSON.stringify(filteredEvents, null, 2));

        // --- ÉTAPE 4 : AUDIT DÉTAILLÉ ---
        const detectionStats = generateDetectionStats(rejections);

        const auditReport = {
            timestamp: new Date().toISOString(),
            session: {
                totalGenerated: rawEvents.length,
                totalAccepted: filteredEvents.length,
                totalRejected: rejections.length,
                acceptanceRate: ((filteredEvents.length / rawEvents.length) * 100).toFixed(1) + '%',
                rejectionRate: ((rejections.length / rawEvents.length) * 100).toFixed(1) + '%'
            },
            rejectionBreakdown: {
                preFilter: preFilterRejects,
                aiDecision: aiRejects
            },
            detectionStrategies: {
                exactMatch: detectionStats.exactMatch,
                highSimilarity: detectionStats.highSimilarity,
                keywordMatch: detectionStats.keywordMatch,
                similarityCloseYear: detectionStats.similarityCloseYear,
                aiDecision: detectionStats.aiDecision
            },
            acceptedEvents: filteredEvents.map(e => ({
                titre: e.titre,
                year: e.year
            })),
            rejectedEvents: rejections.map(r => ({
                titre: r.titre,
                year: r.year,
                reason: r.reason,
                rejectionType: r.rejectionType,
                strategy: r.strategy || 'AI',
                matchedWith: r.matchedWith || null
            })),
            performance: {
                preFilterEfficiency: `${((preFilterRejects / rejections.length) * 100).toFixed(1)}% des rejets sans appel IA`,
                aiCalls: rawEvents.length - preFilterRejects,
                estimatedCostSaved: `~${preFilterRejects} appels IA évités`
            }
        };

        const auditPath = path.join(process.cwd(), 'STORAGE/OUTPUT/sentinel_audit_report.json');
        fs.writeFileSync(auditPath, JSON.stringify(auditReport, null, 2));

        console.log(`\n📊 Rapport d'audit généré: sentinel_audit_report.json`);
        console.log(`   Efficacité du pré-filtre: ${auditReport.performance.preFilterEfficiency}`);
        console.log(`   Appels IA effectués: ${auditReport.performance.aiCalls}/${rawEvents.length}`);

        logDecision(agentName, 'FILTER_SESSION', { total: rawEvents.length }, 'SUCCESS', `${filteredEvents.length} conservés`, {
            rejections: rejections.length,
            preFilterRejects,
            aiRejects
        });

    } catch (e) {
        logDecision(agentName, 'FILTER_ERROR', {}, 'ERROR', e.message);
        console.error("[SENTINEL] Erreur fatale:", e.message);
        process.exit(1);
    }
}

main();
