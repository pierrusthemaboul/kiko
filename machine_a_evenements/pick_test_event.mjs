import { getSupabase } from './AGENTS/shared_utils.mjs';

async function pick() {
    const supabase = getSupabase();
    const { data: events, error } = await supabase
        .from('queue_sevent')
        .select('*')
        .eq('status', 'pending')
        .limit(5);

    if (error) {
        console.error('Error fetching queue:', error);
        return;
    }

    if (!events || events.length === 0) {
        console.log('No pending events in queue.');
        return;
    }

    console.log(JSON.stringify(events, null, 2));
}

pick();
