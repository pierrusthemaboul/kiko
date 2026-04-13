import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Chargement explicite du .env depuis la racine
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '..', '.env');

console.log('🔍 DEBUG .env');
console.log('Chemin du .env:', envPath);

const result = dotenv.config({ path: envPath });
console.log('Résultat dotenv:', result.error || '✅ Chargé');

console.log('\n📋 Variables Supabase trouvées:');
Object.keys(process.env).filter(key => key.toLowerCase().includes('supabase')).forEach(key => {
    console.log(`${key}: ${process.env[key] ? '✅' : '❌'}`);
});

console.log('\n📋 Toutes les variables (premières):');
Object.keys(process.env).slice(0, 10).forEach(key => {
    console.log(`${key}: ${key.includes('KEY') ? '***' : process.env[key]}`);
});
