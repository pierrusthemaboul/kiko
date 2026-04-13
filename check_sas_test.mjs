import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSasTest() {
  const { data, error } = await supabase
    .from('sas_test')
    .select('titre, theme, notoriete_fr, date')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching sas_test:", error.message);
    return;
  }

  console.log("=== DERNIERS ÉVÉNEMENTS DANS SAS_TEST ===");
  data.forEach((evt, idx) => {
    console.log(`[${idx+1}] ${evt.titre}`);
    console.log(`    Date: ${evt.date} | Notoriété FR: ${evt.notoriete_fr}/100`);
    console.log(`    Thème: ${evt.theme}`);
    console.log('-----------------------------------------');
  });
}

checkSasTest();
