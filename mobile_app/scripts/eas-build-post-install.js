const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const dirsToSearch = [
  'ios/Pods/fmt',
  'ios/Pods/Headers/Public/fmt',
  'ios/Pods/Headers/Private/fmt'
];

console.log('--- Running EAS Build Post Install script (Recursive Header Patch) ---');

function patchDirectory(dir) {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️ Directory not found: ${dir}`);
    return;
  }

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      patchDirectory(path.join(dir, item));
    } else if (stat.isFile() && (item.endsWith('.h') || item.endsWith('.hpp') || item.endsWith('.inl'))) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('FMT_USE_CONSTEVAL')) {
          // Make file writable (fix EACCES)
          fs.chmodSync(fullPath, 0o644);
          
          // Force all definitions of FMT_USE_CONSTEVAL to 0
          const updatedContent = content.replace(/#\s*define\s+FMT_USE_CONSTEVAL\s+\d+/g, '#define FMT_USE_CONSTEVAL 0');
          
          if (updatedContent !== content) {
            fs.writeFileSync(fullPath, updatedContent, 'utf8');
            console.log(`✅ Patched FMT_USE_CONSTEVAL in: ${path.join(dir, item)}`);
          } else {
            console.log(`ℹ️ No changes needed in: ${path.join(dir, item)}`);
          }
        }
      } catch (err) {
        console.error(`❌ Failed to patch: ${path.join(dir, item)}`, err);
      }
    }
  }
}

dirsToSearch.forEach(dir => patchDirectory(dir));

console.log('--- EAS Build Post Install script completed ---');
