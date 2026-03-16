import Replicate from 'replicate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function testBerezina() {
    console.log("🚀 STRESS TEST : La Bérézina (1812)");

    const prompt = `Extreme close-up, ground-level shot of a makeshift wooden pontoon bridge in 1812, partially submerged in the churning, icy black water of the Berezina river. A single, frostbitten hand of a French soldier (Grognard) is desperately gripping the rough, ice-covered wood. In the background, blurred through a thick, freezing blizzard, the dark, ghostly silhouettes of retreating soldiers and horses move across the bridge. Rembrandt lighting with a cold, pale morning glow. Gritty textures of frozen wool, splintered wood, and jagged ice. Dramatic, tragic, and hyper-realistic. 1024x576.`;

    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt: prompt, aspect_ratio: "16:9" }
    });

    console.log(`✅ Image 'La Bérézina' générée : ${Array.isArray(output) ? output[0] : output}`);
}

testBerezina().catch(console.error);
