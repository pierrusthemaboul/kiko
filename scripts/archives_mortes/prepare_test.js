require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceKey = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function prepareTest() {
    console.log(`--- Préparation du test pour l'utilisateur ${userId} ---`);

    // 1. Désactiver le statut admin et mettre un quota bas (ex: 2 parties)
    const { error: updateError } = await supabase
        .from('profiles')
        .update({
            is_admin: false,
            parties_per_day: 2,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);

    if (updateError) {
        console.error('Erreur lors de la mise à jour du profil:', updateError);
        return;
    }

    // 2. Vérifier les parties déjà jouées aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const { data: runs, error: runsError } = await supabase
        .from('runs')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', today);

    if (runsError) {
        console.error('Erreur lors de la récupération des runs:', runsError);
        return;
    }

    const playedToday = runs ? runs.length : 0;
    console.log(`✅ Profil mis à jour : is_admin = false, parties_per_day = 2.`);
    console.log(`📊 Parties jouées aujourd'hui : ${playedToday}`);
    console.log(`🎯 Parties restantes : ${Math.max(0, 2 - playedToday)}`);
    console.log('\nRelance ton application. Tu ne devrais plus être admin et avoir très peu de parties.');
}

prepareTest();

