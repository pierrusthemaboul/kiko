import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// --- GESTION DES BASES DE DONNÉES ---
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

function assertEnv(name, value) {
    if (!value || String(value).trim().length === 0) {
        throw new Error(`Configuration manquante: ${name}`);
    }
}

function assertStartupConfig() {
    assertEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    assertEnv('SUPABASE_PROD_SERVICE_ROLE_KEY', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
    assertEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    assertEnv('GEMINI_API_KEY', process.env.GEMINI_API_KEY);
    assertEnv('OPENAI_API_KEY', process.env.OPENAI_API_KEY);
}

// --- FICHIER DE SAUVEGARDE DE PROGRESSION ---
const PROGRESS_FILE = path.join(__dirname, 'prospecteur_state.json');
function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
    return { completedYears: [] };
}
function saveProgress(state) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

// Fonction utilitaire pour diviser un tableau en lots (batching) pour éviter le rate-limit
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Fonction utilitaire de Fetch Sécurisé (Timeout + Retry + Gestion du Rate Limit 429)
async function fetchWithRetry(url, options, maxRetries = 3, timeoutMs = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            // Si on se prend un mur de quota (429), on attend plus longtemps
            if (res.status === 429) {
                console.warn(`⏳ [HTTP 429 - Rate Limit] On se calme, attente avant tentative ${attempt + 1}/${maxRetries}...`);
                await new Promise(r => setTimeout(r, 6000 * attempt));
                continue;
            }
            if (!res.ok) throw new Error(`HTTP Error: ${res.statusText}`);
            return res;
        } catch (err) {
            clearTimeout(timeoutId);
            if (attempt === maxRetries) throw err;
            console.warn(`🔄 [Erreur Réseau/Timeout] Tentative ${attempt} échouée, nouvel essai dans 15s... (${err.message})`);
            await new Promise(r => setTimeout(r, 15000));
        }
    }
}

