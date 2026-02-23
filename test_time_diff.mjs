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

const d1 = '0106-01-01';
const d2 = '0106-01-01';
console.log(`d1: ${d1}, d2: ${d2}, diff: ${getTimeDifference(d1, d2)}`);

const d3 = '1789-07-14';
const d4 = '1789-07-14';
console.log(`d3: ${d3}, d4: ${d4}, diff: ${getTimeDifference(d3, d4)}`);
