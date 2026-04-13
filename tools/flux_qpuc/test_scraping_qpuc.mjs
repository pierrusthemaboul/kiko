import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Script de test pour extraire des thèmes QPUC depuis Wikipédia.
 * On cherche les thèmes du "Quatre à la suite".
 */
async function scrapeQpucThemes() {
  console.log("🔍 Exploration des archives QPUC sur Wikipédia...");
  
  // Note: Wikipedia a souvent des listes par "Saison" ou "Spéciales"
  // On teste d'abord la page principale pour voir ce qu'on peut en tirer.
  const url = 'https://fr.wikipedia.org/wiki/Questions_pour_un_champion';
  
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    // On cherche les thèmes cités dans les tableaux ou listes
    // Souvent les thèmes emblématiques sont listés.
    const themes = [];
    
    // Exemple de pattern de recherche (à affiner selon la structure exacte)
    $('ul li').each((i, el) => {
      const text = $(el).text();
      // On cherche des patterns comme "Thème : Les peintres impressionnistes"
      if (text.includes("Thème") || text.includes("thème")) {
         themes.push(text.trim());
      }
    });

    console.log(`✅ ${themes.length} thèmes potentiels identifiés.`);
    return themes;
  } catch (error) {
    console.error("❌ Erreur de scraping:", error.message);
    return [];
  }
}

// scrapeQpucThemes();