// --- FONCTIONS IA ---
async function generateNewEvents(year, listeX) {
    const isPeriod = year < 1000;
    const periodLabel = isPeriod ? `entre l'an ${year} et l'an ${year + 4}` : `exactement en l'an ${year}`;
    const logLabel = isPeriod ? `la période ${year}-${year + 4}` : `l'année ${year}`;

    console.log(`\n🤖 [RÔLE 1: Prospecteur] Demande de 10 événements pour ${logLabel} (Gemini)...`);
    const apiKey = process.env.GEMINI_API_KEY;

    const prompt = `
        Tu es un historien de génie travaillant sur un jeu de culture générale destiné avant tout à un public FRANÇAIS.
        Trouve 10 événements historiques MAJEURS qui se sont originellement déroulés ${periodLabel}.
        
        CONTRAINTE ABSOLUE SUR LE CONTENU :
        Tu ne dois sous aucun prétexte utiliser les événements de cette liste : ${listeX.length > 0 ? listeX.join(", ") : "(Aucun pour le moment)"}.
        
        RÈGLES DE TITRAGE (OBLIGATOIRE, SINON ECHEC CRITIQUE) :
        1. INTERDICTION FORMELLE DE METTRE UNE DATE dans le titre (pas de "Loi de 1850", "Compromis de 1850", etc.).
        2. Tu DOIS remplacer la date par un qualificatif historique fort ou un protagoniste pour désambiguïser l'événement.
        3. PAS DE PARAPHRASE POÉTIQUE NI DE TITRE VAGUE ("Le géant des airs", "Les inondations", "Les troubles urbains"). Tu dois donner le VRAI NOM explicite du sujet (ex: "Le premier vol de l'Airbus A380", "Les émeutes des banlieues françaises", "La sortie du film La Marche de l'Empereur").
        4. Le titre doit être parfaitement spécifique, autonome et sans ambiguïté.
        
        RÉPARTITION ET DIVERSITÉ (OBLIGATOIRE) :
        1. PRISME FRANÇAIS : Les événements du monde (is_universal: true) doivent être pertinents pour un joueur de culture francophone.
        2. THÉMATIQUES : Choisis parmi : "Politique", "Arts & Culture", "Science & Technologie", "Société & Social", "Exploration & Découvertes", "Santé & Médecine", "Catastrophes & Environnement", "Guerre & Militaire", "Religion & Spiritualité".
        3. QUOTA : MAXIMUM 4 événements par catégorie pour forcer une très grande diversité ! Ne fais pas que de la politique.
        
        Quotas Géographiques demandés :
        - 5 événements concernant l'Histoire de France (is_universal: false)
        - 5 événements internationaux pertinents (is_universal: true)
        
        Renvoie-moi UNIQUEMENT ton résultat en JSON valide au format suivant :
        [
            { 
                "titre": "Nom précis (ZÉRO DATE)", 
                "is_universal": true ou false, 
                "description": "Une phrase courte",
                "types_evenement": "Catégorie",
                "notoriete": un chiffre de 40 à 100
            }
        ]
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
        })
    }, 3, 60000); // 60 secondes de timeout pour Gemini

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Réponse Gemini vide ou invalide");

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        let parsed = JSON.parse(text);
        if (!Array.isArray(parsed) && parsed.evenements) parsed = parsed.evenements;
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("❌ Erreur de parsing du JSON de Gemini :", e.message, text);
        return [];
    }
}

function isLocalDuplicate(newTitre, listeX) {
    const cleanStr = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNew = cleanStr(newTitre);
    for (const oldTitre of listeX) {
        if (cleanNew === cleanStr(oldTitre)) return true;
    }
    return false;
}

async function checkAmbiguity(titre) {
    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = `Tu es l'arbitre intraitable d'un jeu de culture générale français où toutes les dates sont masquées.
Le joueur va lire ce titre de carte EXACTEMENT comme ceci : "${titre}".

Ta mission est de vérifier DEUX CHOSES ABSOLUES :
1. AMBIGUÏTÉ (Règle d'or) : Sans voir l'année, ce titre pourrait-il s'appliquer à PLUSIEURS occurrences différentes dans l'Histoire ?
   (Exemples qui ÉCHOUENT car trop vagues : "Émeutes en banlieue", "Crue de la Seine", "Élection présidentielle", "Guerre Civile", "Séisme meurtrier").
   (Exemples qui RÉUSSISSENT car uniques : "Crue centennale de la Seine", "Premier vol du Concorde", "Chute du mur de Berlin").
   
2. DÉONTOLOGIE ET TONALITÉ : Le jeu doit rester un divertissement intellectuel. Le titre aborde-t-il des sujets de trauma absolu, des génocides (notamment la Shoah / l'Holocauste), la torture systémique, ou le meurtre de civils/enfants/personnes privées ? (ex: "Début de la rafle du Vel' d'Hiv", "L'ouverture du camp d'Auschwitz", "Suite à la mort de Zyed et Bouna"). Si oui, c'est injouable éthiquement et cela casse le ton du jeu.

RÉPONSE ATTENDUE :
Réponds UNIQUEMENT par "OUI" si le titre représente de façon indéniable UN SEUL événement historique extrêmement précis et jouable déontologiquement.
Réponds UNIQUEMENT par "NON" si le titre est répétitif, vague, ou s'il aborde la Shoah, un génocide, ou un drame privé/traumatique inapproprié pour un jeu de société.`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        })
    });
    const data = await res.json();
    const answer = data.choices[0].message.content.trim().toUpperCase();
    return answer.includes("OUI");
}

async function checkSemanticDuplicate(newTitre, listeX) {
    if (listeX.length === 0) return false;
    const apiKey = process.env.OPENAI_API_KEY;
    const prompt = `Voici un nouvel événement : "${newTitre}"
Voici une liste d'événements existants : ${listeX.join(", ")}
Ce nouvel événement décrit-il EXACTEMENT LA MÊME CHOSE qu'un élément de la liste existante, même s'il est formulé un peu différemment ?
Réponds STRICTEMENT par "OUI" ou "NON" et rien d'autre.`;

    const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        })
    });
    const data = await res.json();
    const answer = data.choices[0].message.content.trim().toUpperCase();
    return answer.includes("OUI");
}

