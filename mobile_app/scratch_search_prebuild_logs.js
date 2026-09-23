const https = require('https');
const zlib = require('zlib');

const url = `https://storage.googleapis.com/eas-workflows-production/logs/3cbda57c-1ec1-4949-af06-9e933dbc0050/12405794-e673-4546-9236-6140dde41563/2026-06-06T16%3A31%3A54Z-0686ff41-c1c9-4b3f-890f-edebce71a3a9.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260606%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260606T163627Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=6e71be7770f93f0cfb7f677be143e72aa70589ecf7894a9432846ab0719a100b1e11799f6759d8b3604089ab26c729d91572d37100e4afcdf53ac04c381119f9c72f5f8fa32afd373e5c85c87cde45ad0eddafd4463f67026a091fa0effb22d3ee7eb6f7ce07de121328d7b0d7d4c2fd02c1628c9860ead2840378048c71bbb4a85805727278bf34d89ab54bdbdd420f5b7366c78b21aeb2956f1023b05319a0c815945628b00ba88a3a9be4befea4de4e163f3511eec492867103cb3a238a1d9d4473e90815749acb6bf4281c7419c836ac12b0071e7756a7b5b8f9d1ad3ae656d1dd9164cac9348416864a1911d36e5961ffe570f3865eaf2f0192dd`;

https.get(url, (res) => {
  const chunks = [];
  res.on('data', (chunk) => { chunks.push(chunk); });
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    let text = '';
    try {
      text = zlib.gunzipSync(buffer).toString('utf8');
    } catch (e) {
      text = buffer.toString('utf8');
    }
    console.log('--- RAW LOG ---');
    console.log(text);
  });
}).on('error', (err) => {
  console.error(err);
});
