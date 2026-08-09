/**
 * index.mjs — Serveur Express pour l'admin Timalaus
 * Expose un endpoint SSE pour la régénération d'images en temps réel.
 * 
 * Architecture :
 *  POST /api/regen/start  → démarre un job, retourne { jobId }
 *  GET  /api/regen/stream/:jobId → stream SSE des étapes de progression
 */

import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { regenerateImage } from './regen_service.mjs';
import { chat } from './chat_service.mjs';
import { generateSocialContent, generateMultiPlatformContent } from './social_media_service.mjs';
import { captureAndEditGameplay, checkToolsInstalled } from './gameplay_capture_service.mjs';
import { getMarketingOverview } from './marketing_dashboard_service.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// --- Store en mémoire des jobs actifs ---
// Structure : Map<jobId, { status, steps, clients, error, result }>
const jobs = new Map();

/**
 * POST /api/regen/start
 * Body : { id, titre, date, description_detaillee }
 * Réponse : { jobId }
 */
app.post('/api/regen/start', async (req, res) => {
    const { id, titre, date, description, description_detaillee, source, custom_styles, legal_safety } = req.body;
    const finalDescription = description_detaillee || description;

    if (!id || !titre) {
        return res.status(400).json({ error: 'id et titre sont requis.' });
    }

    const jobId = randomUUID();
    const job = {
        status: 'running',
        steps: [],
        clients: new Set(),  // SSE response objects
        error: null,
        result: null,
    };
    jobs.set(jobId, job);

    // Lancer la régénération en arrière-plan
    (async () => {
        try {
            const publicUrl = await regenerateImage(
                { id, titre, date, description_detaillee: finalDescription, source, custom_styles, legal_safety },
                (step, data) => {
                    const event = { step, ...data, ts: Date.now() };
                    job.steps.push(event);
                    // Envoyer à tous les clients SSE connectés
                    for (const client of job.clients) {
                        client.write(`data: ${JSON.stringify(event)}\n\n`);
                    }
                }
            );
            job.status = 'done';
            job.result = publicUrl;
            // Signaler la fin à tous les clients
            const finalEvent = { step: 'complete', publicUrl, ts: Date.now() };
            job.steps.push(finalEvent);
            for (const client of job.clients) {
                client.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
                client.end();
            }
        } catch (err) {
            job.status = 'error';
            job.error = err.message;
            const errEvent = { step: 'error', message: `❌ Erreur : ${err.message}`, ts: Date.now() };
            job.steps.push(errEvent);
            for (const client of job.clients) {
                client.write(`data: ${JSON.stringify(errEvent)}\n\n`);
                client.end();
            }
        }
    })();

    res.json({ jobId });
});

/**
 * GET /api/regen/stream/:jobId
 * Server-Sent Events — stream la progression du job en temps réel.
 */
app.get('/api/regen/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job introuvable.' });
    }

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Envoyer l'historique des étapes déjà passées (si le client se connecte en retard)
    for (const step of job.steps) {
        res.write(`data: ${JSON.stringify(step)}\n\n`);
    }

    // Si le job est déjà terminé, fermer immédiatement
    if (job.status === 'done' || job.status === 'error') {
        res.end();
        return;
    }

    // Sinon, enregistrer ce client pour les événements futurs
    job.clients.add(res);

    // Nettoyer quand le client se déconnecte
    req.on('close', () => {
        job.clients.delete(res);
    });
});

/**
 * POST /api/chat
 * Body : { message: string, history: Array }
 * L'historique complet est envoyé par le client (persisté dans localStorage côté React).
 * Réponse : { text, events, history }
 */
