/**
 * DIAGNOSTIC PRÉCIS DES TROUS
 * Identifie exactement quels événements ultra-connus manquent dans votre base
 */

import { getSupabase } from './AGENTS/shared_utils.mjs';
import fs from 'fs';

const supabase = getSupabase();

/**
 * Liste de 50 événements ULTRA-CONNUS que tout Français devrait connaître
 * Uniquement des dates précises (pas de périodes), uniquement après JC
 */
const EVENEMENTS_ULTRA_CONNUS = [
    // Moyen Âge
    { titre: "Baptême de Clovis", year: 496, mots_cles: ["bapteme", "clovis"] },
    { titre: "Bataille de Poitiers", year: 732, mots_cles: ["poitiers", "charles martel"] },
    { titre: "Sacre de Charlemagne", year: 800, mots_cles: ["charlemagne", "empereur", "sacre", "couronnement"] },
    { titre: "Traité de Verdun", year: 843, mots_cles: ["verdun", "traite", "partage"] },
    { titre: "Hugues Capet roi", year: 987, mots_cles: ["hugues capet", "roi", "sacre", "avènement"] },
    { titre: "Première croisade", year: 1096, mots_cles: ["croisade", "jerusalem"] },
    { titre: "Bataille de Bouvines", year: 1214, mots_cles: ["bouvines", "philippe auguste"] },
    { titre: "Mort de Saint Louis", year: 1270, mots_cles: ["saint louis", "mort"] },

    // Guerre de Cent Ans
    { titre: "Début Guerre de Cent Ans", year: 1337, mots_cles: ["guerre cent ans", "debut"] },
    { titre: "Peste Noire", year: 1347, mots_cles: ["peste", "noire"] },
    { titre: "Bataille d'Azincourt", year: 1415, mots_cles: ["azincourt"] },
    { titre: "Jeanne d'Arc à Orléans", year: 1429, mots_cles: ["jeanne", "orleans", "siege"] },
    { titre: "Mort de Jeanne d'Arc", year: 1431, mots_cles: ["jeanne", "mort", "bucher", "rouen"] },

    // Renaissance
    { titre: "Bataille de Marignan", year: 1515, mots_cles: ["marignan"] },
    { titre: "François Ier roi", year: 1515, mots_cles: ["francois", "roi", "sacre"] },
    { titre: "Édit de Villers-Cotterêts", year: 1539, mots_cles: ["villers cotterets", "francais", "langue"] },
    { titre: "Massacre Saint-Barthélemy", year: 1572, mots_cles: ["saint barthelemy", "massacre"] },
    { titre: "Édit de Nantes", year: 1598, mots_cles: ["edit", "nantes", "henri"] },

    // 17e siècle
    { titre: "Assassinat Henri IV", year: 1610, mots_cles: ["henri", "assassinat", "ravaillac"] },
    { titre: "Richelieu ministre", year: 1624, mots_cles: ["richelieu", "ministre"] },
    { titre: "Académie française", year: 1635, mots_cles: ["academie", "francaise"] },
    { titre: "Mort de Louis XIV", year: 1715, mots_cles: ["louis xiv", "mort"] },

    // 18e siècle
    { titre: "Encyclopédie", year: 1751, mots_cles: ["encyclopedie", "diderot"] },

    // Révolution
    { titre: "Convocation États généraux", year: 1789, mots_cles: ["etats generaux"] },
    { titre: "Serment Jeu de Paume", year: 1789, mots_cles: ["jeu de paume", "serment"] },
    { titre: "Prise de la Bastille", year: 1789, mots_cles: ["bastille", "prise"] },
    { titre: "Déclaration Droits Homme", year: 1789, mots_cles: ["droits", "homme", "declaration"] },
    { titre: "Fuite à Varennes", year: 1791, mots_cles: ["varennes", "fuite"] },
    { titre: "Bataille de Valmy", year: 1792, mots_cles: ["valmy"] },
    { titre: "Exécution Louis XVI", year: 1793, mots_cles: ["louis xvi", "execution", "guillotine"] },
    { titre: "Chute de Robespierre", year: 1794, mots_cles: ["robespierre", "chute", "thermidor"] },

    // Empire
    { titre: "Coup 18 Brumaire", year: 1799, mots_cles: ["brumaire", "coup", "napoleon"] },
    { titre: "Concordat", year: 1801, mots_cles: ["concordat"] },
    { titre: "Code Civil", year: 1804, mots_cles: ["code civil", "napoleonien"] },
    { titre: "Sacre de Napoléon", year: 1804, mots_cles: ["napoleon", "sacre", "empereur"] },
    { titre: "Bataille d'Austerlitz", year: 1805, mots_cles: ["austerlitz"] },
    { titre: "Bataille de Waterloo", year: 1815, mots_cles: ["waterloo"] },

    // 19e siècle
    { titre: "Trois Glorieuses", year: 1830, mots_cles: ["trois glorieuses", "juillet"] },
    { titre: "Révolution 1848", year: 1848, mots_cles: ["revolution", "1848", "deuxieme republique"] },
    { titre: "Coup d'État Napoléon III", year: 1851, mots_cles: ["coup", "napoleon iii"] },
    { titre: "Guerre Franco-Prussienne", year: 1870, mots_cles: ["franco prussienne", "sedan"] },
    { titre: "Commune de Paris", year: 1871, mots_cles: ["commune", "paris"] },
    { titre: "Tour Eiffel", year: 1889, mots_cles: ["tour eiffel", "inauguration"] },
    { titre: "Affaire Dreyfus", year: 1894, mots_cles: ["dreyfus", "affaire"] },

    // 20e siècle
    { titre: "Séparation Église-État", year: 1905, mots_cles: ["separation", "eglise", "etat"] },
    { titre: "Début 1ère Guerre mondiale", year: 1914, mots_cles: ["guerre mondiale", "1914", "premiere"] },
    { titre: "Bataille de Verdun", year: 1916, mots_cles: ["verdun", "bataille"] },
    { titre: "Armistice 1918", year: 1918, mots_cles: ["armistice", "1918", "fin guerre"] },
    { titre: "Front Populaire", year: 1936, mots_cles: ["front populaire"] },
    { titre: "Appel du 18 juin", year: 1940, mots_cles: ["appel", "18 juin", "gaulle"] },
    { titre: "Libération de Paris", year: 1944, mots_cles: ["liberation", "paris"] }
];

