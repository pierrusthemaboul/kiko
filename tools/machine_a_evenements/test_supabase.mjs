import { getSupabase } from './AGENTS/shared_utils.mjs';
try {
    const supabase = getSupabase('prod');
    console.log('Supabase Loaded Successfully');
    process.exit(0);
} catch (e) {
    console.error(e.message);
    process.exit(1);
}
