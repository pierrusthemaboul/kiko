import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TO_DELETE = [
    "f29f11b4-4ae1-40ce-ab41-75f2a84c4575", // Succession Pologne 1733 (doublon)
    "d10e78fb-4350-44d8-88ff-22884f7ed7c3", // Photo 1827 (Niépce c'est 1826)
    "ebe025e9-c27b-46d9-b559-2ece255b9516", // Expo Universelle 1855 (on garde 1878 ou on gère les dates multiples? L'utilisateur dit confusion, donc on nettoie)
    "e91309cd-455b-459b-a1ec-2cbea5006b23", // Succession Espagne 1701 (on garde 1702)
    "ecd0383d-d247-4e28-91a8-4f059ed3c840", // Académie française 1634 (sacrement 1635)
    "47002aff-e66c-4512-927e-188ebda7d0cb", // Edit Compiègne (doublon parfait)
    "a0fbb24f-693a-4929-8ef3-3b5680259185", // Mariage Louis XIII 1601 (il avait 0 ans... vrai date 1615)
    "a73997d7-a58a-46c9-aef9-a62b0533c462", // Constantinople 1454 (vrai date 1453)
    "595ca01c-34d1-4a17-b8e6-151d56193735", // Fontenoy 1744 (vrai date 1745)
    "89b3e66a-a4d2-4f41-a8fc-e080a1469f90", // St Martin 473 (on garde 561)
    "ed6a2835-e041-45ed-989a-a2a7b9cdf0a7", // Marignan 1514 (Erreur, c'est 1515)
    "941cc7fa-a9b0-4c9b-95cc-f78eba789e7b"  // Provence 1482 (on garde 1481)
];

async function cleanup() {
    console.log(`Suppression de ${TO_DELETE.length} erreurs/doublons...`);
    const { error } = await supabase.from('evenements').delete().in('id', TO_DELETE);
    if (error) console.error(error);
    else console.log("✅ Nettoyage terminé.");
}

cleanup();
