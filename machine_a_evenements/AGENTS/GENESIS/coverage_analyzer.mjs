/**
 * COVERAGE ANALYZER - Analyse les trous dans la base d'événements
 * Identifie les événements majeurs manquants pour guider GENESIS
 */

import { getSupabase } from '../shared_utils.mjs';

const supabase = getSupabase();

/**
 * Liste de référence des événements majeurs de l'histoire de France
 * Ces événements devraient être connus de la plupart des Français
 *
 * Structure: { titre_pattern, year, category, importance }
 */
const MAJOR_FRENCH_EVENTS = [
    // Antiquité et Haut Moyen Âge
    { pattern: ["alesia", "vercingetorix"], year: -52, category: "Bataille", importance: 10 },
    { pattern: ["bapteme", "clovis"], year: 496, category: "Religion", importance: 9 },
    { pattern: ["poitiers", "charles martel"], year: 732, category: "Bataille", importance: 9 },
    { pattern: ["charlemagne", "empereur"], year: 800, category: "Politique", importance: 10 },

    // Moyen Âge classique
    { pattern: ["hugues capet"], year: 987, category: "Politique", importance: 9 },
    { pattern: ["croisade", "jerusalem"], year: 1099, category: "Religion", importance: 8 },
    { pattern: ["philippe auguste", "bouvines"], year: 1214, category: "Bataille", importance: 7 },
    { pattern: ["saint louis", "mort"], year: 1270, category: "Politique", importance: 8 },

    // Bas Moyen Âge
    { pattern: ["guerre cent ans", "debut"], year: 1337, category: "Guerre", importance: 9 },
    { pattern: ["peste noire"], year: 1347, category: "Catastrophe", importance: 9 },
    { pattern: ["azincourt"], year: 1415, category: "Bataille", importance: 8 },
    { pattern: ["jeanne arc", "orleans"], year: 1429, category: "Bataille", importance: 10 },
    { pattern: ["jeanne arc", "bucher"], year: 1431, category: "Histoire", importance: 9 },

    // Renaissance
    { pattern: ["guerres italie"], year: 1494, category: "Guerre", importance: 6 },
    { pattern: ["marignan"], year: 1515, category: "Bataille", importance: 9 },
    { pattern: ["francois 1er", "debut"], year: 1515, category: "Politique", importance: 8 },
    { pattern: ["chambord"], year: 1519, category: "Architecture", importance: 7 },
    { pattern: ["saint barthelemy"], year: 1572, category: "Religion", importance: 9 },
    { pattern: ["henri iv", "edit nantes"], year: 1598, category: "Religion", importance: 9 },
    { pattern: ["henri iv", "assassinat"], year: 1610, category: "Politique", importance: 8 },

    // Ancien Régime
    { pattern: ["richelieu", "ministre"], year: 1624, category: "Politique", importance: 7 },
    { pattern: ["academie francaise"], year: 1635, category: "Culture", importance: 7 },
    { pattern: ["fronde"], year: 1648, category: "Révolte", importance: 7 },
    { pattern: ["louis xiv", "debut", "personnel"], year: 1661, category: "Politique", importance: 9 },
    { pattern: ["versailles", "installation"], year: 1682, category: "Architecture", importance: 8 },
    { pattern: ["revocation", "edit nantes"], year: 1685, category: "Religion", importance: 8 },
    { pattern: ["mort", "louis xiv"], year: 1715, category: "Politique", importance: 7 },
    { pattern: ["encyclopedie"], year: 1751, category: "Culture", importance: 8 },
    { pattern: ["guerre sept ans"], year: 1756, category: "Guerre", importance: 6 },

    // Révolution et Empire
    { pattern: ["etats generaux"], year: 1789, category: "Révolution", importance: 9 },
    { pattern: ["bastille"], year: 1789, category: "Révolution", importance: 10 },
    { pattern: ["droits homme"], year: 1789, category: "Révolution", importance: 9 },
    { pattern: ["fete federation"], year: 1790, category: "Révolution", importance: 7 },
    { pattern: ["fuite varennes"], year: 1791, category: "Révolution", importance: 8 },
    { pattern: ["valmy"], year: 1792, category: "Bataille", importance: 8 },
    { pattern: ["louis xvi", "execution"], year: 1793, category: "Révolution", importance: 10 },
    { pattern: ["terreur"], year: 1793, category: "Révolution", importance: 9 },
    { pattern: ["robespierre", "chute"], year: 1794, category: "Révolution", importance: 8 },
    { pattern: ["coup 18 brumaire"], year: 1799, category: "Politique", importance: 8 },
    { pattern: ["concordat"], year: 1801, category: "Religion", importance: 7 },
    { pattern: ["code civil"], year: 1804, category: "Droit", importance: 9 },
    { pattern: ["napoleon", "empereur", "sacre"], year: 1804, category: "Politique", importance: 9 },
    { pattern: ["austerlitz"], year: 1805, category: "Bataille", importance: 9 },
    { pattern: ["trafalgar"], year: 1805, category: "Bataille", importance: 7 },
    { pattern: ["blocus continental"], year: 1806, category: "Économie", importance: 6 },
    { pattern: ["campagne russie"], year: 1812, category: "Guerre", importance: 8 },
    { pattern: ["waterloo"], year: 1815, category: "Bataille", importance: 9 },

    // 19e siècle
    { pattern: ["restauration"], year: 1815, category: "Politique", importance: 7 },
    { pattern: ["trois glorieuses"], year: 1830, category: "Révolution", importance: 8 },
    { pattern: ["conquete algerie"], year: 1830, category: "Colonisation", importance: 7 },
    { pattern: ["revolution 1848"], year: 1848, category: "Révolution", importance: 8 },
    { pattern: ["coup etat", "napoleon iii"], year: 1851, category: "Politique", importance: 7 },
    { pattern: ["second empire"], year: 1852, category: "Politique", importance: 7 },
    { pattern: ["sedan"], year: 1870, category: "Bataille", importance: 8 },
    { pattern: ["commune paris"], year: 1871, category: "Révolte", importance: 8 },
    { pattern: ["troisieme republique"], year: 1870, category: "Politique", importance: 8 },
    { pattern: ["tour eiffel"], year: 1889, category: "Architecture", importance: 9 },
    { pattern: ["affaire dreyfus"], year: 1894, category: "Justice", importance: 9 },

    // 20e siècle
    { pattern: ["separation eglise etat"], year: 1905, category: "Religion", importance: 8 },
    { pattern: ["premiere guerre mondiale", "debut"], year: 1914, category: "Guerre", importance: 10 },
    { pattern: ["verdun"], year: 1916, category: "Bataille", importance: 10 },
    { pattern: ["armistice"], year: 1918, category: "Guerre", importance: 10 },
    { pattern: ["front populaire"], year: 1936, category: "Politique", importance: 8 },
    { pattern: ["conges payes"], year: 1936, category: "Social", importance: 8 },
    { pattern: ["seconde guerre mondiale", "debut"], year: 1939, category: "Guerre", importance: 10 },
    { pattern: ["appel 18 juin"], year: 1940, category: "Guerre", importance: 10 },
    { pattern: ["vichy"], year: 1940, category: "Politique", importance: 9 },
    { pattern: ["debarquement"], year: 1944, category: "Guerre", importance: 10 },
    { pattern: ["liberation paris"], year: 1944, category: "Guerre", importance: 9 },
    { pattern: ["droit vote femmes"], year: 1944, category: "Social", importance: 9 },
    { pattern: ["quatrieme republique"], year: 1946, category: "Politique", importance: 7 },
    { pattern: ["guerre indochine"], year: 1946, category: "Guerre", importance: 7 },
    { pattern: ["guerre algerie", "debut"], year: 1954, category: "Guerre", importance: 9 },
    { pattern: ["cinquieme republique"], year: 1958, category: "Politique", importance: 9 },
    { pattern: ["gaulle", "president"], year: 1958, category: "Politique", importance: 9 },
    { pattern: ["algerie", "independance"], year: 1962, category: "Décolonisation", importance: 9 },
    { pattern: ["mai 68"], year: 1968, category: "Révolte", importance: 10 },
    { pattern: ["pompidou", "president"], year: 1969, category: "Politique", importance: 6 },
    { pattern: ["giscard", "president"], year: 1974, category: "Politique", importance: 6 },
    { pattern: ["mitterrand", "president"], year: 1981, category: "Politique", importance: 8 },
    { pattern: ["abolition peine mort"], year: 1981, category: "Justice", importance: 9 },
    { pattern: ["chirac", "president"], year: 1995, category: "Politique", importance: 7 },
    { pattern: ["euro"], year: 2002, category: "Économie", importance: 8 }
];

