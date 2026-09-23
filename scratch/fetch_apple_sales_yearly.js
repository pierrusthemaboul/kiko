const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ISSUER_ID = '85201996-ae2c-447a-9760-c5e5c890d3cd';
const KEY_ID = 'NRS8XWJ6KU';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'AuthKey_NRS8XWJ6KU.p8');

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  const payload = {
    iss: ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1200,
    aud: 'appstoreconnect-v1'
  };

  const headerStr = base64url(Buffer.from(JSON.stringify(header)));
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerStr}.${payloadStr}`;

  const signature = crypto.sign(
    'sha256',
    Buffer.from(signInput),
    {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    }
  );

  const signatureStr = base64url(signature);
  return `${signInput}.${signatureStr}`;
}

async function fetchWeeklyReport(dateStr, token) {
  const url = new URL('https://api.appstoreconnect.apple.com/v1/salesReports');
  url.searchParams.append('filter[frequency]', 'WEEKLY');
  url.searchParams.append('filter[reportType]', 'SALES');
  url.searchParams.append('filter[reportSubType]', 'SUMMARY');
  url.searchParams.append('filter[vendorNumber]', '94237352');
  url.searchParams.append('filter[reportDate]', dateStr);
  url.searchParams.append('filter[version]', '1_0');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, dezipped) => {
      if (err) return reject(err);
      resolve(dezipped.toString('utf8'));
    });
  });
}

function parseCSV(csv) {
  const lines = csv.split('\n');
  if (lines.length <= 1) return [];
  const headers = lines[0].split('\t');
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split('\t');
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = values[index];
    });
    results.push(entry);
  }
  return results;
}

// Helper to get past Sundays (weekly reports are index by Sunday date in App Store Connect)
function getPastSundays(count) {
  const sundays = [];
  const d = new Date();
  // Go back to the most recent Sunday
  d.setDate(d.getDate() - d.getDay());
  
  for (let i = 0; i < count; i++) {
    sundays.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 7);
  }
  return sundays;
}

async function scanYear() {
  try {
    const token = generateJWT();
    const sundays = getPastSundays(52);
    console.log(`Scanning weekly reports for the last 52 weeks...`);
    
    let totalDownloads = 0;
    const summaryByApp = {};

    for (const dateStr of sundays) {
      console.log(`Checking week ending on ${dateStr}...`);
      try {
        const csv = await fetchWeeklyReport(dateStr, token);
        if (csv) {
          const parsed = parseCSV(csv);
          parsed.forEach(row => {
            const units = parseInt(row['Units'], 10) || 0;
            const title = row['Title'] || '';
            const type = row['Product Type Identifier'] || '';
            
            // Only count new downloads/installations (usually product type '1' or '1-F' or '1F')
            // Updates might be shown with different codes, let's track all types
            const key = `${title} (${type})`;
            summaryByApp[key] = (summaryByApp[key] || 0) + units;
            totalDownloads += units;
          });
        }
      } catch (err) {
        console.error(`Error checking week ${dateStr}:`, err.message);
      }
      // Sleep slightly to respect rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    console.log('\n--- ANNUAL SCAN COMPLETE ---');
    console.log('Breakdown by app and type:');
    for (const [key, value] of Object.entries(summaryByApp)) {
      console.log(`- ${key}: ${value} units`);
    }
    console.log(`\nGrand Total Units across all 52 weeks: ${totalDownloads}`);
  } catch (error) {
    console.error('Scan failed:', error);
  }
}

scanYear();
