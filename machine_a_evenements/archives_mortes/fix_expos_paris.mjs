import { getSupabase } from './AGENTS/shared_utils.mjs';

const supabase = getSupabase('prod');

async function fixExpos() {
    console.log("🛠️  Mise à jour des Expositions Universelles de Paris...");

    const { data: expos, error } = await supabase
        .from('evenements')
        .select('id, titre, date')
        .ilike('titre', '%Exposition universelle%Paris%')
        .order('date', { ascending: true });

    if (error) {
        console.error("❌ Erreur:", error.message);
        return;
    }

    if (!expos || expos.length === 0) {
        console.log("❓ Aucune exposition trouvée.");
        return;
    }

    console.log(`📊 ${expos.length} expositions trouvées.`);

    const ordinals = [
        "Première", "Deuxième", "Troisième", "Quatrième", "Cinquième",
        "Sixième", "Septième", "Huitième"
    ];

    for (let i = 0; i < expos.length; i++) {
        const expo = expos[i];
        const newTitle = `${ordinals[i]} exposition universelle de Paris`;

        console.log(`📝 Mise à jour ID ${expo.id}: "${expo.titre}" [${expo.date}] -> "${newTitle}"`);

        const { error: updateError } = await supabase
            .from('evenements')
            .update({ titre: newTitle })
            .eq('id', expo.id);

        if (updateError) {
            console.error(`❌ Erreur mise à jour ID ${expo.id}:`, updateError.message);
        } else {
            console.log(`✅ ID ${expo.id} mis à jour.`);
        }
    }

    console.log("🏁 Toutes les expositions ont été renommées.");
}

fixExpos();
