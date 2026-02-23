import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function processImage(imageUrl, title) {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const processed = await sharp(Buffer.from(buffer))
        .webp({ quality: 85 })
        .resize(1024, 576, { fit: 'cover' })
        .toBuffer();

    const fileName = `honor_${title.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}.webp`;
    const { error } = await supabase.storage.from('evenements-image').upload(fileName, processed, { contentType: 'image/webp' });
    if (error) throw error;
    return supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;
}

async function repairMorbids(limit = 200) {
    console.log(`🛡️ [RÉPARATEUR] Début de la session de réparation exhaustive (Batch: ${limit})...`);

    // 1. Trouver les événements sans image (ceux qu'on a purgés)
    const { data: targets, error } = await supabase
        .from('evenements')
        .select('*')
        .is('illustration_url', null)
        .limit(limit);

    if (error || !targets || targets.length === 0) {
        console.log("✅ Aucun événement à réparer.");
        return;
    }

    for (const event of targets) {
        console.log(`\n✨ Régénération pour : "${event.titre}" (${event.date_formatee})...`);

        // A. Architecte de Prompt
        const archPrompt = `You are an Expert Historical Artist.
EVENT: "${event.titre}" (${event.date_formatee}).
MISSION: Create a symbolic, dignified, and PRESTIGIOUS visual representation.
STRICT RULE: NO dead bodies, NO literal death scenes, NO hospitals, NO blood.
STYLE: Fine art historical painting style, cinematic lighting.
If the person is an artist, show them at work. If a leader, show them as a majestic figure of history.
OUTPUT ONLY THE ENGLISH PROMPT.`;

        const res = await gemini.generateContent(archPrompt);
        const prompt = res.response.text().trim();

        // B. Trinity (Génération)
        console.log(`   🎨 Prompt : ${prompt.substring(0, 50)}...`);
        const output = await replicate.run("black-forest-labs/flux-schnell", { input: { prompt, aspect_ratio: "16:9" } });
        const imageUrl = Array.isArray(output) ? output[0] : output;

        // C. REXP (Traitement & Update)
        console.log(`   📦 Traitement et Publication...`);
        const publicUrl = await processImage(imageUrl, event.titre);

        await supabase.from('evenements').update({
            illustration_url: publicUrl,
            donnee_corrigee: true
        }).eq('id', event.id);

        console.log(`   ✅ Terminé : ${publicUrl}`);
    }
}

// On lance la réparation massive
repairMorbids();
