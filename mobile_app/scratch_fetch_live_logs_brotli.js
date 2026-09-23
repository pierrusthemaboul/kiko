const { exec } = require('child_process');
const https = require('https');
const zlib = require('zlib');

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
        resolve({ buffer, headers: res.headers });
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching build info from EAS CLI...');
  const buildJsonStr = await runCommand('npx eas-cli build:view d6b5a666-2978-486b-9e43-5955aeb5c0e7 --json');
  
  const jsonStartIndex = buildJsonStr.indexOf('{');
  const jsonStr = buildJsonStr.substring(jsonStartIndex);
  const buildInfo = JSON.parse(jsonStr);

  const mainLogUrl = buildInfo.logFiles && buildInfo.logFiles[0]; // Let's check the first log file too!

  if (mainLogUrl) {
    console.log('\n--- Fetching Main Job Logs ---');
    const { buffer, headers } = await fetchUrl(mainLogUrl);
    console.log('Downloaded size:', buffer.length);
    console.log('Content-Encoding:', headers['content-encoding']);

    let text = '';
    // Gcloud storage logs might be compressed or not, let's try Brotli first, then gunzip, then raw
    try {
      text = zlib.brotliDecompressSync(buffer).toString('utf8');
      console.log('Decompressed via Brotli');
    } catch (err) {
      try {
        text = zlib.gunzipSync(buffer).toString('utf8');
        console.log('Decompressed via Gunzip');
      } catch (err2) {
        text = buffer.toString('utf8');
        console.log('Used raw text');
      }
    }

    if (text) {
      const mainLines = text.split('\n');
      console.log('Main log lines:', mainLines.length);

      console.log('\n--- Searching for Xcode / macOS / SDK ---');
      mainLines.forEach((line, index) => {
        const l = line.toLowerCase();
        if (l.includes('xcode') || l.includes('macos') || l.includes('image') || l.includes('sdk') || l.includes('builder')) {
          console.log(`[Main Log ${index + 1}]: ${line.trim()}`);
        }
      });

      // Search for the start of PODFILE CONTENT log
      console.log('\n--- Searching for PODFILE CONTENT ---');
      let printing = false;
      let count = 0;
      mainLines.forEach((line, index) => {
        if (line.includes('--- PODFILE CONTENT ---')) {
          printing = true;
        }
        if (printing && count < 100) {
          console.log(`[Podfile ${index + 1}]: ${line.trim()}`);
          count++;
        }
        if (line.includes('------------------------') && printing) {
          printing = false;
        }
      });
    }
  }
}

main().catch(console.error);
