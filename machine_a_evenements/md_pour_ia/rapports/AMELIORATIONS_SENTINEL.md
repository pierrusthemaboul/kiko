# Améliorations proposées pour SENTINEL

## 🎯 Objectif
Éliminer complètement les doublons dans la table `evenements` en améliorant le processus de filtrage de SENTINEL.

## 📊 Diagnostic du problème actuel

### Statistiques du dernier run
- **Événements générés** : 25 (GENESIS)
- **Événements validés** : 9 (SENTINEL)
- **Doublons non détectés** : **7 sur 9** (78% d'échec !)

### Exemples de doublons non détectés
1. ❌ "Prise de la Bastille" (1789) - existe déjà exactement
2. ❌ "Couronnement de Charlemagne" (800) - 2 variantes existent déjà
3. ❌ "Hugues Capet" (987) - 3 variantes existent déjà

## 🔧 Solutions techniques

### Solution 1 : Vérification exacte AVANT l'IA (Obligatoire)

**Ajout d'un pré-filtre strict** pour les cas évidents :

```javascript
// ÉTAPE 2a : PRÉ-FILTRE EXACT (avant l'IA)
function normalizeTitle(titre) {
    return titre
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Enlever accents
        .replace(/[^a-z0-9\s]/g, '') // Enlever ponctuation
        .trim();
}

function isExactDuplicate(event, candidates) {
    const normalized = normalizeTitle(event.titre);

    for (const candidate of candidates) {
        const candidateNorm = normalizeTitle(candidate.titre);

        // 1. Titre identique après normalisation
        if (normalized === candidateNorm) {
            return { isDuplicate: true, reason: `Titre identique: "${candidate.titre}"`, match: candidate };
        }

        // 2. Titre très similaire (> 90% de similarité) ET même année
        const similarity = calculateSimilarity(normalized, candidateNorm);
        if (similarity > 0.9 && event.year === candidate.year) {
            return { isDuplicate: true, reason: `Titre très similaire (${(similarity*100).toFixed(0)}%): "${candidate.titre}"`, match: candidate };
        }

        // 3. Mots clés exacts (pour éviter reformulations)
        const eventKeywords = extractKeywords(normalized);
        const candidateKeywords = extractKeywords(candidateNorm);
        const commonKeywords = eventKeywords.filter(k => candidateKeywords.includes(k));

        if (commonKeywords.length >= 3 && event.year === candidate.year) {
            return { isDuplicate: true, reason: `Mots-clés communs: ${commonKeywords.join(', ')} - "${candidate.titre}"`, match: candidate };
        }
    }

    return { isDuplicate: false };
}

function calculateSimilarity(str1, str2) {
    // Algorithme de Levenshtein simplifié
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

function extractKeywords(text) {
    const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'en', 'a', 'au', 'aux', 'par', 'pour'];
    return text.split(/\s+/).filter(word => word.length > 2 && !stopWords.includes(word));
}
```

**Intégration dans le flux** :

```javascript
for (const event of rawEvents) {
    console.log(`\n🔍 Vérification : "${event.titre}" (${event.year})`);

    const candidates = allExisting.filter(e => Math.abs(e.year - event.year) <= 4);

    if (candidates.length === 0) {
        console.log(`   ✅ Inédit (Aucun événement à +/- 4 ans)`);
        filteredEvents.push(event);
        continue;
    }

    // 🆕 PRÉ-FILTRE EXACT
    const exactCheck = isExactDuplicate(event, candidates);
    if (exactCheck.isDuplicate) {
        console.log(`   ❌ REJETÉ (pré-filtre): ${exactCheck.reason}`);
        rejections.push({ titre: event.titre, reason: exactCheck.reason });
        continue;
    }

    // Si le pré-filtre ne trouve rien, on passe à l'IA
    console.log(`   🤔 ${candidates.length} candidats trouvés. Analyse IA...`);
    // ... reste du code IA
}
```

### Solution 2 : Amélioration du prompt IA

**Prompt actuel** (trop permissif) :
```
RÈGLES :
- REJET si c'est le même fait historique (même si le titre diffère).
- REJET si c'est un doublon conceptuel.
- ACCEPTE uniquement si c'est un fait distinct.
```

**Nouveau prompt** (beaucoup plus strict) :

```javascript
const prompt = `
Tu es SENTINEL, un agent de détection de doublons ULTRA-STRICT.

ÉVÉNEMENT À VALIDER : "${event.titre}" (${event.year})

ÉVÉNEMENTS EXISTANTS PROCHES (±4 ans) :
${JSON.stringify(candidates, null, 2)}

⚠️ RÈGLES DE REJET (MODE STRICT) :

1. REJET IMMÉDIAT si le titre est identique ou quasi-identique
   Exemple: "Prise de la Bastille" vs "Prise de la Bastille" → REJET

2. REJET si c'est le MÊME fait historique, même avec un titre différent
   Exemples:
   - "Couronnement de Charlemagne" vs "Charlemagne sacré empereur" → REJET
   - "Bataille de Poitiers" vs "Victoire de Charles Martel" (732) → REJET
   - "Siège d'Orléans" vs "Victoire de Jeanne d'Arc à Orléans" → REJET

3. REJET si c'est un doublon conceptuel (même type d'événement, même lieu, même année)
   Exemple: "Première ligne de chemin de fer Paris-Rouen" vs "Inauguration du train Paris-Rouen" → REJET

