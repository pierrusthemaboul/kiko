import Replicate from 'replicate';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const ICONIC_REPAIRS = [
    {
        id: "589781bf-380d-4326-ad72-fcb3055e964e",
        titre: "Poujadisme (1955) - Grève Fiscale",
        prompt: "Cinematic 1950s French street scene. Close-up of a small village stationery shop ('Papeterie') with its heavy iron shutters closed. A hand-painted wooden sign hangs on the door: 'GREVE FISCALE' in rough black letters. Muddy cobblestones, overcast moody morning light. No dates, no 2017 text. Gritty, realistic 16mm film texture. 1024x576."
    },
    {
        id: "9d948699-22b5-4dec-92b6-b74c487922c6",
        titre: "Naissance de Richelieu (1585)",
        prompt: "Powerful, symbolic portrait of a young child (premonitory Richelieu) sitting in a dark, ornate 16th-century noble interior. The child's shadow on the stone wall behind him takes the distinct, sharp silhouette of the Cardinal's profile with his iconic hat. Intricate lace collar, dark velvet fabrics, dramatic Rembrandt lighting from a side window. 1024x576."
    },
    {
        id: "1b83c653-6194-4d64-a195-c5ad1a700fb4",
        titre: "Richelieu au Conseil du Roi (1624)",
        prompt: "Iconic, intense portrait of Cardinal Richelieu at the King's council table. He is wearing his vibrant red cardinal robes. His gaze is sharp and commanding, filled with political genius. Dark, moody council chamber with candles illuminating his face and the heavy oak table. One hand rests on a map of France. No parchment focus. Cinematic masterpiece, 1024x576."
    },
    {
        id: "a31b0c33-83d6-44ae-9186-b0e37a305e40",
        titre: "Traité de Loudun (1616) - La Rupture",
        prompt: "Tense historical scene in 1616. Close-up of two rival noble hands sheathing their heavy rapiers simultaneously across a dark table, as a sign of a fragile truce. The ornate hilts of the swords reflect the cold light. A sense of mutual distrust and suppressed violence. No parchemins, no seals. High-contrast, gritty 17th-century atmosphere. 1024x576."
    }
];

async function runIconicRepair() {
    console.log("🎨 Exécution de la Réparation 'Personnages & Variété' (V2.3)...");
    for (const event of ICONIC_REPAIRS) {
        console.log(`\n🖌️ Génération V2.3 : ${event.titre}`);
        
        const output = await replicate.run("black-forest-labs/flux-schnell", {
            input: { prompt: event.prompt, aspect_ratio: "16:9" }
        });
        const imageUrl = Array.isArray(output) ? output[0] : output;
        
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const fileName = `iconic_v23_${event.id}_${Date.now()}.webp`;
        
        await supabase.storage.from('evenements-image').upload(fileName, buffer, { contentType: 'image/webp' });
        const publicUrl = supabase.storage.from('evenements-image').getPublicUrl(fileName).data.publicUrl;

        await supabase.from('evenements').update({ illustration_url: publicUrl }).eq('id', event.id);

        console.log(`✅ SUCCÈS : ${publicUrl}`);
    }
}

runIconicRepair().catch(console.error);

