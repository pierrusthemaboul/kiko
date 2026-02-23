import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Fonction de normalisation
function normalizeTitle(titre) {
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Fonction de similarité de Levenshtein
function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

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

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Détection de doublons sémantiques
function isSementicDuplicate(event1, event2) {
    if (event1.year !== event2.year) return false;
    const norm1 = normalizeTitle(event1.titre);
    const norm2 = normalizeTitle(event2.titre);
    const similarity = calculateSimilarity(norm1, norm2);
    return similarity >= 0.70;
}

async function startSession() {
    let arg1 = process.argv[2];
    let TARGET = 10;
    let THEME = "Histoire de France";

    if (arg1 && !isNaN(parseInt(arg1))) {
        TARGET = parseInt(arg1);
        if (process.argv.length > 3) {
            THEME = process.argv.slice(3).join(' ');
        }
    } else if (arg1) {
        THEME = process.argv.slice(2).join(' ');
    }

    console.clear();
    console.log("========================================");
    console.log("   🏛️  LE BUREAU DES AGENTS KIKO");
    console.log("========================================\n");

    // ÉTAPE 1 : Vérification de la connexion locale (Anciennement sync prod)
    console.log("🔌 Vérification de la connexion locale...");
    // Plus de synchronisation automatique avec la prod pour éviter d'écraser les données locales non migrées
    // execSync('node sync_prod_to_local.mjs', { stdio: 'inherit' });
    console.log("✅ Prêt.");

    if (process.argv.length <= 2) {
        console.log("Bienvenue. Sur quoi travaillons-nous aujourd'hui ?");
        console.log("(Ex: 'Francois 1er', '2ème guerre mondiale', '10 événements sur Voltaire')\n");
        const answer = await askQuestion("👉 ");

        if (answer) {
            // Extraction intelligente du nombre d'événements
            // Cherche "(X événements)", "X événements sur", etc.
            const countMatch = answer.match(/(\d+)\s*événements?/i);

            if (countMatch) {
                TARGET = parseInt(countMatch[1]);
                // Le thème est tout ce qui n'est pas le bloc du nombre, sans les parenthèses et sans le "sur" de liaison
                THEME = answer
                    .replace(countMatch[0], '')     // Retire "5 événements"
                    .replace(/\s*sur\s*/i, ' ')    // Retire le " sur " si présent
                    .replace(/[()]/g, '')           // Retire les parenthèses résiduelles
                    .replace(/\s+/g, ' ')           // Nettoie les espaces doubles
                    .trim();

                // Si après nettoyage le thème est vide, on garde un défaut
                if (!THEME) THEME = "Histoire de France";
            } else {
                // Fallback sur le format simple "10 Voltaire" au début
                const simpleMatch = answer.match(/^(\d+)\s+(.*)/i);
                if (simpleMatch) {
                    TARGET = parseInt(simpleMatch[1]);
                    THEME = simpleMatch[2];
                } else {
                    THEME = answer;
                }
            }
        }
    }

    const MAX_ATTEMPTS = 100;
    const BATCH_SIZE = Math.max(10, Math.ceil(TARGET * 1.2));

    console.log(`\n🎯 Objectif : ${TARGET} événements validés`);
    console.log(`📚 Thème    : ${THEME}`);
    console.log(`📦 Batch    : ${BATCH_SIZE} par cycle\n`);

    console.log("─".repeat(40));

    // Nettoyage de l'historique de session précédente
    const sessionPath = path.resolve('./machine_a_evenements/AGENTS/session_history.json');
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);

    await executeOrchestration(TARGET, THEME, BATCH_SIZE, MAX_ATTEMPTS);
    process.exit(0);
}

