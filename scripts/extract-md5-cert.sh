#!/bin/bash

AAB_FILE="/home/pierre/Téléchargements/application-bf2fd852-998f-47ce-a996-8ad823cd4fb7 (1).aab"

echo "📱 Extraction du certificat et calcul du MD5..."
echo ""

# Extraire le certificat RSA
TEMP_CERT=$(mktemp)
unzip -p "$AAB_FILE" META-INF/*.RSA 2>/dev/null | keytool -printcert -v > "$TEMP_CERT" 2>&1

# Extraire uniquement le certificat en base64
unzip -p "$AAB_FILE" META-INF/*.RSA 2>/dev/null > /tmp/cert.rsa

# Convertir en format lisible par openssl et calculer MD5
openssl pkcs7 -inform DER -in /tmp/cert.rsa -print_certs 2>/dev/null | openssl x509 -fingerprint -md5 -noout 2>/dev/null | cut -d= -f2

echo ""
echo "✅ MD5 extrait !"

rm -f "$TEMP_CERT" /tmp/cert.rsa
