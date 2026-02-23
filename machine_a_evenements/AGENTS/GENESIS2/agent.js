
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

const agentName = "GENESIS2";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

// --- Dedup utilities (don't trust LLM to respect blacklists) ---
function normalizeTitle(titre) {
    if (!titre) return "";
    return titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshteinDistance(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++)
        for (let j = 1; j <= a.length; j++)
            m[i][j] = b[i - 1] === a[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[b.length][a.length];
}

function isSimilar(t1, t2) {
    const n1 = normalizeTitle(t1), n2 = normalizeTitle(t2);
    const longer = n1.length > n2.length ? n1 : n2;
    if (longer.length === 0) return true;
    const sim = (longer.length - levenshteinDistance(n1, n2)) / longer.length;
    return sim >= 0.65;
}

function matchesBlacklist(event, blacklist) {
    for (const rejected of blacklist) {
        // Same year (±2) AND similar title → already rejected, skip
        if (Math.abs(event.year - rejected.year) <= 2 && isSimilar(event.titre, rejected.titre)) {
            return rejected;
        }
    }
    return null;
}

// Sujets sensibles — risque d'illustration problématique (conflits religieux/culturels)
const SENSITIVE_KEYWORDS = [
    'mahomet', 'muhammad', 'mohammed', 'prophete', 'prophet',
    'coran', 'quran', 'hegire', 'hijra',
    'caricatures de mahomet', 'charlie hebdo',
];

function isSensitiveEvent(titre) {
    const norm = normalizeTitle(titre);
    return SENSITIVE_KEYWORDS.some(kw => norm.includes(kw));
}

async function main() {
    const count = parseInt(process.argv[2]) || 50;
    let theme = process.argv[3] || "";

    // Load ANALYST brief if available
    const briefPath = path.join(process.cwd(), '../ANALYST/STORAGE/OUTPUT/analyst_brief.json');
    let analystBrief = null;
    let gapContext = "";

    if (fs.existsSync(briefPath)) {
        analystBrief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
        const gaps = analystBrief.gaps || [];
        if (gaps.length > 0) {
            gapContext = `\n🎯 LACUNES IDENTIFIÉES PAR L'ANALYSTE :\n` +
                gaps.map(g => {
                    let info = `- ${g.label}: ${g.recommendation} (priorité ${g.priority})`;
                    if (g.missingThemes && g.missingThemes.length > 0) {
                        info += `\n  ⚠️ THÈMES À PRIVILÉGIER: ${g.missingThemes.join(', ')}`;
                    }
                    return info;
                }).join('\n');
        }
        console.log(`[${agentName}] Brief ANALYST chargé. ${gaps.length} lacunes détectées.`);
    }

    // Load seed context
    const contextPath = path.join(process.cwd(), '../GENESIS/STORAGE/INPUT/seed_context.md');
    let context = "";
    if (fs.existsSync(contextPath)) {
        context = fs.readFileSync(contextPath, 'utf8');
    }

    // Load session history + build programmatic blacklist
    const sessionPath = path.join(process.cwd(), '../session_history.json');
    let sessionHistory = "";
    let sessionRejections = "";
    let blacklist = []; // For programmatic post-filter (don't trust LLM)
    if (fs.existsSync(sessionPath)) {
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        const validated = Array.isArray(sessionData) ? sessionData : (sessionData.validated || []);
        const rejections = sessionData.rejections || [];
        sessionHistory = validated.map(e => `${e.titre} (${e.year})`).join(', ');
        sessionRejections = rejections.map(e => `${e.titre} (${e.year})`).join(', ');
        // Build blacklist from both validated and rejected events
        blacklist = [...validated, ...rejections].filter(e => e.titre && e.year);
        console.log(`[${agentName}] 🧠 Blacklist chargée: ${blacklist.length} événements à éviter`);
    }

    // Default theme
    if (!theme) {
        const inputPath = path.join(process.cwd(), 'STORAGE/INPUT/seed_theme.txt');
        theme = fs.existsSync(inputPath) ? fs.readFileSync(inputPath, 'utf8') : "Histoire de France";
    }

    let yearRangeContext = "";
    if (analystBrief && analystBrief.gaps) {
        // Find if any gap matches the requested theme
        const matchingGap = analystBrief.gaps.find(g =>
            theme.toLowerCase().includes(g.label.toLowerCase()) ||
            g.label.toLowerCase().includes(theme.toLowerCase())
        );
        if (matchingGap) {
            yearRangeContext = `⚠️  PÉRIODE STRICTE : Tu DOIS générer des événements uniquement entre l'an ${matchingGap.startYear} et l'an ${matchingGap.endYear}.`;
        }
    }

    console.log(`[${agentName}] Génération CIBLÉE pour "${theme}" (cible: ${count})`);
    if (yearRangeContext) console.log(`[${agentName}] ${yearRangeContext}`);

    const prompt = `
Tu es GENESIS2, le générateur d'événements STRATÉGIQUE de la Machine Kiko.
Tu ne génères PAS n'importe quels événements. Tu génères des événements que les joueurs RECONNAÎTRONT.

🎯 MISSION : Produire ${count} événements historiques sur le thème "${theme}".
${yearRangeContext}

📊 CALIBRATION NOTORIÉTÉ (CRITIQUE) :
Tu génères pour un JEU DE CULTURE GÉNÉRALE destiné au grand public français.
Le joueur type est un Français de 30-50 ans, éducation standard (bac ou plus).

Chaque événement DOIT satisfaire ce test :
"Est-ce qu'un Français moyen a DÉJÀ ENTENDU PARLER de cet événement, même vaguement ?"
- Si OUI → L'événement est valide
- Si NON → REJETTE-LE et propose autre chose

EXEMPLES DE NOTORIÉTÉ CORRECTE (≥50) :
- "Bataille de Marignan" (1515) → Tout Français connaît la date ✅
- "Édit de Nantes" (1598) → Enseigné au collège ✅
- "Invention du cinématographe" (1895) → Frères Lumière, iconique ✅
- "Première greffe du cœur" (1967) → Événement médiatisé mondial ✅
- "Catastrophe de Tchernobyl" (1986) → Connu de tous ✅

EXEMPLES D'ÉVÉNEMENTS TROP OBSCURS (< 50) À ÉVITER :
- "Traité de Brétigny" → Seuls les médiévistes connaissent ❌
- "Loi Falloux" → Trop technique ❌
- "Bataille de Fontenoy-en-Puisaye" → Trop mineur ❌
- "Concile de Clermont" → Spécialisé ❌
- "Pragmatique Sanction de Bourges" → Expert uniquement ❌

⚠️ ZÉRO TOLÉRANCE POUR LES PÉRIODES :
N'accepte JAMAIS un "Règne", une "Dynastie" ou une "Période" comme événement. Un événement doit être un POINT dans le temps.
- "Règne de Louis XIV" ❌ (C'est une durée)
- "Sacre de Louis XIV" ✅ (C'est un événement précis)
- "Guerre de Cent Ans" ❌ (C'est une période)
- "Bataille d'Azincourt" ✅ (C'est un point précis)
- "Avènement de X" ✅ (Désigne le début d'un règne)

${gapContext}

⚠️ STRATÉGIE ANTI-DOUBLONS :
La base contient déjà +2600 événements. Les piliers célèbres y sont probablement.

CONTEXTE (ÉVÉNEMENTS DÉJÀ TRÈS PRÉSENTS) :
${context}

HISTORIQUE DE LA SESSION (ÉVITE CEUX-LÀ) :
${sessionHistory || "Aucun pour le moment."}

LISTE NOIRE (REJETÉS PRÉCÉDEMMENT) :
${sessionRejections || "Aucun pour le moment."}

⚠️ RÈGLES STRICTES :
1. Année EXACTE et vérifiable (consensus historique)
2. Année >= 100 (pas d'événements avant J.-C.)
3. Titre TRÈS COURT (max 50 caractères), pas de date dans le titre
4. Notoriété estimée >= 50 (un Français moyen doit connaître)
5. Pour chaque événement, indique ta confiance notoriété (0-100)

⚠️ ASTUCE POUR LES PÉRIODES ANCIENNES :
Pour le Moyen Âge ou l'Antiquité, privilégie :
- Les événements liés à des personnages ICONIQUES (Charlemagne, Jeanne d'Arc, Clovis...)
- Les batailles CÉLÈBRES (Hastings, Poitiers, Azincourt...)
- Les constructions EMBLÉMATIQUES (Notre-Dame, Mont-Saint-Michel...)
- Les grands fléaux (Peste Noire, Grande Famine...)
PAS les traités secondaires, conciles mineurs ou mariages dynastiques obscurs.
🚫 SUJETS SENSIBLES : Ne génère JAMAIS d'événements centré sur des figures religieuses fondatrices (ex: Mahomet, Moïse) dont la représentation peut être problématique. Privilégie les faits historiques, découvertes, ou constructions.

FORMAT JSON EXCLUSIF :
{
  "events": [
    { "titre": "Sacre de Charlemagne", "year": 800, "notoriete_estimee": 82, "justification": "Enseigné au collège, figure iconique" },
    ...
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        // Post-validation: filter year < 100 and low notoriety
        let events = data.events || [];
        const beforeCount = events.length;

        // Filter year
        const yearFiltered = events.filter(e => e.year >= 100);
        const yearRejects = beforeCount - yearFiltered.length;
        if (yearRejects > 0) {
            console.log(`[${agentName}] ⚠️ ${yearRejects} événements rejetés (année < 100)`);
        }

        // Filter sensitive topics (illustration risks)
        const safeFiltered = yearFiltered.filter(e => {
            if (isSensitiveEvent(e.titre)) {
                console.log(`[${agentName}] ⛔ Rejeté (sujet sensible pour illustration): "${e.titre}"`);
                return false;
            }
            return true;
        });
        const sensitiveRejects = yearFiltered.length - safeFiltered.length;

        // Filter low notoriety (< 40 is clearly too obscure even for generous estimate)
        const notFiltered = safeFiltered.filter(e => {
            if (e.notoriete_estimee !== undefined && e.notoriete_estimee < 40) {
                console.log(`[${agentName}] ⚠️ Rejeté (notoriété trop basse ${e.notoriete_estimee}): "${e.titre}"`);
                return false;
            }
            return true;
        });

        const notRejects = yearFiltered.length - notFiltered.length;

        // Programmatic blacklist filter — catch what Gemini ignores
        const deduped = notFiltered.filter(e => {
            const match = matchesBlacklist(e, blacklist);
            if (match) {
                console.log(`[${agentName}] 🚫 Filtré (déjà rejeté): "${e.titre}" (${e.year}) ≈ "${match.titre}" (${match.year})`);
                return false;
            }
            return true;
        });
        const blacklistRejects = notFiltered.length - deduped.length;

        console.log(`[${agentName}] ✅ ${deduped.length} événements NOUVEAUX retenus (${yearRejects} hors période, ${notRejects} trop obscurs, ${blacklistRejects} déjà rejetés)`);

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/genesis2_raw_batch.json');
        fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));

        logDecision(agentName, 'GENERATE', { theme, count }, 'SUCCESS',
            `${deduped.length} événements nouveaux (${yearRejects} hors période, ${notRejects} obscurs, ${blacklistRejects} déjà rejetés)`,
            { file: 'genesis2_raw_batch.json' });

    } catch (e) {
        console.error(`[${agentName}] Erreur:`, e.message);
        logDecision(agentName, 'GENERATE', { theme }, 'ERROR', e.message);
        process.exit(1);
    }
}

main();
