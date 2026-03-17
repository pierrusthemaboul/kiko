import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const TARGETS = [
    {
        id: "e5735fb8-0ebf-4e22-ac4e-12fd5fdb20f2",
        titre: "Loi Neuwirth",
        localPath: path.join(__dirname, 'batch_corrections', 'loi_neuwirth_sur_la_contraception_e5735fb8-0ebf-4e22-ac4e-12fd5fdb20f2.png')
    },
    {
        id: "c7bfd033-aacb-4856-9c1a-833c2215c139",
        titre: "Traité de Rome",
        localPath: path.join(__dirname, 'batch_corrections', 'trait__de_rome_c7bfd033-aacb-4856-9c1a-833c2215c139.png')
    },
    {
        id: "1a3745cc-918c-4e02-afcf-ca2c0bd1870f",
        titre: "CITES V5",
        localPath: path.join(__dirname, 'test_cites_v5.png')
    }
];

async function uploadToProduction() {
    console.log("🚀 Mise en production des 3 images de test...");

    for (const target of TARGETS) {
        console.log(`\n📦 Traitement de : ${target.titre} (ID: ${target.id})`);

        try {
            const fileBuffer = await fs.readFile(target.localPath);
            const fileName = `migrated_${target.titre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.webp`;
            
            // On convertit en webp pour la prod (plus léger) si nécessaire mais ici on va garder la qualité originale ou utiliser sharp
            // Pour simplifier, on upload le PNG tel quel ou on fait une conversion rapide.
            // On va utiliser le buffer direct en spécifiant le type.
            
            console.log(`📤 Upload vers Supabase Storage...`);
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('evenements-image')
                .upload(fileName, fileBuffer, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;
            console.log(`🔗 URL Publique : ${publicUrl}`);

            console.log(`📝 Mise à jour de la base de données...`);
            const { error: updateError } = await supabase
                .from('evenements')
                .update({ 
                    illustration_url: publicUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', target.id);

            if (updateError) throw updateError;

            console.log(`✅ ${target.titre} est maintenant en PRODUCTION !`);
        } catch (error) {
            console.error(`❌ Échec pour ${target.titre}:`, error.message);
        }
    }
}

uploadToProduction().catch(console.error);

