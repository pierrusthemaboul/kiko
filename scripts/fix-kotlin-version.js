const fs = require('fs');
const path = require('path');

// Chemin vers le fichier gradle.properties
const gradlePropertiesPath = path.join(__dirname, '..', 'android', 'gradle.properties');

// Vérifier que le fichier existe
if (!fs.existsSync(gradlePropertiesPath)) {
  console.error('❌ gradle.properties non trouvé. Avez-vous exécuté expo prebuild ?');
  process.exit(1);
}

// Lire le fichier
let content = fs.readFileSync(gradlePropertiesPath, 'utf8');

// Forcer la version Kotlin
if (!content.includes('kotlinVersion=')) {
  content += '\n# Forcer la version Kotlin\nkotlinVersion=1.9.25\n';
  console.log('✅ kotlinVersion=1.9.25 ajouté');
} else {
  // Remplacer la version existante
  content = content.replace(/kotlinVersion=.*/g, 'kotlinVersion=1.9.25');
  console.log('✅ kotlinVersion mis à jour vers 1.9.25');
}

// Ajouter d'autres propriétés utiles si nécessaire
if (!content.includes('org.gradle.jvmargs=')) {
  content += '\n# Augmenter la mémoire pour le build\norg.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8\n';
  console.log('✅ Mémoire JVM augmentée');
}

// Écrire le fichier
fs.writeFileSync(gradlePropertiesPath, content);
console.log('✅ gradle.properties corrigé avec succès!');