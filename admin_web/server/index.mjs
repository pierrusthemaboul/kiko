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
import { randomUUID } from 'crypto';
import { regenerateImage } from './regen_service.mjs';
import { chat } from './chat_service.mjs';

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
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

app.listen(PORT, () => {
    console.log(`\n🚀 Serveur Timalaus Admin démarré sur http://localhost:${PORT}`);
    console.log(`   → POST /api/regen/start`);
    console.log(`   → GET  /api/regen/stream/:jobId\n`);
});
