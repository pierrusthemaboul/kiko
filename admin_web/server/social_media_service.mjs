/**
 * social_media_service.mjs — Service de génération de contenu pour réseaux sociaux
 * 
 * Utilise Gemini pour générer du contenu optimisé pour chaque plateforme:
 * - TikTok: Scripts vidéos, hooks, hashtags
 * - Instagram Reels: Captions, hashtags
 * - Twitter/X: Tweets, threads
 * - Facebook Reels: Descriptions
 * - YouTube Shorts: Titres, descriptions, tags
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────────────────
// PROMPTS SPÉCIALISÉS PAR PLATEFORME
// ─────────────────────────────────────────────────────────

const PLATFORM_PROMPTS = {
  tiktok: `Tu es un expert en création de contenu TikTok viral pour une application de quiz historique.

CONTEXTE:
- App: Timalaus (quiz historique)
- Objectif: Maximiser les téléchargements depuis Play Store et App Store
- Cible: Généraliste, amateurs d'histoire, curieux

FORMAT DE RÉPONSE (JSON uniquement):
{
  "hook": "Phrase d'accroche de 3-5 secondes (intrigante, choquante ou surprenante)",
  "script": "Script de la vidéo (15-30s maximum, rythmé, énergique)",
  "call_to_action": "CTA clair pour télécharger l'app",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "music_suggestion": "Type de musique tendance suggérée",
  "visual_notes": "Notes pour le montage (transitions, textes à l'écran)"
}

RÈGLES:
- Hook percutant en 1ère seconde
- Script dynamique avec questions/réponses historiques
- CTA: "Télécharge Timalaus sur Play Store et App Store!"
- Hashtags mixés: #history #quiz #learnontiktok #viral + 2 spécifiques
- Ton: Énergique, fun, éducatif`,

  instagram: `Tu es un expert Instagram Reels pour une app de quiz historique.

CONTEXTE:
- App: Timalaus (quiz historique)
- Objectif: Maximiser les téléchargements
- Esthétique: Clean, éducatif, engageant

FORMAT DE RÉPONSE (JSON uniquement):
{
  "caption": "Caption principale (150 caractères max, engageante)",
  "extended_caption": "Caption étendue pour les commentaires (optionnel)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"],
  "visual_style": "Style visuel recommandé (couleurs, transitions)",
  "interactive_element": "Élément interactif suggéré (poll, question)"
}

RÈGLES:
- Caption courte et punchy
- Hashtags: #history #education #quiz #learn #historyfacts + 4 spécifiques
- Ton: Inspirant, éducatif, esthétique`,

  twitter: `Tu es un expert Twitter/X pour une app de quiz historique.

CONTEXTE:
- App: Timalaus (quiz historique)
- Objectif: Maximiser les téléchargements et l'engagement

FORMAT DE RÉPONSE (JSON uniquement):
{
  "tweet": "Tweet principal (280 caractères max, percutant)",
  "thread": [
    "Tweet 1 du thread si nécessaire",
    "Tweet 2",
    "Tweet 3"
  ],
  "hashtags": ["#history", "#quiz", "#fact"],
  "media_suggestion": "Type d'image/vidéo suggérée"
}

RÈGLES:
- Tweet principal avec fact historique intrigant
- Thread optionnel pour développer
- Hashtags pertinents et trend
- Ton: Informatif, engageant, conversationnel`,

  facebook: `Tu es un expert Facebook Reels pour une app de quiz historique.

CONTEXTE:
- App: Timalaus (quiz historique)
- Objectif: Maximiser les téléchargements
- Audience: Plus âgée que TikTok, intéressée par l'éducation

FORMAT DE RÉPONSE (JSON uniquement):
{
  "description": "Description principale (200-300 caractères)",
  "extended_description": "Description plus détaillée (optionnel)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"],
  "call_to_action": "CTA pour télécharger l'app"
}

RÈGLES:
- Description informative mais engageante
- Hashtags: #History #Education #Quiz #Learning #FunFacts
- CTA clair avec liens
- Ton: Éducatif, convivial`,

  youtube_shorts: `Tu es un expert YouTube Shorts pour une app de quiz historique.

CONTEXTE:
- App: Timalaus (quiz historique)
- Objectif: Maximiser les téléchargements et les vues

FORMAT DE RÉPONSE (JSON uniquement):
{
  "title": "Titre accrocheur (60 caractères max)",
  "description": "Description détaillée (200-300 caractères)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"],
  "thumbnail_text": "Texte suggéré pour la thumbnail",
  "call_to_action": "CTA pour télécharger l'app"
}

RÈGLES:
- Titre optimisé SEO + accrocheur
- Tags mixés: généraux + spécifiques
- Thumbnail text en 3-4 mots max
- CTA: "Download Timalaus now!"
- Ton: Énergique, éducatif, clickbaity (honnête)`
};

// ─────────────────────────────────────────────────────────
// FONCTION PRINCIPALE
// ─────────────────────────────────────────────────────────

/**
 * Génère du contenu pour une plateforme spécifique
 * @param {string} platform - 'tiktok' | 'instagram' | 'twitter' | 'facebook' | 'youtube'
 * @param {string} topic - Sujet historique ou thème
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Contenu généré
 */
export async function generateSocialContent(platform, topic, options = {}) {
  const { eventType, eventDate, eventDescription } = options;
  
  const systemPrompt = PLATFORM_PROMPTS[platform];
  if (!systemPrompt) {
    throw new Error(`Plateforme non supportée: ${platform}`);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  let userPrompt = `Génère du contenu pour: ${topic}`;
  
  if (eventType) userPrompt += `\nType d'événement: ${eventType}`;
  if (eventDate) userPrompt += `\nDate: ${eventDate}`;
  if (eventDescription) userPrompt += `\nDescription: ${eventDescription}`;

  try {
    const result = await model.generateContent(userPrompt);
    const response = result.response.text();
    
    // Extraire le JSON de la réponse
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Pas de JSON valide dans la réponse');
    }

    const content = JSON.parse(jsonMatch[0]);
    
    return {
      platform,
      topic,
      content,
      rawResponse: response,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Erreur génération contenu ${platform}:`, error);
    throw error;
  }
}

/**
 * Génère du contenu pour plusieurs plateformes en parallèle
 * @param {string} topic - Sujet historique
 * @param {Array<string>} platforms - Plateformes ciblées
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Array<Object>>}
 */
export async function generateMultiPlatformContent(topic, platforms, options = {}) {
  const promises = platforms.map(platform => 
    generateSocialContent(platform, topic, options)
  );
  
  return Promise.all(promises);
}
