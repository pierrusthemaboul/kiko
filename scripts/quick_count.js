
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countEvents() {
    const { data: events, error } = await supabase
        .from('evenements')
        .select('date, notoriete');

    if (error) {
        console.error(error);
        return;
    }

    const stats = {
        antiquity: { count: 0, avgNot: 0, totalNot: 0 }, // < 500
        middleAges: { count: 0, avgNot: 0, totalNot: 0 }, // 500 - 1499
        renaissance: { count: 0, avgNot: 0, totalNot: 0 }, // 1500 - 1799
        xix: { count: 0, avgNot: 0, totalNot: 0 }, // 1800 - 1899
        xx: { count: 0, avgNot: 0, totalNot: 0 }, // 1900 - 1999
        xxi: { count: 0, avgNot: 0, totalNot: 0 }, // >= 2000
    };

    events.forEach(e => {
        const year = new Date(e.date).getFullYear();
        const not = e.notoriete || 0;
        let cat = '';

        if (year < 500) cat = 'antiquity';
        else if (year < 1500) cat = 'middleAges';
        else if (year < 1800) cat = 'renaissance';
        else if (year < 1900) cat = 'xix';
        else if (year < 2000) cat = 'xx';
        else cat = 'xxi';

        stats[cat].count++;
        stats[cat].totalNot += not;
    });

    console.log('Période        | Nombre | Notoriété Moyenne');
    console.log('---------------|--------|------------------');
    for (const [key, val] of Object.entries(stats)) {
        const avg = val.count > 0 ? (val.totalNot / val.count).toFixed(1) : 0;
        console.log(`${key.padEnd(14)} | ${val.count.toString().padEnd(6)} | ${avg}`);
    }
}

countEvents();