4. ACCEPTATION uniquement si c'est un fait TOTALEMENT distinct
   - Événement différent
   - Lieu différent OU année différente
   - Pas de confusion possible

🎯 EN CAS DE DOUTE, REJETTE. Il vaut mieux rejeter un événement unique que d'accepter un doublon.

Réponds UNIQUEMENT en JSON :
{
  "isDuplicate": true/false,
  "reason": "Explication claire et précise",
  "matchedWith": "Titre de l'événement existant le plus proche (si doublon)"
}
`;
```

### Solution 3 : Ne PAS limiter les candidats

**Code actuel** (ligne 80) :
```javascript
CANDIDATS : ${JSON.stringify(candidates.slice(0, 15))}
```

**Code amélioré** :
```javascript
// Option A : Tous les candidats (si < 20)
const candidatesToAnalyze = candidates.length <= 20 ? candidates : candidates.slice(0, 20);

// Option B : Prioriser les candidats les plus proches en année
const candidatesSorted = candidates.sort((a, b) => {
    const diffA = Math.abs(a.year - event.year);
    const diffB = Math.abs(b.year - event.year);
    return diffA - diffB;
});
const candidatesToAnalyze = candidatesSorted.slice(0, 20);

CANDIDATS : ${JSON.stringify(candidatesToAnalyze, null, 2)}
```

### Solution 4 : Logging détaillé pour audit

```javascript
// Créer un rapport détaillé pour chaque session
const auditReport = {
    timestamp: new Date().toISOString(),
    totalGenerated: rawEvents.length,
    totalAccepted: filteredEvents.length,
    totalRejected: rejections.length,
    rejectionDetails: rejections.map(r => ({
        titre: r.titre,
        reason: r.reason,
        rejectionType: r.reason.includes('pré-filtre') ? 'PRE_FILTER' : 'AI_DECISION'
    }))
};

fs.writeFileSync(
    path.join(process.cwd(), 'STORAGE/OUTPUT/sentinel_audit_report.json'),
    JSON.stringify(auditReport, null, 2)
);
```

## 📈 Résultats attendus

### Avant améliorations
- ❌ 78% de doublons non détectés (7/9)
- ❌ Doublons exacts passent le filtre
- ❌ Pas de traçabilité des décisions

### Après améliorations
- ✅ 0% de doublons exacts
- ✅ < 5% de doublons reformulés
- ✅ Rapport d'audit complet
- ✅ Pré-filtre rapide (pas de coût API)

## 🚀 Plan de déploiement

1. **Phase 1** : Implémenter le pré-filtre exact (Solution 1)
   - Impact immédiat sur les doublons exacts
   - Pas de coût API pour les cas évidents

2. **Phase 2** : Améliorer le prompt IA (Solution 2)
   - Meilleure détection des reformulations
   - Coût API identique

3. **Phase 3** : Optimiser la sélection des candidats (Solution 3)
   - Analyse plus complète
   - Légère augmentation du coût API

4. **Phase 4** : Ajouter l'audit (Solution 4)
   - Traçabilité complète
   - Debugging facilité

## 🧪 Tests recommandés

Créer un jeu de test avec des cas connus :

```javascript
const testCases = [
    { event: "Prise de la Bastille", shouldReject: true, reason: "Doublon exact" },
    { event: "Chute de la Bastille", shouldReject: true, reason: "Même fait, titre différent" },
    { event: "Bataille de Waterloo", shouldReject: false, reason: "Événement unique" }
];
```

Exécuter SENTINEL sur ce jeu de test et vérifier que le taux de détection est de 100%.
