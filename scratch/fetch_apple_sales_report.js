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

async function fetchReportForDate(dateStr, token) {
  const url = new URL('https://api.appstoreconnect.apple.com/v1/salesReports');
  url.searchParams.append('filter[frequency]', 'DAILY');
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
    return null; // No sales or error
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

async function scanRange() {
  try {
    const token = generateJWT();
    console.log('Scanning daily reports...');
    
    let totalDownloads = 0;
    const records = [];

    // Let's check the last 20 days
    for (let i = 1; i <= 20; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      console.log(`Checking ${dateStr}...`);
      try {
        const csv = await fetchReportForDate(dateStr, token);
        if (csv) {
          console.log(`🎉 Found sales data on ${dateStr}!`);
          const parsed = parseCSV(csv);
          parsed.forEach(row => {
            // Units column contains number of downloads/updates
            // Product Type Identifier: 1 or 1F represents free app downloads
            const units = parseInt(row['Units'], 10) || 0;
            const title = row['Title'] || '';
            const type = row['Product Type Identifier'] || '';
            
            console.log(`  - ${title} (${type}): ${units} unit(s)`);
            totalDownloads += units;
            records.push({ date: dateStr, title, type, units });
          });
        }
      } catch (err) {
        console.error(`Error checking ${dateStr}:`, err.message);
      }
      
      // Sleep a bit to avoid hitting API rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n--- SCAN COMPLETE ---');
    console.log(`Total units recorded in the last 20 days: ${totalDownloads}`);
  } catch (error) {
    console.error('Scan failed:', error);
  }
}

scanRange();
