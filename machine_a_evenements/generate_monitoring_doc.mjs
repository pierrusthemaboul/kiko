import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateMonitoringDoc() {
    console.log('📝 Génération du document de surveillance...');

    // 1. Charger les personnes vivantes identifiées par l'IA (et non supprimées)
    const auditLiving = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit_living_people_report.json'), 'utf8'));
    const deletedTitles = [
        "Eltsine nomme Poutine Premier ministre",
        "Discours de Dakar : Sarkozy prononce un discours controversé sur l’Afrique à Dakar",
        "Édith Cresson, première femme Premier ministre",
        "Création du super-ministère de l'Écologie avec Jean-Louis Borloo",
        "Fondation de l'association anti-discrimination SOS Racisme",
        "La création du parti politique La République en marche sous la direction d'Emmanuel Macron",
        "Macron lance un débat national pour répondre à la crise sociale des Gilets jaunes",
        "Réélection d'Emmanuel Macron à la présidence face à Marine Le Pen",
        "Un proche d'Macron impliqué dans des violences lors d'une manifestation",
        "Assassinat violent d'un enseignant à la suite d'une présentation de caricatures de Mahomet"
    ];

    const livingToMonitor = auditLiving.filter(e => !deletedTitles.includes(e.titre) && e.id !== null);

    // 2. Chercher les événements avec "Mort" ou "Cadavre" ou "Assassinat"
    const { data: deaths } = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, description_detaillee')
        .or('titre.ilike.%mort%,titre.ilike.%cadavre%,titre.ilike.%assassinat%,titre.ilike.%exécution%')
        .order('date', { ascending: false });

    let mdContent = `# 🛡️ Surveillance des Événements Sensibles (Timalaus)\n\n`;
    mdContent += `Ce document liste les événements qui nécessitent une vérification visuelle de l'image pour éviter les contenus choquants (cadavres, violence) ou les problèmes de droit à l'image.\n\n`;

    mdContent += `## 👤 Personnalités Vivantes (Droit à l'image)\n`;
    mdContent += `*Vérifier si le visage est trop reconnaissable. Privilégier une image symbolique.*\n\n`;

    for (const e of livingToMonitor) {
        const { data } = await supabase.from('evenements').select('illustration_url').eq('id', e.id).single();
        if (data) {
            mdContent += `### ${e.titre} (${e.personne_vivante})\n`;
            mdContent += `- **ID:** \`${e.id}\`\n`;
            mdContent += `- **Raison:** ${e.raison}\n`;
            mdContent += `- **Image:** [Voir l'illustration](${data.illustration_url})\n\n`;
        }
    }

    mdContent += `\n## ⚰️ Représentations de la Mort / Violence\n`;
    mdContent += `*Vérifier l'absence de cadavres graphiques ou de sang excessif.*\n\n`;

    // On sépare par époque (Plus de 1900 = Priorité Haute)
    const modernDeaths = deaths.filter(d => parseInt(d.date.split('-')[0]) >= 1900);
    const ancientDeaths = deaths.filter(d => parseInt(d.date.split('-')[0]) < 1900);

    mdContent += `### 🔴 Époque Moderne (1900 - Aujourd'hui) - PRIORITÉ HAUTE\n`;
    for (const d of modernDeaths) {
        mdContent += `#### ${d.titre} (${d.date.split('-')[0]})\n`;
        mdContent += `- **ID:** \`${d.id}\`\n`;
        mdContent += `- **Image:** [Voir l'illustration](${d.illustration_url})\n\n`;
    }

    mdContent += `\n### 🟠 Époques Anciennes (Avant 1900) - Moins critique\n`;
    for (const d of ancientDeaths.slice(0, 20)) { // Limité aux 20 premiers pour ne pas saturer
        mdContent += `#### ${d.titre} (${d.date.split('-')[0]})\n`;
        mdContent += `- **ID:** \`${d.id}\`\n`;
        mdContent += `- **Image:** [Voir l'illustration](${d.illustration_url})\n\n`;
    }

    fs.writeFileSync(path.join(__dirname, '..', 'SURVEILLANCE_IMAGES.md'), mdContent);
    console.log(`✅ Document géré : SURVEILLANCE_IMAGES.md`);
}

generateMonitoringDoc();