/**
 * Vérifie si un événement existe dans la base via requête SQL
 */
async function verifierExistence(event) {
    const yearMin = event.year - 2;
    const yearMax = event.year + 2;

    // Requête avec ILIKE pour chaque mot-clé
    let query = supabase
        .from('evenements')
        .select('titre, date')
        .gte('date', `${yearMin}-01-01`)
        .lte('date', `${yearMax}-12-31`);

    const { data, error } = await query;

    if (error) {
        console.error(`Erreur requête pour ${event.titre}:`, error);
        return { existe: false, matches: [] };
    }

    if (!data || data.length === 0) {
        return { existe: false, matches: [] };
    }

    // Chercher un match dans les résultats
    const matches = [];
    for (const row of data) {
        const titre_norm = row.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Vérifier si au moins 50% des mots-clés sont présents
        const motsPresents = event.mots_cles.filter(mot =>
            titre_norm.includes(mot.toLowerCase())
        );

        if (motsPresents.length >= Math.ceil(event.mots_cles.length / 2)) {
            matches.push({
                titre: row.titre,
                date: row.date,
                motsMatches: motsPresents
            });
        }
    }

    return {
        existe: matches.length > 0,
        matches
    };
}

/**
 * Diagnostic principal
 */
async function diagnostiquer() {
    console.log("🔍 DIAGNOSTIC PRÉCIS DES TROUS\n");
    console.log("Connexion à Supabase local (http://127.0.0.1:54321)...\n");

    const presents = [];
    const manquants = [];

    console.log("Vérification de 50 événements ultra-connus...\n");

    for (let i = 0; i < EVENEMENTS_ULTRA_CONNUS.length; i++) {
        const event = EVENEMENTS_ULTRA_CONNUS[i];
        process.stdout.write(`[${i + 1}/${EVENEMENTS_ULTRA_CONNUS.length}] ${event.titre} (${event.year})... `);

        const resultat = await verifierExistence(event);

        if (resultat.existe) {
            console.log(`✅ PRÉSENT (${resultat.matches[0].titre})`);
            presents.push({
                ...event,
                match: resultat.matches[0]
            });
        } else {
            console.log(`❌ MANQUANT`);
            manquants.push(event);
        }
    }

    // Statistiques
    console.log("\n" + "=".repeat(80));
    console.log("📊 RÉSULTATS");
    console.log("=".repeat(80));
    console.log(`Total événements vérifiés: ${EVENEMENTS_ULTRA_CONNUS.length}`);
    console.log(`✅ Présents: ${presents.length} (${((presents.length / EVENEMENTS_ULTRA_CONNUS.length) * 100).toFixed(1)}%)`);
    console.log(`❌ Manquants: ${manquants.length} (${((manquants.length / EVENEMENTS_ULTRA_CONNUS.length) * 100).toFixed(1)}%)`);

    // Liste des manquants
    if (manquants.length > 0) {
        console.log("\n" + "=".repeat(80));
        console.log("❌ ÉVÉNEMENTS MANQUANTS À AJOUTER");
        console.log("=".repeat(80));

        manquants.forEach((event, i) => {
            console.log(`${i + 1}. [${event.year}] ${event.titre}`);
            console.log(`   Mots-clés: ${event.mots_cles.join(', ')}`);
        });
    }

    // Export JSON
    const rapport = {
        date_analyse: new Date().toISOString(),
        total: EVENEMENTS_ULTRA_CONNUS.length,
        presents: presents.length,
        manquants: manquants.length,
        taux_couverture: ((presents.length / EVENEMENTS_ULTRA_CONNUS.length) * 100).toFixed(1) + '%',
        liste_manquants: manquants.map(e => ({
            titre: e.titre,
            year: e.year,
            mots_cles: e.mots_cles
        })),
        liste_presents: presents.map(e => ({
            titre_reference: e.titre,
            year: e.year,
            titre_trouve: e.match.titre,
            date_trouvee: e.match.date
        }))
    };

    const rapportPath = 'machine_a_evenements/rapport_trous_precis.json';
    fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2));

    console.log("\n📄 Rapport exporté: " + rapportPath);

    return rapport;
}

// Exécution
diagnostiquer().catch(console.error);
