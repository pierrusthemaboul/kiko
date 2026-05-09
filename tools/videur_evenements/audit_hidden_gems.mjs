import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function auditBatch(events) {
    const results = [];
    
    for (const event of events) {
        const prompt = `Analyse l'événement historique suivant :
Titre : "${event.titre}"
Description : "${event.description_detaillee}"
Notoriété actuelle : ${event.notoriete_fr}

Est-ce un événement majeur de l'histoire (Invention, fondation d'un pays/ville célèbre, première mondiale, révolution scientifique/culturelle) ?
Réponds UNIQUEMENT en format JSON :
{
  "is_gem": boolean,
  "importance_reason": "string",
  "suggested_notoriety": number,
  "suggested_title": "Propose le titre le plus connu et explicite pour un public français (ex: 'Fondation de Kyoto' au lieu de 'Heian-kyō'). Laisse vide si le titre actuel est déjà optimal."
}`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim().replace(/```json|```/g, '');
            const analysis = JSON.parse(responseText);
            
            if (analysis.is_gem || analysis.suggested_notoriety > event.notoriete_fr + 20) {
                results.push({
                    id: event.id,
                    old_title: event.titre,
                    old_noto: event.notoriete_fr,
                    ...analysis
                });
            }
        } catch (e) {
            console.error(`Erreur sur ${event.id}:`, e.message);
        }
    }
    return results;
}

async function start() {
    console.log("🔍 Début de l'audit des 2978 événements...");
    
    let allGems = [];
    let offset = 0;
    const limit = 50;

    while (true) {
        console.log(`📡 Traitement des événements ${offset} à ${offset + limit}...`);
        const { data: events, error } = await supabase
            .from('evenements')
            .select('id, titre, notoriete_fr, description_detaillee')
            .range(offset, offset + limit - 1);

        if (error || !events || events.length === 0) break;

        const gems = await auditBatch(events);
        allGems = allGems.concat(gems);
        
        // Sauvegarde incrémentale JSON pour traçabilité
        fs.writeFileSync('audit_data.json', JSON.stringify(allGems, null, 2));

        // Sauvegarde incrémentale Markdown pour lecture humaine
        const report = allGems.map(g => `
### 💎 ${g.suggested_title || g.old_title}
- **ID** : \`${g.id}\`
- **Ancien Titre** : ${g.old_title}
- **Nouveau Titre suggéré** : ${g.suggested_title || 'Identique'}
- **Notoriété** : ${g.old_noto} ➡️ **${g.suggested_notoriety}**
- **Raison** : ${g.importance_reason}
`).join('\n');
        fs.writeFileSync('audit_report.md', report);

        offset += limit;
        // On retire la limite de 500 pour le scan complet
    }
    console.log(`✅ Audit complet terminé. ${allGems.length} pépites identifiées.`);
}

start();
