import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import sharp from 'sharp';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// IDs des 5 événements pilotes (diversité époque + thème)
const PILOT_IDS = [1225, 1397, 1406, 906, 909];

// ─────────────────────────────────────────────
// 1. GÉNÉRATION DU PROMPT FLUX (via GPT-4o-mini)
// ─────────────────────────────────────────────
async function genererPromptFlux(titre, description, year) {
    const apiKey = process.env.OPENAI_API_KEY;

    const styleGuide = year < 1800
        ? 'Use the style of a masterful oil painting or a detailed historical engraving (e.g. Delacroix, Rembrandt).'
        : year < 1940
            ? 'Use the style of a sepia or black-and-white documentary photograph, grainy, atmospheric.'
            : 'Use the style of a photorealistic, cinematic documentary photograph with dramatic lighting.';

    const prompt = `You are a Flux Schnell prompt engineer. Your mission: write a VISUAL prompt in English for this historical event.

Event: "${titre}" (year ${year})
Context: ${description || '(none)'}

Rules:
1. Describe the scene vividly: action, people, their period-appropriate clothing, lighting, atmosphere, camera angle.
2. ${styleGuide}
3. NEVER include text, dates, titles, or modern typography in the scene.
4. End with technical quality keywords: highly detailed, cinematic lighting, 8k resolution.
5. Be direct. No intro like "A prompt of...". Return ONLY the prompt text.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content.trim();
}

// ─────────────────────────────────────────────
// 2. GÉNÉRATION DE L'IMAGE (Replicate Flux-Schnell)
// ─────────────────────────────────────────────
async function genererImage(prompt, year) {
    const guidanceScale = year < 1500 ? 2.0 : year < 1900 ? 2.5 : 3.0;

    console.log(`   🎨 Flux-Schnell (guidance=${guidanceScale})...`);
    const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: {
            prompt,
            aspect_ratio: '16:9',
            num_inference_steps: 4,
            output_format: 'webp',
            output_quality: 90,
            seed: Math.floor(Math.random() * 1e9),
            guidance_scale: guidanceScale
        }
    });

    const urls = Array.isArray(output) ? output : [output];
    const url = urls.find(u => typeof u === 'string' && u.startsWith('http'));
    if (!url) throw new Error('Replicate: aucune URL retournée');
    return url;
}

// ─────────────────────────────────────────────
// 3. UPLOAD VERS SUPABASE STORAGE
// ─────────────────────────────────────────────
async function uploaderImage(imageUrl, titre) {
    console.log(`   ☁️  Téléchargement + resize...`);
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const processed = await sharp(buffer)
        .webp({ quality: 85 })
        .resize(800, 450, { fit: 'cover' })
        .toBuffer();

    const slug = titre.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 35);
    const fileName = `labo_${slug}_${Date.now()}.webp`;

    const { error } = await localDb.storage
        .from('evenements-image')
        .upload(fileName, processed, { contentType: 'image/webp', upsert: true });

    if (error) throw new Error(`Storage upload: ${error.message}`);

    const { data: { publicUrl } } = localDb.storage
        .from('evenements-image')
        .getPublicUrl(fileName);

    return publicUrl;
}

// ─────────────────────────────────────────────
// PIPELINE PRINCIPAL
// ─────────────────────────────────────────────
async function illustrerLabo() {
    console.log('='.repeat(60));
    console.log('  🖼️  ILLUSTRATEUR LABO — Pilote 5 événements');
    console.log('='.repeat(60) + '\n');

    const { data: events, error } = await localDb
        .from('labo')
        .select('id, titre, year, description')
        .in('id', PILOT_IDS)
        .order('year', { ascending: true });

    if (error) { console.error('❌ Erreur lecture labo:', error.message); return; }
    if (!events?.length) { console.log('⚠️  Aucun événement trouvé.'); return; }

    const results = [];

    for (const ev of events) {
        console.log(`\n[${'─'.repeat(56)}]`);
        console.log(`  📅 ${ev.year} | "${ev.titre}"`);
        console.log(`${'─'.repeat(58)}`);

        try {
            // Étape 1 : Prompt
            console.log(`   ✍️  Génération du prompt Flux...`);
            const imagePrompt = await genererPromptFlux(ev.titre, ev.description, ev.year);
            console.log(`   > ${imagePrompt.substring(0, 100)}...`);

            // Étape 2 : Image
            const replicateUrl = await genererImage(imagePrompt, ev.year);
            console.log(`   ✅ Image Replicate: ${replicateUrl.substring(0, 60)}...`);

            // Étape 3 : Upload
            const publicUrl = await uploaderImage(replicateUrl, ev.titre);
            console.log(`   ✅ Stockée: ${publicUrl.substring(0, 80)}...`);

            // Étape 4 : Update labo
            const { error: updateErr } = await localDb
                .from('labo')
                .update({ image_prompt: imagePrompt, illustration_url: publicUrl })
                .eq('id', ev.id);

            if (updateErr) throw new Error(`Update labo: ${updateErr.message}`);
            console.log(`   ✅ Labo mis à jour (id=${ev.id})`);

            results.push({ id: ev.id, year: ev.year, titre: ev.titre, illustration_url: publicUrl });

            await new Promise(r => setTimeout(r, 2000));

        } catch (e) {
            console.error(`   ❌ Erreur pour "${ev.titre}": ${e.message}`);
            results.push({ id: ev.id, year: ev.year, titre: ev.titre, error: e.message });
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('  📋 RÉCAP');
    console.log('='.repeat(60));
    for (const r of results) {
        const icon = r.error ? '❌' : '✅';
        console.log(`${icon} [${r.year}] ${r.titre}`);
        if (r.illustration_url) console.log(`      → ${r.illustration_url}`);
        if (r.error) console.log(`      Erreur: ${r.error}`);
    }
}

illustrerLabo();

