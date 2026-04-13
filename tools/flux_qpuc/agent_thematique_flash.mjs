import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const POOL_PATH = path.join(__dirname, '..', '..', 'data', 'qpuc_themes_pool.json');

/**
 * 🎫 AGENT THÉMATIQUE (Version SÉRIES)
 * Rôle : Gérer un pool de thèmes historiques réels de QPUC (Archives 2018-2020).
 */

async function refreshThemesPool() {
    console.log("📡 [SÉRIES] Rafraîchissement du pool de thèmes (Archives 2018-2020)...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Tu es l'archiviste expert de 'Questions pour un champion'.
    
    OBJECTIF : Donne-moi une liste de 50 thèmes historiques réels (ou extrêmement probables) qui ont été abordés lors du '4 à la suite' entre 2015 et 2023.
    
    EXIGENCES :
    - Thèmes très précis (ex: 'Les reines Marguerite', 'Les batailles navales napoléoniennes', 'Les dynasties impériales du Japon').
    - Évite les thèmes génériques (pas de 'Napoléon' seul, pas de 'France').
    - Varie les époques et zones géographiques.
    
    Réponds uniquement en JSON formaté :
    { "themes": ["Thème 1", "Thème 2", ...] }`;

    try {
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
        fs.writeFileSync(POOL_PATH, JSON.stringify({ themes: parsed.themes, updated_at: new Date().toISOString() }, null, 2));
        return parsed.themes;
    } catch (err) {
        console.error("❌ Erreur rafraîchissement pool:", err.message);
        return ["Les rois de France", "Les compositeurs romantiques", "Les batailles antiques"];
    }
}

export async function getThemesFromSeries() {
    let pool = { themes: [] };
    if (fs.existsSync(POOL_PATH)) {
        pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'));
    }

    if (!pool.themes || pool.themes.length < 5) {
        pool.themes = await refreshThemesPool();
    }

    // On pioche 4 thèmes pour simuler un "4 à la suite"
    const selection = [];
    for (let i = 0; i < 4; i++) {
        if (pool.themes.length === 0) break;
        const index = Math.floor(Math.random() * pool.themes.length);
        selection.push(pool.themes.splice(index, 1)[0]);
    }

    // Mise à jour du pool (on retire les thèmes piochés)
    fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 2));
    
    console.log(`🎫 [SÉRIES] Thèmes piochés dans le pool (${pool.themes.length} restants) : ${selection.join(' | ')}`);
    return selection;
}
