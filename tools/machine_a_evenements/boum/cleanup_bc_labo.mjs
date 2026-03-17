import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const localDb = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { count: beforeCount, error: beforeErr } = await localDb
    .from('labo')
    .select('*', { count: 'exact', head: true })
    .lt('year', 1);

  if (beforeErr) throw beforeErr;

  console.log(`BC rows in labo (year < 1) before delete: ${beforeCount ?? 0}`);

  if (!beforeCount || beforeCount === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const { error: delErr } = await localDb
    .from('labo')
    .delete()
    .lt('year', 1);

  if (delErr) throw delErr;

  const { count: afterCount, error: afterErr } = await localDb
    .from('labo')
    .select('*', { count: 'exact', head: true })
    .lt('year', 1);

  if (afterErr) throw afterErr;

  console.log(`BC rows in labo (year < 1) after delete: ${afterCount ?? 0}`);
}

main().catch((e) => {
  console.error('Cleanup failed:', e?.message || e);
  process.exit(1);
});

