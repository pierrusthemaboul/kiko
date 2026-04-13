import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config({ path: 'credentials/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkNotoriety(titre) {
    const prompt = `Agis comme un historien expert de la culture générale francophone.
Évalue l'importance culturelle, historique ou mémorable de CET ÉVÉNEMENT SPÉCIFIQUE (pas du sujet général) du point de vue d'un citoyen européen francophone.
Titre : "${titre}"
Échelle :
100 = Événement mondial incontournable (ex: Fin WW2, 1er pas sur la lune, Armistice)
80 = Grand événement très connu (ex: Sortie de GTA 5, Coupe du monde 98)
50 = Fait marquant connu des amateurs du domaine ou fait divers historique franco-européen célèbre
30 = Anecdote intéressante mais de niche
10 = Détail infime

Note de 1 à 100 ? Réponds UNIQUEMENT par le nombre.`;

    const [geminiRes, openaiRes] = await Promise.all([
        geminiModel.generateContent(prompt),
        openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
        })
    ]);

    const scoreG = parseInt(geminiRes.response.text().match(/\d+/)[0], 10);
    const scoreO = parseInt(openaiRes.choices[0].message.content.match(/\d+/)[0], 10);
    console.log(`- ${titre} -> Gemini: ${scoreG} | GPT: ${scoreO} => Moyenne: ${Math.round((scoreG+scoreO)/2)}`);
}

async function run() {
    await checkNotoriety("Sortie mondiale officielle de Grand Theft Auto V (GTA 5)");
    await checkNotoriety("Exécution de Jeanne d'Arc sur le bûcher à Rouen");
    await checkNotoriety("La Boston Tea Party");
}
run();
