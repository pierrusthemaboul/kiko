function getCachedDateInfo(dateStr) {
    try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const timestamp = date.getTime();
        return { year, timestamp };
    } catch {
        return { year: 2000, timestamp: new Date('2000-01-01').getTime() };
    }
}

function getTimeDifference(date1, date2) {
    const info1 = getCachedDateInfo(date1);
    const info2 = getCachedDateInfo(date2);
    const diffInMilliseconds = Math.abs(info1.timestamp - info2.timestamp);
    return diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
}

const d1 = 'invalid';
const d2 = 'another_invalid';
const diff = getTimeDifference(d1, d2);
console.log(`d1: ${d1}, d2: ${d2}, diff: ${diff}, diff !== 0: ${diff !== 0}`);
console.log(`isNaN(diff): ${isNaN(diff)}`);
