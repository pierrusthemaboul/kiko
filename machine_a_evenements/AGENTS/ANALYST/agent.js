
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { getSupabase, logDecision } from '../shared_utils.mjs';

const agentName = "ANALYST";
const supabase = getSupabase('prod');

// Periods matching useEventSelector.ts HistoricalPeriod enum
const PERIODS = {
    ANTIQUITY: { label: 'Antiquité (100-500)', min: 100, max: 499 },
    MIDDLE_AGES: { label: 'Moyen Âge (500-1500)', min: 500, max: 1499 },
    RENAISSANCE: { label: 'Renaissance (1500-1800)', min: 1500, max: 1799 },
    NINETEENTH: { label: 'XIXe siècle (1800-1900)', min: 1800, max: 1899 },
    TWENTIETH: { label: 'XXe siècle (1900-2000)', min: 1900, max: 1999 },
    TWENTYFIRST: { label: 'XXIe siècle (2000+)', min: 2000, max: 2099 }
};

function getPeriod(year) {
    if (year < 500) return 'ANTIQUITY';
    if (year < 1500) return 'MIDDLE_AGES';
    if (year < 1800) return 'RENAISSANCE';
    if (year < 1900) return 'NINETEENTH';
    if (year < 2000) return 'TWENTIETH';
    return 'TWENTYFIRST';
}

function getNotorietyTier(notoriete) {
    if (notoriete >= 75) return 'T1_STAR';
    if (notoriete >= 50) return 'T2_CLASSIC';
    return 'T3_EXPERT';
}

