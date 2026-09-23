const https = require('https');
const fs = require('fs');

const url = `https://storage.googleapis.com/eas-workflows-production/logs/3cbda57c-1ec1-4949-af06-9e933dbc0050/d6b5a666-2978-486b-9e43-5955aeb5c0e7/2026-06-06T18%3A12%3A51Z-9bc8b00d-8263-4a4e-a769-0c0f1549c65b.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260606%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260606T183810Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=858fd7ffe0a0a668660ba19ad904a1f38c9ac44aed560609d9f09746281033b8da9ef09bf260e59eabc004bb0c0ec526cc5a307b5056969bcb5209bb8a2d2197d03d2f0d59c760b95c456b5bf4d8f367aa3329cfc6877e7a33bca989244c9ae84f3d0724f75d33eef4efc79039e2fd12d145d401abb8cd3618e14a482ca504e557f094e6968fb19f828695aec542c0da9473c72d57aae7ee4732b83cb116265c48750320c2b581f5b85a80b79cd95bec0024af3c44ef0c1db4f2b342e0927003b61d3fa39be533d69082d7bcd9b9cf1fb19c5260f465b94d362c25b0d4e2752562fc40ea4d77f6816092705c9f9a45dfbe96eaeb14d35dd842b58d0007023153`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('--- FIRST 50 LINES ---');
    const lines = data.split('\n');
    for (let i = 0; i < Math.min(100, lines.length); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  });
}).on('error', (err) => {
  console.error(err);
});