/**
 * Normalise un titre (similaire à duplicate_detector)
 */
function normalizeTitle(titre) {
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Vérifie si un événement de la base correspond à un pattern de référence
 * Utilise une approche équilibrée pour détecter les variantes de titres
 */
function matchesPattern(eventTitle, eventYear, referenceEvent) {
    // Vérifier l'année (±2 ans de tolérance)
    if (Math.abs(eventYear - referenceEvent.year) > 2) {
        return false;
    }

    const normalizedTitle = normalizeTitle(eventTitle);

    // Vérifier si les mots du pattern sont présents (ordre non important)
    const wordsPresent = referenceEvent.pattern.filter(word => {
        const normalizedWord = word.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
        return normalizedTitle.includes(normalizedWord);
    });

    const matchCount = wordsPresent.length;
    const patternLength = referenceEvent.pattern.length;

    // Stratégie 1: Pour les patterns de 1 mot, il doit être présent
    if (patternLength === 1 && matchCount === 1) {
        return true;
    }

    // Stratégie 2: Pour les patterns de 2 mots, au moins 1 mot clé doit matcher
    // (ex: "alesia" OU "vercingetorix" pour détecter "Bataille d'Alésia")
    if (patternLength === 2 && matchCount >= 1) {
        return true;
    }

    // Stratégie 3: Pour les patterns de 3+ mots, au moins 50% doivent matcher
    if (patternLength >= 3 && matchCount >= Math.ceil(patternLength / 2)) {
        return true;
    }

    return false;
}

/**
 * Analyse la couverture de la base par rapport aux événements majeurs
 */
export async function analyzeCoverage() {
    console.log("📊 Analyse de la couverture historique...\n");

    // Récupérer tous les événements de la base
    let allEvents = [];
    let from = 0;
    let step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('evenements')
            .select('titre, date, notoriete')
            .range(from, from + step - 1);

        if (error) throw error;

        const processedData = data.map(e => ({
            titre: e.titre,
            year: parseInt(e.date.split('-')[0]),
            notoriete: e.notoriete || 0
        }));

        allEvents = allEvents.concat(processedData);
        if (data.length < step) hasMore = false;
        else from += step;
    }

    console.log(`   Base actuelle: ${allEvents.length} événements`);

    // Analyser quels événements majeurs sont présents/absents
    const missing = [];
    const present = [];

    for (const refEvent of MAJOR_FRENCH_EVENTS) {
        const found = allEvents.some(e => matchesPattern(e.titre, e.year, refEvent));

        if (found) {
            present.push(refEvent);
        } else {
            missing.push(refEvent);
        }
    }

    console.log(`   ✅ Événements majeurs présents: ${present.length}/${MAJOR_FRENCH_EVENTS.length}`);
    console.log(`   ❌ Événements majeurs manquants: ${missing.length}/${MAJOR_FRENCH_EVENTS.length}`);

    // Analyser par période
    const periods = {
        "Antiquité (-100 à 500)": { min: -100, max: 500 },
        "Haut Moyen Âge (500-1000)": { min: 500, max: 1000 },
        "Moyen Âge (1000-1500)": { min: 1000, max: 1500 },
        "Renaissance (1500-1600)": { min: 1500, max: 1600 },
        "Ancien Régime (1600-1789)": { min: 1600, max: 1789 },
        "Révolution/Empire (1789-1815)": { min: 1789, max: 1815 },
        "19e siècle (1815-1900)": { min: 1815, max: 1900 },
        "20e siècle (1900-2000)": { min: 1900, max: 2000 }
    };

    console.log("\n📅 Analyse par période:");
    const periodStats = {};

    for (const [periodName, range] of Object.entries(periods)) {
        const eventsInPeriod = allEvents.filter(e => e.year >= range.min && e.year <= range.max);
        const missingInPeriod = missing.filter(e => e.year >= range.min && e.year <= range.max);

        periodStats[periodName] = {
            total: eventsInPeriod.length,
            missing: missingInPeriod.length,
            missingEvents: missingInPeriod
        };

        console.log(`   ${periodName}: ${eventsInPeriod.length} événements, ${missingInPeriod.length} majeurs manquants`);
    }

    // Analyser par catégorie
    console.log("\n🏷️  Analyse par catégorie:");
    const categoryStats = {};

    const categories = [...new Set(MAJOR_FRENCH_EVENTS.map(e => e.category))];
    for (const category of categories) {
        const missingInCategory = missing.filter(e => e.category === category);
        if (missingInCategory.length > 0) {
            categoryStats[category] = missingInCategory;
            console.log(`   ${category}: ${missingInCategory.length} événements manquants`);
        }
    }

    // Top priorités (événements manquants les plus importants)
    const topMissing = missing
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 20);

    console.log("\n🎯 Top 20 événements majeurs manquants (par importance):");
    topMissing.forEach((event, i) => {
        console.log(`   ${i + 1}. [${event.year}] ${event.pattern.join(' + ')} (importance: ${event.importance}/10)`);
    });

    return {
        totalEvents: allEvents.length,
        majorEventsPresent: present.length,
        majorEventsMissing: missing.length,
        missingEvents: missing,
        topMissing,
        periodStats,
        categoryStats
    };
}

