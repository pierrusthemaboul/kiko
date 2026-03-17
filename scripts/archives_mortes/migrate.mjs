// ==============================================================================
// migrate_auto_complete.mjs - VERSION COMPLÈTE ET CORRIGÉE
// Migration automatique de 'goju' vers 'evenements' sans validation humaine
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import 'dotenv/config';

// --- Initialisation des Clients ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Vérifiez que SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont dans votre fichier .env");
}

// ==============================================================================
// FONCTION DE MIGRATION SÉCURISÉE
// ==============================================================================
async function migrateEvent(event) {
    const eventToInsert = {
        date: event.date,
        titre: event.titre,
        illustration_url: event.illustration_url,
        universel: event.universel,
        region: event.region,
        langue: event.langue,
        ecart_temps_max: event.ecart_temps_max,
        facteur_variation: event.facteur_variation,
        niveau_difficulte: event.niveau_difficulte,
        types_evenement: event.types_evenement,
        pays: event.pays,
        epoque: event.epoque,
        mots_cles: event.mots_cles,
        date_formatee: event.date_formatee,
        code: event.code,
        date_precision: event.date_precision,
        ecart_temps_min: event.ecart_temps_min,
        frequency_score: event.frequency_score,
        description_detaillee: event.description_detaillee,
    };

    try {
        // Insertion dans evenements
        const { error: insertError } = await supabase.from('evenements').insert([eventToInsert]);

        if (insertError) {
            if (insertError.code === '23505') {
                console.log(`   ⚠️ Code en double détecté pour "${event.titre}", génération d'un nouveau code...`);
                // Générer un nouveau code unique
                eventToInsert.code = `mig${Date.now().toString().slice(-5)}${Math.floor(Math.random()*100)}`;
                const { error: retryError } = await supabase.from('evenements').insert([eventToInsert]);
                if (retryError) throw retryError;
            } else {
                throw insertError;
            }
        }

        // Suppression de goju2 si insertion réussie
        const { error: deleteError } = await supabase.from('goju2').delete().eq('id', event.id);
        if (deleteError) {
            console.error(`   ⚠️ ATTENTION: Événement inséré dans 'evenements' mais échec suppression de 'goju2' (ID: ${event.id})`);
            console.error(`   Suppression manuelle recommandée pour éviter les doublons futurs.`);
        }

        return { success: true, code: eventToInsert.code };

    } catch (error) {
        console.error(`   ❌ ERREUR migration pour "${event.titre}":`, error.message);
        return { success: false, error: error.message };
    }
}

// ==============================================================================
// MIGRATION PAR LOTS (PLUS EFFICACE)
// ==============================================================================
async function migrateBatch(events, batchSize = 5) {
    const results = {
        migrated: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`\n📦 Traitement du lot ${Math.floor(i/batchSize) + 1}/${Math.ceil(events.length/batchSize)} (${batch.length} événements)`);

        const promises = batch.map(async (event, index) => {
            const globalIndex = i + index + 1;
            console.log(`   ${globalIndex}/${events.length}. "${event.titre}" (${event.date?.substring(0, 4) || 'N/A'})`);

            const result = await migrateEvent(event);
            if (result.success) {
                console.log(`      ✅ Migré avec succès (Code: ${result.code})`);
                results.migrated++;
            } else {
                console.log(`      ❌ Échec de migration`);
                results.failed++;
                results.errors.push({
                    titre: event.titre,
                    error: result.error
                });
            }
            return result;
        });

        // Exécution du lot en parallèle
        await Promise.all(promises);

        // Petite pause entre les lots pour éviter la surcharge
        if (i + batchSize < events.length) {
            console.log(`   ⏳ Pause de 1 seconde avant le prochain lot...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}

// ==============================================================================
// SCRIPT PRINCIPAL
// ==============================================================================
async function main() {
    console.log("\n🚀 === MIGRATION AUTOMATIQUE DE GOJU2 (LOCAL) VERS EVENEMENTS (PROD) ===");

    // Choix du mode de fonctionnement
    console.log("\nModes disponibles :");
    console.log("1. AUTO : Migration automatique de tous les événements de 'goju2'");
    console.log("2. MANUAL : Migration avec validation humaine (comme l'ancien script)");

    const mode = await askQuestion("Choisissez le mode (1 pour AUTO, 2 pour MANUAL) : ");

    if (mode === '2') {
        console.log("Redirection vers le mode manuel...");
        await manualMigration();
        rl.close();
        return;
    }

    if (mode !== '1') {
        console.log("Mode invalide. Arrêt du script.");
        rl.close();
        return;
    }

    // Mode automatique
    console.log("\n🤖 === MODE AUTOMATIQUE SÉLECTIONNÉ ===");
    console.log("Les événements de 'goju2' seront migrés automatiquement vers 'evenements'");
    console.log("⚠️ ATTENTION : Cette opération est irréversible !");

    const confirmed = await askQuestion("\nConfirmer la migration automatique ? (oui/non) : ");
    if (!['oui', 'o', 'yes', 'y'].includes(confirmed.toLowerCase().trim())) {
        console.log("Opération annulée.");
        rl.close();
        return;
    }

    console.log("\n📚 Récupération des événements de la table 'goju2'...");
    const { data: eventsFromGoju, error: fetchError } = await supabase.from('goju2').select('*');

    if (fetchError) {
        console.error("❌ Erreur lors de la récupération:", fetchError.message);
        rl.close();
        return;
    }

    if (!eventsFromGoju || eventsFromGoju.length === 0) {
        console.log("✅ La table 'goju2' est vide. Aucune migration à effectuer.");
        rl.close();
        return;
    }

    console.log(`   - ${eventsFromGoju.length} événements trouvés dans 'goju2'`);

    // Vérification des codes existants pour éviter les conflits
    console.log("\n📋 Vérification des codes existants dans 'evenements'...");
    const { data: existingCodes } = await supabase.from('evenements').select('code');
    const existingCodesSet = new Set(existingCodes?.map(e => e.code).filter(c => c) || []);
    console.log(`   - ${existingCodesSet.size} codes uniques trouvés dans 'evenements'`);

    // Détection des conflits potentiels
    const conflicts = eventsFromGoju.filter(event => existingCodesSet.has(event.code));
    if (conflicts.length > 0) {
        console.log(`\n⚠️ ${conflicts.length} conflits de codes détectés. Ils seront automatiquement résolus.`);
    }

    console.log(`\n🚀 Démarrage de la migration automatique...`);
    const startTime = Date.now();

    const results = await migrateBatch(eventsFromGoju, 5);

    const duration = (Date.now() - startTime) / 1000;

    console.log(`\n\n🏁 === MIGRATION AUTOMATIQUE TERMINÉE ===`);
    console.log(`⏱️  Durée totale: ${Math.floor(duration / 60)}m ${(duration % 60).toFixed(1)}s`);
    console.log(`✅ Événements migrés avec succès: ${results.migrated}`);
    console.log(`❌ Échecs de migration: ${results.failed}`);

    if (results.migrated > 0) {
        const avgTimePerEvent = duration / results.migrated;
        console.log(`📊 Temps moyen par migration: ${avgTimePerEvent.toFixed(1)}s`);
    }

    if (results.failed > 0) {
        console.log(`\n📋 Détail des échecs:`);
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. "${error.titre}": ${error.error}`);
        });
    }

    // Vérification finale
    const { count: finalGojuCount } = await supabase.from('goju2').select('*', { count: 'exact' });
    const { count: finalEventsCount } = await supabase.from('evenements').select('*', { count: 'exact' });

    console.log(`\n📊 État final des tables:`);
    console.log(`   - 'goju2': ${finalGojuCount || 0} événements restants`);
    console.log(`   - 'evenements': ${finalEventsCount || 0} événements au total`);

    if (finalGojuCount === 0) {
        console.log(`🎉 Migration complète ! Tous les événements ont été transférés.`);
    } else {
        console.log(`⚠️ ${finalGojuCount} événements restent dans 'goju2' (probablement dus aux échecs).`);
    }

    rl.close();
}

