
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

// On essaie de charger le .env du dossier backend-scripts qui contient les clés AI
const backendEnvPath = 'C:/Users/Pierre/Documents/backend-scripts/.env';
require('dotenv').config({ path: backendEnvPath });

// Fallback sur le .env local si nécessaire pour Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!supabaseUrl || !supabaseKey || !anthropicKey) {
    console.error('❌ Erreur : Clés manquantes dans le .env');
    console.log('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('SUPABASE_KEY:', supabaseKey ? 'OK' : 'MISSING');
    console.log('ANTHROPIC_KEY:', anthropicKey ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

async function auditGoju2Anachronisms() {
    console.log('🚀 Démarrage de l\'audit des images de goju2...');

    const { data: events, error } = await supabase
        .from('goju2')
        .select('id, titre, date, illustration_url')
        .not('illustration_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Erreur Supabase:', error);
        return;
    }

    if (!events || events.length === 0) {
        console.log('Aucune image avec URL trouvée dans goju2.');
        return;
    }

    console.log(`🔎 Analyse de ${events.length} images...`);

    for (const event of events) {
        console.log(`\n--- Audit : ${event.titre} (${event.date}) ---`);
        console.log(`📸 Image : ${event.illustration_url}`);

        try {
            const imageRes = await fetch(event.illustration_url);
            if (!imageRes.ok) throw new Error(`HTTP ${imageRes.status}`);

            const arrayBuffer = await imageRes.arrayBuffer();
            const base64Image = Buffer.from(arrayBuffer).toString('base64');

            const response = await anthropic.messages.create({
                model: "claude-3-5-haiku-20241022",
                max_tokens: 1024,
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
                                text: `Agis en tant qu'expert en histoire et anachronismes. 
                                Analyse cette image pour l'événement : "${event.titre}" à la date "${event.date}".
                                
                                Cherche avec rigueur :
                                1. Objets modernes (lunettes de soleil modernes, montres, lampes électriques, fils électriques, plastique).
                                2. Architecture ou mobilier qui n'est pas de l'époque.
                                3. Vêtements, coupes de cheveux ou accessoires anachroniques.
                                4. Texte ou chiffres écrits (dates, titres, filigranes).
                                5. Éléments fantastiques ou magiques.
                                
                                Donne un score (0/10) de fidélité historique et explique précisément chaque erreur détectée. Si l'image est parfaite, dis-le.`
                            }
                        ]
                    }
                ]
            });

            console.log(`🤖 Avis Expert Claude :`);
            console.log(response.content[0].text);

        } catch (err) {
            console.error(`❌ Erreur sur ${event.titre}:`, err.message);
        }
    }
}

auditGoju2Anachronisms();
