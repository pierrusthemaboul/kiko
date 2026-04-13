import axios from 'axios';
import 'dotenv/config';

/**
 * 🧪 TEST ÉTAPE 1 : SOURCE QPUC (Wikipedia)
 * Objectif : Voir si on arrive à lire Wikipédia proprement.
 * Aucun coût IA ici.
 */

async function testSource() {
  console.log("--- 🧪 TEST SOURCE QPUC ---");
  const url = 'https://fr.wikipedia.org/wiki/Questions_pour_un_champion';
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const length = data.length;
    console.log(`✅ Wikipédia lu avec succès ! (${length} caractères reçus)`);
    
    // On cherche juste si le mot "Quatre à la suite" est présent
    if (data.includes("Quatre à la suite")) {
       console.log("✅ Section 'Quatre à la suite' identifiée !");
    } else {
       console.log("⚠️ Section 'Quatre à la suite' non trouvée directement.");
    }
  } catch (error) {
    console.error("❌ Échec de lecture Wikipédia :", error.message);
  }
}

testSource();
