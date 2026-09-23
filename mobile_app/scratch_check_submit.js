const https = require('https');
const fs = require('fs');

const sessionSecret = '{"id":"4cbbde39-e994-4868-b466-13edd4cf59d4","version":2}';

function checkSubmission(id) {
  const url = `https://expo.dev/accounts/pierretulle/projects/kiko/submissions/${id}`;
  const options = {
    headers: {
      'expo-session': sessionSecret
    }
  };

  https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`\n=== Submission ${id} (Status ${res.statusCode}) ===`);
      if (data.includes('Log In — Expo') || data.includes('Log in to Expo')) {
        console.log('Redirected to login screen. Session header rejected.');
        return;
      }

      // Search for status indicators
      // Typical statuses: "Failed", "Finished", "In progress"
      const match = data.match(/"status"\s*:\s*"([^"]+)"/i);
      console.log('Status from JSON:', match ? match[1] : 'Not found');

      // Search for logs or error messages
      const errorMatch = data.match(/"error"\s*:\s*({[^}]+})/);
      if (errorMatch) {
        console.log('Error found:', errorMatch[1]);
      } else {
        console.log('No direct error object in HTML');
      }

      // Check if we can find text patterns
      if (data.includes('failed') || data.includes('error')) {
        console.log('Page contains error/fail keywords');
      }
      
      // Save output to file to analyze
      fs.writeFileSync(`C:\\Users\\pierr\\dev\\kiko\\mobile_app\\submit_log_${id}.html`, data);
      console.log(`Saved full HTML to submit_log_${id}.html`);
    });
  }).on('error', (err) => {
    console.error('Request failed:', err);
  });
}

checkSubmission('28d3b85a-0093-4367-b7cf-5d0accfd0d47');
checkSubmission('610d1b9b-d4ff-46d5-bc8f-6abe69a3cfb6');
