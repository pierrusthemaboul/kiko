import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ce script décale mathématiquement la base "notoriete" de production pour 
// corriger le biais "récentiste/pop-culture" de Wikipédia
// +20 pour tout ce qui est avant 1800, ou étiqueté Politique/Conflit/Science
// -15 pour Divertissement, Musique post-1950

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function patchNotoriete() {
  console.log("🚀 Lancement de la correction de Biais Rétroactive...");
  
  let fetchHasMore = true;
  let offset = 0;
  const PAGE_SIZE = 500;
  let totalModifies = 0;

  while (fetchHasMore) {
    const { data: events, error } = await supabase
      .from('evenements')
      .select('id, titre, notoriete_fr, types_evenement, epoque')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("Erreur de fetch :", error);
      break;
    }

    if (!events || events.length === 0) {
      fetchHasMore = false;
      break;
    }

    for (const ev of events) {
      if (!ev.notoriete_fr) continue;
      
      let modifier = 0;
      const theme = (ev.types_evenement ? ev.types_evenement.join(' ') : '').toLowerCase();
      const epoque = ev.epoque ? ev.epoque.toLowerCase() : '';

      // Malus Pop Culture
      if (theme.includes('divertissement') || theme.includes('musique') || theme.includes('sport') || theme.includes('jeu')) {
        modifier -= 15;
      }
      
      // Bonus Histoire / Académique
      if (theme.includes('science') || theme.includes('politique') || theme.includes('conflit')) {
        modifier += 20;
      }
      if (epoque === 'antiquité' || epoque === 'moyen-âge' || epoque === 'temps modernes') {
         modifier += 15; // Un peu plus lourd pour le très vieux
      }

      const nouveauScore = Math.max(0, Math.min(100, Math.round(Number(ev.notoriete_fr) + modifier)));

      if (nouveauScore !== Number(ev.notoriete_fr)) {
         await supabase
           .from('evenements')
           .update({ 
               notoriete_fr: nouveauScore,
               notoriete: nouveauScore // garder synchro
           })
           .eq('id', ev.id);
         
         totalModifies++;
         console.log(`[PATCH] ${ev.titre} | ${ev.notoriete_fr} -> ${nouveauScore} (T:${theme})`);
      }
    }
    
    offset += PAGE_SIZE;
  }
  
  console.log(`✅ Opération terminée. ${totalModifies} événements ajustés mathématiquement.`);
}

patchNotoriete();
