const https = require('https');
const { exec } = require('child_process');

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function main() {
  console.log('Fetching build info from EAS CLI...');
  const buildJsonStr = await runCommand('npx eas-cli build:view 12405794-e673-4546-9236-6140dde41563 --json');
  
  const jsonStartIndex = buildJsonStr.indexOf('{');
  const jsonStr = buildJsonStr.substring(jsonStartIndex);
  const buildInfo = JSON.parse(jsonStr);

  const xcodeLogUrl = buildInfo.artifacts && buildInfo.artifacts.xcodeBuildLogsUrl;
  if (!xcodeLogUrl) {
    console.error('No xcodeBuildLogsUrl found!');
    return;
  }

  console.log('Fetching Xcode logs headers...');
  https.get(xcodeLogUrl, (res) => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    res.resume(); // consume the stream
  }).on('error', console.error);
}

main().catch(console.error);
