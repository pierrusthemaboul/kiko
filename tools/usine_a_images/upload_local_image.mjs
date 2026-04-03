import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Erreur : Variables d'environnement manquantes (SUPABASE_URL ou SERVICE_ROLE_KEY)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function uploadLocalImage(filePath, eventId, sourceTable = 'evenements') {
    try {
        console.log(`🚀 Traitement de l'image : ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Le fichier n'existe pas : ${filePath}`);
        }

        // 1. Lire et compresser avec Sharp
        const buffer = await sharp(filePath)
            .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        console.log(`✅ Image compressée (Taille : ${(buffer.length / 1024).toFixed(2)} KB)`);

        // 2. Préparer le nom du fichier
        const ext = '.webp';
        const fileName = `manual_${eventId}_${Date.now()}${ext}`;

        // 3. Upload sur Supabase Storage
        console.log(`📤 Upload vers le bucket 'evenements-image'...`);
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('evenements-image')
            .upload(fileName, buffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 4. Récupérer l'URL publique
        const { data: { publicUrl } } = supabase.storage
            .from('evenements-image')
            .getPublicUrl(fileName);

        console.log(`🔗 URL Publique : ${publicUrl}`);

        // 5. Mettre à jour la base de données
        console.log(`💾 Mise à jour de la table '${sourceTable}' pour l'ID ${eventId}...`);
        const { error: dbError } = await supabase
            .from(sourceTable)
            .update({ illustration_url: publicUrl })
            .eq('id', eventId);

        if (dbError) throw dbError;

        console.log(`✨ Terminé avec succès ! L'image de l'événement a été mise à jour.`);
        return publicUrl;

    } catch (error) {
        console.error(`❌ Erreur lors de l'upload :`, error.message);
        process.exit(1);
    }
}

// Extraction des arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log(`Usage: node tools/usine_a_images/upload_local_image.mjs <chemin_image> <id_evenement> [table_cible]`);
    console.log(`Exemple: node tools/usine_a_images/upload_local_image.mjs imagesint/ma_belle_image.jpg 123e4567-e89b-12d3-a456-426614174000`);
    process.exit(0);
}

const [filePath, eventId, sourceTable] = args;
uploadLocalImage(filePath, eventId, sourceTable || 'evenements');
