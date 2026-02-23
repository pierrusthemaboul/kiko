import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Restoration mapping: Object mapping the current (bad/changed) title back to what it originally was
// From first run:
const run1 = {
    "Siège de Mézières par Bayard": "Siège de Mézières (Bayard)",
    "Création du moulin à vent de Weedley": "Création de moulin à vent de Weedley",
    "Arrestation d'Eichmann à Buenos Aires": "Arrestation d'Eichmann (Buenos Aires)",
    "Arrestation de Pinochet à Londres": "Arrestation de Pinochet (Londres)",
    "Crise financière bancaire américaine de 1857": "Crise de 1857 (crise financière mondiale)",
    "Première Coupe du monde de football en Uruguay": "Première Coupe du monde de football",
    "Bataille de Beyrouth durant l'opération Paix en Galilée": "Bataille de Beyrouth-Ouest",
    "Construction du palais carolingien d'Aix-la-Chapelle": "Construction du palais d'Aix-la-Chapelle (c. 794)",
    "Première translation des reliques de Saint-Martin": "Translation des reliques de Saint-Martin",
    "Entrée en guerre des États-Unis": "Entrée en guerre des États-Unis dans la Première Guerre mondiale",
    "Naufrage de l'Erika entraînant une grave pollution des côtes françaises": "Naufrage d'un pétrolier entraînant une grave pollution des côtes françaises",
    "Collision entre deux rames du RER C à Issy-les-Moulineaux": "Collision entre deux rames du RER C dans la région parisienne",
    "Accord commercial entre Venise et le Sultan Qala'ûn": "Accord commercial entre Venise et le Sultanat Mamelouk",
    "Catastrophe ferroviaire de Melun": "Catastrophe ferroviaire de Melun (France)",
    "Traité de Bautzen entre Bolesław et le Saint-Empire": "Traité de Bautzen entre Pologne et Saint-Empire",
    "Grève des métallurgistes de Rateau à La Courneuve": "Grève des métallurgistes de Rateau",
    "Mort de François d'Anjou, Duc d'Alençon": "Mort de François d'Anjou",
    "Signature du traité d'interdiction des essais nucléaires partiels": "Signature du traité d'interdiction des essais nucléaires",
    "Interdiction du PCF par Daladier": "Interdiction du Parti communiste français",
    "Traité de Troyes imposant Henri V": "Traité de Troyes (Charles VI)"
};

// From second run
const run2 = {
    "Premiers esclaves africains déportés vers le Nouveau Monde": "Premiers esclaves africains arrivés dans le Nouveau Monde",
    "Première croisade en Terre sainte": "Première croisade",
    "Première de l'Affaire des Fiches": "Guerre du Liban", // (Was "Guerre du liban" initially before being changed twice)
    "Première Création du Secrétariat d'État à la Condition féminine": "Création du Secrétariat d'État à la Condition féminine",
    "Première bataille de Brémule": "Bataille de Brémule",
    "Première Loi d'amnistie": "Loi d'amnistie de 1981",
    "Réhabilitation posthume de Jeanne d'Arc par Charles VII": "Réhabilitation posthume de Jeanne d'Arc",
    "Première Création de l'ICANN": "Création de l'ICANN",
    "Première Création de l'Université de Barcelone": "Création de l'Université de Barcelone par Alphonse V",
    "Premier Séisme dévastateur d'Agadir": "Séisme dévastateur d'Agadir au Maroc",
    "Première Seconde guerre du Liban": "Seconde guerre du Liban",
    "Génocide des Arméniens de l'Empire Ottoman": "Génocide arménien",
    "Crise politique du 16 mai sous Mac Mahon": "Crise du 16 mai 1877",
    "Première Abdication de Napoléon Ier": "Abdication de Napoléon Ier",
    "Première retransmission télévisée en France": "Première retransmission télévisée française",
    "Trajan devient Empereur Romain": "Trajan Devient Empereur",
    "Élection de Raymond Poincaré à la présidence du Conseil": "Election de Raymond Poincaré à la présidence du Conseil",
    "Première victoire de l'équipe de France en Coupe du Monde": "Première victoire de l'équipe de France à la Coupe du Monde",
    "Modernisation de la Constitution française sous Sarkozy": "Modernisation de la Constitution française",
    "Brunelleschi débute la construction du Dôme de Florence": "Début de la construction du Dôme de Florence par Brunelleschi",
    "Mariage de Robert II avec Berthe de Bourgogne": "Mariage de Berthe de Bourgogne et Robert II",
    "Victoire de Charles Martel à la bataille de Poitiers": "Victoire de Charles Martel à la bataille de Poitiers contre les Omeyyades",
    "Victoire de Charles Martel sur Chilpéric II à Soissons": "Victoire de Charles Martel sur Chilpéric II et Eudes d'Aquitaine à Soissons",
    "Création de la RTF en France": "Création de la RTF",
    "Renversement de l’Empire allemand par la révolution allemande": "Renversement de l’Empire allemand par la révolution de novembre",
    "Bataille de Wagram": "Bataille de Wagram (France/Autriche)",
    "Loi sur les apparentements en France (législatives)": "Loi sur les apparentements en France",
    "Affaire du sang contaminé en France – premiers verdicts": "Affaire du sang contaminé en France – verdicts",
    "Bataille de la Kalka (Invasion mongole)": "Bataille de la Kalka",
    "Guerre des Paysans": "Guerre des Paysans allemands"
};

async function rollbackDB() {
    const allFixes = { ...run1, ...run2 };
    let restoredCount = 0;

    for (let badTitle in allFixes) {
        const originalTitle = allFixes[badTitle];
        const { error } = await supabase.from('evenements').update({ titre: originalTitle }).eq('titre', badTitle);
        if (!error) {
            console.log(`✅ Restauré : "${originalTitle}"`);
            restoredCount++;
        } else {
            console.log(`❌ Erreur sur : "${originalTitle}"`, error);
        }
    }
    console.log(`\n🎉 Rollback complet : ${restoredCount} titres restaurés à leur état d'origine.`);
}

rollbackDB();