app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }

    console.log(`\n💬 [Chat] "${message.substring(0, 80)}..."`);

    try {
        const result = await chat(history, message);
        res.json(result);
    } catch (err) {
        console.error('❌ Erreur chat:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/health
 * Health check basique.
 */
app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

/**
 * POST /api/social-media/generate
 * Body : { platform, topic, eventType, eventDate, eventDescription }
 * Génère du contenu pour une plateforme spécifique
 */
app.post('/api/social-media/generate', async (req, res) => {
    const { platform, topic, eventType, eventDate, eventDescription } = req.body;

    if (!platform || !topic) {
        return res.status(400).json({ error: 'platform et topic sont requis.' });
    }

    const validPlatforms = ['tiktok', 'instagram', 'twitter', 'facebook', 'youtube'];
    if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ error: `Plateforme invalide. Options: ${validPlatforms.join(', ')}` });
    }

    try {
        console.log(`\n📱 [Social Media] Génération pour ${platform}: "${topic}"`);
        const result = await generateSocialContent(platform, topic, { eventType, eventDate, eventDescription });
        res.json(result);
    } catch (err) {
        console.error('❌ Erreur génération social media:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/social-media/generate-multi
 * Body : { topic, platforms, eventType, eventDate, eventDescription }
 * Génère du contenu pour plusieurs plateformes en parallèle
 */
app.post('/api/social-media/generate-multi', async (req, res) => {
    const { topic, platforms, eventType, eventDate, eventDescription } = req.body;

    if (!topic || !platforms || !Array.isArray(platforms)) {
        return res.status(400).json({ error: 'topic et platforms (array) sont requis.' });
    }

    const validPlatforms = ['tiktok', 'instagram', 'twitter', 'facebook', 'youtube'];
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
        return res.status(400).json({ error: `Plateformes invalides: ${invalidPlatforms.join(', ')}` });
    }

    try {
        console.log(`\n📱 [Social Media] Génération multi-plateforme: "${topic}" pour ${platforms.join(', ')}`);
        const results = await generateMultiPlatformContent(topic, platforms, { eventType, eventDate, eventDescription });
        res.json({ results });
    } catch (err) {
        console.error('❌ Erreur génération multi-plateforme:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/gameplay/check-tools
 * Vérifie si les outils nécessaires sont installés
 */
app.get('/api/gameplay/check-tools', async (_, res) => {
    try {
        const tools = await checkToolsInstalled();
        res.json({ tools });
    } catch (err) {
        console.error('❌ Erreur check tools:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/gameplay/capture
 * Body : { captureDuration, targetDuration, platform }
 * Démarre une capture gameplay et retourne un jobId
 */
app.post('/api/gameplay/capture', async (req, res) => {
    const { captureDuration = 60, targetDuration = 30, platform = 'tiktok' } = req.body;

    const jobId = randomUUID();
    const job = {
        status: 'running',
        steps: [],
        clients: new Set(),
        error: null,
        result: null,
    };
    jobs.set(jobId, job);

    // Lancer la capture en arrière-plan
    (async () => {
        try {
            const step = { step: 'log', message: '📱 Démarrage de la capture...', ts: Date.now() };
            job.steps.push(step);
            for (const client of job.clients) {
                client.write(`data: ${JSON.stringify(step)}\n\n`);
            }

            const result = await captureAndEditGameplay({
                captureDuration,
                targetDuration,
                platform
            });

            job.status = 'done';
            job.result = result;
            const finalEvent = { step: 'complete', result, ts: Date.now() };
            job.steps.push(finalEvent);
            for (const client of job.clients) {
                client.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
                client.end();
            }
        } catch (err) {
            job.status = 'error';
            job.error = err.message;
            const errEvent = { step: 'error', message: `❌ Erreur: ${err.message}`, ts: Date.now() };
            job.steps.push(errEvent);
            for (const client of job.clients) {
                client.write(`data: ${JSON.stringify(errEvent)}\n\n`);
                client.end();
            }
        }
    })();

    res.json({ jobId });
});

/**
 * GET /api/gameplay/stream/:jobId
 * Stream SSE de la progression de la capture
 */
app.get('/api/gameplay/stream/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job introuvable.' });
    }

    // Headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Envoyer l'historique des étapes déjà passées
    for (const step of job.steps) {
        res.write(`data: ${JSON.stringify(step)}\n\n`);
    }

    // Si le job est déjà terminé, fermer immédiatement
    if (job.status === 'done' || job.status === 'error') {
        res.end();
        return;
    }

    // Sinon, enregistrer ce client pour les événements futurs
    job.clients.add(res);

    // Nettoyer quand le client se déconnecte
    req.on('close', () => {
        job.clients.delete(res);
    });
});

/**
 * GET /api/marketing/overview
 * Agrège Buffer (dernier post + métriques par réseau), App Store Connect
 * et Google Play Console en une seule réponse pour le dashboard marketing.
 */
app.get('/api/marketing/overview', async (_, res) => {
    try {
        const overview = await getMarketingOverview();
        res.json(overview);
    } catch (err) {
        console.error('❌ Erreur marketing overview:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Serveur Timalaus Admin démarré sur http://localhost:${PORT}`);
    console.log(`   → POST /api/regen/start`);
    console.log(`   → GET  /api/regen/stream/:jobId`);
    console.log(`   → POST /api/social-media/generate`);
    console.log(`   → POST /api/social-media/generate-multi`);
    console.log(`   → GET  /api/gameplay/check-tools`);
    console.log(`   → POST /api/gameplay/capture`);
    console.log(`   → GET  /api/gameplay/stream/:jobId`);
    console.log(`   → GET  /api/marketing/overview\n`);
});
