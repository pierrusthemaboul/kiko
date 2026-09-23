const fs = require('fs');
const path = require('path');

const BUILD_ID = 'bc450c57-cd51-4ecf-af00-6b6ba9a6d9cb';

async function main() {
  console.log('Fetching build view...');
  const { execSync } = require('child_process');
  const buildJsonStr = execSync(`npx eas-cli build:view ${BUILD_ID} --json`).toString('utf8');
  
  const jsonStartIndex = buildJsonStr.indexOf('{');
  const buildInfo = JSON.parse(buildJsonStr.substring(jsonStartIndex));

  const mainLogUrl = buildInfo.logFiles && buildInfo.logFiles[0];
  const xcodeLogUrl = buildInfo.artifacts && buildInfo.artifacts.xcodeBuildLogsUrl;

  if (mainLogUrl) {
    console.log('Fetching Main Log...');
    const res = await fetch(mainLogUrl);
    const text = await res.text();
    fs.writeFileSync(path.join(__dirname, 'scratch_main_log.txt'), text, 'utf8');
    console.log(`Saved scratch_main_log.txt, length: ${text.length}`);
  }

  if (xcodeLogUrl) {
    console.log('Fetching Xcode Log...');
    const res = await fetch(xcodeLogUrl);
    const text = await res.text();
    fs.writeFileSync(path.join(__dirname, 'scratch_xcode_log.txt'), text, 'utf8');
    console.log(`Saved scratch_xcode_log.txt, length: ${text.length}`);
  }
}

main().catch(console.error);
