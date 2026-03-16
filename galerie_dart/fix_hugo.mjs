import { orchestrateIllustration } from './orchestrateur_images.mjs';

async function fixHugo() {
    console.log("📚 Correction immédiate de L'illustration de Victor Hugo...");
    // ID: cbd5ab74-9245-4259-a2a9-4b07e932dc08
    const result = await orchestrateIllustration("Publication de Les Misérables de Victor Hugo", "cbd5ab74-9245-4259-a2a9-4b07e932dc08");
    if (result) {
        console.log("✅ Victor Hugo a été sauvé du surréalisme.");
    }
}

fixHugo().catch(console.error);
