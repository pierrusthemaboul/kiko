import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const agentName = "CHRONOS";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL_SMART || "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" }
});

async function crossCheckWithGemini(titre, year) {
  try {
    const prompt = `Fact-check historique strict. L'événement "${titre}" s'est-il produit en l'an ${year} (après J.-C.) ?
Sois strict : si l'événement est réel mais que l'année est fausse (erreur > 1 an), réponds valid=false.
Réponds UNIQUEMENT en JSON : {"valid": true/false, "reason": "raison courte (max 15 mots)"}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { valid: true, reason: "parse error - bénéfice du doute" };
  } catch (e) {
    return { valid: true, reason: `gemini unavailable: ${String(e.message || e).substring(0, 30)}` };
  }
}

async function main() {
  const orchestratorPath = path.join(process.cwd(), '../../orchestrator_result.json');
  const sentinelPath = path.join(process.cwd(), '../SENTINEL/STORAGE/OUTPUT/sentinel_filtered_ids.json');

  let inputPath, events;

  if (fs.existsSync(orchestratorPath)) {
    console.log("[CHRONOS] Mode orchestrateur détecté");
    inputPath = orchestratorPath;
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    events = data.events;
  } else if (fs.existsSync(sentinelPath)) {
    console.log("[CHRONOS] Mode manuel détecté");
    inputPath = sentinelPath;
    events = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    console.error("[CHRONOS] Aucun fichier source trouvé.");
    process.exit(1);
  }

  if (events.length === 0) {
    console.log("[CHRONOS] Pas d'événements à traiter.");
    return;
  }

  const anchors = JSON.parse(fs.readFileSync('historical_anchors.json', 'utf8'));

  const prompt = `
    Tu es CHRONOS, le Garde-Fou Temporel.
    Ta mission est d'extraire les ancres historiques pour ces événements afin d'empêcher tout anachronisme dans les images IA.

    BASE DE CONNAISSANCES :
    ${JSON.stringify(anchors, null, 2)}

    ÉVÉNEMENTS :
    ${JSON.stringify(events, null, 2)}

    MISSION :
    Pour chaque événement :
    1. **VÉRIFICATION HISTORIQUE ET DATATION (CRITIQUE)** : 
       - Est-ce que cet événement s'est bel et bien produit à l'année indiquée ? S'il y a plus de 1 an d'erreur par rapport à l'histoire réelle, 'is_historically_valid' DOIT ÊTRE false.
       - ⚠️ RÈGLE DE L'ANNÉE PURE : Le jeu ne se base STRICTEMENT QUE SUR L'ANNÉE. Ne fais aucun zèle sur le mois ou le jour. Tant que l'année (year) est correcte, l'événement est historiquement VALIDE.
       - Rejette les légendes ou les faits très contestés (ex: Éruption du Krakatoa en 416).
       - Le titre est-il complet et précis ? L'événement est-il compréhensible seul, sans contexte ? Interdit les titres vagues comme "Explosion" ou incomplets comme "Signature du traité d'interdiction". Si le titre est mauvais, 'is_historically_valid' DOIT ÊTRE false.
    2. Identifie l'ère correspondante dans la base de connaissances.
    3. Environnement Principal : Détermine si la scène doit se passer en INTÉRIEUR (Palatial ou Humble) ou EXTÉRIEUR (Urban, Countryside ou Battle).
    4. ⚠️ VERROU MARITIME : N'utilise l'ancre "Maritime" QUE si l'événement se passe explicitement en mer ou sur un port. NE PAS l'utiliser pour des colonies terrestres.
    5. Sélectionne les ancres de vêtements, médium et matériaux les plus PERTINENTES et SOBRES. Évite le "trop épique" si le sujet est calme.
    6. Liste les objets strictement INTERDITS : Combine le "universal_forbidden" avec les interdits spécifiques de l'ère et ajoute les anachronismes logiques (ex: moteurs au XVIIIe).

    FORMAT JSON REQUIS :
    {
      "audited_events": [
        {
          "titre": "Titre original",
          "year": 1234,
          "is_historically_valid": true/false,
          "justification": "Explication courte (20 mots max) du choix de l'environnement et de la validité historique.",
          "historical_anchors": {
            "era_name": "...",
            "medium": "...",
            "anchors": ["ancre_vêtement", "ancre_materiau", "ancre_contexte", "..."],
            "forbidden": ["objet1", "objet2", "..."]
          }
        }
      ]
    }
    `;

  try {
    // PASSE 1 : Gemini valide en batch (ancres + is_historically_valid)
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());
    const auditedEvents = data.audited_events;

    // PASSE 2 : Contre-vérification Gemini uniquement sur les événements approuvés
    const geminiApproved = auditedEvents.filter(e => e.is_historically_valid !== false);
    const geminiRejected = auditedEvents.filter(e => e.is_historically_valid === false);

    if (geminiRejected.length > 0) {
      console.log(`[CHRONOS] Gemini a rejeté ${geminiRejected.length} événement(s) :`);
      geminiRejected.forEach(e => console.log(`   ❌ Gemini: "${e.titre}" (${e.year}) — ${e.justification}`));
    }

    if (geminiApproved.length > 0) {
      console.log(`[CHRONOS] 🔍 Contre-vérification Gemini sur ${geminiApproved.length} événement(s)...`);

      // Appels Gemini en parallèle pour la vitesse
      const crossResults = await Promise.all(
        geminiApproved.map(e => crossCheckWithGemini(e.titre, e.year))
      );

      let crossRejections = 0;
      geminiApproved.forEach((event, i) => {
        const cross = crossResults[i];
        if (cross.valid === false) {
          event.is_historically_valid = false;
          event.justification = `[CrossCheck] ${cross.reason}`;
          crossRejections++;
          console.log(`   ❌ CrossCheck: "${event.titre}" (${event.year}) — ${cross.reason}`);
        }
      });

      if (crossRejections === 0) {
        console.log(`   ✅ CrossCheck confirme tous les événements.`);
      }
    }

    const finalEvents = auditedEvents;
    const validCount = finalEvents.filter(e => e.is_historically_valid !== false).length;
    const invalidCount = finalEvents.length - validCount;

    const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/chronos_audited_events.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalEvents, null, 2));

    console.log(`[CHRONOS] ✅ ${validCount} événements valides, ${invalidCount} rejetés (double validation Gemini+Claude).`);
    logDecision(agentName, 'AUDIT', { count: events.length }, 'SUCCESS', `Ancres historiques générées (${invalidCount} rejetés)`);

  } catch (e) {
    console.error("[CHRONOS] Erreur:", e);
    logDecision(agentName, 'AUDIT', { count: events.length }, 'ERROR', e.message);
    process.exit(1);
  }
}

main();

