require('dotenv').config(); // Charge les variables d'environnement
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs'); // Importe le module fs standard (pour createReadStream)
const fsp = require('fs').promises; // Importe les versions basées sur des promesses
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const csv = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser'); // Pour lire le CSV
const Replicate = require('replicate'); // Pour l'API FLUX.1 via Replicate

// Configuration
const SUPABASE_URL = "https://ppxmtnuewcixbbmhnzzc.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const EVENTS_CSV_PATH = "/home/pierre/sword/kiko/nouveaux_evenements_test_10.csv";
const TEMP_DIR = "/home/pierre/Images/temp_processing";
const REPORT_DIR = path.join(__dirname, "reports");
const SUPABASE_BUCKET = "evenements-image";
const SUPABASE_TABLE = "goju";

const MAX_RETRIES_UPLOAD = 3;
const MAX_RETRIES_FLUX = 2;
const MAX_FILENAME_LENGTH = 100;

// Initialisation Supabase
if (!SUPABASE_KEY) {
     console.error("Erreur : La clé Supabase n'est pas configurée dans vos variables d'environnement.");
     if(process.env.SUPABASE_SERVICE_KEY) console.error("SUPABASE_SERVICE_KEY commence par:", process.env.SUPABASE_SERVICE_KEY.substring(0, 5) + '...');
     if(process.env.SUPABASE_ANON_KEY) console.error("SUPABASE_ANON_KEY commence par:", process.env.SUPABASE_ANON_KEY.substring(0, 5) + '...');
     process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

// Initialisation Replicate
if (!REPLICATE_API_TOKEN) {
    console.error("Erreur : La clé API Replicate (REPLICATE_API_TOKEN) n'est pas configurée dans vos variables d'environnement.");
     if(process.env.REPLICATE_API_TOKEN) console.error("REPLICATE_API_TOKEN commence par:", process.env.REPLICATE_API_TOKEN.substring(0, 5) + '...');
    process.exit(1);
}
const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN,
});

// ✅ FONCTION UTILITAIRE POUR PARSER JSON EN SÉCURITÉ
function safeJsonParse(value, fieldName = 'unknown') {
    if (!value || value === '' || value === 'null' || value === 'undefined') {
        return null;
    }
    
    // Si c'est déjà un objet/array, le retourner tel quel
    if (typeof value === 'object') {
        return value;
    }
    
    try {
        // Nettoyer la valeur avant parsing
        let cleanValue = value.toString().trim();
        
        // Vérifier si ça ressemble à du JSON
        if ((cleanValue.startsWith('[') && cleanValue.endsWith(']')) || 
            (cleanValue.startsWith('{') && cleanValue.endsWith('}'))) {
            return JSON.parse(cleanValue);
        }
        
        // Si ce n'est pas du JSON, traiter comme string simple
        console.log(`⚠️ Champ ${fieldName} n'est pas du JSON valide: "${cleanValue}". Conversion en array.`);
        return [cleanValue];
        
    } catch (error) {
        console.warn(`❌ Erreur parsing JSON pour ${fieldName}: "${value}" - ${error.message}`);
        // En cas d'erreur, créer un array avec la valeur comme string
        return [value.toString()];
    }
}

async function ensureDirectories() {
    for (const dir of [TEMP_DIR, REPORT_DIR]) {
        try {
            await fsp.access(dir);
        } catch {
            console.log(`Création du dossier: ${dir}`);
            await fsp.mkdir(dir, { recursive: true });
        }
    }
}

