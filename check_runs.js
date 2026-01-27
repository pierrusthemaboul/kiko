
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAll() {
    // On va d'abord chercher le profil par display_name puisque l'ID semble nous tromper
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, display_name, parties_per_day')
        .ilike('display_name', '%Pierrot%');

    if (pError) {
        console.error('Error profile:', pError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for Pierrot');
        return;
    }

    const profile = profiles[0];
    console.log('Profile found:', profile);
    const userId = profile.id;

    const { data: runs, error: rError } = await supabase
        .from('runs')
        .select('id, created_at, mode')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

    if (rError) console.error('Error runs:', rError);
    else {
        console.log('Recent runs count:', runs.length);
        runs.forEach(run => {
            console.log(`${run.created_at} - ${run.mode} - ${run.id}`);
        });
    }
}

checkAll();
