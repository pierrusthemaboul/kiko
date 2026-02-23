import { getSupabase } from './AGENTS/shared_utils.mjs';

async function resetGojuToQueue() {
    const supabase = getSupabase();

    // 1. Lister les événements de goju2
    const { data: gojuEvents, error: fetchError } = await supabase
        .from('goju2')
        .select('titre');

    if (fetchError) {
        console.error('Error fetching goju2:', fetchError);
        return;
    }

    const titlesToReset = gojuEvents
        .map(e => e.titre)
        .filter(t => t !== 'Invention du télégraphe électrique');

    console.log('Titles to reset:', titlesToReset);

    if (titlesToReset.length === 0) {
        console.log('No events to reset (excluding Morse).');
        return;
    }

    // 2. Remettre en 'pending' dans queue_sevent
    const { error: updateError } = await supabase
        .from('queue_sevent')
        .update({ status: 'pending' })
        .in('titre', titlesToReset);

    if (updateError) {
        console.error('Error updating queue_sevent:', updateError);
    } else {
        console.log('✅ queue_sevent updated to pending for', titlesToReset.length, 'events.');
    }

    // 3. Supprimer de goju2 pour permettre la ré-insertion propre
    const { error: deleteError } = await supabase
        .from('goju2')
        .delete()
        .in('titre', titlesToReset);

    if (deleteError) {
        console.error('Error deleting from goju2:', deleteError);
    } else {
        console.log('✅ goju2 cleaned up for those events.');
    }
}

resetGojuToQueue();
