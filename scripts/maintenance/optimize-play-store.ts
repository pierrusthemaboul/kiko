import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

/**
 * Script pour optimiser la présence de Timalaus sur le Play Store
 */

async function optimizePlayStore() {
  console.log('🚀 Optimisation du Play Store pour Timalaus\n');

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');
  const packageName = 'com.pierretulle.juno2';

  try {
    // Authentification
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    // Étape 1: Récupérer les infos actuelles
    console.log('📊 Récupération des métadonnées actuelles...\n');

    const edit = await androidPublisher.edits.insert({
      packageName: packageName,
    });
    const editId = edit.data.id!;

    // Récupérer les listings actuels
    const listings = await androidPublisher.edits.listings.list({
      packageName,
      editId,
    });

    console.log('📝 Listings actuels:');
    for (const [language, listing] of Object.entries(listings.data.listings || {})) {
      const l = listing as any;
      console.log(`\n${language}:`);
      console.log('  Titre:', l.title);
      console.log('  Description courte:', l.shortDescription?.substring(0, 50) + '...');
      console.log('  Description complète:', l.fullDescription?.substring(0, 100) + '...');
    }

    // Étape 2: Optimiser les métadonnées pour le français
    console.log('\n\n✨ Optimisation pour le français (fr-FR)...\n');

    const optimizedTitle = 'Timalaus - Quiz Chrono Culture';
    const optimizedShortDescription = 'Quiz chrono de culture générale. Testez vos connaissances rapidement !';
    const optimizedFullDescription = `Timalaus - Le Quiz Chrono Ultime ! 🎯

Relevez le défi avec Timalaus, l'application de quiz chronométré qui teste votre culture générale !

🎮 CONCEPT DU JEU
Répondez rapidement à des questions de culture générale dans différentes catégories. Chaque bonne réponse vous rapporte des points, mais attention : le temps est compté !

⏱️ MODES DE JEU
• Mode Chrono : Répondez avant la fin du temps imparti
• Questions variées : Histoire, géographie, sciences, arts, sport...
• Difficulté progressive : Du débutant à l'expert

🏆 CARACTÉRISTIQUES
• Interface intuitive et moderne
• Questions de qualité vérifiées
• Suivi de vos performances
• Défis quotidiens
• Mode hors ligne disponible

📚 CATÉGORIES
Histoire, Géographie, Sciences, Arts et Culture, Sport, Divertissement, et bien plus encore !

🎯 PARFAIT POUR
• Améliorer votre culture générale
• Passer le temps intelligemment
• Défier vos amis
• Apprendre en s'amusant

Téléchargez Timalaus maintenant et prouvez que vous êtes un champion de culture générale ! 🏆

Mots-clés : quiz, culture générale, chrono, questions, jeu éducatif, timalaus, quiz français, connaissances, défi, trivia`;

    await androidPublisher.edits.listings.update({
      packageName,
      editId,
      language: 'fr-FR',
      requestBody: {
        title: optimizedTitle,
        shortDescription: optimizedShortDescription,
        fullDescription: optimizedFullDescription,
      },
    });

    console.log('✅ Métadonnées françaises optimisées');
    console.log('   Titre:', optimizedTitle);
    console.log('   Description courte:', optimizedShortDescription);

    // Étape 3: Ajouter une version anglaise pour toucher plus de monde
    console.log('\n✨ Ajout de métadonnées en anglais (en-US)...\n');

    const englishTitle = 'Timalaus - Timed Quiz Game';
    const englishShortDescription = 'Timed quiz game. Test your general knowledge fast!';
    const englishFullDescription = `Timalaus - The Ultimate Timed Quiz! 🎯

Take on the challenge with Timalaus, the timed quiz app that tests your general knowledge!

🎮 GAME CONCEPT
Answer general knowledge questions quickly across different categories. Each correct answer earns points, but watch out: time is running!

⏱️ GAME MODES
• Chrono Mode: Answer before time runs out
• Varied questions: History, geography, science, arts, sports...
• Progressive difficulty: From beginner to expert

🏆 FEATURES
• Intuitive and modern interface
• Quality verified questions
• Track your performance
• Daily challenges
• Offline mode available

📚 CATEGORIES
History, Geography, Science, Arts & Culture, Sports, Entertainment, and much more!

🎯 PERFECT FOR
• Improving your general knowledge
• Spending time wisely
• Challenging your friends
• Learning while having fun

Download Timalaus now and prove you're a general knowledge champion! 🏆

Keywords: quiz, trivia, general knowledge, timed, questions, educational game, timalaus, knowledge, challenge`;

    await androidPublisher.edits.listings.update({
      packageName,
      editId,
      language: 'en-US',
      requestBody: {
        title: englishTitle,
        shortDescription: englishShortDescription,
        fullDescription: englishFullDescription,
      },
    });

    console.log('✅ Métadonnées anglaises ajoutées');

    // Étape 4: Vérifier les détails de l'app
    console.log('\n📱 Vérification des détails de l\'application...\n');

    const appDetails = await androidPublisher.edits.details.get({
      packageName,
      editId,
    });

    console.log('Détails actuels:');
    console.log('  Email de contact:', appDetails.data.contactEmail);
    console.log('  Site web:', appDetails.data.contactWebsite);
    console.log('  Téléphone:', appDetails.data.contactPhone);

    // Mettre à jour si nécessaire
    await androidPublisher.edits.details.update({
      packageName,
      editId,
      requestBody: {
        contactEmail: appDetails.data.contactEmail || 'pierre.tulle@example.com',
        contactWebsite: appDetails.data.contactWebsite,
        contactPhone: appDetails.data.contactPhone,
        defaultLanguage: 'fr-FR',
      },
    });

    // Étape 5: Valider les changements
    console.log('\n💾 Validation des changements...\n');

    await androidPublisher.edits.commit({
      packageName,
      editId,
    });

    console.log('✅ Changements validés et publiés sur le Play Store !');

    console.log('\n🎉 OPTIMISATION TERMINÉE !\n');
    console.log('📝 Récapitulatif des optimisations:');
    console.log('  ✅ Titre optimisé avec "Timalaus" comme mot-clé principal');
    console.log('  ✅ Description courte accrocheuse (80 caractères)');
    console.log('  ✅ Description complète avec mots-clés SEO');
    console.log('  ✅ Version française (fr-FR) optimisée');
    console.log('  ✅ Version anglaise (en-US) ajoutée');
    console.log('  ✅ Langue par défaut définie sur français');

    console.log('\n💡 PROCHAINES ÉTAPES RECOMMANDÉES:');
    console.log('  1. Ajouter des screenshots attractifs');
    console.log('  2. Créer une vidéo promotionnelle');
    console.log('  3. Optimiser l\'icône de l\'application');
    console.log('  4. Ajouter une bannière feature graphic');
    console.log('  5. Attendre 24-48h pour l\'indexation Google');

    console.log('\n🔍 Votre app devrait être trouvable avec:');
    console.log('  - "Timalaus"');
    console.log('  - "quiz chrono"');
    console.log('  - "quiz culture générale"');
    console.log('  - "timed quiz" (en anglais)');

  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message);
    if (error.response?.data) {
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

optimizePlayStore();

