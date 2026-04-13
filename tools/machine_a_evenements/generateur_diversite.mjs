/**
 * GÉNÉRATEUR DE DIVERSITÉ
 * Cible les thématiques sous-représentées identifiées dans l'audit.
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

const supabase = getSupabase('prod');

const THEMES_CIBLES = [
    {
        nom: "FEMMES_HISTORIQUES",
        exemples: [
            "Ada Lovelace et le premier algorithme informatique (1843)",
            "Hypatie d'Alexandrie, philosophe et mathématicienne (415)",
            "Hildegarde de Bingen, mystique et compositrice (1150)",
            "Nzinga de Ndongo, reine guerrière d'Angola (1624)",
            "Ranavalona Ire, reine de Madagascar (1828)",
            "Rosalind Franklin et la photo 51 de l'ADN (1952)"
        ]
    },
    {
        nom: "AFRIQUE_PRECOLONIALE",
        exemples: [
            "Fondation de l'Empire du Mali par Soundiata Keïta (1235)",
            "Couronnement de Mansa Moussa à Tombouctou (1312)",
            "Construction des enceintes du Grand Zimbabwe (1100)",
            "Apogée du Royaume de Bénin (XVème siècle)",
            "Arrivée de l'Islam en Afrique de l'Ouest (IXème siècle)"
        ]
    },
    {
        nom: "COLOMBIE_PRE_HISPANIQUE",
        exemples: [
            "Fondation de Tenochtitlan par les Aztèques (1325)",
            "Construction de Machu Picchu par les Incas (1450)",
            "Chute des cités Mayas classiques (900)",
            "Construction de Chichén Itzá (750)"
        ]
    },
    {
        nom: "SCIENCE_NON_OCCIDENTALE",
        exemples: [
            "Invention du papier par Cai Lun en Chine (105)",
            "Invention de l'algèbre par Al-Khwarizmi à Bagdad (820)",
            "Invention de la boussole magnétique en Chine (XIème siècle)",
            "Premier livre imprimé avec des types mobiles en métal en Corée (1377)",
            "Calcul de la circonférence de la Terre par Al-Biruni (1020)"
        ]
    }
];

async function verifierAbsence(event_title, year) {
    const yearMin = year - 5;
    const yearMax = year + 5;

    const { data } = await supabase
        .from('evenements')
        .select('titre, date')
        .gte('date', `${yearMin}-01-01`)
        .lte('date', `${yearMax}-12-31`);

    if (!data || data.length === 0) return true;

    const title_norm = event_title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const row of data) {
        const row_norm = row.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const words = title_norm.split(' ').filter(w => w.length > 4);
        const matches = words.filter(w => row_norm.includes(w));
        if (matches.length >= Math.ceil(words.length * 0.6)) return false;
    }
    return true;
}

async function genererDiversite() {
    console.log("🌍 GÉNÉRATEUR DE DIVERSITÉ HISTORIQUE\n");
    
    let allGenerated = [];

    for (const theme of THEMES_CIBLES) {
        console.log(`\n📚 Thème: ${theme.nom}`);
        
        const prompt = `
        Tu es un historien spécialisé dans la diversité mondiale. 
        Génère 5 à 7 événements HISTORIQUES PRÉCIS pour le thème : ${theme.nom}.
        
        EXEMPLES POUR INSPIRATION :
        ${theme.exemples.join('\n')}
        
        RÈGLES :
        1. Événements réels avec une année PRÉCISE.
        2. Titre en français, court et mémorable.
        3. Priorité aux événements absents des manuels scolaires européens classiques.
        4. Notoriété réelle (l'événement doit être vérifiable).
        
        FORMAT JSON :
        {
          "events": [
            { "titre": "Titre", "year": 1234, "contexte": "Brève description" }
          ]
        }
        `;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());
            
            for (const ev of data.events) {
                const absent = await verifierAbsence(ev.titre, ev.year);
                if (absent) {
                    console.log(`✅ [${ev.year}] ${ev.titre}`);
                    allGenerated.push(ev);
                } else {
                    console.log(`❌ [${ev.year}] ${ev.titre} (déjà présent)`);
                }
            }
        } catch (err) {
            console.error(`Erreur pour le thème ${theme.nom}:`, err.message);
        }
    }

    if (allGenerated.length > 0) {
        const outputPath = 'AGENTS/GENESIS/STORAGE/OUTPUT/diversity_batch.json';
        fs.writeFileSync(outputPath, JSON.stringify(allGenerated, null, 2));
        console.log(`\n💾 ${allGenerated.length} événements sauvegardés dans ${outputPath}`);
    } else {
        console.log("\nAucun nouvel événement généré.");
    }
}

genererDiversite().catch(console.error);
