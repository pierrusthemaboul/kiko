import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateDates() {
    console.log('Fetching all events...');
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, date, titre')
        .order('date');

    if (error) {
        console.error('Error fetching events:', error);
        return;
    }

    console.log(`Fetched ${events.length} events.`);

    const dateMap = new Map();
    const duplicates = [];

    for (const event of events) {
        if (dateMap.has(event.date)) {
            duplicates.push({
                date: event.date,
                event1: dateMap.get(event.date),
                event2: { id: event.id, titre: event.titre }
            });
        } else {
            dateMap.set(event.date, { id: event.id, titre: event.titre });
        }
    }

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate dates:`);
        duplicates.slice(0, 10).forEach(d => {
            console.log(`- Date: ${d.date}`);
            console.log(`  1: [${d.event1.id}] ${d.event1.titre}`);
            console.log(`  2: [${d.event2.id}] ${d.event2.titre}`);
        });
        if (duplicates.length > 10) {
            console.log('...');
        }
    } else {
        console.log('No duplicate dates found.');
    }
}

checkDuplicateDates();
