// scripts/dev/preview-economy.ts
import { pointsToXP, DEFAULT_CONVERT } from '../../lib/economy/convert';
import { RANKS } from '../../lib/economy/ranks';



type Mode = 'classic' | 'date';
type Sample = { mode: Mode; points: number };

const samples: Sample[] = [
  { mode: 'classic', points: 50 },
  { mode: 'classic', points: 100 },
  { mode: 'classic', points: 200 },
  { mode: 'classic', points: 400 },
  { mode: 'classic', points: 800 },
  { mode: 'classic', points: 1200 },
  { mode: 'classic', points: 2000 },
  { mode: 'date', points: 50 },
  { mode: 'date', points: 100 },
  { mode: 'date', points: 200 },
  { mode: 'date', points: 400 },
  { mode: 'date', points: 800 },
  { mode: 'date', points: 1200 },
  { mode: 'date', points: 2000 },
];

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printPointsTable() {
  printHeader('Points → XP');
  console.log('Mode\tPoints\tXP');
  for (const sample of samples) {
    const xp = pointsToXP(sample.points, sample.mode, DEFAULT_CONVERT);
    console.log(`${sample.mode}\t${sample.points}\t${xp}`);
  }
}

function printRanks() {
  printHeader('Ranks');
  console.log('Index\tLabel\tXP Total Required\tParties/Day');
  for (const rank of RANKS) {
    console.log(`${rank.index}\t${rank.label}\t${rank.xpTotalRequired}\t${rank.partiesPerDay}`);
  }
}

function main() {
  printPointsTable();
  printRanks();
}

main();
