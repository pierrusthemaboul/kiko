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

async function getDownloadsLastMonth() {
  try {
    const token = generateJWT();
    console.log('JWT generated successfully.');
    
    // We want to fetch downloads for the last 30 days (since 2026-05-24 to 2026-06-23)
    const today = new Date('2026-06-24T11:24:41+02:00');
    
    console.log(`Checking daily reports from 30 days ago to yesterday...`);
    
    const aggregatedData = {};
    let totalUnitsAll = 0;
    
    for (let i = 1; i <= 30; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      try {
        const csv = await fetchReportForDate(dateStr, token);
        if (csv) {
          const parsed = parseCSV(csv);
          parsed.forEach(row => {
            const units = parseInt(row['Units'], 10) || 0;
            const title = row['Title'] || 'Unknown App';
            const type = row['Product Type Identifier'] || 'Unknown Type';
            const promoCode = row['Promo Code'] || '';
            const parentId = row['Parent Identifier'] || '';
            
            if (!aggregatedData[title]) {
              aggregatedData[title] = {};
            }
            if (!aggregatedData[title][type]) {
              aggregatedData[title][type] = 0;
            }
            
            aggregatedData[title][type] += units;
            totalUnitsAll += units;
          });
          console.log(`Successfully parsed report for ${dateStr}`);
        } else {
          console.log(`No data or report not available for ${dateStr}`);
        }
      } catch (err) {
        console.error(`Error on date ${dateStr}:`, err.message);
      }
      
      // small delay
      await new Promise(r => setTimeout(r, 100));
    }
    
    console.log('\n=====================================');
    console.log('SUMMARY FOR THE LAST 30 DAYS:');
    console.log('=====================================');
    for (const [appTitle, types] of Object.entries(aggregatedData)) {
      console.log(`\nApp: ${appTitle}`);
      for (const [type, units] of Object.entries(types)) {
        let typeDescription = 'Other/Unknown';
        if (type === '1' || type === '1F' || type === '1-F' || type === '1-T') {
          typeDescription = 'First-time downloads (App Store)';
        } else if (type === '7' || type === '7F' || type === '7-F') {
          typeDescription = 'Updates';
        } else if (type === '3' || type === '3F' || type === '3-F') {
          typeDescription = 'Redownloads';
        } else if (type === 'IA1' || type === 'IA5' || type === 'IA9') {
          typeDescription = 'In-App Purchase';
        } else if (type === '1E' || type === '1EP' || type === '1EU') {
          typeDescription = 'App Bundle';
        }
        console.log(`  - Type [${type}] (${typeDescription}): ${units} unit(s)`);
      }
    }
    console.log(`\nGrand Total Units (All Types): ${totalUnitsAll}`);
    
  } catch (error) {
    console.error('Failed to query downloads:', error);
  }
}

getDownloadsLastMonth();
