import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function analyzeUsage() {
    console.log("ANALYSIS START");

    const { data: usage, error: usageError } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)');

    if (usageError) {
        console.error("ERROR:", usageError.message);
        return;
    }

    const totalRows = usage.length;
    const uniqueUsers = new Set(usage.map(u => u.user_id)).size;
    const uniqueEvents = new Set(usage.map(u => u.event_id)).size;

    console.log("--- Global Stats ---");
    console.log("Total entries:", totalRows);
    console.log("Unique users:", uniqueUsers);
    console.log("Unique events seen:", uniqueEvents);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentActivity = usage.filter(u => u.last_seen_at >= oneDayAgo);

    console.log("--- Recent Activity (24h) ---");
    console.log("New records:", recentActivity.length);

    const eventStats = {};
    usage.forEach(u => {
        const title = u.evenements?.titre || 'Unknown';
        if (!eventStats[title]) eventStats[title] = 0;
        eventStats[title] += u.times_seen;
    });

    const topEvents = Object.entries(eventStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    console.log("--- Top 10 Events ---");
    topEvents.forEach(([title, count], i) => {
        console.log(`${i + 1}. ${title}: ${count} times`);
    });

    const userStats = {};
    usage.forEach(u => {
        if (!userStats[u.user_id]) userStats[u.user_id] = 0;
        userStats[u.user_id] += 1;
    });

    const topUsers = Object.entries(userStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    console.log("--- Top 5 Active Users ---");
    topUsers.forEach(([id, count], i) => {
        console.log(`${i + 1}. User ${id.slice(0, 8)}: ${count} events`);
    });

    console.log("ANALYSIS END");
}

analyzeUsage();