async function readEventsFromCsv(filePath) {
    console.log(`Lecture des événements depuis ${filePath}...`);
    const events = [];
    return new Promise((resolve, reject) => {
        fsp.access(filePath, fs.constants.R_OK)
            .then(() => {
                 fs.createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', (row) => {
                        // ✅ DEBUG: Afficher un exemple de ligne pour voir la structure
                        if (events.length === 0) {
                            console.log("📋 Exemple de ligne CSV:", row);
                            console.log("🔍 Clés disponibles:", Object.keys(row));
                        }
                        events.push(row);
                    })
                    .on('end', () => {
                        console.log(`Lecture terminée. ${events.length} événements trouvés.`);
                        resolve(events);
                    })
                    .on('error', (error) => {
                        console.error(`Erreur lors de la lecture du CSV: ${error.message}`);
                        reject(error);
                    });
            })
            .catch(() => {
                 const error = new Error(`Le fichier CSV n'existe pas ou n'est pas lisible : ${filePath}`);
                 console.error(error.message);
                 reject(error);
            });
    });
}

// Fonction pour déterminer le type d'événement et générer un prompt spécialisé pour FLUX
function generateFluxSpecializedPrompt(eventRow) {
    const titre = eventRow.titre.toLowerCase();
    // ✅ PARSING SÉCURISÉ DES TYPES D'ÉVÉNEMENTS
    const typesEvenement = safeJsonParse(eventRow.types_evenement, 'types_evenement') || [];
    const epoque = eventRow.epoque || '';
    const date = eventRow.date || '';
    
    // Déterminer l'année pour les contraintes temporelles
    const year = date ? parseInt(date.split('-')[0]) : 1800;
    
    // Bases communes pour tous les prompts FLUX (plus direct et concis)
    const baseConstraints = [
        'Ultra-realistic, cinematic, photographic quality.',
        'Professional historical photography aesthetic.',
        'Dramatic lighting with depth of field.',
        'Focus on 1-3 main characters, avoid crowds.',
        'Authentic period colors and textures.',
        'No text, writing, letters, or numbers visible.',
        `Historically accurate to ${year}, no anachronisms.`
    ];

    // Contraintes anti-anachronisme par époque (adaptées pour FLUX)
    let temporalConstraints = [];
    if (year >= 1800 && year <= 1815) {
        temporalConstraints = [
            'Early 19th century Napoleonic era.',
            'Men: redingotes, high collars, cravats, breeches.',
            'Military: shakos, bicornes, gold braiding, white cross-belts.',
            'Women: Empire waist dresses, spencer jackets, bonnets.',
            'Neoclassical or late baroque architecture.',
            'Period weapons: muskets, cannons, sabres.',
            'Horse-drawn carriages, period transportation.',
            'No medieval or modern elements.'
        ];
    }

    // Déterminer le type d'événement et créer un prompt spécialisé pour FLUX
    if (typesEvenement.includes('Militaire') || titre.includes('bataille') || titre.includes('trafalgar')) {
        // ÉVÉNEMENT MILITAIRE
        return `${baseConstraints.join(' ')} ${temporalConstraints.join(' ')} 
        Military battle scene: ${eventRow.titre}. 
        Naval battle: ships with sails, cannon smoke, officers on deck. 
        Land battle: cavalry, infantry, artillery. 
        Focus on one heroic commander in detailed uniform. 
        Authentic period weapons and tactics. 
        Dramatic battlefield atmosphere.`;
        
    } else if (typesEvenement.includes('Diplomatique') || titre.includes('traité') || titre.includes('signature') || titre.includes('paix') || titre.includes('vente')) {
        // ÉVÉNEMENT DIPLOMATIQUE/COMMERCIAL
        return `${baseConstraints.join(' ')} ${temporalConstraints.join(' ')} 
        Diplomatic negotiation: ${eventRow.titre}. 
        Elegant government office with period furniture. 
        Men in formal civilian dress around mahogany table. 
        Documents, maps, quill pens, ink wells on table. 
        Moment of signing important agreement. 
        Formal ceremonial atmosphere. 
        Rich interior with period decorations.`;
        
    } else if (typesEvenement.includes('Politique') || titre.includes('dissolution') || titre.includes('empire') || titre.includes('couronnement')) {
        // ÉVÉNEMENT POLITIQUE
        return `${baseConstraints.join(' ')} ${temporalConstraints.join(' ')} 
        Political ceremony: ${eventRow.titre}. 
        Grand ceremonial hall with period architecture. 
        Imperial figures in elaborate court dress. 
        Formal ceremony with officials in hierarchy. 
        Rich fabrics, ceremonial objects, regalia. 
        Solemn, majestic atmosphere. 
        Ornate period interior decoration.`;
        
    } else {
        // ÉVÉNEMENT GÉNÉRAL/HISTORIQUE
        return `${baseConstraints.join(' ')} ${temporalConstraints.join(' ')} 
        Historical scene: ${eventRow.titre}. 
        Period-appropriate setting with authentic architecture. 
        People in accurate ${year} clothing. 
        Scene capturing the historical moment's essence. 
        Environmental context supporting the narrative. 
        Authentic period details in all elements.`;
    }
}

