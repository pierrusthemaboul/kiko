
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Credentials Local
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const local = createClient(LOCAL_URL, LOCAL_KEY);

const eventsToRecover = [
    { titre: "Invasion de l'Ukraine par la Russie", year: 2022, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_invasion_de_l_ukraine_par_la_r_1770585670684.webp" },
    { titre: "Référendum sur le Brexit", year: 2016, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_r_f_rendum_sur_le_brexit_1770585686972.webp" },
    { titre: "Indépendance du Congo belge", year: 1960, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_ind_pendance_du_congo_belge_1770585695298.webp" },
    { titre: "Signature du Civil Rights Act aux États-Unis", year: 1964, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_signature_du_civil_rights_act__1770585703254.webp" },
    { titre: "Invasion du Koweït par l'Irak", year: 1990, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_invasion_du_kowe_t_par_l_irak_1770585720506.webp" },
    { titre: "Guerre civile en Bosnie-Herzégovine", year: 1992, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_guerre_civile_en_bosnie_herz_g_1770585728579.webp" },
    { titre: "Fin de la guerre du Biafra", year: 1970, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_fin_de_la_guerre_du_biafra_1770585736186.webp" },
    { titre: "Mort de Charles le Téméraire", year: 1477, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_mort_de_charles_le_t_m_raire_1770585768868.webp" },
    { titre: "Mort de Claude", year: 54, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_mort_de_claude_1770585777343.webp" },
    { titre: "Décès d'Auguste", year: 14, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_d_c_s_d_auguste_1770585785131.webp" },
    { titre: "Mort de Madame de La Fayette", year: 1694, url: "https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/chambre_noire_mort_de_madame_de_la_fayette_1770585792709.webp" }
];

async function recover() {
    console.log(`🔧 Récupération de ${eventsToRecover.length} événements "perdus"...`);

    for (const ev of eventsToRecover) {
        console.log(`📥 Staging : ${ev.titre} (${ev.year})...`);
        const { error } = await local
            .from('goju2')
            .insert([{
                titre: ev.titre,
                date: `${ev.year.toString().padStart(4, '0')}-01-01`,
                // date_formatee supprimé car absent du schéma local
                illustration_url: ev.url,
                description_detaillee: `Événement historique : ${ev.titre}.`,
                types_evenement: ['Historique'],
                notoriete: 50,
                transferred: false
            }]);

        if (error) {
            console.error(`❌ Erreur pour ${ev.titre}:`, error.message);
        } else {
            console.log(`✅ ${ev.titre} sauvegardé dans goju2.`);
        }
    }
    console.log("\n✨ Récupération terminée. Tu peux maintenant lancer 'migration' !");
}

recover();
