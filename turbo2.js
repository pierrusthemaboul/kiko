const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-writer').createObjectCsvWriter;

// Configuration
const SUPABASE_URL = "https://ppxmtnuewcixbbmhnzzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U";
const SOURCE_DIR = "/home/pierre/Images/histoire";
const TEMP_DIR = "/home/pierre/Images/temp_compressed";
const UPLOAD_DIR = path.join(__dirname, "upload");
const MAX_RETRIES = 3;
const MAX_FILENAME_LENGTH = 100;

// Initialisation Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Fonction pour s'assurer que les répertoires nécessaires existent
async function ensureDirectories() {
    for (const dir of [TEMP_DIR, UPLOAD_DIR]) {
        try {
            await fs.access(dir);
        } catch {
            console.log(`Création du dossier: ${dir}`);
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

// Fonction pour nettoyer les noms de fichiers
function cleanFilename(filename) {
    const name = path.parse(filename).name;
    
    let cleanName = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '_')
        .split('_')
        .slice(0, 5)
        .join('_');
    
    const uniqueId = uuidv4().slice(0, 8);
    let finalName = `${cleanName}_${uniqueId}.webp`;
    
    if (finalName.length > MAX_FILENAME_LENGTH) {
        const extension = '.webp';
        const idLength = uniqueId.length + 1;
        const maxBaseLength = MAX_FILENAME_LENGTH - extension.length - idLength - 1;
        cleanName = cleanName.slice(0, maxBaseLength);
        finalName = `${cleanName}_${uniqueId}${extension}`;
    }
    
    console.log(`Nom de fichier nettoyé: ${finalName}`);
    return finalName;
}

// Fonction de compression d'image
async function compressImage(inputPath, outputPath) {
    console.log(`Compression de l'image: ${inputPath}`);
    
    try {
        // Vérification que le fichier est lisible
        await fs.access(inputPath, fs.constants.R_OK);
        
        // Lecture du fichier en buffer
        const buffer = await fs.readFile(inputPath);
        const originalSize = buffer.length;
        console.log(`Taille originale: ${(originalSize / 1024).toFixed(2)}KB`);

        await sharp(buffer)
            .resize(1200, 1200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality: 80,
                effort: 6
            })
            .toFile(outputPath);

        const finalSize = (await fs.stat(outputPath)).size;
        const reduction = ((1 - finalSize / originalSize) * 100).toFixed(1);
        console.log(`Compression terminée. Nouvelle taille: ${(finalSize / 1024).toFixed(2)}KB (réduction de ${reduction}%)`);
    } catch (error) {
        console.error(`Erreur lors de la compression de ${inputPath}:`, error);
        throw new Error(`Échec de la compression: ${error.message}`);
    }
}

// Fonction d'upload avec retry
async function uploadWithRetry(filePath, newFilename) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Tentative d'upload ${attempt}/${MAX_RETRIES}`);
            console.log(`Chemin du fichier: ${filePath}`);
            console.log(`Nouveau nom: ${newFilename}`);

            const fileBuffer = await fs.readFile(filePath);
            console.log(`Taille du buffer: ${fileBuffer.length} bytes`);

            const { data, error } = await supabase.storage
                .from("evenements-image")
                .upload(newFilename, fileBuffer, {
                    contentType: 'image/webp',
                    upsert: true,
                    duplex: 'half'
                });

            if (error) {
                console.error("Erreur détaillée:", JSON.stringify(error, null, 2));
                throw error;
            }

            console.log("Réponse de l'upload:", JSON.stringify(data, null, 2));
            console.log(`Upload réussi à la tentative ${attempt}`);
            return true;

        } catch (error) {
            console.warn(`Échec de la tentative ${attempt}: ${error.message}`);
            
            if (attempt < MAX_RETRIES) {
                const waitTime = Math.pow(2, attempt - 1) * 1000;
                console.log(`Nouvelle tentative dans ${waitTime/1000} secondes...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                throw error;
            }
        }
    }
}

// Fonction principale de traitement des images
async function processImages() {
    console.log("=== Début du programme ===");
    
    try {
        await ensureDirectories();
        
        // Lire tous les fichiers du répertoire source
        const files = await fs.readdir(SOURCE_DIR, { withFileTypes: true });
        
        // Filtrer pour ne garder que les fichiers images et obtenir les chemins complets
        const imageFiles = files
            .filter(file => file.isFile() && /\.(webp|jpg|jpeg|png)$/i.test(file.name))
            .map(file => ({
                name: file.name,
                path: path.join(SOURCE_DIR, file.name)
            }));
        
        console.log(`Nombre total de fichiers à traiter: ${imageFiles.length}`);
        
        const processedData = [];
        
        for (const [index, fileInfo] of imageFiles.entries()) {
            console.log(`\nTraitement du fichier ${index + 1}/${imageFiles.length}: ${fileInfo.name}`);
            
            try {
                const newFilename = cleanFilename(fileInfo.name);
                const compressedPath = path.join(TEMP_DIR, newFilename);
                
                await compressImage(fileInfo.path, compressedPath);
                
                console.log(`Début de l'upload vers Supabase: ${newFilename}`);
                await uploadWithRetry(compressedPath, newFilename);
                
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/evenements-image/${newFilename}`;
                console.log(`URL publique générée: ${publicUrl}`);
                
                processedData.push({
                    ancien_nom: fileInfo.name,
                    nouveau_nom: newFilename,
                    url: publicUrl
                });
                
                // Nettoyage du fichier temporaire
                try {
                    await fs.unlink(compressedPath);
                    console.log('Fichier temporaire supprimé');
                } catch (error) {
                    console.warn(`Avertissement : impossible de supprimer le fichier temporaire ${compressedPath}`, error);
                }
                
            } catch (error) {
                console.error(`Erreur lors du traitement de ${fileInfo.name}:`, error);
                console.error("Stack trace:", error.stack);
            }
        }
        
        // Écriture du rapport CSV
        if (processedData.length > 0) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
            const csvPath = path.join(UPLOAD_DIR, `upload_report_${timestamp}.csv`);
            
            const csvWriter = csv({
                path: csvPath,
                header: [
                    {id: 'ancien_nom', title: 'ancien_nom'},
                    {id: 'nouveau_nom', title: 'nouveau_nom'},
                    {id: 'url', title: 'url'}
                ]
            });
            
            await csvWriter.writeRecords(processedData);
            console.log(`\nRésultats exportés dans: ${csvPath}`);
        } else {
            console.warn("\nAucune donnée n'a été traitée");
        }
        
    } catch (error) {
        console.error(`\nErreur critique:`, error);
        console.error("Stack trace:", error.stack);
        throw error;
    } finally {
        console.log("\n=== Fin du programme ===");
    }
}

// Lancement du programme
processImages().catch(console.error);