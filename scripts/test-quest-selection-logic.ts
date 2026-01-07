
import { selectDailyQuests } from '../utils/questSelection';

async function simulate() {
    console.log('🧪 TEST DE LA LOGIQUE DE SÉLECTION DES QUÊTES\n');

    const ranks = [
        { name: 'Page', index: 0 },
        { name: 'Seigneur', index: 7 },
        { name: 'Empereur', index: 22 },
    ];

    for (const rank of ranks) {
        console.log(`👤 Tirage pour : ${rank.name} (Index ${rank.index})`);
        const quests = await selectDailyQuests(rank.index);

        if (quests.length === 0) {
            console.log('❌ Aucune quête trouvée !');
        } else {
            quests.forEach((q, i) => {
                console.log(`  ${i + 1}. [${(q as any).category || '?'}] ${q.title} -> ${q.description}`);
            });
        }
        console.log('');
    }
}

simulate();
