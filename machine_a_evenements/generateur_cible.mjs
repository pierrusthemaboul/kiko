/**
 * GÉNÉRATEUR CIBLÉ
 * Génère exactement les événements ultra-connus manquants identifiés par le diagnostic
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase();

/**
 * Les 7 événements ultra-connus VRAIMENT manquants
 * Basé sur le diagnostic précis
 */
const EVENEMENTS_MANQUANTS = [
    {
        titre_attendu: "Sacre de François Ier",
        year: 1515,
        contexte: "François Ier devient roi de France en 1515 après la mort de Louis XII. Il est sacré à Reims. La même année, il remporte la bataille de Marignan."
    },
    {
        titre_attendu: "Déclaration des Droits de l'Homme et du Citoyen",
        year: 1789,
        contexte: "Texte fondamental de la Révolution française adopté le 26 août 1789. Proclame l'égalité des droits et la souveraineté nationale."
    },
    {
        titre_attendu: "Fuite à Varennes",
        year: 1791,
        contexte: "Dans la nuit du 20 au 21 juin 1791, Louis XVI et sa famille tentent de fuir Paris mais sont arrêtés à Varennes-en-Argonne."
    },
    {
        titre_attendu: "Bataille d'Austerlitz",
        year: 1805,
        contexte: "Le 2 décembre 1805, victoire décisive de Napoléon contre les armées austro-russes. Surnommée la 'bataille des Trois Empereurs'."
    },
    {
        titre_attendu: "Révolution de 1848",
        year: 1848,
        contexte: "Révolution française de février 1848 qui renverse la monarchie de Juillet et instaure la Deuxième République."
    },
    {
        titre_attendu: "Guerre franco-prussienne",
        year: 1870,
        contexte: "Guerre de 1870-1871 entre la France et la Prusse. Défaite française à Sedan le 2 septembre 1870, capture de Napoléon III."
    },
    {
        titre_attendu: "Début de la Première Guerre mondiale",
        year: 1914,
        contexte: "La Première Guerre mondiale débute en août 1914 après l'assassinat de l'archiduc François-Ferdinand. La France entre en guerre le 3 août 1914."
    }
];

/**
 * Vérification finale : l'événement existe-t-il vraiment ?
 */
async function verifierAbsence(event) {
    const yearMin = event.year - 2;
    const yearMax = event.year + 2;

    const { data } = await supabase
        .from('evenements')
        .select('titre, date')
        .gte('date', `${yearMin}-01-01`)
        .lte('date', `${yearMax}-12-31`);

    if (!data || data.length === 0) return true;

    // Chercher un match STRICT pour éviter les faux positifs
    const titre_norm = event.titre_attendu.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const row of data) {
        const row_norm = row.titre.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Extraire les mots significatifs (>3 chars, pas "de", "la", "le", etc.)
        const stopWords = ['pour', 'avec', 'dans', 'vers', 'entre', 'contre'];
        const mots = titre_norm.split(' ')
            .filter(m => m.length > 3 && !stopWords.includes(m));

        const matches = mots.filter(mot => row_norm.includes(mot));

        // Critère STRICT: au moins 70% des mots clés doivent matcher
        if (matches.length >= Math.ceil(mots.length * 0.7)) {
            console.log(`      ⚠️  Trouvé dans la base: "${row.titre}"`);
            return false;
        }
    }

    return true;
}

/**
 * Génération ciblée
 */
async function genererCible() {
    console.log("🎯 GÉNÉRATEUR CIBLÉ D'ÉVÉNEMENTS MANQUANTS\n");
    console.log("Vérification des 7 événements à générer...\n");

    const aGenerer = [];

    for (const event of EVENEMENTS_MANQUANTS) {
        process.stdout.write(`Vérification: ${event.titre_attendu} (${event.year})... `);

        const absent = await verifierAbsence(event);
        if (absent) {
            console.log("✅ À GÉNÉRER");
            aGenerer.push(event);
        } else {
            console.log("❌ DÉJÀ PRÉSENT (skip)");
        }
    }

    if (aGenerer.length === 0) {
        console.log("\n✅ Tous les événements sont déjà présents !");
        return;
    }

    console.log(`\n📝 Génération de ${aGenerer.length} événements...\n`);

    const prompt = `
Tu es un expert historique. Génère EXACTEMENT les événements suivants avec des titres clairs et précis.

ÉVÉNEMENTS À GÉNÉRER :
${aGenerer.map((e, i) => `${i + 1}. ${e.titre_attendu} (${e.year})
   Contexte : ${e.contexte}`).join('\n\n')}

RÈGLES STRICTES :
1. Le titre doit être CLAIR et RECONNAISSABLE par un Français moyen
2. L'année doit être EXACTE (celle indiquée)
3. Pas de dates approximatives ou de périodes
4. Le titre doit contenir les mots-clés principaux de l'événement

Exemples de BONS titres :
- "Sacre de François Ier à Reims"
- "Déclaration des Droits de l'Homme et du Citoyen"
- "Fuite de Louis XVI à Varennes"
- "Bataille d'Austerlitz"
- "Révolution de février 1848"
- "Défaite de Sedan - Guerre franco-prussienne"
- "Début de la Première Guerre mondiale"

FORMAT JSON EXCLUSIF :
{
  "events": [
    { "titre": "Titre exact de l'événement", "year": année },
    ...
  ]
}
`;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    console.log(`✅ ${data.events.length} événements générés\n`);

    // Afficher les événements générés
    console.log("📋 Événements générés :");
    data.events.forEach((e, i) => {
        console.log(`   ${i + 1}. [${e.year}] ${e.titre}`);
    });

    // Sauvegarder pour SENTINEL
    const outputPath = 'AGENTS/GENESIS/STORAGE/OUTPUT/genesis_raw_batch.json';
    fs.writeFileSync(outputPath, JSON.stringify(data.events, null, 2));

    console.log(`\n💾 Sauvegardé: ${outputPath}`);
    console.log("\n▶️  PROCHAINE ÉTAPE : Lancer SENTINEL pour filtrer");
    console.log("   cd machine_a_evenements/AGENTS/SENTINEL && node agent.js");

    return data.events;
}

// Exécution
genererCible().catch(console.error);
