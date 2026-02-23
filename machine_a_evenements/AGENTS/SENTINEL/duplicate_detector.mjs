/**
 * DUPLICATE DETECTOR - Utilitaires pour la détection de doublons
 * Utilisé par SENTINEL pour pré-filtrer les doublons évidents avant l'analyse IA
 */

/**
 * Normalise un titre pour la comparaison
 * - Minuscules
 * - Sans accents
 * - Sans ponctuation
 * - Trimé
 */
export function normalizeTitle(titre) {
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
        .replace(/[^a-z0-9\s]/g, '') // Enlever ponctuation
        .replace(/\s+/g, ' ') // Normaliser espaces
        .trim();
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * Retourne le nombre de modifications nécessaires pour transformer str1 en str2
 */
export function levenshteinDistance(str1, str2) {
    const matrix = [];

    // Initialisation de la première colonne
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    // Initialisation de la première ligne
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    // Calcul de la distance
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // suppression
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Calcule le coefficient de similarité entre deux chaînes (0 à 1)
 * 1 = identique, 0 = totalement différent
 */
export function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Extrait les mots-clés significatifs d'un texte
 * (enlève les stop words français)
 */
export function extractKeywords(text) {
    const stopWords = [
        'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'en',
        'a', 'au', 'aux', 'par', 'pour', 'dans', 'sur', 'avec', 'sans',
        'sous', 'vers', 'chez', 'contre', 'entre', 'pendant', 'depuis'
    ];

    return text
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Détecte si un événement est un doublon exact d'un des candidats
 * Utilise plusieurs stratégies :
 * 1. Comparaison de titre normalisé
 * 2. Similarité de Levenshtein
 * 3. Analyse des mots-clés communs
 *
 * @param {Object} event - Événement à vérifier {titre, year}
 * @param {Array} candidates - Événements existants {titre, year}
 * @returns {Object} {isDuplicate: boolean, reason: string, match: Object|null}
 */
export function isExactDuplicate(event, candidates) {
    const normalized = normalizeTitle(event.titre);
    const eventKeywords = extractKeywords(normalized);

    for (const candidate of candidates) {
        const candidateNorm = normalizeTitle(candidate.titre);
        const candidateKeywords = extractKeywords(candidateNorm);

        // STRATÉGIE 1 : Titre identique après normalisation ET même année
        if (normalized === candidateNorm && event.year === candidate.year) {
            return {
                isDuplicate: true,
                reason: `Titre identique (normalisé) + même année: "${candidate.titre}"`,
                match: candidate,
                strategy: 'EXACT_MATCH'
            };
        }

        // STRATÉGIE 2 : Titre très similaire (>= 80%) ET même année
        const similarity = calculateSimilarity(normalized, candidateNorm);
        if (similarity >= 0.80 && event.year === candidate.year) {
            return {
                isDuplicate: true,
                reason: `Titre très similaire (${(similarity * 100).toFixed(0)}%) + même année: "${candidate.titre}"`,
                match: candidate,
                strategy: 'HIGH_SIMILARITY',
                similarity: similarity
            };
        }

        // STRATÉGIE 3 : Mots-clés identiques ET même année
        const commonKeywords = eventKeywords.filter(k => candidateKeywords.includes(k));
        const keywordMatchRatio = commonKeywords.length / Math.max(eventKeywords.length, 1);

        if (commonKeywords.length >= 3 && keywordMatchRatio > 0.75 && event.year === candidate.year) {
            return {
                isDuplicate: true,
                reason: `Mots-clés communs (${commonKeywords.length}/${eventKeywords.length}) + même année: [${commonKeywords.join(', ')}] - "${candidate.titre}"`,
                match: candidate,
                strategy: 'KEYWORD_MATCH',
                keywords: commonKeywords
            };
        }

        // STRATÉGIE 4 : Similarité élevée (> 85%) avec année proche (±1 an)
        if (similarity > 0.85 && Math.abs(event.year - candidate.year) <= 1) {
            return {
                isDuplicate: true,
                reason: `Titre similaire (${(similarity * 100).toFixed(0)}%) + année proche (±1): "${candidate.titre}"`,
                match: candidate,
                strategy: 'SIMILARITY_CLOSE_YEAR',
                similarity: similarity
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Sélectionne les meilleurs candidats pour l'analyse IA
 * Priorise par proximité d'année et similarité de titre
 *
 * @param {Object} event - Événement à analyser
 * @param {Array} candidates - Tous les candidats
 * @param {number} maxCount - Nombre max de candidats à retourner
 * @returns {Array} - Candidats triés et limités
 */
export function selectBestCandidates(event, candidates, maxCount = 20) {
    const normalized = normalizeTitle(event.titre);

    // Score chaque candidat
    const scoredCandidates = candidates.map(candidate => {
        const candidateNorm = normalizeTitle(candidate.titre);
        const yearDiff = Math.abs(event.year - candidate.year);
        const similarity = calculateSimilarity(normalized, candidateNorm);

        // Score : plus c'est proche, plus c'est élevé
        const score = (5 - yearDiff) * 10 + similarity * 50;

        return {
            ...candidate,
            _score: score,
            _similarity: similarity,
            _yearDiff: yearDiff
        };
    });

    // Trier par score décroissant
    scoredCandidates.sort((a, b) => b._score - a._score);

    // Retourner les N meilleurs sans les métadonnées de scoring
    return scoredCandidates.slice(0, maxCount).map(c => {
        const { _score, _similarity, _yearDiff, ...candidate } = c;
        return candidate;
    });
}

/**
 * Génère un résumé des statistiques de détection pour l'audit
 */
export function generateDetectionStats(results) {
    const stats = {
        total: results.length,
        exactMatch: 0,
        highSimilarity: 0,
        keywordMatch: 0,
        similarityCloseYear: 0,
        aiDecision: 0
    };

    results.forEach(r => {
        if (r.rejectionType === 'PRE_FILTER') {
            switch (r.strategy) {
                case 'EXACT_MATCH': stats.exactMatch++; break;
                case 'HIGH_SIMILARITY': stats.highSimilarity++; break;
                case 'KEYWORD_MATCH': stats.keywordMatch++; break;
                case 'SIMILARITY_CLOSE_YEAR': stats.similarityCloseYear++; break;
            }
        } else if (r.rejectionType === 'AI_DECISION') {
            stats.aiDecision++;
        }
    });

    return stats;
}
