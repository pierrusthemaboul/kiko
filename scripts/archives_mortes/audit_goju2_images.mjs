
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function auditGoju2Anachronisms() {
    console.log('🚀 Démarrage de l\'audit des images de goju2 (ESM)...');

    const { data: events, error } = await supabase
        .from('goju2')
        .select('id, titre, date, illustration_url')
        .not('illustration_url', 'is', null)
        .limit(3);

    if (error) {
        console.error('Erreur Supabase:', error);
        return;
    }

    if (!events || events.length === 0) {
        console.log('Aucune image trouvée dans goju2.');
        return;
    }

    console.log(`🔎 Analyse de ${events.length} images...`);

    for (const event of events) {
        console.log(`\n--- Audit : ${event.titre} (${event.date}) ---`);
        console.log(`📸 Image : ${event.illustration_url}`);

        try {
            const imageRes = await fetch(event.illustration_url);
            const buffer = await imageRes.arrayBuffer();
            const base64Image = Buffer.from(buffer).toString('base64');

            const response = await anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 1000,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: "image/webp",
                                    data: base64Image
                                }
                            },
                            {
                                type: "text",
                                text: `Expert en anachronismes. Analyse l'image pour l'événement : "${event.titre}" (${event.date}). Score de 0 à 10. Justifie si < 7.`
                            }
                        ]
                    }
                ]
            });

            console.log(`🤖 Résultat Claude :`);
            console.log(response.content[0].text);

        } catch (err) {
            console.error(`❌ Erreur sur ${event.titre}:`, err.message);
        }
    }
}

auditGoju2Anachronisms().catch(console.error);

