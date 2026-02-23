
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const __dirname_shared = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname_shared, '../../.env') });

import sharp from 'sharp';

export function getSupabase(env = 'local') {
    if (env === 'prod') {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
        return createClient(url, key);
    }
    // Par défaut : Local
    return createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function uploadImageToSupabase(supabase, imageUrl, eventTitle) {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer();
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
        .webp({ quality: 85 })
        .resize(1024, 576, { fit: 'cover' }) // Format 16:9
        .toBuffer();

    const fileName = `chambre_noire_${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)}_${Date.now()}.webp`;

    const { error } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, processedBuffer, {
            contentType: 'image/webp',
            upsert: true
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName);

    return publicUrl;
}

export function logDecision(agentName, action, inputs, decision, reason, outputs = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        agent: agentName,
        action,
        inputs,
        decision,
        reason,
        outputs
    };

    const logDir = path.join(__dirname_shared, agentName, 'STORAGE/LOGS');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    const logFile = path.join(logDir, `log_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(entry, null, 2));

    console.log(`[${agentName}] ${action}: ${decision} - ${reason}`);
    return entry;
}
