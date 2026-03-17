import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// LOCAL DB for the 'labo' table
const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

const apiKey = process.env.OPENAI_API_KEY;

export async function generatePromptWithAI(titre, description, year, eventType, style = 'realistic') {
    const isMuslimEvent = /islam|musulman|mosquée|coran|mahomet|califat|omeyyade|abbasside/i.test(titre + " " + (description || ""));
    const finalStyle = isMuslimEvent ? 'symbolic' : style;

    // --- DIVERSITY ENGINE: Composition & Medium Logic ---
    const compositions = [
        "Cinematic Wide Shot, showing a group in action",
        "Classic Medium shot including 3-4 key figures",
        "Intimate Close-up focusing on facial expression or hands",
        "Heroic Low-angle perspective",
        "Dynamic Dutch tilt for tension"
    ];

    // Priority based on type, but with a 30% "chaos" factor for variety
    let composition = compositions[Math.floor(Math.random() * compositions.length)];
    const typeLabel = (eventType + " " + titre).toLowerCase();
    const isChaos = Math.random() < 0.3;

    if (!isChaos) {
        if (/bataille|combat|siège|guerre|war|battle|conquête|invasion|révolte/i.test(typeLabel)) {
            composition = "Cinematic Wide Shot showing a group of 5-7 characters in action";
        } else if (/couronnement|sacre|traité|signature|discours|rencontre|réunion/i.test(typeLabel)) {
            composition = "Classic Medium shot including 3-4 key figures in a formal setting";
        } else if (/mort|décès|portrait|naissance|peinture|découverte/i.test(typeLabel)) {
            composition = "Intimate Close-up or profile shot of a single individual";
        } else if (/vol|aviation|bateau|navigation|vaisseau|monument|construction|cathédrale/i.test(typeLabel)) {
            composition = "Grand Wide-angle view with scale-defining figures";
        }
    }

    // Historical Mediums (Pre-Photography)
    let historicalMedium = "Historical oil painting style";
    if (year < 1860) {
        const mediums = [
            "Historical oil painting style",
            "Fine line copperplate engraving style",
            "Detailed charcoal and ink sketch",
            "Renaissance fresco mural aesthetic"
        ];
        // Engravings were very common for books, give them a good weight
        historicalMedium = mediums[Math.floor(Math.random() * mediums.length)];
    }

    const lightingMoods = ["Golden hour lighting", "Foggy morning mist", "Dramatic chiaroscuro", "Cold midnight moonlight", "Dusty sunbeams through windows", "Stormy grey sky lighting"];
    const randomLighting = lightingMoods[Math.floor(Math.random() * lightingMoods.length)];

    let visualStyle = "";
    if (year < 1840) {
        visualStyle = historicalMedium;
    } else if (year < 1880) {
        visualStyle = "Early daguerreotype photography style, silver-toned monochrome";
    } else if (year < 1920) {
        visualStyle = "Grainy black and white early cinema film stock look";
    } else if (year < 1950) {
        visualStyle = "Classic Technicolor or Noir film aesthetic";
    } else if (year < 1980) {
        visualStyle = "Faded Ektachrome or Kodachrome 35mm film stock vintage tones";
    } else {
        visualStyle = "Authentic documentary photography style with realistic grain";
    }

    let systemPrompt = '';

    if (finalStyle === 'symbolic') {
        systemPrompt = `You are a minimalist artist specializing in historical allegory.
Your mission is to create a SYMBOLIC visual prompt for: "${titre}" (${year}).

SYMBOLIC RULES:
- NO HUMAN BEINGS. Focus on iconic objects.
- DIVERSITY: Use objects like crowns, keys, seals, tools, coins, or manuscripts.
- 🕌 MUSLIM RELIGION RULE: Use sacred geometry, calligraphy, or ancient lamps.
- 🚫 NO COMPASS/ASTROLABE.
- COMPOSITION: One or two central objects. ${randomLighting}.
- MEDIUM: ${visualStyle}.

Return ONLY the prompt in English.`;
    } else {
        systemPrompt = `You are a cinematic director specializing in historical realism for the game Timalaus.
Your mission is to create a visual prompt for: "${titre}" in ${year}.

DIVERSITY RULES (Avoid visual fatigue):
- COMPOSITION: Use a [${composition}].
- LIGHTING: Use [${randomLighting}].
- VISUAL MEDIUM: Use [${visualStyle}].

STRICT CONSTRAINTS:
- NO OVERCROWDING: Max 7 people for wide shots, 1-3 for others.
- ANTI-MODERN: No modern grooming, no brushed hair. Hair must be covered or messy.
- MATERIALS: Describe specific ${year} textures (raw linen, beaten copper, dirt, weathered wood).
- 🚫 NO COMPASS/ASTROLABE.

REALISTIC STRUCTURE:
1. [Scene]: Describe the ${composition} in its ${year} setting.
2. [Details]: Describe specific materials and character appearances matching the period.
3. [Atmosphere]: Describe the [${randomLighting}] and the [${visualStyle}] effects.

Return ONLY the prompt in English.`;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Event: ${titre}\nYear: ${year}\nDescription: ${description}` }
                    ],
                    temperature: 0.8 // Un peu plus de variété
                })
            });

            if (response.status === 429) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const data = await response.json();
            return data.choices[0].message.content.trim();

        } catch (err) {
            if (attempt === 3) throw err;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function runScenariste(limit = 20) {
    console.log("======================================================");
    console.log("  🎭 DÉMARRAGE DU SCÉNARISTE - MODE PRODUCTION (LOCAL DB)");
    console.log("======================================================\n");

    const testIds = []; // Laissez vide pour traiter TOUT le stock PENDING

    let query = localDb.from('labo').select('*');

    if (testIds.length > 0) {
        console.log(`🔍 Mode TEST : Filtrage sur IDs : ${testIds.join(', ')}`);
        query = query.in('id', testIds);
    } else {
        console.log(`🔍 Mode PRODUCTION : Recherche des événements PENDING sans prompt...`);
        query = query.eq('status', 'PENDING').is('image_prompt', null).limit(limit);
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("❌ Erreur accès BD Locale (table labo):", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("✅ Aucun événement à traiter !");
        return;
    }

    console.log(`🎬 ${events.length} événements trouvés pour le scénario visuel.\n`);

    for (const event of events) {
        try {
            console.log(`------------------------------------------------------`);
            console.log(`📝 TRAITEMENT : [${event.id}] (${event.year}) "${event.titre}"`);
            console.log(`   Type: ${event.type}`);

            console.log(`   ✍️  Appel à l'IA pour générer le prompt Flux Schnell...`);
            const imagePrompt = await generatePromptWithAI(event.titre, event.description || '', event.year, event.type || '');

            console.log(`   ✨ Prompt généré :`);
            console.log(`      "${imagePrompt}"`);

            // On update la ligne avec le texte généré et on le prépare pour le peintre
            const { error: updateError } = await localDb
                .from('labo')
                .update({
                    image_prompt: imagePrompt,
                    status: 'READY_FOR_IMAGE'
                })
                .eq('id', event.id);

            if (updateError) {
                console.error(`   ❌ Erreur de sauvegarde :`, updateError.message);
            } else {
                console.log(`   ✅ Sauvegardé dans table 'labo'. Status -> READY_FOR_IMAGE`);
            }

            // Pause Anti Rate-Limit
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`   ⚠️ Erreur technique sur "${event.titre}" :`, err.message);
        }
    }

    console.log(`\n💥 MISSION DU SCÉNARISTE TERMINÉE !`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runScenariste();
}

