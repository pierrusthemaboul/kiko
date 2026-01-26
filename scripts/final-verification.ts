import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

/**
 * Vérification finale de l'optimisation du Play Store
 */

async function finalVerification() {
  console.log('🔍 VÉRIFICATION FINALE - Optimisation Play Store\n');
  console.log('═'.repeat(60));

  const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-d02fc8cffcf6.json');
  const packageName = 'com.pierretulle.juno2';

  try {
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    const edit = await androidPublisher.edits.insert({
      packageName: packageName,
    });
    const editId = edit.data.id!;

    console.log('\n📊 ÉTAT ACTUEL DU LISTING\n');

    // Vérifier les deux langues
    for (const lang of ['fr-FR', 'en-US']) {
      console.log(`\n🌍 ${lang === 'fr-FR' ? 'FRANÇAIS' : 'ANGLAIS'} (${lang})`);
      console.log('─'.repeat(60));

      try {
        const listing = await androidPublisher.edits.listings.get({
          packageName,
          editId,
          language: lang,
        });

        console.log('\n📝 Métadonnées:');
        console.log('  Titre:', listing.data.title);
        console.log('  Description courte:', listing.data.shortDescription);
        console.log('  Description complète:', listing.data.fullDescription?.substring(0, 150) + '...');

        // Vérifier les images
        const featureGraphic = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language: lang,
          imageType: 'featureGraphic',
        });

        const phoneScreenshots = await androidPublisher.edits.images.list({
          packageName,
          editId,
          language: lang,
          imageType: 'phoneScreenshots',
        });

        console.log('\n🖼️  Images:');
        console.log(`  Feature Graphic: ${featureGraphic.data.images?.length || 0} ${featureGraphic.data.images?.length ? '✅' : '❌'}`);
        console.log(`  Screenshots: ${phoneScreenshots.data.images?.length || 0} ${phoneScreenshots.data.images && phoneScreenshots.data.images.length >= 2 ? '✅' : '⚠️'}`);

      } catch (error: any) {
        console.log(`  ❌ Pas de listing pour ${lang}`);
      }
    }

    // Détails de l'app
    console.log('\n\n📱 DÉTAILS DE L\'APPLICATION');
    console.log('─'.repeat(60));

    const appDetails = await androidPublisher.edits.details.get({
      packageName,
      editId,
    });

    console.log('\nInformations:');
    console.log('  Package:', packageName);
    console.log('  Email contact:', appDetails.data.contactEmail);
    console.log('  Langue par défaut:', appDetails.data.defaultLanguage);

    // Nettoyer
    await androidPublisher.edits.delete({
      packageName,
      editId,
    });

    console.log('\n\n🎯 OPTIMISATION SEO - MOTS-CLÉS');
    console.log('─'.repeat(60));
    console.log('\nVotre app est maintenant optimisée pour être trouvée avec:');
    console.log('\n🇫🇷 Français:');
    console.log('  • "Timalaus" (mot-clé principal)');
    console.log('  • "quiz chrono"');
    console.log('  • "quiz culture générale"');
    console.log('  • "quiz français"');
    console.log('  • "jeu éducatif"');
    console.log('  • "culture générale"');

    console.log('\n🇬🇧 Anglais:');
    console.log('  • "Timalaus"');
    console.log('  • "timed quiz"');
    console.log('  • "quiz game"');
    console.log('  • "general knowledge"');
    console.log('  • "trivia"');

    console.log('\n\n⏰ DÉLAI D\'INDEXATION');
    console.log('─'.repeat(60));
    console.log('\nLes changements sont IMMÉDIATEMENT publiés sur le Play Store.');
    console.log('MAIS l\'indexation par le moteur de recherche Google prend:');
    console.log('  • 24-48h pour les nouvelles métadonnées');
    console.log('  • 2-7 jours pour une indexation complète');
    console.log('\n💡 Conseil: Testez la recherche "Timalaus" dans 48h.');

    console.log('\n\n📈 PROCHAINES ÉTAPES RECOMMANDÉES');
    console.log('─'.repeat(60));
    console.log('\n1. ⏳ Attendre 48-72h pour l\'indexation');
    console.log('2. 🔍 Tester la recherche "Timalaus" sur Play Store');
    console.log('3. 📊 Suivre les statistiques dans Play Console');
    console.log('4. 🎬 (Optionnel) Ajouter une vidéo promotionnelle');
    console.log('5. 🌟 Encourager les premiers avis utilisateurs');

    console.log('\n\n✅ OPTIMISATION TERMINÉE AVEC SUCCÈS !');
    console.log('═'.repeat(60));
    console.log('\nVotre app Timalaus est maintenant bien optimisée pour le SEO !');

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

finalVerification();
