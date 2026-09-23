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
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching build info from EAS CLI...');
  const buildJsonStr = await runCommand('npx eas-cli build:view 12405794-e673-4546-9236-6140dde41563 --json');
  
  // Clean JSON output (sometimes warning messages are printed before the JSON)
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
    console.log('\n--- Fetching Main Job Logs ---');
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
    
    // Print prebuild lines
    const mainLines = mainText.split('\n');
    console.log('Main log lines:', mainLines.length);
    mainLines.forEach((line, index) => {
      const l = line.toLowerCase();
      if (l.includes('prebuild') || l.includes('fmt') || l.includes('podfile') || l.includes('warning') || l.includes('error') || l.includes('apply') || l.includes('inject')) {
        if (l.includes('cxx') || l.includes('consteval') || l.includes('pod') || l.includes('fail')) {
          console.log(`[Main ${index + 1}]: ${line.trim()}`);
        }
      }
    });
  }

  if (xcodeLogUrl) {
    console.log('\n--- Fetching Xcode Build Logs ---');
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
    
    const xcodeLines = xcodeText.split('\n');
    console.log('Xcode log lines:', xcodeLines.length);
    // Find the error section (last 50 lines or lines with errors)
    console.log('Xcode logs tail (last 30 lines):');
    const tailLines = xcodeLines.slice(-30);
    tailLines.forEach((line, index) => {
      console.log(`[Xcode Tail ${xcodeLines.length - 30 + index + 1}]: ${line.trim()}`);
    });
  }
}

main().catch(console.error);
