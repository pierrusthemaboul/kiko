import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Utilisation du modèle gemini-2.0-flash comme dans sevent3.mjs
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function auditBatch(events) {
    const prompt = `Voici une liste d'événements historiques (id, titre, date). 
    Identifie UNIQUEMENT les événements qui mentionnent le nom d'une personne physique qui est ENCORE EN VIE en février 2026.
    Ignore les personnes décédées (même célèbres comme Elizabeth II, Steve Jobs, Pelé, Prince, Michael Jackson, etc.).
    Réponds au format JSON suivant :
    [
      {"id": "id_de_l_evenement", "titre": "titre", "personne_vivante": "nom de la personne", "raison": "pourquoi elle est vivante/notoriété"}
    ]
    Si aucun événement de la liste ne concerne une personne vivante, réponds simplement [].
    
    LISTE :
    ${JSON.stringify(events.map(e => ({ id: e.id, titre: e.titre, date: e.date })))}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Nettoyage du texte pour extraire le JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('❌ Erreur lors de l\'audit du lot :', error.message);
        return [];
    }
}

async function runAudit() {
    const events = JSON.parse(fs.readFileSync(path.join(__dirname, 'post_1945_events.json'), 'utf8'));
    console.log(`🚀 Audit IA lancé sur ${events.length} événements par lots de 50...`);

    let livingPeopleEvents = [];
    const batchSize = 50;

    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`📦 Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}...`);
        const batchResults = await auditBatch(batch);
        livingPeopleEvents = livingPeopleEvents.concat(batchResults);
    }

    const reportPath = path.join(__dirname, 'audit_living_people_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(livingPeopleEvents, null, 2));

    console.log(`\n✅ Audit terminé !`);
    console.log(`⚠️ ${livingPeopleEvents.length} événements avec des personnes vivantes identifiées.`);

    if (livingPeopleEvents.length > 0) {
        console.log('\n--- RÉCAPITULATIF DES PERSONNES VIVANTES TROUVÉES ---');
        livingPeopleEvents.forEach(e => {
            console.log(`- ${e.personne_vivante} (${e.titre})`);
        });
    }

    console.log(`\n📄 Rapport complet disponible ici : ${reportPath}`);
}

runAudit();