async function factCheckEvent(titre, annee) {
    const isPeriod = annee < 1000;
    const periodStr = isPeriod ? `entre ${annee} et ${annee + 4}` : `vers ${annee}`;

    const apiKey = process.env.GEMINI_API_KEY;
    const prompt = `L'événement "${titre}" (qui se serait déroulé ${periodStr}) est-il un événement historique RÉEL, avéré, et largement documenté ?
 Est-ce que son titre est EXPLICITE et PRÉCIS (pas de devinette poétique, pas de résumé vague) ?
 Réponds STRICTEMENT par "OUI" ou "NON" et rien d'autre.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 }
        })
    }, 3, 60000);

    const data = await res.json();
    const answer = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().toUpperCase();
    return answer.includes('OUI');
}

// --- BOUCLE PRINCIPALE ---
async function runProspector() {
    console.log("=======================================");
    console.log("   🚀 DÉMARRAGE DU PROSPECTEUR - KIKO  ");
    console.log("=======================================\n");

    try {
        assertStartupConfig();
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const state = loadProgress();

    // On démarre toujours du plafond (2010 par défaut).
    const startYear = 2010;
    const endYear = 476; // On descend jusqu'à la chute de l'Empire romain (476)

    console.log(`📡 Le mineur démarre depuis l'année : ${startYear} (Descente jusqu'à : ${endYear})`);

    // --- MISE EN CACHE GLOBALE (Anti-Doublons Inter-Années) ---
    console.log("📥 Chargement de la mémoire temporelle globale...");
    let globalEvents = [];
    let page = 0;
    while (true) {
        const { data, error } = await prodDb.from('evenements').select('titre, date').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) break;
        if (!data || data.length === 0) break;
        data.forEach(e => {
            const y = e.date ? parseInt(e.date.substring(0, 4)) : 0;
            globalEvents.push({ titre: e.titre, year: y });
        });
        page++;
    }
    // On charge aussi ce qu'on a déjà miné dans boumboum
    const { data: localData } = await localDb.from('labo').select('titre, year');
    if (localData) {
        globalEvents = globalEvents.concat(localData);
    }
    console.log(`🧠 Mémoire chargée avec ${globalEvents.length} événements. Le script est maintenant omniscient sur les dates.\n`);

    let currentYear = startYear;

    // Boucle descendante automatique
    while (currentYear >= endYear) {
        // Au cas où une année aurait été validée isolément plus tard, on la saute
        if (state.completedYears.includes(currentYear)) {
            console.log(`\n⏭️  Année ${currentYear} déjà traitée, on passe...`);
            currentYear = currentYear > 1000 ? currentYear - 1 : currentYear - 5;
            continue;
        }

        const isPeriod = currentYear < 1000;
        const logLabel = isPeriod ? `la période ${currentYear}-${currentYear + 4}` : `l'année ${currentYear}`;

        console.log(`\n🗓️  TRAITEMENT DE : ${logLabel}`);

        try {
            // Création de ListeX contextuelle (+/- 3 ans pour 1 an, on l'étend à +/- 15 ans pour les vieux siècles sautés)
            const contextRadius = currentYear > 1000 ? 3 : 15;
            const contextEvents = globalEvents.filter(e => e.year >= currentYear - contextRadius && e.year <= currentYear + contextRadius);
            const listeX_context = [...new Set(contextEvents.map(e => e.titre))];

            // Liste globale uniquement pour les vérifications exactes (isLocalDuplicate)
            const globalListeX_titres = globalEvents.map(e => e.titre);

            console.log(`📚 Contexte (+/- ${contextRadius} ans) envoyé à l'IA : ${listeX_context.length} événements.`);

            const generatedProspects = await generateNewEvents(currentYear, listeX_context);
            console.log(`💡 Gemini a proposé ${generatedProspects.length} événements.\n`);

            // --- EXECUTION PARALLÈLE (BATCH DE 5) ---
            const validProspects = [];
            const batches = chunkArray(generatedProspects, 5); // Découpage par sous-groupes de 5

            let batchIndex = 1;
            for (const batch of batches) {
                console.log(`⏳ Traitement Parallèle du lot ${batchIndex}/${batches.length}...`);

                // Promise.all permet d'exécuter l'évaluation des 5 éléments simultanément !
                const batchResults = await Promise.all(batch.map(async (prospect) => {
                    try {
                        const title = prospect.titre;

                        if (isLocalDuplicate(title, globalListeX_titres)) {
                            console.log(`  🛡️  [Refusé Local]    : ${title}`);
                            return null;
                        }

                        if (await checkSemanticDuplicate(title, listeX_context)) {
                            console.log(`  ⛔ [Refusé Juge IA]  : ${title}`);
                            return null;
                        }

                        if (!(await checkAmbiguity(title))) {
                            console.log(`  🌫️ [Refusé Flou/Éthique] : ${title}`);
                            return null;
                        }

                        if (!(await factCheckEvent(title, currentYear))) {
                            console.log(`  💩 [Refusé FactCheck]: ${title}`);
                            return null;
                        }

                        console.log(`  ✅ [VALIDÉ PAR TOUS] : ${title}`);
                        return prospect;
                    } catch (e) {
                        console.error(`  ⚠️  [Erreur traitement] ${prospect.titre}:`, e.message);
                        return null; // On ignore cet event en cas d'erreur API interne
                    }
                }));

                // On garde seulement ceux qui n'ont pas renvoyé "null"
                validProspects.push(...batchResults.filter(Boolean));
                batchIndex++;

                // Toute petite pause anti-Spam d'API entre deux batches
                await new Promise(r => setTimeout(r, 600)); // Courte pause entre les lots de 5
            }

            // --- INSERTION BULK EN UNE SEULE REQUÊTE ---
            if (validProspects.length > 0) {
                console.log(`\n💾 Préparation de l'insertion de ${validProspects.length} événements dans labo...`);

                const rowsToInsert = validProspects.map(p => ({
                    titre: p.titre,
                    year: currentYear, // On stocke l'année de départ de la plage, ou l'année exacte
                    is_universal: p.is_universal === true,
                    notoriete: Number(p.notoriete),
                    description: p.description,
                    status: 'PENDING',
                    type: p.types_evenement || 'historical'
                }));

                const titres = rowsToInsert.map(r => r.titre);
                const { data: existing, error: existingErr } = await localDb
                    .from('labo')
                    .select('titre')
                    .in('titre', titres);

                if (existingErr) {
                    console.error("❌ Erreur vérification idempotence :", existingErr.message);
                }

                const existingSet = new Set((existing || []).map(e => e.titre));
                const toInsert = rowsToInsert.filter(r => !existingSet.has(r.titre));

                if (toInsert.length === 0) {
                    console.log(`🎉 SUCCÈS : 0 insertion (idempotence: tout existait déjà).`);
                } else {
                    const { error: insertErr } = await localDb.from('labo').insert(toInsert);

                    if (insertErr) {
                        console.error("❌ Erreur lors de l'insertion locale :", insertErr.message);
                    } else {
                        console.log(`🎉 SUCCÈS : ${toInsert.length} prospects sauvegardés dans la base locale !`);
                        // On les ajoute immédiatement à la mémoire globale pour qu'il n'y ait pas de doublons l'année prochaine (dans 5 min)
                        toInsert.forEach(p => globalEvents.push({ titre: p.titre, year: p.year }));
                    }
                }
            } else {
                console.log(`\n⚠️ Aucun prospect valide n'a pu être extrait pour ${logLabel}.`);
            }

            // Sauvegarde de progression
            if (!state.completedYears.includes(currentYear)) {
                state.completedYears.push(currentYear);
                saveProgress(state);
            }

            console.log(`\n🛑 Fin de ${logLabel}. Pause de 8 secondes avant le saut temporel suivant (Anti Rate-Limit)...`);
            await new Promise(r => setTimeout(r, 8000));

            // Calcul de la descente (Saut de 5 ans si avant l'an 1000)
            currentYear = currentYear > 1000 ? currentYear - 1 : currentYear - 5;

        } catch (err) {
            console.error(`🚨 Erreur critique sur l'année ${currentYear} :`, err.message);
            console.log("⏳ Pause de sécurité de 60s avant de retenter la même année...");
            // Si on crash, on ne touche pas à currentYear (grâce au while, on va retenter direct)
            await new Promise(r => setTimeout(r, 60000));
            continue;
        }
    }
    console.log("\n💥 SCRIPT TERMINÉ !");
}

runProspector();