async function main() {
    console.log(`[${agentName}] Analyse des lacunes du catalogue de production...`);

    // Fetch all events from production with pagination
    let allEvents = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('evenements')
            .select('titre, date, notoriete, types_evenement')
            .range(from, from + step - 1);

        if (error) {
            console.error(`[${agentName}] Erreur lecture production:`, error.message);
            process.exit(1);
        }

        allEvents = allEvents.concat(data);
        if (data.length < step) hasMore = false;
        else from += step;
    }

    console.log(`[${agentName}] ${allEvents.length} événements chargés depuis la production.`);

    // Parse years and compute stats
    const parsed = allEvents.map(e => {
        const yearStr = e.date ? e.date.split('-')[0] : '0';
        return {
            titre: e.titre,
            year: parseInt(yearStr),
            notoriete: e.notoriete || 0,
            types: e.types_evenement || []
        };
    }).filter(e => e.year >= 100);

    // Period distribution
    const periodStats = {};
    for (const key of Object.keys(PERIODS)) {
        periodStats[key] = { total: 0, t1: 0, t2: 0, t3: 0, avgNotoriete: 0, notSum: 0 };
    }

    for (const evt of parsed) {
        const period = getPeriod(evt.year);
        const tier = getNotorietyTier(evt.notoriete);
        periodStats[period].total++;
        periodStats[period].notSum += evt.notoriete;
        if (tier === 'T1_STAR') periodStats[period].t1++;
        else if (tier === 'T2_CLASSIC') periodStats[period].t2++;
        else periodStats[period].t3++;
    }

    // Compute averages and identify gaps
    const gaps = [];
    const idealDistribution = {
        ANTIQUITY: 0.06,
        MIDDLE_AGES: 0.18,
        RENAISSANCE: 0.18,
        NINETEENTH: 0.18,
        TWENTIETH: 0.28,
        TWENTYFIRST: 0.12
    };

    const MANDATORY_THEMES = [
        "Politique", "Guerre & Militaire", "Science & Technologie", "Arts & Culture",
        "Religion & Spiritualité", "Économie & Commerce", "Société & Social",
        "Exploration & Découvertes", "Catastrophes & Environnement", "Sport", "Justice & Droit", "Santé & Médecine"
    ];

    const THEME_FLAVORS = {
        "Politique": ["Grands traités", "Coups d'État", "Assassinats politiques", "Nouvelles constitutions"],
        "Guerre & Militaire": ["Batailles décisives", "Sièges célèbres", "Traités de paix", "Inventions militaires"],
        "Arts & Culture": ["Peinture & Sculpture", "Grands romans", "Mouvements artistiques", "Premières de théâtre"],
        "Société & Social": ["Révoltes populaires", "Droits des femmes", "Grands procès de société", "Éducation"],
        "Catastrophes & Environnement": ["Séismes majeurs", "Éruptions", "Grandes famines", "Inondations historiques"],
        "Sport": ["Premiers tournois", "Jeux Olympiques", "Records historiques", "Naissances de sports"],
        "Justice & Droit": ["Codes de lois", "Grands procès", "Déclarations de droits", "Abolitions"],
        "Santé & Médecine": ["Grandes épidémies", "Premières chirurgies", "Découvertes de virus", "Traités de médecine"],
        "Religion & Spiritualité": {
            default: ["Réformes religieuses", "Mystiques", "Grands conciles"],
            ancient: ["Cultes antiques", "Mythologie", "Premiers temples"],
            medieval: ["Fondations d'ordres", "Pèlerinages", "Hérésies"],
            modern: ["Laïcité", "Nouveaux mouvements spirituels", "Crises de foi"]
        },
        "Exploration & Découvertes": {
            default: ["Cartographie", "Grands explorateurs", "Nouveaux mondes"],
            ancient: ["Routes commerciales", "Périples maritimes", "Confins du monde"],
            industrial: ["Expéditions polaires", "Sommets himalayens", "Traversées"],
            contemporary: ["Conquête spatiale", "Abysses", "Mars & Lune"]
        },
        "Science & Technologie": {
            default: ["Inventions révolutionnaires", "Grandes théories"],
            ancient: ["Astronomie primitive", "Mathématiques", "Médecine antique"],
            industrial: ["Électricité", "Vapeur", "Vaccins"],
            contemporary: ["Intelligence Artificielle", "Physique quantique", "Génétique"]
        },
        "Économie & Commerce": {
            default: ["Scandales financiers", "Nouvelles monnaies"],
            ancient: ["Routes de la soie", "Troc et marchés"],
            industrial: ["Bourse", "Standard pétrolier", "Syndicats"],
            contemporary: ["Cryptomonnaies", "Crash boursier", "Startups"]
        }
        // Les autres thèmes restent génériques ou sont adaptés de la même façon
    };

    function getInspiredExample(theme, periodKey) {
        const data = THEME_FLAVORS[theme];
        if (!data) return "Événements marquants";

        // Si c'est un tableau simple (thèmes non encore adaptés par époque)
        if (Array.isArray(data)) {
            return data[Math.floor(Math.random() * data.length)];
        }

        // Si c'est un objet structuré par époque
        const eraMapping = {
            'ANTIQUITY': 'ancient', 'MIDDLE_AGES': 'medieval', 'RENAISSANCE': 'modern',
            'NINETEENTH': 'industrial', 'TWENTIETH': 'modern', 'TWENTYFIRST': 'contemporary'
        };
        const era = eraMapping[periodKey] || 'default';
        const list = data[era] || data.default || [];

        if (list.length === 0) return "Événements marquants";
        return list[Math.floor(Math.random() * list.length)];
    }

    const totalEvents = parsed.length;
    console.log(`\n[${agentName}] === ÉTAT DU CATALOGUE ===`);
    console.log(`Total: ${totalEvents} événements valides\n`);

    // Step 2: Theme distribution per period
    const themeCountsByPeriod = {};
    for (const key of Object.keys(PERIODS)) {
        themeCountsByPeriod[key] = {};
        MANDATORY_THEMES.forEach(t => themeCountsByPeriod[key][t] = 0);
    }

    for (const evt of parsed) {
        const period = getPeriod(evt.year);
        if (evt.types && Array.isArray(evt.types)) {
            evt.types.forEach(t => {
                if (themeCountsByPeriod[period] && themeCountsByPeriod[period].hasOwnProperty(t)) {
                    themeCountsByPeriod[period][t]++;
                }
            });
        }
    }

    for (const [key, stats] of Object.entries(periodStats)) {
        stats.avgNotoriete = stats.total > 0 ? Math.round(stats.notSum / stats.total) : 0;
        const currentShare = stats.total / totalEvents;
        const idealShare = idealDistribution[key];
        const deficit = Math.max(0, Math.round(idealShare * totalEvents - stats.total));
        const highNotDeficit = Math.max(0, Math.round(stats.total * 0.55) - (stats.t1 + stats.t2));

        // Identify missing themes for this period
        const missingThemes = MANDATORY_THEMES.filter(t => (themeCountsByPeriod[key][t] || 0) < 5);

        // Get inspired examples
        const examples = missingThemes.map(t => getInspiredExample(t, key)).slice(0, 3);

        console.log(`  ${PERIODS[key].label}:`);
        console.log(`    Total: ${stats.total} (${(currentShare * 100).toFixed(1)}% | idéal: ${(idealShare * 100).toFixed(0)}%)`);
        console.log(`    T1(≥75): ${stats.t1} | T2(≥50): ${stats.t2} | T3(<50): ${stats.t3}`);
        console.log(`    Notoriété moy: ${stats.avgNotoriete}`);
        if (missingThemes.length > 0) {
            console.log(`    🔴 Thèmes en sous-effectif: ${missingThemes.join(', ')}`);
        }

        if (deficit > 0 || highNotDeficit > 0 || missingThemes.length > 0) {
            gaps.push({
                period: key,
                label: PERIODS[key].label,
                currentCount: stats.total,
                deficit,
                highNotDeficit,
                missingThemes,
                priority: deficit > 50 ? 'HIGH' : (deficit > 20 || missingThemes.length > 3) ? 'MEDIUM' : 'LOW',
                recommendation: deficit > 0
                    ? `Peu représenté. Idée: ${examples.join(', ')}...`
                    : missingThemes.length > 0
                        ? `Manque de diversité. Pistes: ${examples.join(', ')}...`
                        : `Manque de "stars". Chercher des événements très connus.`
            });
            console.log(`    ⚠️  Déficit: ${deficit} événements | Haute not. manquante: ${highNotDeficit}`);
        } else {
            console.log(`    ✅ Bien couvert`);
        }
        console.log('');
    }

    // Sort gaps by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Build strategic brief
    const brief = {
        timestamp: new Date().toISOString(),
        totalEvents: totalEvents,
        periodStats,
        gaps,
        topPriorities: gaps.filter(g => g.priority === 'HIGH').map(g => g.label),
        generationGuidelines: {
            minNotoriete: 50,
            targetNotoriete: '60-85',
            calibration: 'Un Français moyen de 30-50 ans doit pouvoir reconnaître cet événement ou au minimum le situer à ±20 ans.',
            avoidList: [
                'Événements ultra-spécialisés (batailles mineures, traités secondaires)',
                'Événements locaux sans impact national',
                'Personnages connus uniquement des historiens',
                'Sous-événements techniques de conflits plus larges'
            ],
            preferList: [
                'Événements enseignés au collège/lycée en France',
                'Événements liés à des personnages célèbres',
                'Découvertes scientifiques majeures',
                'Traités et lois qui ont changé la société',
                'Événements culturels iconiques (livres, films, inventions)',
                'Événements sportifs mémorables',
                'Catastrophes naturelles ou industrielles majeures'
            ]
        }
    };

    // Save brief
    const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/analyst_brief.json');
    fs.writeFileSync(outputPath, JSON.stringify(brief, null, 2));

    console.log(`\n[${agentName}] ✅ Brief stratégique généré: analyst_brief.json`);
    console.log(`[${agentName}] Priorités: ${brief.topPriorities.join(', ') || 'Aucune priorité haute'}`);

    logDecision(agentName, 'ANALYZE', { totalEvents }, 'SUCCESS', `${gaps.length} lacunes identifiées`, { gaps: gaps.length });
}

main();
