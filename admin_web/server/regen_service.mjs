/**
 * regen_service.mjs
 * Logique de régénération d'image pour l'admin.
 * Basée sur galerie_dart/image_engine/engine_v2.mjs
 * Adaptée pour streamer la progression via un callback SSE.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Import l'Équipe "AUTOMATIQUE" (Souveraine/Visionnaire) ---
import { runHistorian as runHistorianAuto } from '../../_agents/image_regeneration/auto/Historian/agent.mjs';
import { runArtDirector as runArtDirectorAuto } from '../../_agents/image_regeneration/auto/Art_Director/agent.mjs';
import { runPainter as runPainterAuto } from '../../_agents/image_regeneration/auto/Painter/agent.mjs';
import { runEvaluator as runEvaluatorAuto } from '../../_agents/image_regeneration/auto/Evaluator/agent.mjs';

// --- Import l'Équipe "ASSISTÉE" (Subalterne/Exécutante) ---
import { runHistorian as runHistorianActive } from '../../_agents/image_regeneration/active/Historian/agent.mjs';
import { runArtDirector as runArtDirectorActive } from '../../_agents/image_regeneration/active/Art_Director/agent.mjs';
import { runPainter as runPainterActive } from '../../_agents/image_regeneration/active/Painter/agent.mjs';
import { runEvaluator as runEvaluatorActive } from '../../_agents/image_regeneration/active/Evaluator/agent.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'regen_debug.log');

async function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${msg}\n`;
    console.log(msg); // Garde aussi dans la console
    await fs.appendFile(LOG_FILE, formatted, 'utf-8');
}

// Chemin vers les credentials partagés du projet
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

// --- Clients ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
);

// --- Style guides (centralisés dans _agents/image_regeneration) ---
const REGEN_AGENTS_DIR = path.join(__dirname, '..', '..', '_agents', 'image_regeneration');
const STYLE_GUIDE_FILE = path.join(REGEN_AGENTS_DIR, 'Style_Expert', 'guide.md');
const EVALUATOR_GUIDE_FILE = path.join(REGEN_AGENTS_DIR, 'Evaluator', 'instructions.md');
const ECOLE_ART_FILE = path.join(REGEN_AGENTS_DIR, 'Art_School', 'rules.md');

async function getFileContent(filePath) {
    return await fs.readFile(filePath, 'utf-8');
}

/**
 * Phase 1 & 4 : Brainstorming de la stratégie visuelle
 */
async function brainstorm(event, feedback = null, onProgress = () => {}, customStyles = [], legalSafety = false) {
    const isAutoMode = !customStyles || customStyles.length === 0;
    const teamName = isAutoMode ? 'AUTOMATIQUE' : 'ASSISTÉE';

    onProgress('brain_historian', { message: `📚 Consultation de l'Archiviste [${teamName}]...` });
    const runHistorian = isAutoMode ? runHistorianAuto : runHistorianActive;
    const history = await runHistorian(event);
    onProgress('brain_historian_done', { message: '✅ Rapport historique établi.', details: history.rapport_historique });

    onProgress('brain_da', { message: `🎭 Réflexion du Directeur Artistique [${teamName}]...` });
    const runArtDirector = isAutoMode ? runArtDirectorAuto : runArtDirectorActive;
    const da = await runArtDirector(event, history.rapport_historique, feedback, customStyles, legalSafety);
    onProgress('brain_da_done', { message: '✅ Stratégie visuelle définie.' });
    onProgress('brain_thinking', { message: `💡 Concept : ${da.concept_visuel}` });

    onProgress('brain_painter', { message: `🎨 Préparation de la palette technique [${teamName}]...` });
    const runPainter = isAutoMode ? runPainterAuto : runPainterActive;
    const painter = await runPainter(event, history.rapport_historique, da.concept_visuel, legalSafety);
    onProgress('brain_painter_done', { message: '✅ Palette prête.' });
    onProgress('brain_prompt', { message: `🌀 Visual Tokens : ${painter.flux_prompt}` });

    return {
        reflexion: da.concept_visuel,
        medium: painter.medium,
        flux_prompt: painter.flux_prompt,
        historian: history
    };
}

/**
 * Phase 2 : Génération via Flux Schnell (Replicate)
 */
async function generateImage(prompt) {
    const output = await replicate.run('black-forest-labs/flux-schnell', {
        input: { prompt, aspect_ratio: '16:9' }
    });
    return Array.isArray(output) ? output[0] : output;
}

/**
 * Phase 3 & 6 : Évaluation via Gemini Vision
 */
/**
 * Phase 3 & 6 : Évaluation via L'AGENT ÉVALUATEUR MODULAIRE
 */
