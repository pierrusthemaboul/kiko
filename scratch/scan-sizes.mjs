import fs from 'fs';
import path from 'path';

function getDirSize(dirPath) {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git') continue;
        size += getDirSize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (e) {}
  return size;
}

const root = 'c:\\Users\\pierr\\dev\\kiko';
const items = fs.readdirSync(root);
const results = [];

for (const item of items) {
  const itemPath = path.join(root, item);
  const stat = fs.statSync(itemPath);
  let size = 0;
  if (stat.isDirectory()) {
    if (item === 'node_modules' || item === '.git') continue;
    size = getDirSize(itemPath);
  } else {
    size = stat.size;
  }
  results.push({ name: item, sizeMB: (size / (1024 * 1024)).toFixed(2) });
}

results.sort((a, b) => b.sizeMB - a.sizeMB);
console.log(JSON.stringify(results.slice(0, 20), null, 2));
