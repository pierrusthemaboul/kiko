const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (Anon Key)
const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeEvents() {
    console.log('🔍 Connexion à Supabase et récupération des événements...');

    // Récupérer tous les événements (limite à 1000 pour l'instant, ajustable)
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, notoriete')
        .limit(2000);

    if (error) {
        console.error('❌ Erreur lors de la récupération:', error.message);
        return;
    }

    console.log(`✅ ${events.length} événements récupérés.\n`);

    // Définition des époques
    const eras = {
        antiquity: { label: 'Antiquité (< 500)', min: -Infinity, max: 499, count: 0, sumNotoriety: 0, examples: [] },
        middleAges: { label: 'Moyen-Âge (500-1499)', min: 500, max: 1499, count: 0, sumNotoriety: 0, examples: [] },
        renaissance: { label: 'Renaissance (1500-1799)', min: 1500, max: 1799, count: 0, sumNotoriety: 0, examples: [] },
        nineteenth: { label: 'XIXe siècle (1800-1899)', min: 1800, max: 1899, count: 0, sumNotoriety: 0, examples: [] },
        twentieth: { label: 'XXe siècle (1900-1999)', min: 1900, max: 1999, count: 0, sumNotoriety: 0, examples: [] },
        twentyfirst: { label: 'XXIe siècle (>= 2000)', min: 2000, max: Infinity, count: 0, sumNotoriety: 0, examples: [] },
    };

    // Analyse
    events.forEach(event => {
        if (!event.date) return;
        const year = new Date(event.date).getFullYear();
        const notoriety = event.notoriete || 0;

        for (const era of Object.values(eras)) {
            if (year >= era.min && year <= era.max) {
                era.count++;
                era.sumNotoriety += notoriety;
                if (era.examples.length < 3) {
                    era.examples.push(`${event.titre} (${year}) [Not: ${notoriety}]`);
                }
                break;
            }
        }
    });

    // Affichage du rapport
    console.log('📊 RAPPORT DE DISTRIBUTION DES ÉVÉNEMENTS\n');
    console.log(`${'ÉPOQUE'.padEnd(25)} | ${'COUNT'.padEnd(6)} | ${'AVG NOTORIÉTÉ'.padEnd(15)} | ${'EXEMPLES'}`);
    console.log('-'.repeat(100));

    for (const era of Object.values(eras)) {
        const avgNotoriety = era.count > 0 ? (era.sumNotoriety / era.count).toFixed(1) : '0.0';
        console.log(`${era.label.padEnd(25)} | ${era.count.toString().padEnd(6)} | ${avgNotoriety.padEnd(15)} | ${era.examples[0] || ''}`);
        if (era.examples[1]) console.log(`${''.padEnd(25)} | ${''.padEnd(6)} | ${''.padEnd(15)} | ${era.examples[1]}`);
        if (era.examples[2]) console.log(`${''.padEnd(25)} | ${''.padEnd(6)} | ${''.padEnd(15)} | ${era.examples[2]}`);
        console.log('-'.repeat(100));
    }
}

analyzeEvents();
