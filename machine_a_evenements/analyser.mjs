
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const rl = readline.createInterface({ input, output });

async function askAI(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e) {
        return null;
    }
}

async function start() {
    console.log("\n" + "=".repeat(60));
    console.log("🔍 ANALYSEUR D'ÉVÉNEMENTS KIKO");
    console.log("=".repeat(60));

    let query = process.argv.slice(2).join(' ');
    if (!query) {
        query = await rl.question("\n❓ Quel événement voulez-vous analyser ? ");
    } else {
        console.log(`\n🔎 Recherche pour : "${query}"`);
    }

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, notoriete_fr, notoriete, description_detaillee, epoque, region, types_evenement')
        .ilike('titre', `%${query}%`)
        .limit(3);

    if (error || !events || events.length === 0) {
        console.log("❌ Aucun événement trouvé.");
        rl.close();
        return;
    }

    let event = events[0];
    if (events.length > 1) {
        console.log("\nPlusieurs résultats trouvés :");
        events.forEach((ev, i) => console.log(`${i + 1}. ${ev.titre} (${new Date(ev.date).getFullYear()})`));
        const choice = await rl.question("\nLequel choisir (1, 2, 3...) ? ");
        event = events[parseInt(choice) - 1] || events[0];
    }

    let firstPass = true;
    while (true) {
        if (firstPass) {
            console.log("\n" + "-".repeat(60));
            console.log(`🆔 UUID    : ${event.id}`);
            console.log(`📌 TITRE   : ${event.titre}`);
            console.log(`📅 DATE    : ${event.date}`);
            console.log(`⭐ NOTO FR : ${event.notoriete_fr || event.notoriete}`);
            console.log(`🌍 REGION  : ${event.region}`);
            console.log(`🎨 TYPE    : ${event.types_evenement}`);
            console.log(`🖼️  URL     : ${event.illustration_url}`);
            console.log(`📝 DESC    : ${event.description_detaillee?.substring(0, 150)}...`);
            console.log("-".repeat(60));
            firstPass = false;
        }

        const action = await rl.question("\n🔧 Action (illustration / titre / date / desc / show / fin) : ");

        if (action.toLowerCase() === 'fin') break;

        if (action.toLowerCase() === 'illustration') {
            const year = event.date ? new Date(event.date).getFullYear() : (event.epoque === 'XXe' ? 1950 : 0);

            console.log("♻️ Nettoyage de la file d'attente pour cet événement...");
            await supabase.from('queue_sevent').delete().eq('titre', event.titre).eq('status', 'pending');

            console.log("📸 Envoi vers la Chambre Noire...");
            const { error: insError } = await supabase.from('queue_sevent').insert([{
                titre: event.titre,
                year: year,
                description: event.description_detaillee, // Utilise la desc d'origine
                specific_location: event.description_detaillee,
                type: Array.isArray(event.types_evenement) ? event.types_evenement[0] : event.types_evenement,
                region: event.region,
                notoriete: event.notoriete_fr || event.notoriete,
                status: 'pending',
                error_log: `ORIGINAL_UUID:${event.id}` // Utilise error_log faute de validation_notes
            }]);

            if (insError) console.error("❌ Erreur insertion:", insError.message);
            else console.log("✅ Ajouté à la file d'attente avec métadonnées complètes.");
        }
        else if (action.toLowerCase() === 'titre') {
            const newTitre = await rl.question(`Nouveau titre (actuel: "${event.titre}") : `);
            const aiHelp = await rl.question("Voulez-vous que l'IA optimise ce titre ? (o/n) : ");
            let finalTitre = newTitre;
            if (aiHelp.toLowerCase() === 'o') {
                finalTitre = await askAI(`Améliore ce titre d'événement historique pour qu'il soit percutant et précis, SANS DATE : "${newTitre}"`);
                console.log(`🤖 Proposition IA : ${finalTitre}`);
            }
            await supabase.from('evenements').update({ titre: finalTitre }).eq('id', event.id);
            event.titre = finalTitre;
            console.log("✅ Titre mis à jour.");
        }
        else if (action.toLowerCase() === 'date') {
            const newDate = await rl.question(`Nouvelle date (AAAA-MM-JJ, actuelle: ${event.date}) : `);
            await supabase.from('evenements').update({ date: newDate }).eq('id', event.id);
            event.date = newDate;
            console.log("✅ Date mise à jour.");
        }
        else if (action.toLowerCase() === 'desc') {
            console.log("--- Mode Description ---");
            const mode = await rl.question("1. Saisie manuelle\n2. Optimisation par IA\nChoix : ");
            if (mode === '1') {
                const newDesc = await rl.question("Nouvelle description : ");
                await supabase.from('evenements').update({ description_detaillee: newDesc }).eq('id', event.id);
                event.description_detaillee = newDesc;
            } else {
                console.log("🤖 IA en cours d'optimisation...");
                const optimized = await askAI(`Rédige une description détaillée, immersive et historiquement riche pour l'événement suivant : "${event.titre}" en 1980. Garde un ton neutre mais captivant.`);
                console.log(`\nProposition IA :\n${optimized}`);
                const confirm = await rl.question("\nAppliquer cette description ? (o/n) : ");
                if (confirm.toLowerCase() === 'o') {
                    await supabase.from('evenements').update({ description_detaillee: optimized }).eq('id', event.id);
                    event.description_detaillee = optimized;
                    console.log("✅ Description mise à jour.");
                }
            }
        }
        else if (action.toLowerCase() === 'show') {
            firstPass = true;
        }
    }

    console.log("\n👋 Session terminée.");
    rl.close();
}

start();
