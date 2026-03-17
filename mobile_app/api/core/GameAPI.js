/**
 * Timalaus Game API - Core
 *
 * API interne pour simuler des parties de jeu sans UI
 * Utilisée par Reporters Corp pour générer de la matière première
 *
 * @version 1.0.0
 * @date 2026-01-13
 */

// Charger les variables d'environnement depuis .env (à la racine du projet)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * GameAPI - Classe principale pour simuler des parties
 */
class GameAPI {
  /**
   * Charger les événements depuis Supabase avec filtres optionnels
   * @param {Object} filters - Filtres à appliquer
   * @param {string[]} filters.tags - Tags pour filtrer (ex: ['napoleon', 'france'])
   * @param {string} filters.periode - Période (ex: '1789-1821')
   * @param {string} filters.categorie - Catégorie (ex: 'guerre', 'culture')
   * @returns {Promise<Array>} Liste d'événements
   */
  static async chargerEvenements(filters = {}) {
    let query = supabase
      .from('evenements')
      .select('*')
      .not('date', 'is', null); // Exclure les événements sans date

    // Filtrer par tags si disponible (nécessite que la colonne existe)
    if (filters.tags && filters.tags.length > 0) {
      // Adapter selon votre structure de BDD
      // Si vous avez une colonne 'tags' de type array :
      // query = query.contains('tags', filters.tags);

      // Sinon, chercher dans le nom/description :
      const tagPattern = filters.tags.join('|');
      query = query.or(`nom.ilike.%${tagPattern}%,description.ilike.%${tagPattern}%`);
    }

    // Filtrer par période
    if (filters.periode) {
      const [debut, fin] = filters.periode.split('-').map(Number);
      query = query.gte('date', debut).lte('date', fin);
    }

    const { data, error } = await query.limit(500); // Limite raisonnable

    if (error) {
      console.error('Erreur chargement événements:', error);
      throw new Error(`Erreur Supabase: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Sélectionner le prochain événement selon la logique du jeu
   * @param {number} referenceDate - Date de l'événement de référence
   * @param {Array} evenementsPossibles - Pool d'événements disponibles
   * @param {number} difficulte - Niveau de difficulté (0-1)
   * @returns {Object} Événement sélectionné
   */
  static selectionnerProchainEvenement(referenceDate, evenementsPossibles, difficulte = 0.5) {
    if (!evenementsPossibles || evenementsPossibles.length === 0) {
      throw new Error('Aucun événement disponible');
    }

    // Logique de sélection basée sur la proximité (similaire à votre useEventSelector)
    // Plus la difficulté est élevée, plus les événements peuvent être éloignés

    const plageAnnees = 50 + (difficulte * 200); // 50 à 250 ans selon difficulté

    // Filtrer les événements dans une plage raisonnable
    const evenementsProches = evenementsPossibles.filter(evt => {
      const distance = Math.abs(evt.date - referenceDate);
      return distance <= plageAnnees && distance >= 1; // Au moins 1 an d'écart
    });

    // Si pas assez d'événements proches, élargir la recherche
    const pool = evenementsProches.length >= 5 ? evenementsProches : evenementsPossibles;

    // Sélectionner aléatoirement
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  /**
   * Simuler une partie complète
   * @param {string} mode - Mode de jeu ('Classique', 'Precision', 'Survie')
   * @param {Object} options - Options de simulation
   * @param {string} options.type - 'gagnante' ou 'perdante'
   * @param {Object} options.filtre - Filtres pour les événements
   * @param {number} options.evenementsCount - Nombre d'événements (défaut: 6)
   * @param {number} options.difficulte - Difficulté 0-1 (défaut: 0.5)
   * @returns {Promise<Object>} Résultat de la partie
   */
  static async simulerPartie(mode = 'Classique', options = {}) {
    const {
      type = 'gagnante',
      filtre = {},
      evenementsCount = 6,
      difficulte = 0.5,
    } = options;

    console.log(`🎮 Simulation partie ${mode} (${type})...`);

    // 1. Charger les événements
    const evenementsPossibles = await this.chargerEvenements(filtre);
    console.log(`   📚 ${evenementsPossibles.length} événements chargés`);

    if (evenementsPossibles.length < evenementsCount) {
      throw new Error(`Pas assez d'événements disponibles (${evenementsPossibles.length} < ${evenementsCount})`);
    }

    // 2. Sélectionner l'événement de départ aléatoirement
    const eventDepart = evenementsPossibles[Math.floor(Math.random() * evenementsPossibles.length)];

    const partie = {
      mode,
      type,
      evenements: [eventDepart],
      choix: [],
      score: 0,
      erreurs: 0,
      dureeSecondes: 0,
      resultat: null,
      timestamp: new Date().toISOString(),
    };

    console.log(`   🎯 Événement de départ: ${eventDepart.nom} (${eventDepart.date})`);

    // 3. Jouer les tours suivants
    for (let tour = 1; tour < evenementsCount; tour++) {
      const referenceDate = partie.evenements[tour - 1].date;

      // Sélectionner le prochain événement
      const prochainEvt = this.selectionnerProchainEvenement(
        referenceDate,
        evenementsPossibles,
        difficulte
      );

      // Déterminer le choix correct
      const choixCorrect = prochainEvt.date > referenceDate ? 'APRES' : 'AVANT';

      // Décider si on fait une erreur (selon le type de partie)
      let choixJoueur;
      if (type === 'gagnante') {
        choixJoueur = choixCorrect; // Toujours correct
      } else {
        // Partie perdante : faire une erreur au tour spécifié (par défaut au 4ème tour)
        const tourErreur = options.tourErreur || 4;
        if (tour === tourErreur) {
          choixJoueur = choixCorrect === 'APRES' ? 'AVANT' : 'APRES'; // Erreur volontaire
          console.log(`   ❌ Erreur volontaire au tour ${tour}`);
        } else {
          choixJoueur = choixCorrect; // Correct avant l'erreur
        }
      }

      const correct = choixJoueur === choixCorrect;

      partie.evenements.push(prochainEvt);
      partie.choix.push({
        tour,
        evenement: prochainEvt.nom,
        annee: prochainEvt.date,
        choix: choixJoueur,
        correct,
      });

      if (correct) {
        // Score basé sur le mode (simplifié)
        const pointsBase = 1000;
        const bonus = Math.floor(Math.random() * 500); // Bonus aléatoire
        partie.score += pointsBase + bonus;
      } else {
        partie.erreurs++;
        // En mode Classique, une erreur = game over
        if (mode === 'Classique') {
          console.log(`   💀 Partie terminée au tour ${tour} (erreur)`);
          break;
        }
      }

      // Simuler la durée (5-15s par tour)
      partie.dureeSecondes += 5 + Math.floor(Math.random() * 10);
    }

    // 4. Déterminer le résultat final
    if (type === 'gagnante' && partie.erreurs === 0) {
      partie.resultat = 'victoire';
    } else {
      partie.resultat = 'defaite';
    }

    console.log(`   ✅ Simulation terminée: ${partie.resultat} (Score: ${partie.score})`);

    return partie;
  }

  /**
   * Simuler plusieurs parties et retourner la meilleure selon un critère
   * @param {string} mode - Mode de jeu
   * @param {Object} options - Options de simulation
   * @param {number} tentatives - Nombre de tentatives (défaut: 10)
   * @param {Function} critere - Fonction de sélection (défaut: meilleur score)
   * @returns {Promise<Object>} Meilleure partie
   */
  static async trouverMeilleurePartie(mode, options = {}, tentatives = 10, critere = null) {
    console.log(`🔍 Recherche de la meilleure partie (${tentatives} tentatives)...`);

    const parties = [];

    for (let i = 0; i < tentatives; i++) {
      try {
        const partie = await this.simulerPartie(mode, options);
        parties.push(partie);
      } catch (e) {
        console.warn(`   ⚠️  Tentative ${i + 1} échouée:`, e.message);
      }
    }

    if (parties.length === 0) {
      throw new Error('Aucune partie réussie');
    }

    // Critère par défaut : meilleur score
    const selectionner = critere || ((parties) => {
      return parties.reduce((best, current) =>
        current.score > best.score ? current : best
      );
    });

    const meilleure = selectionner(parties);
    console.log(`   🏆 Meilleure partie: Score ${meilleure.score}, ${meilleure.evenements.length} événements`);

    return meilleure;
  }

  /**
   * Obtenir les statistiques d'une partie
   * @param {Object} partie - Résultat de simulerPartie()
   * @returns {Object} Stats formatées
   */
  static getStats(partie) {
    return {
      mode: partie.mode,
      score: partie.score,
      duree: partie.dureeSecondes,
      evenementsJoues: partie.evenements.length,
      erreurs: partie.erreurs,
      precision: ((partie.evenements.length - partie.erreurs) / partie.evenements.length * 100).toFixed(1),
      resultat: partie.resultat,
      timestamp: partie.timestamp,
    };
  }
}

module.exports = { GameAPI };
