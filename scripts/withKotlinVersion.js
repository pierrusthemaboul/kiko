const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

function withKotlinVersion(config) {
  // 1. Forcer dans gradle.properties
  config = withGradleProperties(config, config => {
    const gradleProperties = config.modResults;
    
    // Forcer Kotlin version
    gradleProperties.push({
      type: 'property',
      key: 'kotlinVersion',
      value: '1.9.25',
    });
    
    // Ajouter les propriétés JVM
    gradleProperties.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
    });
    
    console.log('✅ Plugin: kotlinVersion=1.9.25 ajouté dans gradle.properties');
    
    return config;
  });
  
  // 2. Forcer dans build.gradle
  config = withProjectBuildGradle(config, config => {
    const buildGradle = config.modResults.contents;
    
    // Ajouter ext.kotlinVersion dans buildscript
    if (!buildGradle.includes('ext.kotlinVersion')) {
      config.modResults.contents = buildGradle.replace(
        /buildscript\s*{/,
        `buildscript {
    ext {
        kotlinVersion = "1.9.25"
    }`
      );
    } else {
      // Remplacer la version existante
      config.modResults.contents = buildGradle.replace(
        /kotlinVersion\s*=\s*["'][\d.]+["']/g,
        'kotlinVersion = "1.9.25"'
      );
    }
    
    console.log('✅ Plugin: kotlinVersion forcé à 1.9.25 dans build.gradle');
    
    return config;
  });
  
  return config;
}

module.exports = withKotlinVersion;