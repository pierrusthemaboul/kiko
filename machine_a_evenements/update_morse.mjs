import { getSupabase } from './AGENTS/shared_utils.mjs';

async function updateMorse() {
    const supabase = getSupabase();

    // On met à jour le Télégraphe avec une description "Optimisée Flux Schnell" (Artisan New Style)
    const newDescription = "Inside a dimly lit 1837 workshop filled with brass scientific instruments and tangled copper wires, Samuel Morse leans intently over a cluttered wooden table. He is meticulously adjusting a primitive telegraph prototype, his face partially illuminated by the warm glow of oil lamps and occasional sparks from early chemical batteries. The background features tall mahogany cabinets and scattered parchment diagrams. The scene captures the gritty atmosphere of a major scientific breakthrough.";

    // On isole l'événement pour le test
    await supabase.from('queue_sevent').update({ status: 'done' }).neq('titre', 'Invention du télégraphe électrique');

    const { error } = await supabase
        .from('queue_sevent')
        .update({
            description: newDescription,
            status: 'pending'
        })
        .eq('titre', 'Invention du télégraphe électrique');

    if (error) {
        console.error('Error updating Morse:', error);
    } else {
        console.log('✅ Morse updated with Flux-optimized description.');
    }
}

updateMorse();
