import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const corrections = [
    { id: 'a6bb9584-9ddb-48b2-a097-f202ce9bfdd0', titre: 'Déraillement du train de troupes de Saint-Valery-en-Caux' },
    { id: 'e76ece99-4fbf-457b-a2da-cf02389a39cf', titre: 'Révolte des Ciompi à Florence' },
    { id: 'fecf09c7-5004-441f-bf31-86cf6b07414f', titre: 'Condamnation du bellicisme par Martin de Tours' },
    { id: '660ef028-f95f-48ca-a915-1949a5a9dc4a', titre: 'Mort de la reine Catherine de Médicis' },
    { id: '42bdd672-1e22-4dc0-bfe0-bf140853e10f', titre: 'Élection de Simone Veil à la présidence du Parlement européen' },
    { id: '6b6fe8cc-d88d-495b-aaf5-b1f475b19981', titre: "Fondation de l'Ordre des Béghards" },
    { id: '505a5ab8-59c2-4dbe-b0be-da8749da7f6f', titre: 'Référendum français sur le traité de Maastricht' },
    { id: '50a4c1d1-72b6-4cbc-a349-12c71823f32a', titre: "Discours de Dominique de Villepin à l'ONU contre la guerre d'Irak" },
    { id: 'ca68a266-fbd5-444b-854c-190564ee0a22', titre: "Mariage d'Isabelle de France et d'Édouard II d'Angleterre à Boulogne" },
    { id: '094c94bd-fadf-4508-96f8-9f34a70a5e93', titre: 'Mariage de Louis XV et de Marie Leszczyńska à Fontainebleau' },
    { id: 'e47539fb-64f9-47ec-b958-52f5664dfe60', titre: 'Siège de Philippsburg pendant la guerre de Succession de Pologne' },
    { id: '163c0889-b456-4271-b00f-cb172c335c03', titre: 'Premier siège de Rhodes par les troupes ottomanes de Mehmet II' },
    { id: '82ea02cb-e12d-4331-a9a2-da64010ad6b5', titre: "Institution de la Trêve de Dieu au concile d'Elne" }
];

async function run() {
    console.log("🚀 Lancement des mises à jour...");
    for (const item of corrections) {
        const { error } = await supabase
            .from('evenements')
            .update({ titre: item.titre, updated_at: new Date().toISOString() })
            .eq('id', item.id);
        
        if (error) console.error(`❌ Erreur pour ${item.id}:`, error.message);
        else console.log(`✅ Mis à jour : ${item.titre}`);
    }
    console.log("🏁 Mises à jour terminées.");
}

run();
