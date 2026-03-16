import Replicate from 'replicate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function testSignatureAccessory() {
    console.log("🚀 Test de l'accessoire-signature pour l'Édit d'Amboise...");

    const prompt = `Extreme close-up, top-down perspective on a heavy 16th-century parchment document lying on a rough stone table. A massive red wax seal with the fleur-de-lys of the French monarchy is the central focus (occupying 40% of frame). Next to it, a worn quill pen dipped in black ink. In the blurred background, through a narrow castle window, the distinct fortress silhouette of Amboise is visible under a moody, misty sky. Gritty textures of ancient stone and thick, yellowed paper. 16th-century historical atmosphere, cinematic lighting, no modern elements, hyper-realistic.`;

    const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: { prompt: prompt, aspect_ratio: "16:9" }
    });

    console.log(`✅ Image générée : ${Array.isArray(output) ? output[0] : output}`);
}

testSignatureAccessory().catch(console.error);