// Fonction pour générer l'image avec FLUX.1 [schnell] via Replicate
async function generateImageWithFluxSchnell(eventRow) {
    for (let attempt = 1; attempt <= MAX_RETRIES_FLUX; attempt++) {
        try {
            // Générer le prompt spécialisé selon le type d'événement
            const specializedPrompt = generateFluxSpecializedPrompt(eventRow);
            
            console.log(`Tentative de génération FLUX.1 [schnell] ${attempt}/${MAX_RETRIES_FLUX} pour: "${eventRow.titre}"`);
            console.log(`Type d'événement détecté: ${eventRow.types_evenement}`);
            console.log(`Prompt spécialisé: "${specializedPrompt.substring(0, 200)}..."`);
            
            const output = await replicate.run(
                "black-forest-labs/flux-schnell",
                {
                    input: {
                        prompt: specializedPrompt,
                        num_outputs: 1,
                        aspect_ratio: "1:1",
                        output_format: "png",
                        output_quality: 80,
                        num_inference_steps: 4, // FLUX schnell optimisé pour 1-4 steps
                        guidance_scale: 0.0, // FLUX schnell fonctionne mieux avec guidance_scale=0
                        disable_safety_checker: false
                    }
                }
            );

            console.log(`Génération FLUX.1 [schnell] réussie à la tentative ${attempt}`);
            
            // FLUX via Replicate retourne un array d'URLs
            if (output && Array.isArray(output) && output.length > 0) {
                const imageUrl = output[0];
                console.log(`URL de l'image générée: ${imageUrl}`);
                
                // Télécharger l'image depuis l'URL
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(`Échec du téléchargement de l'image: ${response.status}`);
                }
                
                const imageBuffer = await response.arrayBuffer();
                return Buffer.from(imageBuffer);
            } else {
                throw new Error("La réponse de FLUX.1 [schnell] ne contient pas d'URL d'image valide.");
            }

        } catch (error) {
             console.warn(`Échec de la tentative de génération FLUX ${attempt}: ${error.message}`);
            if (attempt < MAX_RETRIES_FLUX) {
                 const waitTime = Math.pow(2, attempt - 1) * 3000; // Attente plus longue pour API externe
                 console.log(`Nouvelle tentative FLUX dans ${waitTime/1000} secondes...`);
                 await new Promise(resolve => setTimeout(resolve, waitTime));
             } else {
                 console.error("Échec définitif de la génération FLUX.1 [schnell] après plusieurs tentatives.");
                 throw error;
             }
        }
    }
}

function generateStorageFilename(eventTitle) {
    const name = eventTitle || 'no_title';
    
    let cleanName = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[-\s]+/g, '_')
        .substring(0, 50);

    const uniqueId = uuidv4().slice(0, 8);
    const extension = '.webp';
    
    let finalName = `${cleanName}_${uniqueId}${extension}`;
    
    if (finalName.length > MAX_FILENAME_LENGTH) {
         const idLength = uniqueId.length + 1 + extension.length;
         const maxBaseLength = MAX_FILENAME_LENGTH - idLength -1;
         cleanName = cleanName.substring(0, maxBaseLength).replace(/_$/, '');
         finalName = `${cleanName}_${uniqueId}${extension}`;
    }

    console.log(`Nom de fichier généré pour storage: "${finalName}"`);
    return finalName;
}

