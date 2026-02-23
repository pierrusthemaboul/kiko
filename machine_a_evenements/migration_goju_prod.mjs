import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import 'dotenv/config';

// Credentials Production
const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prod = createClient(PROD_URL, PROD_KEY);

// Credentials Local
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const local = createClient(LOCAL_URL, LOCAL_KEY);

// Gemini Init
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// CLI Arguments
const limitArg = process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1];
const maxLimit = limitArg ? parseInt(limitArg) : Infinity;

/**
 * Utilise Gemini pour enrichir l'événement local avant migration
 */
async function getEnrichment(event) {
    const prompt = `
Tu es un expert historien. Analyse cet événement pour migration vers la table de production.
Titre: ${event.titre}
Date: ${event.date}
Description actuelle: ${event.description_detaillee || 'N/A'}

Règles :
1. "universel" : true si l'événement a un impact mondial, false si c'est régional (ex: France uniquement).
2. "region" : La région du monde (ex: "Europe", "Asie", "Afrique", "Amérique du Nord", "Amérique du Sud", "Océanie", "Moyen-Orient").
3. "pays" : Tableau des pays concernés (ex: ["France"]).
4. "epoque" : L'époque historique (Antiquité, Moyen Âge, Renaissance, XVIIe siècle, XVIIIe siècle, XIXe siècle, XXe siècle, Contemporain).
5. "notoriete" : Score de 0 à 100 (importance historique réelle).
6. "niveau_difficulte" : 1 (Facile), 2 (Moyen), 3 (Difficile).
7. "date_formatee" : L'année seule (ex: "1789").
8. "types_evenement" : Tableau de catégories. Combine les catégories existantes s'il y en a : ${JSON.stringify(event.types_evenement || [])}.
9. "description_detaillee" : Rédige une description factuelle et captivante de 2 à 3 phrases (environ 250 caractères). Si la description actuelle est déjà pertinente, améliore-la, sinon repars du titre.

Réponds UNIQUEMENT en JSON :
{
  "universel": boolean,
  "region": "string",
  "pays": ["string"],
  "epoque": "string",
  "notoriete": number,
  "niveau_difficulte": number,
  "date_formatee": "string",
  "types_evenement": ["string"],
  "mots_cles": ["string"],
  "description_detaillee": "string"
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error(`❌ Erreur Gemini pour "${event.titre}":`, e.message);
        return null;
    }
}

/**
 * Génère un code unique pour la table production
 */
function generateCode(titre, year) {
    const slug = titre.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
    return `${slug}-${year}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Transfère l'image du local vers le cloud production
 */
async function migrateImage(localUrl, title) {
    if (!localUrl || localUrl.startsWith('offline://')) return localUrl;
    if (localUrl.includes('ppxmtnuewcixbbmhnzzc.supabase.co')) return localUrl; // Déjà en prod

    try {
        const response = await fetch(localUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

        const buffer = await response.arrayBuffer();
        const fileName = `migrated_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}.webp`;

        const { data, error } = await prod.storage
            .from('evenements-image')
            .upload(fileName, buffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = prod.storage
            .from('evenements-image')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (e) {
        console.error(`  ⚠️ Migration image échouée pour "${title}": ${e.message}`);
        return localUrl;
    }
}

/**
 * Boucle principale de migration
 */
async function runMigration() {
    console.log(`🚀 Lancement de la migration TOTALE : Goju2 (Local) -> Evenements (Prod)`);
    if (maxLimit !== Infinity) console.log(`   (Limite imposée par l'utilisateur : ${maxLimit} événements)`);

    let totalSuccess = 0;
    let finished = false;

    while (!finished && totalSuccess < maxLimit) {
        // On traite par vagues de 10 pour ne pas saturer l'API
        const batchLimit = Math.min(10, maxLimit - totalSuccess);

        const { data: items, error: fetchError } = await local
            .from('goju2')
            .select('*')
            .eq('transferred', false)
            .order('created_at', { ascending: true })
            .limit(batchLimit);

        if (fetchError) {
            console.error("❌ Erreur lecture locale:", fetchError.message);
            break;
        }

        if (!items || items.length === 0) {
            finished = true;
            break;
        }

        console.log(`\n📦 Traitement d'une vague de ${items.length} événements...`);

        for (const sourceEvent of items) {
            console.log(`\n🔹 Analyse : "${sourceEvent.titre}"...`);

            // 1. IA Enrichment
            const enrichment = await getEnrichment(sourceEvent);
            if (!enrichment) continue;

            // 2. Image Migration
            const prodImageUrl = await migrateImage(sourceEvent.illustration_url, sourceEvent.titre);

            // 3. Data Prep
            const insertData = {
                date: sourceEvent.date,
                titre: sourceEvent.titre,
                illustration_url: prodImageUrl,
                description_detaillee: enrichment.description_detaillee || sourceEvent.description_detaillee || sourceEvent.titre,
                universel: enrichment.universel,
                region: enrichment.region,
                langue: 'fr',
                ecart_temps_max: 500,
                ecart_temps_min: 20,
                facteur_variation: 1.0,
                niveau_difficulte: enrichment.niveau_difficulte,
                types_evenement: enrichment.types_evenement,
                pays: enrichment.pays,
                epoque: enrichment.epoque,
                mots_cles: enrichment.mots_cles || [],
                date_formatee: enrichment.date_formatee,
                code: generateCode(sourceEvent.titre, enrichment.date_formatee),
                notoriete: enrichment.notoriete,
                source_goju2_id: sourceEvent.id,
                migration_at: new Date().toISOString()
            };

            // 4. Insert to Prod
            const { data: inserted, error: insertError } = await prod
                .from('evenements')
                .insert([insertData])
                .select();

            if (insertError) {
                console.error(`  ❌ Erreur Production: ${insertError.message}`);
                continue;
            }

            // 5. Nettoyage Local (Suppression)
            const { error: deleteError } = await local
                .from('goju2')
                .delete()
                .eq('id', sourceEvent.id);

            if (deleteError) {
                console.error(`  ⚠️ Erreur nettoyage local (ID: ${sourceEvent.id}): ${deleteError.message}`);
            } else {
                console.log(`  ✅ Migré et supprimé de goju2 (Prod ID: ${inserted[0].id})`);
                totalSuccess++;
            }
        }
    }

    console.log(`\n✨ Migration terminée ! Total : ${totalSuccess} événement(s) transféré(s) et nettoyé(s).`);
}

runMigration();
