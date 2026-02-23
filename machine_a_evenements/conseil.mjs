
import { execSync } from 'child_process';
import path from 'path';

async function runConseil() {
    console.clear();
    console.log("========================================");
    console.log("   🏛️  LE CONSEIL DES SAGES KIKO");
    console.log("========================================\n");

    const councilDir = path.resolve('./machine_a_evenements/AGENTS/CONSEIL');

    try {
        // 1. Audit
        execSync(`node auditeur.mjs`, { cwd: councilDir, stdio: 'inherit' });

        console.log("\n---");

        // 2. Délibération
        execSync(`node agent.js`, { cwd: councilDir, stdio: 'inherit' });

    } catch (err) {
        console.error("\n❌ Erreur pendant la session du Conseil:", err.message);
    }

    console.log("\n========================================");
}

runConseil();
