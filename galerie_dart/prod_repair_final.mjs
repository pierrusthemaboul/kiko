import { orchestrateIllustration } from './orchestrateur_images.mjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const REPAIRS = [
    {
        id: "7a07b33e-c64e-45fa-8874-e4e9a73b75cc",
        titre: "Loi Copé-Zimmermann sur les quotas de genre",
        customPrompt: "Cinematic medium shot of a high-end modern corporate boardroom in 2011. A group of elegant, powerful women in professional suits are leadng a meeting. Glass walls overlooking a sunny business district. Dominant subject is a woman standing and speaking. No 1950s style, no secretaries. Modern high-tech atmosphere, sharp focus, 40% subject dominance. Masterpiece."
    },
    {
        id: "c08b87bb-afd5-4a7d-898b-9a492a015663",
        titre: "Invention du télégraphe optique par Claude Chappe",
        customPrompt: "Epic wide shot of a Chappe optical telegraph tower on a French hilltop in 1793. The giant black wooden semaphore arms are positioned in a clear signal code. Cinematic sunset lighting, historical 18th century landscape. Dramatic clouds. The tower is the clear hero, occupying 40% of the frame. Pure historical realism, sharp detail. No modern elements."
    },
    {
        id: "6c796526-b920-4df3-b3ff-abc9610baf20",
        titre: "Accords de Grenelle sur la formation continue",
        customPrompt: "Close-up of a French industrial worker's hand in 1972, resting his heavy metallic tools on a workbench to pick up a vibrant technical training booklet. The booklet has 1970s orange and brown graphic design. In the background, a blurred factory interior with vintage machinery. Warm cinematic 1970s film grain, emotional transition from labor to education. High contrast, sharp focus."
    }
];

async function runProductionRepair() {
    console.log("🚀 Lancement de la réparation en PRODUCTION (Supabase)...");

    for (const event of REPAIRS) {
        console.log(`\n--- 🔨 Traitement de : ${event.titre} ---`);
        
        // On contourne l'agent pour injecter le "Vrai" prompt validé
        const result = await orchestrateIllustration(event.id, event.titre, event.customPrompt);
        
        if (result.success) {
            console.log(`✅ SUCCÈS : ${event.titre}`);
            console.log(`🔗 URL : ${result.storageUrl}`);
        } else {
            console.log(`❌ ÉCHEC : ${event.titre} - ${result.error}`);
        }
    }
}

runProductionRepair().catch(console.error);
