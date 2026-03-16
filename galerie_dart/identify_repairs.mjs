import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const TITRES_CIBLES = [
    "Édit d'Amboise", "Accords de Genève sur l'Indochine", "Adoption du premier Naturalization Act aux États-Unis",
    "Traité d'Aix-la-Chapelle (fin de la guerre de Succession d'Autriche)", "Création du CNRS",
    "Retraites ouvrières et paysannes", "Signature du traité d'Entrammes", "Partenariat transpacifique (TPP) négociations lancées",
    "Loi Gayssot sur le négationnisme", "Accords de Locarno", "Victoire travailliste en Nouvelle-Zélande",
    "Concile d’Agde réunion ecclésiastique importante en Gaule wisigothique", "Loi d'amnistie de 1981",
    "Réhabilitation posthume de Jeanne d'Arc", "Pacte franco-soviétique", "Traité de Madrid", "Création de l'ANPE",
    "Modernisation de la Constitution française", "Naissance du mouvement poujadiste", "Création de l’OAS",
    "Accords SALT", "Création des Croix de Feu", "Lois Niel de réforme militaire", "Droit de vote des femmes au Royaume-Uni",
    "Inauguration du Pont Jacques-Gabriel à Blois", "Première réunion des États généraux",
    "Fondation de la Société protectrice des animaux (France)", "Traité de Sèvres", "Naissance de Richelieu",
    "Le traité de Loudun met fin à la révolte des princes", "Nomination du cardinal de Richelieu au Conseil du roi",
    "Scrutin anticipé qui fragilise la majorité gaulliste", "Loi de séparation des Églises et de l'État",
    "Empire des Gaules", "Concile de Niceé, première réunion œcuménique du christianisme", "Adoption de la Convention CITES",
    "Création du CNIL", "Traité Hay-Bunau-Varilla", "Privilèges commerciaux accordés à Marseille par Toulouse",
    "French Opposition to the 2003 Iraq War", "Loi sur le Glass-Steagall Act aux États-Unis", "Fondation du Ku Klux Klan",
    "Dissolution de l'Assemblée nationale française de 1997", "Création du Comité de salut public",
    "Accord de libre-échange continental africain (AfCFTA)", "Signature du Civil Rights Act aux États-Unis",
    "Création du Revenu minimum d’insertion", "Traité de Vienne et reconnaissance de la Pragmatique Sanction",
    "Assassinat de Chilpéric Ier", "Fin de la croisade contre les Albigeois", "Paix de Cateau-Cambrésis",
    "Entrevue du Camp du Drap d'Or", "Édit de Caracalla", "Loi pour l’économie sociale et solidaire",
    "Traité de Ribemont fixant la frontière entre la France et la Germanie", "Premières manifestations étudiantes contre la loi Devaquet",
    "Accords du Latran", "Colloque de Poissy", "Création de la IVe République", "Premier feu de circulation au monde",
    "Retrait de l'Allemagne de la SDN", "Réforme des régimes matrimoniaux donnant l’autonomie aux épouses",
    "Création du Ministère de la Mer", "Création du royaume de Bourgogne", "Scandale du sang contaminé – procès"
];

async function identifyTargets() {
    console.log("🔍 Identification des 64 cibles dans Supabase...");
    
    let targets = [];
    for (const titre of TITRES_CIBLES) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date, description_detaillee')
            .ilike('titre', `%${titre}%`)
            .limit(1);
            
        if (data && data[0]) {
            targets.push(data[0]);
            console.log(`✅ Trouvé : ${data[0].titre}`);
        } else {
            console.warn(`⚠️ Non trouvé : ${titre}`);
        }
    }
    
    await fs.writeFile(path.join(__dirname, 'reparation_targets.json'), JSON.stringify(targets, null, 2));
    console.log(`\n💾 ${targets.length} cibles enregistrées dans reparation_targets.json`);
}

identifyTargets().catch(console.error);
