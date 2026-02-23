import { analyzeCoverage, generateGenesisContext } from './AGENTS/GENESIS/coverage_analyzer.mjs';

console.log("=== ANALYSE DE COUVERTURE HISTORIQUE ===\n");

const analysis = await analyzeCoverage();

console.log("\n" + "=".repeat(60));
console.log("CONTEXTE INTELLIGENT POUR GENESIS");
console.log("=".repeat(60));

const context = generateGenesisContext(analysis);

console.log("\n📝 Instructions:");
console.log(`   ${context.instruction}`);

console.log("\n🎯 Top 10 événements prioritaires:");
context.priorities.topMissing.forEach((event, i) => {
    console.log(`   ${i + 1}. [${event.year}] ${event.pattern} (${event.category})`);
});

console.log("\n📅 Périodes sous-représentées:");
context.priorities.underRepresentedPeriods.forEach(period => {
    console.log(`   - ${period}`);
});

console.log("\n🏷️  Catégories à privilégier:");
context.priorities.underRepresentedCategories.forEach(category => {
    console.log(`   - ${category}`);
});

console.log("\n💡 Recommandations:");
context.guidance.forEach(guide => {
    console.log(`   • ${guide}`);
});

console.log("\n✅ Analyse terminée");
