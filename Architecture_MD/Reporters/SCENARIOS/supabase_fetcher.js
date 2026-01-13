/**
 * SUPABASE FETCHER (Sarah)
 * Permet d'extraire des "Human Stories" depuis la base de données.
 */

const { createClient } = require('@supabase/supabase-js');
// Note : Les credentials sont normalement dans les variables d'environnement
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getInterestingProfiles() {
    console.log("🔍 Sarah explore la base à la recherche d'histoires...");

    // Exemple : Chercher les joueurs qui ont fait plus de 10 parties entre 2h et 5h du matin
    const { data, error } = await supabase
        .from('game_sessions')
        .select('user_id, score, created_at')
        .filter('created_at', 'gte', '02:00:00')
        .filter('created_at', 'lte', '05:00:00')
        .limit(5);

    if (error) {
        console.error("❌ Erreur Sarah :", error);
        return;
    }

    console.log("📝 Profils trouvés pour investigation :", data);
}

// getInterestingProfiles();
