import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Client PROD (Écriture pour mettre en quarantaine)
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prodDb = createClient(PROD_URL, PROD_KEY);

// Client LOCAL (Lecture locale des rapports du Purificateur)
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

async function quarantineEvents() {
    console.log("======================================================");
    console.log("  🚨 MISE EN QUARANTAINE D'URGENCE (JEU PROD) KIKO");
    console.log("======================================================\n");

    try {
        // 1. On va chercher tous les IDs signalés dans la table locale `audit_reports`
        console.log("📥 Lecture des anomalies signalées par le Purificateur...");
        const { data: reports, error: localErr } = await localDb
            .from('audit_reports')
            .select('evenement_id, titre, type_audit, raisons')
            .eq('is_problematic', true);

        if (localErr) throw new Error("Erreur de lecture locale : " + localErr.message);

        if (!reports || reports.length === 0) {
            console.log("✅ Aucune anomalie n'a été repérée dans la base locale. Ton jeu est sain !");
            return;
        }

        console.log(`⚠️  ALERTE : ${reports.length} anomalies trouvées (Texte/Ethique ou Vision/Droits).`);

        // Extraire la liste unique des IDs pour éviter de mettre deux fois en quarantaine la même carte
        const uniqueIds = [...new Set(reports.map(r => r.evenement_id))];

        console.log(`🔒 Déplacement de ${uniqueIds.length} événements vers le TYPE 'QUARANTAINE' en PRODUCTION...`);

        // 2. Mise à jour massive ('update') en production pour les cacher du jeu
        const { error: prodErr } = await prodDb
            .from('evenements')
            .update({ types_evenement: ['QUARANTAINE'] })
            .in('id', uniqueIds);

        if (prodErr) throw new Error("Erreur système lors de la mise en Quarantaine (PROD) : " + prodErr.message);

        console.log("\n🎉 SUCCÈS ABSOLU ! Les événements dangereux sont désormais INVISIBLES pour tes joueurs.");
        console.log("Tu peux aller te coucher tranquille. Demain, on discutera sereinement de la façon de les réparer.");

        // Affichage optionnel de ce qui a été banni
        console.log("\n--- EXEMPLES DE CE QUI A ÉTÉ ÉCARTÉ ---");
        for (let i = 0; i < Math.min(5, reports.length); i++) {
            console.log(`- ${reports[i].titre} (Raison: ${reports[i].raisons.substring(0, 50)}...)`);
        }

    } catch (err) {
        console.error("🚨 Échec critique du script d'urgence :", err.message);
    }
}

quarantineEvents();