/**
 * Génère un contexte intelligent pour GENESIS basé sur l'analyse de couverture
 */
export function generateGenesisContext(coverageAnalysis) {
    const { missingEvents, periodStats, categoryStats, topMissing } = coverageAnalysis;

    // Identifier les périodes sous-représentées
    const underRepresentedPeriods = Object.entries(periodStats)
        .filter(([_, stats]) => stats.missing > 0)
        .sort((a, b) => b[1].missing - a[1].missing)
        .slice(0, 3)
        .map(([period]) => period);

    // Identifier les catégories manquantes
    const underRepresentedCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3)
        .map(([category]) => category);

    // Construire le contexte
    const context = {
        instruction: "Génère des événements MAJEURS de l'Histoire de France qui sont TRÈS CONNUS des Français.",
        priorities: {
            topMissing: topMissing.slice(0, 10).map(e => ({
                pattern: e.pattern.join(' '),
                year: e.year,
                category: e.category
            })),
            underRepresentedPeriods,
            underRepresentedCategories
        },
        guidance: [
            `Focus sur les périodes: ${underRepresentedPeriods.join(', ')}`,
            `Priorité aux catégories: ${underRepresentedCategories.join(', ')}`,
            "Événements très célèbres (enseignés à l'école, commémorés, connus de tous)",
            "Évite les événements obscurs ou trop spécialisés",
            "Privilégie les tournants historiques majeurs"
        ]
    };

    return context;
}