async function evaluateImage(event, imageUrl) {
    const isAutoMode = !event.custom_styles || event.custom_styles.length === 0;
    const runEvaluator = isAutoMode ? runEvaluatorAuto : runEvaluatorActive;
    return await runEvaluator(event, imageUrl);
}

/**
 * Upload vers Supabase Storage + mise à jour de illustration_url en DB
 */
async function uploadAndSave(event, imageUrl) {
    const res = await fetch(imageUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `admin_regen_${event.id}_${Date.now()}.webp`;

    const { error: uploadError } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, buffer, { contentType: 'image/webp', upsert: false });

    if (uploadError) throw new Error(`Upload Supabase échoué : ${uploadError.message}`);

    const publicUrl = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName).data.publicUrl;

    const targetTable = event.source || 'evenements';
    const { error: dbError } = await supabase
        .from(targetTable)
        .update({ illustration_url: publicUrl })
        .eq('id', event.id);

    if (dbError) throw new Error(`Mise à jour DB [${targetTable}] échouée : ${dbError.message}`);

    return publicUrl;
}

/**
 * Fonction principale exportée.
 * @param {object} event - { id, titre, date, description_detaillee }
 * @param {function} onProgress - callback(step: string, data?: object) pour SSE
 */
export async function regenerateImage(event, onProgress = () => {}) {
    onProgress('start', { message: `🚀 Lancement de la régénération pour "${event.titre}"` });

    // --- Tentative V1 ---
    onProgress('brainstorm_v1', { message: '💡 Réunion du Collectif IA (Historien + DA + Peintre)...' });
    let brain = await brainstorm(event, null, onProgress, event.custom_styles, event.legal_safety);
    onProgress('brainstorm_v1_done', { message: `✅ Stratégie V1 adoptée`, reflexion: brain.reflexion });

    await logDebug(`\n--- DÉBUT RÉGÉNÉRATION : ${event.titre} ---`);
    await logDebug(`Table cible : ${event.source || 'evenements'}`);

    onProgress('generate_v1', { message: '🎨 Génération de l\'image V1...' });
    const urlV1 = await generateImage(brain.flux_prompt);
    onProgress('generate_v1_done', { message: '📸 Image V1 générée, évaluation en cours...' });

    onProgress('evaluate_v1', { message: '🔍 Évaluation de la qualité...' });
    const evalV1 = await evaluateImage(event, urlV1);
    onProgress('evaluate_v1_done', {
        message: `⭐ Score V1 : ${evalV1.score_total}/10 (Scannabilité: ${evalV1.scannability}/10)`,
        score: evalV1.score_total,
        feedback: evalV1.feedback_critique
    });

    let finalUrl = urlV1;

    // --- Tentative V2 si score insuffisant (UNIQUEMENT EN AUTO) ---
    const isAutoMode = !event.custom_styles || event.custom_styles.length === 0;

    if (isAutoMode && evalV1.score_total < 7) {
        onProgress('retry', { message: `⚠️ Score insuffisant (${evalV1.score_total}/10). Re-réflexion en cours...`, feedback: evalV1.feedback_critique });

        onProgress('brainstorm_v2', { message: '💡 Brainstorming V2...' });
        const brainV2 = await brainstorm(event, evalV1.feedback_critique, onProgress, event.custom_styles, event.legal_safety);
        onProgress('brainstorm_v2_done', { message: `✅ Nouvelle approche : ${brainV2.medium}` });

        onProgress('generate_v2', { message: '🎨 Génération de l\'image V2...' });
        const urlV2 = await generateImage(brainV2.flux_prompt);
        onProgress('generate_v2_done', { message: '📸 Image V2 générée.' });

        onProgress('evaluate_v2', { message: '🔍 Évaluation V2...' });
        const evalV2 = await evaluateImage(event, urlV2);
        onProgress('evaluate_v2_done', { message: `⭐ Score V2 : ${evalV2.score_total}/10`, score: evalV2.score_total });

        if (evalV2.score_total >= evalV1.score_total) {
            onProgress('decision', { message: `✅ V2 retenue (score ${evalV2.score_total} >= ${evalV1.score_total})` });
            finalUrl = urlV2;
        } else {
            onProgress('decision', { message: `↩️ V1 conservée (score ${evalV1.score_total} > ${evalV2.score_total})` });
            finalUrl = urlV1;
        }
    } else {
        onProgress('decision', { message: `🔥 Qualité suffisante (${evalV1.score_total}/10) !` });
    }

    // --- Upload & Save ---
    onProgress('upload', { message: `☁️ Sauvegarde en base (${event.source || 'evenements'})...` });
    const publicUrl = await uploadAndSave(event, finalUrl);
    onProgress('done', { message: '🎉 Image mise à jour avec succès !', publicUrl });

    return publicUrl;
}
