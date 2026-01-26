
function getResetDate(questType: 'daily' | 'weekly' | 'monthly', now: Date): string {
    if (questType === 'daily') {
        const tomorrow = new Date(now);
        tomorrow.setHours(24, 0, 0, 0);
        return tomorrow.toISOString();
    } else if (questType === 'weekly') {
        const nextMonday = new Date(now);
        const dayOfWeek = nextMonday.getDay();
        // Monday is 1. If Sunday (0), daysUntilMonday = 1. Else 8 - dayOfWeek (e.g. Mon=1 -> 7).
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        return nextMonday.toISOString();
    } else {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth.toISOString();
    }
}

// Simulated tests
const tests = [
    { name: 'Mercredi 8 Janvier', date: new Date('2026-01-08T10:00:00Z') },
    { name: 'Dimanche 11 Janvier', date: new Date('2026-01-11T10:00:00Z') },
    { name: 'Lundi 12 Janvier', date: new Date('2026-01-12T10:00:00Z') },
    { name: 'Fin de mois 31 Janvier', date: new Date('2026-01-31T22:00:00Z') },
];

console.log('🧪 TEST DES CALCULS DE RESET\n');

tests.forEach(t => {
    console.log(`📅 Test: ${t.name} (${t.date.toUTCString()})`);
    console.log(`   - Daily:   ${getResetDate('daily', t.date)}`);
    console.log(`   - Weekly:  ${getResetDate('weekly', t.date)}`);
    console.log(`   - Monthly: ${getResetDate('monthly', t.date)}`);
    console.log('');
});
