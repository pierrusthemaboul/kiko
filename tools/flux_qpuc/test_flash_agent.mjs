import { getThemesForRandomDate } from './agent_thematique_flash.mjs';

async function testFlashAgent() {
    console.log("🚀 Test de l'Agent Thématique Flash (Gemini 2.0)...");
    const themes = await getThemesForRandomDate();
    console.log("\nRésultat final :");
    console.log(JSON.stringify(themes, null, 2));
}

testFlashAgent();
