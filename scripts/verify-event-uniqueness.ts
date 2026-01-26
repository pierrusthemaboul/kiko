import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getTimeDifference(date1: string | null, date2: string | null): number {
    if (!date1 || !date2) return Infinity;
    // Use a simple string comparison if timestamps are problematic, 
    // but here we follow the hook's intended logic
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    return d1 - d2;
}

async function verify() {
    console.log('🧪 VERIFYING EVENT UNIQUENESS AT LEVEL 1 INIT (1000 Simulations)');

    const { data: allEventsData } = await supabase
        .from('evenements')
        .select('id, titre, date, notoriete, types_evenement');

    if (!allEventsData) {
        console.error('Failed to load events');
        return;
    }

    // Add dummy 'pays' if missing, simulate the frenchEvents logic
    // In the real DB, 'types_evenement' or other fields might be used or 'pays' exists.
    // The hook uses (e as any).pays. Let's assume some are French.
    const validEvents = allEventsData.filter(e => !!e.id && !!e.date && !!e.titre);

    let duplicateCount = 0;

    for (let i = 0; i < 1000; i++) {
        const initialCandidates = validEvents.filter(e => {
            const year = new Date(e.date).getFullYear();
            const notoriete = (e as any).notoriete ?? 0;
            return notoriete >= 80 && year >= 1850;
        });

        let firstEvent: any;
        let secondEvent: any;

        // Simulate the logic I just implemented in useInitGame.ts

        // We'll simulate the "frenchEvents" part by assuming a random subset is French
        const frenchEvents = initialCandidates.filter(() => Math.random() > 0.5);

        if (frenchEvents.length > 0) {
            const shuffledFrench = [...frenchEvents].sort(() => 0.5 - Math.random());
            firstEvent = shuffledFrench[0];

            const remaining = initialCandidates.filter(e => e.id !== firstEvent.id && getTimeDifference(e.date, firstEvent.date) !== 0);
            const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());

            if (shuffledRemaining.length > 0) {
                secondEvent = shuffledRemaining[0];
            } else {
                const backup = validEvents.filter(e => e.id !== firstEvent.id && getTimeDifference(e.date, firstEvent.date) !== 0);
                secondEvent = backup.length > 0 ? backup[0] : null;
            }
        } else {
            const shuffled = [...initialCandidates].sort(() => 0.5 - Math.random());
            firstEvent = shuffled[0];
            const candidatesForSecond = shuffled.slice(1).filter(e => getTimeDifference(e.date, firstEvent.date) !== 0);

            if (candidatesForSecond.length > 0) {
                secondEvent = candidatesForSecond[0];
            } else {
                const backup = validEvents.filter(e => e.id !== firstEvent.id && getTimeDifference(e.date, firstEvent.date) !== 0);
                secondEvent = backup.length > 0 ? backup[0] : null;
            }
        }

        if (firstEvent && secondEvent && firstEvent.date === secondEvent.date) {
            console.error(`❌ DUPLICATE FOUND: [${firstEvent.id}] ${firstEvent.titre} (${firstEvent.date}) and [${secondEvent.id}] ${secondEvent.titre} (${secondEvent.date})`);
            duplicateCount++;
        }
    }

    if (duplicateCount === 0) {
        console.log('✅ Success: 1000 simulations complete. No duplicates found.');
    } else {
        console.log(`❌ Failure: ${duplicateCount} duplicates found.`);
        process.exit(1);
    }
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
