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

// Normalisation pour détection doublons sémantiques
function normalizeTitle(titre) {
    if (!titre) return "";
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

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
    return (longer.length - levenshteinDistance(longer, shorter)) / longer.length;
}

function isSemanticDuplicate(event1, event2) {
    if (event1.year !== event2.year) return false;
    return calculateSimilarity(normalizeTitle(event1.titre), normalizeTitle(event2.titre)) >= 0.70;
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
    console.log("╔══════════════════════════════════════════╗");
    console.log("║   🏛️  BUREAU 2 - GÉNÉRATION STRATÉGIQUE  ║");
    console.log("║   Qualité > Quantité                     ║");
    console.log("╚══════════════════════════════════════════╝\n");

    // STEP 0: ANALYST - Gap analysis (Moved early to guide the user)
    console.log("📊 [ANALYST] Analyse des lacunes du catalogue...");
    try {
        execSync(`node agent.js`, {
            cwd: path.resolve('./machine_a_evenements/AGENTS/ANALYST'),
            stdio: 'inherit'
        });

        const briefPath = path.resolve('./machine_a_evenements/AGENTS/ANALYST/STORAGE/OUTPUT/analyst_brief.json');
        if (fs.existsSync(briefPath)) {
            const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
            if (brief.gaps && brief.gaps.length > 0) {
                console.log("\n" + "═".repeat(50));
                console.log("💡 CONSEILS DU BUREAU (Lacunes prioritaires)");
                console.log("═".repeat(50));
                brief.gaps.slice(0, 3).forEach(gap => {
                    console.log(`  📍 ${gap.label}`);
                    console.log(`     🎯 ${gap.recommendation}`);
                });
                console.log("═".repeat(50) + "\n");
            }
        }
    } catch (error) {
        console.log("⚠️  Impossible de charger le brief de l'Analyste.");
    }

    if (process.argv.length <= 2) {
        console.log("Bienvenue au Bureau 2 (mode qualité).");
        console.log("Sur quoi travaillons-nous aujourd'hui ?");
        console.log("(Ex: 'Le Moyen Âge', '15 événements sur le XIXe siècle')\n");
        const answer = await askQuestion("👉 ");

        if (answer) {
            const countMatch = answer.match(/(\d+)\s*événements?/i);
            if (countMatch) {
                TARGET = parseInt(countMatch[1]);
                THEME = answer
                    .replace(countMatch[0], '')
                    .replace(/\s*sur\s*/i, ' ')
                    .replace(/[()]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!THEME) THEME = "Histoire de France";
            } else {
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

    // bureau2 generates MORE candidates but filters harder
    const MAX_ATTEMPTS = 10; // 10 cycles max safely
    const BATCH_SIZE = Math.max(20, Math.ceil(TARGET * 2));

    console.log(`\n🎯 Objectif : ${TARGET} événements QUALITÉ validés`);
    console.log(`📚 Thème    : ${THEME}`);
    console.log(`📦 Batch    : ${BATCH_SIZE} par cycle (surproduction pour filtrage qualité)\n`);
    console.log("─".repeat(50));

    // Clean previous session (but keep analyst brief!)
    const sessionPath = path.resolve('./machine_a_evenements/AGENTS/session_history.json');
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);

    await executeOrchestration(TARGET, THEME, BATCH_SIZE, MAX_ATTEMPTS);
    process.exit(0);
}

async function executeOrchestration(TARGET, THEME, BATCH_SIZE, MAX_ATTEMPTS) {
    const startTime = Date.now();
    let validatedPillars = [];
    let validatedBonus = [];
    let allRejections = [];
    let attempts = 0;
    let totalGenerated = 0;
    let totalRejectedDupes = 0;
    let totalRejectedQuality = 0;

    // Seuil pour être considéré comme un "Pilier" (compte pour l'objectif)
    const PILLAR_THRESHOLD = 60;

    while (validatedPillars.length < TARGET && attempts < MAX_ATTEMPTS) {
        attempts++;
        console.log(`\n🔄 CYCLE ${attempts} - Objectif Piliers: ${validatedPillars.length}/${TARGET}`);
        console.log(`💡 Événements Bonus récoltés: ${validatedBonus.length}\n`);

        try {
            // STEP 1: GENESIS2 (gap-aware generation)
            console.log(`📝 [GENESIS2] Génération ciblée de ${BATCH_SIZE} événements sur "${THEME}"...`);
            execSync(`node agent.js ${BATCH_SIZE} "${THEME}"`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/GENESIS2'),
                stdio: 'inherit'
            });
            totalGenerated += BATCH_SIZE;

            // Copy GENESIS2 output to GENESIS output path (so SENTINEL can read it)
            const genesis2Output = path.resolve('./machine_a_evenements/AGENTS/GENESIS2/STORAGE/OUTPUT/genesis2_raw_batch.json');
            const genesisInput = path.resolve('./machine_a_evenements/AGENTS/GENESIS/STORAGE/OUTPUT/genesis_raw_batch.json');
            if (fs.existsSync(genesis2Output)) {
                fs.copyFileSync(genesis2Output, genesisInput);
            }

            // STEP 2: SENTINEL (reuse existing - duplicate detection)
            console.log(`\n🛡️  [SENTINEL] Filtrage des doublons...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/SENTINEL'),
                stdio: 'inherit'
            });

            // STEP 3: QUALITY_GATE (NEW - notoriety filter)
            console.log(`\n🎯 [QUALITY_GATE] Contrôle qualité notoriété...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/QUALITY_GATE'),
                stdio: 'inherit'
            });

            // Read results from QUALITY_GATE
            const qualityPath = 'machine_a_evenements/AGENTS/QUALITY_GATE/STORAGE/OUTPUT/quality_gate_passed.json';
            const sentinelAuditPath = 'machine_a_evenements/AGENTS/SENTINEL/STORAGE/OUTPUT/sentinel_audit_report.json';
            const qualityRejectPath = 'machine_a_evenements/AGENTS/QUALITY_GATE/STORAGE/OUTPUT/quality_gate_rejected.json';

            if (fs.existsSync(qualityPath)) {
                const newValidated = JSON.parse(fs.readFileSync(qualityPath, 'utf-8'));

                for (const event of newValidated) {
                    const isPillar = (event.quality_notoriete || 0) >= PILLAR_THRESHOLD;

                    // Check for duplicates in both pillars and bonus
                    const existsInPillars = validatedPillars.some(e => isSemanticDuplicate(e, event));
                    const existsInBonus = validatedBonus.some(e => isSemanticDuplicate(e, event));

                    if (!existsInPillars && !existsInBonus) {
                        if (isPillar) {
                            validatedPillars.push(event);
                            console.log(`   💎 PILLIER validé: "${event.titre}" (${event.quality_notoriete})`);
                        } else {
                            validatedBonus.push(event);
                            console.log(`   🎁 BONUS validé: "${event.titre}" (${event.quality_notoriete})`);
                        }
                    }
                }

                // Collect ALL rejections from this cycle
                if (fs.existsSync(sentinelAuditPath)) {
                    const audit = JSON.parse(fs.readFileSync(sentinelAuditPath, 'utf-8'));
                    totalRejectedDupes += audit.session.totalRejected;
                    const sentinelRejects = audit.rejectedEvents || [];
                    sentinelRejects.forEach(r => {
                        allRejections.push({ titre: r.titre, year: r.year, reason: r.reason || 'Doublon' });
                    });
                }
                if (fs.existsSync(qualityRejectPath)) {
                    const qRejects = JSON.parse(fs.readFileSync(qualityRejectPath, 'utf-8'));
                    totalRejectedQuality += qRejects.length;
                    qRejects.forEach(r => {
                        allRejections.push({ titre: r.titre, year: r.year, reason: r.reason || 'Notoriété insuffisante' });
                    });
                }

                console.log(`\n📊 Cycle terminé: ${validatedPillars.length}/${TARGET} piliers | ${validatedBonus.length} bonus`);

                // Save session history
                const sessionPath = path.resolve('./machine_a_evenements/AGENTS/session_history.json');
                const sessionData = {
                    validated: [...validatedPillars, ...validatedBonus],
                    rejections: allRejections
                };
                fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
            }

            if (attempts >= 3 && validatedPillars.length === 0 && validatedBonus.length === 0) {
                console.log("\n⚠️ Aucun événement validé après 3 cycles. Arrêt.");
                break;
            }

        } catch (error) {
            console.error(`\n❌ Erreur au cycle ${attempts}:`, error.message);
            break;
        }
    }

    const allFinalEvents = [...validatedPillars, ...validatedBonus];
    console.log(`\n✨ Fin de collecte : ${validatedPillars.length} piliers et ${validatedBonus.length} bonus.`);

    // Save intermediate result
    const resultData = {
        timestamp: new Date().toISOString(),
        theme: THEME,
        target_pillars: TARGET,
        pillers_obtained: validatedPillars.length,
        bonus_obtained: validatedBonus.length,
        events: allFinalEvents
    };
    const outputPath = 'machine_a_evenements/orchestrator2_result.json';
    fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
    fs.writeFileSync('machine_a_evenements/orchestrator_result.json', JSON.stringify(resultData, null, 2));
    console.log(`\n💾 Résultat intermédiaire: ${outputPath}`);

    if (allFinalEvents.length > 0) {
        console.log("\n" + "═".repeat(50));
        console.log("🛠️  PHASE D'ENRICHISSEMENT & EXPORT");
        console.log("═".repeat(50));

        try {
            // STEP 4: CHRONOS (reuse existing - historical anchors)
            console.log(`\n⏳ [CHRONOS] Audit des ancres historiques...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/CHRONOS'),
                stdio: 'inherit'
            });

            // STEP 5: ARTISAN2 (enhanced enrichment)
            console.log(`\n🎨 [ARTISAN2] Enrichissement premium des métadonnées...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/ARTISAN2'),
                stdio: 'inherit'
            });

            // STEP 6: REXP (reuse existing - export to Supabase)
            // We need to copy ARTISAN2 output to ARTISAN path so REXP can read it
            const artisan2Output = path.resolve('./machine_a_evenements/AGENTS/ARTISAN2/STORAGE/OUTPUT/artisan2_finished_products.json');
            const artisanOutput = path.resolve('./machine_a_evenements/AGENTS/ARTISAN/STORAGE/OUTPUT/artisan_finished_products.json');
            if (fs.existsSync(artisan2Output)) {
                fs.copyFileSync(artisan2Output, artisanOutput);
            }

            console.log(`\n🚀 [REXP] Insertion dans queue_sevent...`);
            execSync(`node agent.js`, {
                cwd: path.resolve('./machine_a_evenements/AGENTS/REXP'),
                stdio: 'inherit'
            });

        } catch (error) {
            console.error(`\n❌ Erreur phase finale:`, error.message);
        }
    }

    // Final report
    console.log("\n" + "═".repeat(50));
    console.log("📊 RAPPORT BUREAU 2");
    console.log("═".repeat(50));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ ${allFinalEvents.length} événements QUALITÉ injectés en base`);
    console.log(`📚 Thème : ${THEME}`);
    console.log(`⏳ Temps total : ${elapsed}s`);
    console.log(`📈 Statistiques :`);
    console.log(`   - Générés par GENESIS2 : ~${totalGenerated}`);
    console.log(`   - Rejetés (doublons)   : ${totalRejectedDupes}`);
    console.log(`   - Rejetés (qualité)    : ${totalRejectedQuality}`);
    console.log(`   - Validés finaux       : ${allFinalEvents.length}`);
    const yieldRate = totalGenerated > 0 ? ((allFinalEvents.length / totalGenerated) * 100).toFixed(1) : '0';
    console.log(`   - Rendement            : ${yieldRate}%`);

    if (allFinalEvents.length > 0) {
        console.log(`\n📋 Événements créés :`);
        allFinalEvents.forEach((e, i) => {
            const not = e.quality_notoriete || e.notoriete_estimee || '?';
            console.log(`   ${i + 1}. "${e.titre}" (${e.year}) - notoriété: ${not}`);
        });
    }

    console.log(`\n👉 Prochaine étape : 'chambre_noire' pour les illustrations.`);
}

startSession();
