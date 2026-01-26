#!/bin/bash

AAB_FILE="/home/pierre/Téléchargements/application-bf2fd852-998f-47ce-a996-8ad823cd4fb7 (1).aab"

echo "📱 Extraction des empreintes de certificat depuis le AAB"
echo ""

# Extraire le certificat
unzip -p "$AAB_FILE" META-INF/*.RSA 2>/dev/null | keytool -printcert -v 2>&1 | grep -E "(MD5|SHA1|SHA256)" | head -3

echo ""
echo "✅ Empreintes extraites avec succès !"
