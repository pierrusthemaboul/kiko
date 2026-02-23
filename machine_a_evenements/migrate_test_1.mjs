
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import 'dotenv/config';

// Credentials
const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const prod = createClient(PROD_URL, PROD_KEY);

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const local = createClient(LOCAL_URL, LOCAL_KEY);

// Gemini Init
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function getEnrichment(event) {
    const prompt = `
Tu es un expert historien. Analyse cet événement pour migration vers la table de production.
ID Source: ${event.id}
Titre: ${event.titre}
Date: ${event.date}
Description: ${event.description_detaillee || 'N/A'}

Règles :
1. "universel" : true si l'événement a un impact mondial, false si c'est régional (ex: France uniquement).
2. "region" : La région du monde (ex: "Europe", "Asie", "Amerique du Nord", etc.).
3. "pays" : Tableau des pays concernés (ex: ["France"]).
4. "epoque" : L'époque historique (ex: "Moyen Âge", "Renaissance", "XIXe siècle", etc.).
5. "notoriete" : Score de 0 à 100 (importance historique).
6. "niveau_difficulte" : 1 (Facile), 2 (Moyen), 3 (Difficile) pour un jeu de quiz.
7. "date_formatee" : L'année seule (ex: "1789").
8. "types_evenement" : Tableau de catégories (ex: ["Politique", "Guerre"]). Utilise ceux existants : ${JSON.stringify(event.types_evenement || [])} ou complète.

Réponds uniquement en JSON :
{
  "universel": boolean,
  "region": "string",
  "pays": ["string"],
  "epoque": "string",
  "notoriete": number,
  "niveau_difficulte": number,
  "date_formatee": "string",
  "types_evenement": ["string"],
  "mots_cles": ["string"]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("❌ Erreur Gemini:", e.message);
        return null;
    }
}

function generateCode(titre, year) {
    const slug = titre.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);
    return `${slug}-${year}-${Math.floor(Math.random() * 1000)}`;
}

async function migrateImage(localUrl, title) {
    if (!localUrl || localUrl.startsWith('offline://')) return localUrl;

    try {
        console.log(`🖼️ Migration de l'image : ${localUrl}`);
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
        console.error(`❌ Erreur migration image: ${e.message}`);
        return localUrl; // fallback to original
    }
}

async function runTestMigration() {
    console.log("🚀 Lancement du test de migration (1 seul événement)...");

    const { data: items, error: fetchError } = await local
        .from('goju2')
        .select('*')
        .eq('transferred', false)
        .limit(1);

    if (fetchError || !items || items.length === 0) {
        console.log("ℹ️ Aucun événement à migrer dans goju2.");
        return;
    }

    const sourceEvent = items[0];
    console.log(`📦 Traitement de : "${sourceEvent.titre}"`);

    const enrichment = await getEnrichment(sourceEvent);
    if (!enrichment) return;

    // Migrer l'image vers la prod
    const prodImageUrl = await migrateImage(sourceEvent.illustration_url, sourceEvent.titre);

    const insertData = {
        date: sourceEvent.date,
        titre: sourceEvent.titre,
        illustration_url: prodImageUrl,
        description_detaillee: sourceEvent.description_detaillee || enrichment.description_detaillee,
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

    const { data: inserted, error: insertError } = await prod
        .from('evenements')
        .insert([insertData])
        .select();

    if (insertError) {
        console.error("❌ Erreur insertion Production:", insertError.message);
        return;
    }

    console.log(`✅ Succès ! Événement migré avec image en Prod: ${inserted[0].id}`);

    await local
        .from('goju2')
        .update({ transferred: true, transferred_at: new Date().toISOString() })
        .eq('id', sourceEvent.id);
}

runTestMigration();
