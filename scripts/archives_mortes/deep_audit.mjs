import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTable() {
    console.log('--- Inspection approfondie de la table evenements ---');

    // 1. Récupérer un échantillon large (3000 max en local souvent)
    const { data: events, error } = await supabase.from('evenements').select('*').range(0, 2500);

    if (error) {
        console.error('Erreur:', error);
        return;
    }

    const total = events.length;

    // 2. Vérification des colonnes critiques
    const stats = {
        missingIllustration: 0,
        missingDescription: 0,
        missingTypes: 0,
        missingNotoriete: 0,
        zeroNotoriete: 0,
        futureDates: 0,
        veryOldDates: 0,
        longDescriptions: 0,
        shortDescriptions: 0
    };

    const countries = {};
    const types = {};

    events.forEach(e => {
        if (!e.illustration_url) stats.missingIllustration++;
        if (!e.description_detaillee) stats.missingDescription++;
        else {
            if (e.description_detaillee.length > 300) stats.longDescriptions++;
            if (e.description_detaillee.length < 50) stats.shortDescriptions++;
        }
        if (!e.types_evenement || e.types_evenement.length === 0) stats.missingTypes++;
        else {
            e.types_evenement.forEach(t => types[t] = (types[t] || 0) + 1);
        }

        if (e.notoriete === null || e.notoriete === undefined) stats.missingNotoriete++;
        else if (e.notoriete === 0) stats.zeroNotoriete++;

        const year = new Date(e.date).getFullYear();
        if (year > 2026) stats.futureDates++;
        if (year < -1000) stats.veryOldDates++;

        // Pays
        if (e.pays && Array.isArray(e.pays)) {
            e.pays.forEach(p => countries[p] = (countries[p] || 0) + 1);
        }
    });

    console.log(`Total inspectés : ${total}`);
    console.log(`- Sans illustration : ${stats.missingIllustration} (${(stats.missingIllustration / total * 100).toFixed(1)}%)`);
    console.log(`- Sans description  : ${stats.missingDescription}`);
    console.log(`- Sans types        : ${stats.missingTypes}`);
    console.log(`- Notoriété manquante ou 0 : ${stats.missingNotoriete + stats.zeroNotoriete}`);
    console.log(`- Dates "futuristes" (>2026) : ${stats.futureDates}`);
    console.log(`- Antiquité très lointaine (<-1000) : ${stats.veryOldDates}`);

    console.log('\n--- Top 10 Types d\'événements ---');
    Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([t, c]) => {
        console.log(`${t}: ${c}`);
    });

    console.log('\n--- Top 10 Pays ---');
    Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([p, c]) => {
        console.log(`${p}: ${c}`);
    });

    // 3. Vérifier les doublons de titres
    const titles = events.map(e => e.titre.toLowerCase().trim());
    const uniqueTitles = new Set(titles);
    console.log(`\n- Doublons de titres potentiels : ${total - uniqueTitles.size}`);

}

inspectTable();
