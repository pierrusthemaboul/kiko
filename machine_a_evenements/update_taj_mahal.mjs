import { getSupabase } from './AGENTS/shared_utils.mjs';

async function updateTestEvent() {
    const supabase = getSupabase();

    // On met à jour le Taj Mahal avec une description "Optimisée Flux Schnell"
    const newDescription = "Thousands of skilled marble masons and artisans gather at the vast construction site of the Taj Mahal in Agra. They are meticulously carving complex floral patterns into large slabs of brilliant white marble that glow under the intense midday Indian sun. The massive base of the mausoleum is surrounded by an intricate web of bamboo scaffolding. The air is filled with white marble dust and the rhythmic sound of chisels, capturing an atmosphere of grand architectural ambition.";

    const { error } = await supabase
        .from('queue_sevent')
        .update({
            description: newDescription,
            type: 'Construction' // S'assurer que le type est bon
        })
        .eq('titre', 'Construction du Taj Mahal');

    if (error) {
        console.error('Error updating Taj Mahal:', error);
    } else {
        console.log('✅ Taj Mahal updated with Flux-optimized description.');
    }
}

updateTestEvent();
