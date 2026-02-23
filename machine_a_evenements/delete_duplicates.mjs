import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function deleteDuplicates() {
    const idsToDelete = [
        "e2d81317-4a13-445d-a63e-4cbf04ecfaa9", // Concini (Wrong date)
        "b47305fe-cedb-4e5f-9d76-4b5a19f34a2d", // Palais des Papes (Old duplicate)
        "e4945ec1-f8d7-47fa-a030-c3e5b72e7086", // Guerre de 30 ans (Wrong date)
        "3c079cdb-1c11-4cba-9f69-4d3d46065f38", // Auguste (Vague date)
        "54a7661e-2e8a-4f17-98a2-f962e23bbc8d", // Jamestown (Old duplicate)
        "fb2d0817-d23a-4742-8665-29254561aa81", // Téméraire (Vague date)
        "b00ef62d-e44f-4f9b-bc2f-109b2c218562", // Claude (Vague date)
        "b4dd32e2-6994-4bd9-908b-1412e114ec90", // Louis XIV (Wrong date)
        "6ca9b77b-ffcb-49bc-ab82-2c6f5f30321f", // Mme de La Fayette (Wrong date)
        "30336d9b-8d09-422d-aba3-a3f023a7ac8f"  // Saint Louis (Vague date)
    ];

    console.log(`🗑️ Deleting ${idsToDelete.length} duplicate/incorrect events...`);

    const { error } = await supabase
        .from('evenements')
        .delete()
        .in('id', idsToDelete);

    if (error) {
        console.error("❌ Error deleting events:", error.message);
    } else {
        console.log("✅ Successfully deleted 10 duplicates.");
    }
}

deleteDuplicates();