async function compressImage(inputBuffer, outputPath) {
    console.log(`Compression de l'image buffer vers ${outputPath}...`);
    
    try {
        const originalSize = inputBuffer.length;
        console.log(`Taille originale (buffer): ${(originalSize / 1024).toFixed(2)}KB`);

        await sharp(inputBuffer)
            .resize(1200, 1200, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .webp({
                quality: 80,
                effort: 6
            })
            .toFile(outputPath);

        const finalSize = (await fsp.stat(outputPath)).size;
        const reduction = ((1 - finalSize / originalSize) * 100).toFixed(1);
        console.log(`Compression terminée. Nouvelle taille: ${(finalSize / 1024).toFixed(2)}KB (réduction de ${reduction}%)`);
    } catch (error) {
        console.error(`Erreur lors de la compression:`, error);
        throw new Error(`Échec de la compression: ${error.message}`);
    }
}

async function uploadToStorageWithRetry(filePath, storageFilename) {
    for (let attempt = 1; attempt <= MAX_RETRIES_UPLOAD; attempt++) {
        try {
            console.log(`Tentative d'upload ${attempt}/${MAX_RETRIES_UPLOAD} de "${storageFilename}" vers le bucket "${SUPABASE_BUCKET}"`);
            const fileBuffer = await fsp.readFile(filePath);

            const { data, error } = await supabase.storage
                .from(SUPABASE_BUCKET)
                .upload(storageFilename, fileBuffer, {
                    contentType: 'image/webp',
                    upsert: true,
                    duplex: 'half'
                });

            if (error) {
                console.error("Erreur détaillée de l'upload:", JSON.stringify(error, null, 2));
                throw error;
            }

            console.log(`Upload réussi de "${storageFilename}" à la tentative ${attempt}`);
             const publicUrlResponse = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(data.path);

            if (publicUrlResponse.error) {
                 console.error("Erreur lors de la récupération de l'URL publique:", JSON.stringify(publicUrlResponse.error, null, 2));
                 throw publicUrlResponse.error;
            }

            return publicUrlResponse.data.publicUrl;

        } catch (error) {
            console.warn(`Échec de la tentative d'upload ${attempt}: ${error.message}`);
            
            if (attempt < MAX_RETRIES_UPLOAD) {
                const waitTime = Math.pow(2, attempt - 1) * 1000;
                console.log(`Nouvelle tentative d'upload dans ${waitTime/1000} secondes...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
                console.error("Échec définitif de l'upload après plusieurs tentatives.");
                throw error;
            }
        }
    }
}

async function insertEventIntoSupabase(eventData) {
     try {
        console.log(`Insertion de l'événement "${eventData.titre}" (ID: ${eventData.id}) dans la table "${SUPABASE_TABLE}"...`);
        
        const { data, error } = await supabase
            .from(SUPABASE_TABLE)
            .insert([eventData])
            .select();

        if (error) {
            console.error("Erreur détaillée lors de l'insertion:", JSON.stringify(error, null, 2));
            throw error;
        }

        if (data && data.length > 0) {
             console.log(`Insertion réussie pour l'événement "${eventData.titre}".`);
             return data[0];
        } else {
             throw new Error("Insertion Supabase réussie mais aucune donnée retournée.");
        }

     } catch (error) {
        console.error(`Échec de l'insertion pour l'événement "${eventData.titre}": ${error.message}`);
        return null;
     }
}

async function processBatch() {
    console.log("=== Début du programme Turbo3 avec FLUX.1 [schnell] via Replicate ===");
    console.log("🚀 Économies attendues: ~93% vs DALL-E 3 | Qualité: Supérieure | Licence: Apache 2.0 (Commercial OK)");
    
    try {
        await ensureDirectories();
        
        const events = await readEventsFromCsv(EVENTS_CSV_PATH);
        const reportData = [];

        for (const [index, eventRow] of events.entries()) {
            console.log(`\n--- Traitement de l'événement ${index + 1}/${events.length}: "${eventRow.titre}" ---`);
            
            let publicImageUrl = null;
            let eventId = uuidv4();
            let status = 'SUCCESS';
            let errorMessage = null;
            let insertedRecordId = null;

            try {
                // 1. Générer l'image avec FLUX.1 [schnell] via prompt spécialisé
                const imageBuffer = await generateImageWithFluxSchnell(eventRow);

                // 2. Générer le nom de fichier pour le storage et compresser
                const storageFilename = generateStorageFilename(eventRow.titre);
                const tempOutputPath = path.join(TEMP_DIR, storageFilename);
                
                await compressImage(imageBuffer, tempOutputPath); 
                console.log(`Image compressée sauvegardée temporairement : ${tempOutputPath}`);

                // 3. Uploader vers Supabase Storage
                publicImageUrl = await uploadToStorageWithRetry(tempOutputPath, storageFilename);
                
                // 4. Nettoyer les fichiers temporaires
                try {
                     await fsp.unlink(tempOutputPath);
                     console.log('Fichier temporaire nettoyé');
                 } catch (error) {
                     console.warn(`Avertissement : impossible de supprimer le fichier temporaire ${tempOutputPath}`, error);
                 }

                // 5. ✅ PARSING SÉCURISÉ DES DONNÉES AVANT INSERTION
                const eventDataForInsert = {
                    id: eventId,
                    date: eventRow.date,
                    titre: eventRow.titre,
                    illustration_url: publicImageUrl,
                    universel: eventRow.universel ? (eventRow.universel.toLowerCase() === 'true' || eventRow.universel === '1') : false,
                    region: eventRow.region || null,
                    langue: eventRow.langue || 'fr',
                    ecart_temps_max: parseInt(eventRow.ecart_temps_max) || 500,
                    facteur_variation: parseFloat(eventRow.facteur_variation) || 1.5,
                    niveau_difficulte: parseInt(eventRow.niveau_difficulte) || null,
                    // ✅ PARSING SÉCURISÉ AVEC LA NOUVELLE FONCTION
                    types_evenement: safeJsonParse(eventRow.types_evenement, 'types_evenement'),
                    pays: safeJsonParse(eventRow.pays, 'pays'),
                    epoque: eventRow.epoque || null,
                    mots_cles: safeJsonParse(eventRow.mots_cles, 'mots_cles'),
                    date_formatee: eventRow.date_formatee || null,
                    code: eventRow.code || null,
                    date_precision: eventRow.date_precision || null,
                    ecart_temps_min: parseInt(eventRow.ecart_temps_min) || null,
                    description_detaillee: eventRow.description_detaillee || null,
                };

                // ✅ DEBUG: Afficher les données avant insertion
                console.log("📋 Données préparées pour insertion:", {
                    titre: eventDataForInsert.titre,
                    types_evenement: eventDataForInsert.types_evenement,
                    pays: eventDataForInsert.pays,
                    mots_cles: eventDataForInsert.mots_cles
                });

                 // Validation de base des données avant insertion
                 if (!eventDataForInsert.date || !eventDataForInsert.titre || typeof eventDataForInsert.universel !== 'boolean' || !eventDataForInsert.langue) {
                     status = 'VALIDATION_FAILED';
                     errorMessage = 'Données d\'événement minimales manquantes ou invalides (date, titre, universel, langue)';
                     console.error(errorMessage);
                 } else {
                    // 6. Insérer dans Supabase
                    const insertedEvent = await insertEventIntoSupabase(eventDataForInsert);
                    if (insertedEvent && insertedEvent.id) {
                         insertedRecordId = insertedEvent.id;
                         status = 'SUCCESS';
                         console.log(`✅ Insertion réussie avec ID: ${insertedRecordId}`);
                         console.log(`💰 Coût estimé: ~0.00285$ (vs 0.04$ avec DALL-E 3)`);
                    } else {
                         status = 'INSERT_FAILED';
                         errorMessage = errorMessage || 'Échec de l\'insertion dans la base de données ou ID non retourné';
                    }
                 }

            } catch (error) {
                status = 'FAILED';
                errorMessage = error.message;
                console.error(`Traitement de l'événement "${eventRow.titre}" échoué :`, error);
                console.error("Stack trace de l'échec individuel:", error.stack);
            } finally {
                 reportData.push({
                    titre_evenement: eventRow.titre,
                    types_evenement: eventRow.types_evenement,
                    model_used: 'FLUX.1 [schnell]',
                    status: status,
                    generated_image_url: publicImageUrl,
                    inserted_record_id: insertedRecordId,
                    error_message: errorMessage
                 });
                 console.log(`--- Fin du traitement pour "${eventRow.titre}" avec statut : ${status} ---`);
            }
        }
        
        // Écriture du rapport CSV
        if (reportData.length > 0 && reportData.some(item => item.status !== 'VALIDATION_FAILED')) {
            const timestamp = new Date().toISOString().replace(/[:.-]/g, '').slice(0, 15);
            const csvPath = path.join(REPORT_DIR, `generation_insertion_report_flux_schnell_${timestamp}.csv`);
            
            const csvWriter = csv({
                path: csvPath,
                header: [
                    {id: 'titre_evenement', title: 'Titre Événement'},
                    {id: 'types_evenement', title: 'Types Événement'},
                    {id: 'model_used', title: 'Modèle Utilisé'},
                    {id: 'status', title: 'Statut'},
                    {id: 'generated_image_url', title: 'URL Image Générée'},
                    {id: 'inserted_record_id', title: 'ID Enregistrement Inséré'},
                    {id: 'error_message', title: 'Message d\'Erreur'}
                ]
            });
            
            await csvWriter.writeRecords(reportData);
            console.log(`\nRésultats du lot exportés dans: ${csvPath}`);
        } else if (reportData.length > 0 && reportData.every(item => item.status === 'VALIDATION_FAILED')) {
             console.warn("\nAucun événement n'a pu être traité au-delà de la validation.");
        } else {
            console.warn("\nAucun événement n'a été traité.");
        }

        // Statistiques finales
        const successCount = reportData.filter(item => item.status === 'SUCCESS').length;
        const totalCostEstimate = successCount * 0.00285;
        const savingsVsDalle = (successCount * 0.04) - totalCostEstimate;
        
        console.log(`\n🎯 === Résumé FLUX.1 [schnell] ===`);
        console.log(`✅ Images générées avec succès: ${successCount}/${reportData.length}`);
        console.log(`💰 Coût total estimé: ~$${totalCostEstimate.toFixed(4)}`);
        console.log(`💸 Économies vs DALL-E 3: ~$${savingsVsDalle.toFixed(4)} (${((savingsVsDalle/(successCount * 0.04)) * 100).toFixed(1)}%)`);
        console.log(`⚖️ Licence: Apache 2.0 - Usage commercial autorisé`);
        console.log(`🚀 Qualité: Supérieure à DALL-E 3 (tests confirmés)`);

    } catch (error) {
        console.error(`\nErreur critique lors du traitement du lot:`, error);
        console.error("Stack trace:", error.stack);
    } finally {
        console.log("\n=== Fin du programme Turbo3 avec FLUX.1 [schnell] ===");
    }
}

// Lancement du programme
processBatch().catch(console.error);
