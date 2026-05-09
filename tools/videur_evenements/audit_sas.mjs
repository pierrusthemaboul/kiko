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
Description : "${event.description}"
Notoriété actuelle : ${event.notoriete_fr || 0}

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
            
            // On considère que c'est une pépite si is_gem est vrai OU si la notoriété suggérée est > 20 alors qu'elle était à 0
            if (analysis.is_gem || (analysis.suggested_notoriety > 20 && (event.notoriete_fr || 0) < 20)) {
                results.push({
                    id: event.id,
                    old_title: event.titre,
                    old_noto: event.notoriete_fr || 0,
                    has_image: !!event.illustration_url,
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
    console.log("🔍 Début de l'audit de la table SAS (944 événements)...");
    
    let allGems = [];
    let offset = 0;
    const limit = 50;

    while (true) {
        console.log(`📡 SAS : Traitement des événements ${offset} à ${offset + limit}...`);
        const { data: events, error } = await supabase
            .from('sas')
            .select('id, titre, notoriete_fr, description, illustration_url')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("❌ Erreur Supabase:", error.message);
            break;
        }
        if (!events || events.length === 0) break;

        const gems = await auditBatch(events);
        allGems = allGems.concat(gems);
        
        fs.writeFileSync('audit_data_sas.json', JSON.stringify(allGems, null, 2));

        const report = allGems.map(g => `
### 💎 ${g.suggested_title || g.old_title}
- **ID** : \`${g.id}\`
- **Ancien Titre** : ${g.old_title}
- **Image** : ${g.has_image ? '✅ Présente' : '❌ Absente'}
- **Notoriété** : ${g.old_noto} ➡️ **${g.suggested_notoriety}**
- **Raison** : ${g.importance_reason}
`).join('\n');
        fs.writeFileSync('audit_report_sas.md', report);

        offset += limit;
    }
    console.log(`✅ Audit SAS terminé. ${allGems.length} pépites identifiées.`);
}

start();
