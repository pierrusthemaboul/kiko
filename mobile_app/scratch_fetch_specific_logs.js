const { exec } = require('child_process');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const BUILD_ID = 'e8a6685d-53f6-4c29-9006-dca245abf94f';

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Fetching build info for ${BUILD_ID} from EAS CLI...`);
  const buildJsonStr = await runCommand(`npx eas-cli build:view ${BUILD_ID} --json`);
  
  const jsonStartIndex = buildJsonStr.indexOf('{');
  if (jsonStartIndex === -1) {
    console.error('No JSON found in build:view output:', buildJsonStr);
    return;
  }
  const jsonStr = buildJsonStr.substring(jsonStartIndex);
  const buildInfo = JSON.parse(jsonStr);

  const mainLogUrl = buildInfo.logFiles && buildInfo.logFiles[0];
  const xcodeLogUrl = buildInfo.artifacts && buildInfo.artifacts.xcodeBuildLogsUrl;

  if (mainLogUrl) {
    console.log('Fetching Main Job Logs...');
    const mainBuffer = await fetchUrl(mainLogUrl);
    let mainText = '';
    try {
      mainText = zlib.gunzipSync(mainBuffer).toString('utf8');
    } catch (e) {
      try {
        mainText = zlib.inflateSync(mainBuffer).toString('utf8');
      } catch (e2) {
        mainText = mainBuffer.toString('utf8');
      }
    }
    fs.writeFileSync(path.join(__dirname, 'scratch_main_log.txt'), mainText, 'utf8');
    console.log('Saved main log to scratch_main_log.txt');
  }

  if (xcodeLogUrl) {
    console.log('Fetching Xcode Build Logs...');
    const xcodeBuffer = await fetchUrl(xcodeLogUrl);
    let xcodeText = '';
    try {
      xcodeText = zlib.gunzipSync(xcodeBuffer).toString('utf8');
    } catch (e) {
      try {
        xcodeText = zlib.inflateSync(xcodeBuffer).toString('utf8');
      } catch (e2) {
        xcodeText = xcodeBuffer.toString('utf8');
      }
    }
    fs.writeFileSync(path.join(__dirname, 'scratch_xcode_log.txt'), xcodeText, 'utf8');
    console.log('Saved Xcode log to scratch_xcode_log.txt');
  }
}

main().catch(console.error);
