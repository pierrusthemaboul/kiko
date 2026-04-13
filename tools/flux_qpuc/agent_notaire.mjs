import fetch from 'node-fetch';

/**
 * ⚖️ AGENT NOTAIRE (Évaluation de Notoriété FR)
 * 🔬 Rôle : Calculer un score objectif de popularité (0-100) basé sur fr.wikipedia.org
 */

async function calculateNotorietyFR(titre) {
    try {
        console.log(`⚖️ [NOTAIRE] Évaluation de notoriété FR pour : "${titre}"`);
        
        // 1. Chercher la page Wikipedia exacte correspondant au titre
        const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(titre)}&utf8=&format=json&srlimit=1`;
        const headers = { 'User-Agent': 'KikoGame/1.0 (Data Curation Bot; contact@kikogame.com)' };
        const searchRes = await fetch(searchUrl, { headers });
        if (!searchRes.ok) {
            throw new Error(`HTTP Error: ${searchRes.status} on Search`);
        }
        const searchData = await searchRes.json();
        
        if (!searchData.query.search || searchData.query.search.length === 0) {
            console.log(`   📉 [NOTAIRE] Aucune page Wikipedia FR exacte trouvée (Score par défaut: 5)`);
            return 5; // Obscur
        }
        
        const pageTitle = searchData.query.search[0].title;
        const pageWordcount = searchData.query.search[0].wordcount;
        
        // 2. Fetcher le nombre de liens internationaux (Interwiki) via l'Action API (proxy de résonance globale + française)
        // Les articles très importants sont traduits.
        const langUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=langlinks&titles=${encodeURIComponent(pageTitle)}&lllimit=500&format=json`;
        const langRes = await fetch(langUrl, { headers });
        if (!langRes.ok) {
            throw new Error(`HTTP Error: ${langRes.status} on LangLinks`);
        }
        const langData = await langRes.json();
        
        const pages = langData.query.pages;
        const pageId = Object.keys(pages)[0];
        const langLinks = pages[pageId].langlinks ? pages[pageId].langlinks.length : 0;

        // 3. Calcul du score
        // - wordcount: Historiquement, la taille de la page reflète la quantité de littérature (ex: Jeanne d'Arc = ~15000, obscure = ~1000)
        // - langLinks: Nombre de traductions de l'article (ex: WW2 = 180, obscur = 2)
        
        // Formule empirique logarithmique lissée entre 0 et 100
        // Poids : Taille française (60%) + Traduction Internationale (40%)
        
        const sizeScore = Math.min(100, (Math.log10(pageWordcount + 1) / 4.5) * 100); // 4.5 log10 ~= 31000 mots (max)
        const internationalScore = Math.min(100, (langLinks / 100) * 100); // Plafond à 100 langues
        
        let finalScore = Math.round((sizeScore * 0.6) + (internationalScore * 0.4));
        
        // Bonus si c'est exactement le titre
        if (titre.toLowerCase() === pageTitle.toLowerCase()) {
            finalScore = Math.min(100, finalScore + 5);
        }

        console.log(`   📊 [NOTAIRE] Titre retenu: "${pageTitle}" | Mots: ${pageWordcount} | Langues: ${langLinks} -> Score brut: ${finalScore}`);
        
        return Math.max(1, Math.min(100, finalScore)); // Toujours entre 1 et 100

    } catch (err) {
        console.error("❌ Erreur Notaire API Wikipedia:", err.message);
        return 10; // Valeur de repli sécurisée
    }
}

export { calculateNotorietyFR };