// ==============================================================================
// MODE MANUEL (VERSION SIMPLIFIÉE)
// ==============================================================================
async function manualMigration() {
    console.log("\n👨‍💼 === MODE MANUEL ACTIVÉ ===");

    const confirmed = await askQuestion(
        "\n⚠️ ATTENTION : Mode manuel avec validation humaine.\n" +
        "Chaque événement nécessitera votre approbation. Continuer ? (oui/non) : "
    );

    if (!['oui', 'o', 'yes', 'y'].includes(confirmed.toLowerCase().trim())) {
        console.log("Mode manuel annulé.");
        return;
    }

    console.log("\n📚 Récupération des événements de 'goju2'...");
    const { data: eventsFromGoju, error: fetchError } = await supabase.from('goju2').select('*');

    if (fetchError || !eventsFromGoju || eventsFromGoju.length === 0) {
        if(fetchError) console.error("❌ Erreur:", fetchError.message);
        console.log("La table 'goju2' est vide. Aucune migration à effectuer.");
        return;
    }

    console.log(`   - ${eventsFromGoju.length} événements à examiner`);

    let migratedCount = 0, rejectedCount = 0;
    const rejectedEvents = [];

    for (const event of eventsFromGoju) {
        console.log(`\n--- Examen de "${event.titre}" (${event.date?.substring(0, 4) || 'N/A'}) ---`);
        console.log(`   Description: ${event.description_detaillee || 'Non fournie'}`);
        console.log(`   Image: ${event.illustration_url}`);

        const humanChoice = await askQuestion("   ➡️ Action ? (Migrer/Rejeter) [m/r] : ");

        if (['m', 'migrer', 'migrate', 'oui', 'o', 'yes', 'y'].includes(humanChoice.toLowerCase().trim())) {
            const result = await migrateEvent(event);
            if (result.success) {
                migratedCount++;
                console.log(`   ✅ Migré avec succès !`);
            } else {
                console.log(`   ❌ Échec de migration - événement conservé dans 'goju'`);
            }
        } else {
            console.log("   ❌ Événement rejeté manuellement.");
            rejectedCount++;
            rejectedEvents.push({ titre: event.titre, raison: "Rejet manuel." });
            await supabase.from('goju2').delete().eq('id', event.id);
        }
    }

    console.log(`\n🏁 === MODE MANUEL TERMINÉ ===`);
    console.log(`✅ Migrés: ${migratedCount}`);
    console.log(`❌ Rejetés: ${rejectedCount}`);

    if (rejectedEvents.length > 0) {
        console.log(`\n📋 Événements rejetés:`);
        rejectedEvents.forEach(r => console.log(`   - "${r.titre}": ${r.raison}`));
    }
}

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

main().catch(error => {
    console.error("\n\n💥 Erreur critique:", error);
    rl.close();
});

