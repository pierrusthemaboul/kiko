
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { getSupabase, logDecision, uploadImageToSupabase } from '../shared_utils.mjs';

const agentName = "REXP";
const supabase = getSupabase('prod');

async function main() {
    const args = process.argv.slice(2);
    const isFinalMode = args.includes('--final');

    if (isFinalMode) {
        await exportToEvenements();
    } else {
        await exportToQueue();
    }
}

/**
 * PRODUCTION : Bureau 1 -> queue_sevent (Cloud)
 */
async function exportToQueue() {
    const inputPath = path.join(process.cwd(), '../ARTISAN/STORAGE/OUTPUT/artisan_finished_products.json');
    if (!fs.existsSync(inputPath)) {
        console.log("[REXP] Aucun produit fini trouvé. Fin du batch.");
        return;
    }

    const finalEvents = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`[REXP] Export de ${finalEvents.length} événements vers queue_sevent...`);

    const { error } = await supabase.from('queue_sevent').insert(finalEvents.map(e => ({
        titre: e.titre,
        year: e.year,
        type: e.type,
        region: e.region,
        description: e.description_flux || e.description, // English prompt for Trinity
        specific_location: e.description_detaillee, // French description for final export
        notoriete: e.notoriete,
        status: 'pending'
    })));

    if (error) {
        logDecision(agentName, 'EXPORT_QUEUE', { count: finalEvents.length }, 'ERROR', error.message);
        process.exit(1);
    }

    logDecision(agentName, 'EXPORT_QUEUE', { count: finalEvents.length }, 'SUCCESS', 'Insertion terminée vers queue_sevent');
}

/**
 * DÉTECTION DYNAMIQUE DES COLONNES (Copie de la logique de sevent3)
 */
async function detectTableColumns(tableName) {
    const columns = ['style_name', 'style_info', 'date_formatee', 'prompt_flux', 'score_validation', 'description_detaillee', 'notoriete_fr'];
    const support = {};

    await Promise.all(columns.map(async (col) => {
        const { error } = await supabase.from(tableName).select(col).limit(0);
        support[col] = !error;
    }));

    return support;
}

/**
 * CHAMBRE NOIRE : Mise à jour directe de la table PRODUCTION
 */
async function exportToEvenements() {
    const inputPath = path.join(process.cwd(), 'STORAGE/INPUT/final_task.json');
    if (!fs.existsSync(inputPath)) {
        console.log("[REXP] Aucun fichier final_task.json trouvé.");
        return;
    }

    const task = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    // specific_location contient ici la description détaillée FR envoyée par Chambre Noire
    const { id, titre, year, type, region, description, specific_location, imageUrl, notoriety, notoriete } = task;
    const finalNotoriety = notoriety || notoriete || 0;
    const descFR = specific_location || ''; // Récupération de la description FR

    console.log(`[REXP] Export FINAL vers PRODUCTION : ${titre}`);

    try {
        // 1. Upload de l'image sur le stockage Cloud
        const publicUrl = await uploadImageToSupabase(supabase, imageUrl, titre);
        console.log(`🔗 Image uploadée : ${publicUrl}`);

        // 2. Détection des colonnes disponibles (pour notoriete_fr)
        const columns = await detectTableColumns('evenements');

        // 3. Mise à jour de l'événement dans la table 'evenements'
        const datePrefix = `${year.toString().padStart(4, '0')}-`;

        let targetId = null;
        let originalUuid = null;

        if (task.internal_metadata && task.internal_metadata.startsWith('ORIGINAL_UUID:')) {
            originalUuid = task.internal_metadata.replace('ORIGINAL_UUID:', '');
        }

        if (originalUuid) {
            console.log(`🎯 UUID Source trouvé dans les notes : ${originalUuid}`);
            targetId = originalUuid;
        } else {
            console.log(`🔍 Recherche par titre/date (pas d'UUID source)...`);
            const { data: existing, error: searchError } = await supabase
                .from('evenements')
                .select('id')
                .eq('titre', titre)
                .gte('date', `${datePrefix}01-01`)
                .lte('date', `${datePrefix}12-31`)
                .limit(1)
                .maybeSingle();

            if (searchError) console.error(`[REXP] Erreur recherche: ${searchError.message}`);
            if (existing) targetId = existing.id;
        }

        const updatePayload = {
            illustration_url: publicUrl,
            description_detaillee: descFR,
            donnee_corrigee: false,
            notoriete: finalNotoriety
        };

        if (columns.notoriete_fr) {
            updatePayload.notoriete_fr = finalNotoriety;
            updatePayload.notoriete_source = "NOTOREX (AUTO-PIPELINE)";
        }

        if (targetId) {
            console.log(`✨ Mise à jour de l'événement ${targetId}`);
            const { error: updateError } = await supabase
                .from('evenements')
                .update(updatePayload)
                .eq('id', targetId);

            if (updateError) throw updateError;
            logDecision(agentName, 'EXPORT_PROD', { titre, year }, 'SUCCESS', 'Image et métadonnées FR mises à jour', { publicUrl, id: targetId });
        } else {
            console.log(`📝 Événement non trouvé en base, CRÉATION en production...`);
            const insertPayload = {
                titre: titre,
                date: `${year.toString().padStart(4, '0')}-01-01`,
                illustration_url: publicUrl,
                description_detaillee: descFR,
                types_evenement: Array.isArray(type) ? type : [type || 'Histoire'],
                region: region || 'Monde',
                notoriete: finalNotoriety,
                donnee_corrigee: false,
                universel: true,
                langue: 'fr',
                ecart_temps_max: 500,
                facteur_variation: 1.5,
                code: `gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            };

            if (columns.notoriete_fr) {
                insertPayload.notoriete_fr = finalNotoriety;
                insertPayload.notoriete_source = "NOTOREX (AUTO-PIPELINE)";
            }

            const { data: inserted, error: insertError } = await supabase
                .from('evenements')
                .insert([insertPayload])
                .select();

            if (insertError) {
                console.error("❌ Erreur création production:", insertError.message);
            } else {
                console.log("📥 Événement CRÉÉ avec succès dans 'evenements'.");
                logDecision(agentName, 'EXPORT_PROD', { titre, year }, 'SUCCESS', 'Nouvel événement créé avec métadonnées FR', { publicUrl, id: inserted?.[0]?.id });
            }
        }

    } catch (error) {
        console.error(`[${agentName}] ERREUR EXPORT PRODUCTION:`, error.message);
        logDecision(agentName, 'EXPORT_PROD', { titre, year }, 'ERROR', error.message);
        process.exit(1);
    }
}

main();
