const https = require('https');

const url = 'https://raw.githubusercontent.com/expo/expo/sdk-52/templates/expo-template-bare-minimum/ios/Podfile';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- EXPO SDK 52 Podfile TEMPLATE ---');
    console.log(data);
  });
}).on('error', (err) => {
  console.error(err);
});
