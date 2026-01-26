// ==============================================================================
// migrate_auto.mjs - VERSION AUTOMATIQUE pour événements pré-validés
// Migration automatique de 'goju' vers 'evenements' sans validation humaine
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import 'dotenv/config';

// --- Initialisation des Clients ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Vérifiez que SUPABASE_URL et SUPABASE_SERVICE_KEY sont dans votre fichier .env");
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

        // Suppression de goju si insertion réussie
        const { error: deleteError } = await supabase.from('goju').delete().eq('id', event.id);
        if (deleteError) {
            console.error(`   ⚠️ ATTENTION: Événement inséré dans 'evenements' mais échec suppression de 'goju' (ID: ${event.id})`);
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
    console.log("\n🚀 === MIGRATION AUTOMATIQUE DE GOJU VERS EVENEMENTS ===");
    
    // Choix du mode de fonctionnement
    console.log("\nModes disponibles :");
    console.log("1. AUTO : Migration automatique de tous les événements de 'goju'");
    console.log("2. MANUAL : Migration avec validation humaine (comme l'ancien script)");
    
    const mode = await askQuestion("Choisissez le mode (1 pour AUTO, 2 pour MANUAL) : ");
    
    if (mode === '2') {
        console.log("Redirection vers le mode manuel...");
        await manualMig