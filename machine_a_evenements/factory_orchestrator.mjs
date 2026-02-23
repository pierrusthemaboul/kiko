
import { spawn } from 'child_process';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAgent(agentName, args = []) {
    const agentDir = path.join(__dirname, 'AGENTS', agentName);
    console.log(`\n▶️  Exécution de l'Agent ${agentName}${(args.length > 0) ? ' avec arguments: ' + args.join(' ') : ''}...`);

    return new Promise((resolve) => {
        const child = spawn(process.execPath, ['agent.js', ...args], {
            cwd: agentDir,
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${agentName} terminé.`);
                resolve(true);
            } else {
                console.log(`❌ ${agentName} a échoué (code ${code}).`);
                resolve(false);
            }
        });
    });
}

async function main() {
    console.log("🏭 BIENVENUE DANS L'EVENT_FACTORY (Machine Kiko)");
    console.log("═".repeat(45));

    const count = process.argv[2] || "50";
    const agents = ["GENESIS", "SENTINEL", "ARTISAN", "REXP"];

    for (const agent of agents) {
        const args = (agent === "GENESIS") ? [count] : [];
        const success = await runAgent(agent, args);
        if (!success) {
            console.log("\n🛑 Pipeline interrompu suite à une erreur.");
            process.exit(1);
        }
    }

    console.log("\n✨ TOUTE LA CHAINE DE PRODUCTION A TERMINÉ !");
    console.log("Check machine_a_evenements/AGENTS/REXP/STORAGE/OUTPUT/export_report.md");
}

main();
