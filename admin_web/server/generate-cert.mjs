/**
 * generate-cert.mjs — Génère un certificat SSL auto-signé pour le développement
 */

import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

console.log('🔐 Génération du certificat SSL auto-signé...');

// Générer une paire de clés RSA
const keys = forge.pki.rsa.generateKeyPair(2048);

// Créer un certificat
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Attributs du sujet
const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'FR' },
    { name: 'organizationName', value: 'Kiko Dev' },
    { name: 'organizationalUnitName', value: 'Development' }
];
cert.setSubject(attrs);
cert.setIssuer(attrs);

// Extensions pour localhost
cert.setExtensions([{
    name: 'subjectAltName',
    altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' }
    ]
}]);

// Signer le certificat
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convertir en format PEM
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(certPath, certPem);
fs.writeFileSync(keyPath, keyPem);

console.log('✅ Certificat généré avec succès:');
console.log(`   - Certificat: ${certPath}`);
console.log(`   - Clé privée: ${keyPath}`);
console.log('   - Valide pour 365 jours');
console.log('   - Common Name: localhost');
