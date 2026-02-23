const fs = require('fs');
const csvParser = require('csv-parser');

const CSV_PATH = "/home/pierre/sword/kiko/nouveaux_evenements_test_10.csv";

async function diagnosticCsv() {
    console.log("🔍 === DIAGNOSTIC CSV ===");
    
    const events = [];
    const jsonFields = ['types_evenement', 'pays', 'mots_cles'];
    const problemsFound = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
            .pipe(csvParser())
            .on('data', (row) => {
                events.push(row);
                
                // Analyser chaque champ JSON
                jsonFields.forEach(field => {
                    if (row[field] && row[field] !== '') {
                        try {
                            // Tester le parsing JSON
                            JSON.parse(row[field]);
                        } catch (error) {
                            problemsFound.push({
                                ligne: events.length,
                                titre: row.titre || 'Titre manquant',
                                field: field,
                                value: row[field],
                                error: error.message
                            });
                        }
                    }
                });
            })
            .on('end', () => {
                console.log(`📊 Total d'événements: ${events.length}`);
                console.log(`❌ Problèmes JSON trouvés: ${problemsFound.length}`);
                
                if (problemsFound.length > 0) {
                    console.log("\n🚨 DÉTAILS DES PROBLÈMES:");
                    problemsFound.slice(0, 10).forEach((problem, index) => {
                        console.log(`\n${index + 1}. Ligne ${problem.ligne} - "${problem.titre}"`);
                        console.log(`   Champ: ${problem.field}`);
                        console.log(`   Valeur: "${problem.value}"`);
                        console.log(`   Erreur: ${problem.error}`);
                    });
                    
                    if (problemsFound.length > 10) {
                        console.log(`\n... et ${problemsFound.length - 10} autres problèmes`);
                    }
                } else {
                    console.log("✅ Aucun problème JSON détecté!");
                }
                
                // Afficher un exemple de ligne valide
                if (events.length > 0) {
                    console.log("\n📋 Exemple de première ligne:");
                    console.log("Colonnes disponibles:", Object.keys(events[0]));
                    console.log("Titre:", events[0].titre);
                    console.log("Types événement:", events[0].types_evenement);
                    console.log("Pays:", events[0].pays);
                    console.log("Mots clés:", events[0].mots_cles);
                }
                
                resolve({
                    totalEvents: events.length,
                    problems: problemsFound,
                    sampleRow: events[0]
                });
            })
            .on('error', (error) => {
                console.error(`❌ Erreur lecture CSV: ${error.message}`);
                reject(error);
            });
    });
}

// Fonction utilitaire pour nettoyer un champ JSON
function cleanJsonField(value) {
    if (!value || value === '' || value === 'null') {
        return null;
    }
    
    try {
        // Nettoyer les caractères problématiques
        let cleaned = value
            .trim()
            .replace(/^\uFEFF/, '') // Supprimer BOM
            .replace(/\r\n|\r|\n/g, ' ') // Remplacer retours à la ligne
            .replace(/\s+/g, ' '); // Normaliser les espaces
        
        // Tester le parsing
        JSON.parse(cleaned);
        return cleaned;
    } catch (error) {
        console.log(`⚠️ Nettoyage impossible pour: "${value}" - ${error.message}`);
        // En cas d'échec, convertir en array simple
        return JSON.stringify([value.toString()]);
    }
}

async function fixCsvFile() {
    console.log("\n🔧 === CORRECTION AUTOMATIQUE DU CSV ===");
    
    const events = [];
    const fixed = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
            .pipe(csvParser())
            .on('data', (row) => {
                events.push(row);
                
                // Créer une copie corrigée
                const fixedRow = { ...row };
                
                // Corriger les champs JSON
                ['types_evenement', 'pays', 'mots_cles'].forEach(field => {
                    if (fixedRow[field]) {
                        fixedRow[field] = cleanJsonField(fixedRow[field]);
                    }
                });
                
                fixed.push(fixedRow);
            })
            .on('end', () => {
                console.log(`✅ ${fixed.length} lignes traitées`);
                
                // Sauvegarder le fichier corrigé
                const outputPath = CSV_PATH.replace('.csv', '_fixed.csv');
                const csvWriter = require('csv-writer').createObjectCsvWriter({
                    path: outputPath,
                    header: Object.keys(fixed[0]).map(key => ({ id: key, title: key }))
                });
                
                csvWriter.writeRecords(fixed)
                    .then(() => {
                        console.log(`💾 Fichier corrigé sauvé: ${outputPath}`);
                        resolve(outputPath);
                    })
                    .catch(reject);
            })
            .on('error', reject);
    });
}

// Exécution
if (require.main === module) {
    diagnosticCsv()
        .then(result => {
            if (result.problems.length > 0) {
                console.log("\n🔧 Voulez-vous que je tente de corriger automatiquement le fichier? (Uncomment la ligne suivante)");
                // return fixCsvFile();
            }
        })
        .catch(console.error);
}

module.exports = { diagnosticCsv, fixCsvFile, cleanJsonField };