async function executeOrchestration(TARGET, THEME, BATCH_SIZE, MAX_ATTEMPTS) {
    const startTime = Date.now();
    let validatedEvents = [];
    let attempts = 0;
    let totalGenerated = 0;
    let totalRejected = 0;

    while (validatedEvents.length < TARGET && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`\n🔄 CYCLE ${attempts} - Progression: ${validatedEvents.length}/${TARGET} validés\n`);

        try {
            // ÉTAPE 1: GENESIS (avec le thème passé en argument)
            console.log(`📝 [GENESIS] Génération de ${BATCH_SIZE} événements sur "${THEME}"...`);
            execSync(`node agent.js ${BATCH_SIZE} "${THEME}"`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/GENESIS'),
                stdio: 'inherit'
            });
            totalGenerated += BATCH_SIZE;

            // ÉTAPE 2: SENTINEL
            console.log(`\n🛡️  [SENTINEL] Filtrage des doublons...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/SENTINEL'),
                stdio: 'inherit'
            });

            // ÉTAPE 3: Lire les résultats
            const filteredPath = 'machine_a_evenements/AGENTS/SENTINEL/STORAGE/OUTPUT/sentinel_filtered_ids.json';
            const auditPath = 'machine_a_evenements/AGENTS/SENTINEL/STORAGE/OUTPUT/sentinel_audit_report.json';

            if (fs.existsSync(filteredPath)) {
                const newValidated = JSON.parse(fs.readFileSync(filteredPath, 'utf-8'));
                const audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

                for (const event of newValidated) {
                    const exists = validatedEvents.some(e => isSementicDuplicate(e, event));
                    if (!exists) {
                        validatedEvents.push(event);
                    } else {
                        const duplicate = validatedEvents.find(e => isSementicDuplicate(e, event));
                        console.log(`   ⚠️  Doublon sémantique détecté: "${event.titre}" (similaire à "${duplicate.titre}")`);
                    }
                }

                // Collecte des rejets pour la mémoire de session
                const sessionRejections = audit.rejectedEvents || [];

                totalRejected += audit.session.totalRejected;
                console.log(`\n✅ ${newValidated.length} nouveaux événements validés`);
                console.log(`📊 Total accumulé: ${validatedEvents.length}/${TARGET}`);

                // Sauvegarde temporaire partagée pour que les agents détectent les doublons entre cycles
                const sessionPath = path.resolve('./machine_a_evenements/AGENTS/session_history.json');
                const sessionData = {
                    validated: validatedEvents,
                    rejections: sessionRejections.map(r => ({ titre: r.titre, year: r.year, reason: r.reason }))
                };
                fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
            }

            if (attempts >= 3 && validatedEvents.length === 0) {
                console.log("\n⚠️  Aucun événement validé après 3 cycles. On arrête pour éviter de boucler.");
                break;
            }

        } catch (error) {
            console.error(`\n❌ Erreur au cycle ${attempts}:`, error.message);
            break;
        }
    }

    // On garde tous les événements trouvés, même si on dépasse le TARGET
    console.log(`\n✨ Fin de collecte : ${validatedEvents.length} événements conservés.`);

    // SAUVEGARDE ET SYNTHÈSE
    const outputPath = 'machine_a_evenements/orchestrator_result.json';
    const resultData = {
        timestamp: new Date().toISOString(),
        theme: THEME,
        target: TARGET,
        obtained: validatedEvents.length,
        events: validatedEvents
    };
    fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
    console.log(`\n💾 Résultat intermédiaire sauvegardé: ${outputPath}`);

    if (validatedEvents.length > 0) {
        console.log("\n" + "=".repeat(40));
        console.log("🛠️  PHASE D'ENRICHISSEMENT & EXPORT");
        console.log("=".repeat(40));

        try {
            // ÉTAPE 4 : CHRONOS (Audit Historique)
            console.log(`\n⏳ [CHRONOS] Audit des ancres historiques...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/CHRONOS'),
                stdio: 'inherit'
            });

            // ÉTAPE 5: ARTISAN (Enrichissement)
            console.log(`🎨 [ARTISAN] Sculpture des métadonnées...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/ARTISAN'),
                stdio: 'inherit'
            });

            // ÉTAPE 6: REXP (Export vers Supabase)
            console.log(`\n🚀 [REXP] Insertion dans la table queue_sevent...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/REXP'),
                stdio: 'inherit'
            });

        } catch (error) {
            console.error(`\n❌ Erreur lors de la phase finale:`, error.message);
        }
    }

    // RAPPORT FINAL
    console.log("\n" + "=".repeat(40));
    console.log("📊 RÉSUMÉ DE LA SESSION");
    console.log("=".repeat(40));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ ${validatedEvents.length} événements ont été injectés en base.`);
    console.log(`📚 Thème : ${THEME}`);
    console.log(`⏳ Temps total : ${elapsed}s`);
    console.log(`\n👉 Prochaine étape : Tape 'chambre_noire' pour commencer les illustrations (via les AGENTS).`);
}

startSession();
