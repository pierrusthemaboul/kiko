import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configuration OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const HYBRID_CONFIG = {
  imageValidation: "gpt-4o-mini"
};

// Fonction reproduced exactement de sayon2.mjs
async function callOpenAIWithImage(prompt: string, imageUrl: string, options: any = {}) {
  const {
    model = HYBRID_CONFIG.imageValidation,
    max_tokens = 350,
    temperature = 0.05,
    retryAttempt = 1
  } = options;

  console.log(`🤖 [OPENAI-VISION] Appel ${model} pour validation image${retryAttempt > 1 ? ` - Retry ${retryAttempt}/3` : ''}`);

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ 
        role: "user", 
        content: [
          { type: "text", text: prompt }, 
          { type: "image_url", image_url: { url: imageUrl } }
        ] 
      }],
      response_format: { type: "json_object" },
      max_tokens,
      temperature
    });

    console.log(`✅ [OPENAI-VISION] Validation terminée`);
    return completion.choices[0].message.content;

  } catch (error: any) {
    console.error(`❌ [OPENAI-VISION] Erreur:`, error.message);

    // Retry automatique
    if ((error.message.includes('rate_limit') || 
         error.message.includes('timeout')) && retryAttempt < 3) {
      const waitTime = retryAttempt * 3000;
      console.log(`🔄 [OPENAI-VISION] Retry automatique dans ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return await callOpenAIWithImage(prompt, imageUrl, { ...options, retryAttempt: retryAttempt + 1 });
    }

    throw error;
  }
}

// Fonction de validation exactement reproduite de sayon2.mjs
async function validateImageWithGPTMini(titre: string, year: number, imageUrl: string) {
  console.log(`🔍 [GPT-4O-MINI] Validation intelligente pour ${year}...`);

  const prompt = `Évalue cette image pour l'événement "${titre}" (${year}).

VALIDATION HISTORIQUE INTELLIGENTE :

🚫 CRITÈRES DE REJET AUTOMATIQUE UNIQUEMENT SI :
1. TEXTE INTERDIT : Date "${year}" visible ou titre "${titre}" écrit dans l'image
2. TEXTE PROÉMINENT : Gros titre, panneau principal, inscription majeure au premier plan
3. ANACHRONISMES MYTHOLOGIQUES : ailes, créatures volantes, anges, dieux, pouvoirs surnaturels
4. ANACHRONISMES MODERNES : voitures, smartphones, vêtements contemporains
5. ANATOMIE IMPOSSIBLE : humains volants, créatures fantastiques
6. ÉPOQUE INCORRECTE : différence >50 ans avec ${year}

✅ TEXTE ACCEPTABLE (ne pas rejeter) :
- Texte sur livres, manuscrits, parchemins (arrière-plan)
- Inscriptions sur bannières, blasons, architecture
- Texte flou, illisible ou décoratif
- Écritures anciennes sur objets d'époque

✅ ACCEPTER SI :
1. Aucun texte interdit (date ${year} ou titre "${titre}")
2. Texte éventuel reste discret et d'époque
3. PERSONNAGES HUMAINS NORMAUX avec anatomie réaliste
4. VÊTEMENTS cohérents avec l'époque (tolérance ±25 ans)
5. OBJETS/OUTILS d'époque appropriés
6. ÉVOQUE l'événement historique sans fantaisie

⚠️ ATTENTION SPÉCIALE :
- Les personnages historiques étaient des HUMAINS NORMAUX
- Aucun pouvoir surnaturel, vol, magie
- Réalisme documentaire requis
- Un peu de texte d'époque est historiquement normal

JSON OBLIGATOIRE:
{
  "hasForbiddenText": true/false,
  "forbiddenTextDescription": "description du texte interdit s'il y en a (date ${year} ou titre visible)",
  "hasAcceptableText": true/false,
  "acceptableTextDescription": "description du texte acceptable (livres, bannières, etc.)",
  "representsEvent": true/false,
  "eventRelevance": "description précise de ce que montre l'image",
  "hasWingsOrSupernatural": true/false,
  "hasModernObjects": true/false,
  "anatomyRealistic": true/false,
  "historicalAccuracy": true/false,
  "periodClothing": true/false,
  "overallValid": true/false,
  "score": number 1-10,
  "reason": "explication détaillée de l'évaluation"
}`;

  try {
    const responseText = await callOpenAIWithImage(prompt, imageUrl, {
      model: HYBRID_CONFIG.imageValidation,
      max_tokens: 350,
      temperature: 0.05
    });

    const result = JSON.parse(responseText);

    console.log(`📊 [GPT-4O-MINI] Validation INTELLIGENTE:`);
    console.log(`🚫 Texte interdit (date/titre): ${result.hasForbiddenText ? '❌' : '✅'}`);
    if (result.hasForbiddenText) {
      console.log(`🚫 Texte interdit détecté: "${result.forbiddenTextDescription}"`);
    }
    console.log(`📝 Texte acceptable: ${result.hasAcceptableText ? '✅' : 'Aucun'}`);
    if (result.hasAcceptableText) {
      console.log(`📝 Texte acceptable: "${result.acceptableTextDescription}"`);
    }
    console.log(`🎯 Représente événement: ${result.representsEvent}`);
    console.log(`👼 Ailes/Surnaturel: ${result.hasWingsOrSupernatural}`);
    console.log(`📱 Objets modernes: ${result.hasModernObjects}`);
    console.log(`🧍 Anatomie réaliste: ${result.anatomyRealistic}`);
    console.log(`👔 Vêtements d'époque: ${result.periodClothing}`);
    console.log(`📝 Pertinence: "${result.eventRelevance}"`);
    console.log(`📊 Score: ${result.score}/10`);
    console.log(`💭 Raison: "${result.reason}"`);

    // Validation finale avec la même logique que sayon2.mjs
    const MIN_VALIDATION_SCORE = 4;

    // REJET SEULEMENT SI TEXTE VRAIMENT INTERDIT
    if (result.hasForbiddenText) {
      console.log(`❌ [GPT-4O-MINI] REJET: Texte interdit détecté (date ${year} ou titre "${titre}")`);
      return {
        isValid: false,
        score: result.score,
        explanation: `Texte interdit détecté: ${result.forbiddenTextDescription}`,
        detailedAnalysis: result
      };
    }

    if (result.hasWingsOrSupernatural) {
      console.log(`❌ [GPT-4O-MINI] REJET: Éléments mythologiques détectés`);
      return {
        isValid: false,
        score: result.score,
        explanation: "Éléments surnaturels/mythologiques détectés",
        detailedAnalysis: result
      };
    }

    if (result.hasModernObjects) {
      console.log(`❌ [GPT-4O-MINI] REJET: Anachronismes modernes détectés`);
      return {
        isValid: false,
        score: result.score,
        explanation: "Objets modernes/anachronismes détectés",
        detailedAnalysis: result
      };
    }

    if (!result.anatomyRealistic) {
      console.log(`❌ [GPT-4O-MINI] REJET: Anatomie non réaliste`);
      return {
        isValid: false,
        score: result.score,
        explanation: "Anatomie non réaliste",
        detailedAnalysis: result
      };
    }

    if (!result.periodClothing) {
      console.log(`❌ [GPT-4O-MINI] REJET: Vêtements non conformes à l'époque`);
      return {
        isValid: false,
        score: result.score,
        explanation: "Vêtements non conformes à l'époque",
        detailedAnalysis: result
      };
    }

    // Validation finale basée sur score et critères - IDENTIQUE À SAYON2.MJS
    if (result.score >= MIN_VALIDATION_SCORE && result.overallValid && result.historicalAccuracy && result.representsEvent) {
      console.log(`✅ [GPT-4O-MINI] Image VALIDÉE (${result.score}/10) - Critères respectés`);
      if (result.hasAcceptableText) {
        console.log(`🎯 SUCCÈS: Texte acceptable toléré + Réalisme historique confirmé`);
      } else {
        console.log(`🎯 SUCCÈS: Aucun texte + Réalisme historique confirmé`);
      }
      return {
        isValid: true,
        score: result.score,
        explanation: result.reason,
        detailedAnalysis: result
      };
    }

    console.log(`❌ [GPT-4O-MINI] Validation échouée - Score/critères insuffisants`);
    return {
      isValid: false,
      score: result.score,
      explanation: `Score/critères insuffisants: ${result.reason}`,
      detailedAnalysis: result
    };

  } catch (error: any) {
    console.error(`❌ [GPT-4O-MINI] Erreur validation:`, error.message);
    return {
      isValid: false,
      score: 0,
      explanation: `Erreur lors de la validation: ${error.message}`,
      detailedAnalysis: null
    };
  }
}

// Route API
export async function POST(request: NextRequest) {
  try {
    const { action, imageUrl, titre, year } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
        { status: 500 }
      );
    }

    if (action === 'evaluate') {
      if (!imageUrl || !titre || !year) {
        return NextResponse.json(
          { error: 'Paramètres manquants: imageUrl, titre, year requis' },
          { status: 400 }
        );
      }

      console.log(`🔍 [API] Validation demandée pour "${titre}" (${year})`);
      console.log(`🖼️ [API] Image URL: ${imageUrl.substring(0, 100)}...`);

      const validation = await validateImageWithGPTMini(titre, year, imageUrl);

      return NextResponse.json({
        success: true,
        score: validation.score,
        explanation: validation.explanation,
        isValid: validation.isValid,
        detailedAnalysis: validation.detailedAnalysis
      });
    }

    // Autres actions futures (generatePrompt, generateImage, etc.)
    if (action === 'generatePrompt') {
      return NextResponse.json({
        success: false,
        error: 'Action generatePrompt pas encore implémentée'
      });
    }

    if (action === 'generateImage') {
      return NextResponse.json({
        success: false,
        error: 'Action generateImage pas encore implémentée'
      });
    }

    return NextResponse.json(
      { error: `Action "${action}" non supportée` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ [API] Erreur validation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erreur interne du serveur',
        score: 0,
        explanation: 'Erreur lors de la validation'
      },
      { status: 500 }
    );
  }
}

// Route GET pour documentation
export async function GET() {
  return NextResponse.json({
    message: 'API de validation d\'images historiques',
    endpoints: {
      'POST /api/validation': {
        description: 'Validation d\'image avec GPT-4o-mini',
        actions: {
          evaluate: {
            parameters: ['imageUrl', 'titre', 'year'],
            description: 'Évalue une image historique avec les mêmes critères que sayon2.mjs'
          },
          generatePrompt: 'À implémenter',
          generateImage: 'À implémenter'
        }
      }
    },
    config: {
      model: HYBRID_CONFIG.imageValidation,
      criteria: [
        'Pas de texte interdit (date/titre visible)',
        'Pas d\'éléments surnaturels/mythologiques',
        'Pas d\'objets modernes',
        'Anatomie réaliste',
        'Vêtements d\'époque',
        'Score minimum: 4/10'
      ]
    }
  });
}