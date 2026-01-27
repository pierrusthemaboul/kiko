
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listProtiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Profiles:');
    data.forEach(p => console.log(`${p.id} - ${p.display_name}`));
}

listProtiles();
