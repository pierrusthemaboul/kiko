// reply_bot.js
// Usage: node reply_bot.js "Texte de l'avis" [Note 1-5]

const reviewText = process.argv[2];
const starRating = parseInt(process.argv[3]) || 5;

if (!reviewText) {
    console.error("❌ Usage: node reply_bot.js \"Texte\" [Stars]");
    process.exit(1);
}

function generateReply(text, stars) {
    const t = text.toLowerCase();

    // 1. Cas CRITIQUE (Bug)
    if (t.includes('bug') || t.includes('crash') || t.includes('plante')) {
        return "👨‍🔧 Oups ! Serge (notre CTO) est déjà sur le coup. Désolé pour ce contretemps historique. Une mise à jour arrive vite !";
    }

    // 2. Cas CONTENU (Erreur de date)
    if (t.includes('date') || t.includes('erreur') || t.includes('faux')) {
        return "🧐 Une erreur ? Nos historiens vont vérifier ça tout de suite. Merci pour votre vigilance !";
    }

    // 3. Cas POSITIF (Love)
    if (stars >= 4) {
        if (t.includes('dur') || t.includes('difficile')) {
            return "🔥 L'Histoire ne s'est pas faite en un jour ! Courage, vous allez grimper au classement.";
        }
        return "👑 Merci ! Ravi que Timalaus vous plaise. Prêt pour le prochain défi ?";
    }

    // 4. Cas NÉGATIF (Pas content)
    return "Merci pour votre retour. Nous travaillons dur pour améliorer le jeu. N'hésitez pas à nous dire ce qui vous déplaît !";
}

const reply = generateReply(reviewText, starRating);
console.log(`\n💬 AVIS (${starRating}★) : "${reviewText}"`);
console.log(`🤖 RÉPONSE BOT : "${reply}"\n`);
