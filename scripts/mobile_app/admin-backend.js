/**
 * Backend API pour Admin Panel Timalaus
 * Endpoints pour la gestion des événements
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.ADMIN_API_PORT || 3001;

// Configuration Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Clé service pour accès admin

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Middleware de vérification admin (simple pour le moment)
const verifyAdmin = (req, res, next) => {
  const adminEmail = req.headers['x-admin-email'];
  if (adminEmail !== 'pierre.cousin7@gmail.com') {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
  next();
};

// --- Routes API ---

// GET /api/events - Lister tous les événements avec filtres
app.get('/api/events', verifyAdmin, async (req, res) => {
  try {
    const { 
      search, 
      categorie, 
      statut, 
      limit = 50, 
      offset = 0,
      orderBy = 'date',
      orderDirection = 'desc'
    } = req.query;

    let query = supabase
      .from('evenements')
      .select('*')
      .order(orderBy, { ascending: orderDirection === 'asc' });

    // Filtre par recherche
    if (search) {
      query = query.or(`titre.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filtre par catégorie
    if (categorie && categorie !== 'toutes') {
      query = query.eq('categorie', categorie);
    }

    // Filtre par statut
    if (statut) {
      query = query.eq('statut', statut);
    }

    // Pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      events: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Erreur GET /api/events:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
  }
});

// GET /api/events/:id - Détail d'un événement
app.get('/api/events/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Événement non trouvé' });
      }
      throw error;
    }

    res.json(data);

  } catch (error) {
    console.error(`Erreur GET /api/events/${req.params.id}:`, error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
  }
});

// PUT /api/events/:id - Mettre à jour un événement
app.put('/api/events/:id', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validation basique
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const { data, error } = await supabase
      .from('evenements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Événement mis à jour avec succès',
      event: data
    });

  } catch (error) {
    console.error(`Erreur PUT /api/events/${req.params.id}:`, error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'événement' });
  }
});

// POST /api/events/:id/regenerate-title - Regénérer le titre
app.post('/api/events/:id/regenerate-title', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Intégrer avec ton système de génération de titres
    // Pour l'instant, on simule une regénération
    const nouveauTitre = `Nouveau titre généré - ${Date.now()}`;
    
    const { data, error } = await supabase
      .from('evenements')
      .update({ 
        titre: nouveauTitre,
        statut: 'titre_regenerated',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Titre regénéré avec succès',
      event: data
    });

  } catch (error) {
    console.error(`Erreur POST /api/events/${req.params.id}/regenerate-title:`, error);
    res.status(500).json({ error: 'Erreur lors de la régénération du titre' });
  }
});

// POST /api/events/:id/regenerate-illustration - Regénérer l'illustration
app.post('/api/events/:id/regenerate-illustration', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Intégrer avec ton système de génération d'images
    // Pour l'instant, on simule une regénération
    const nouvelleIllustration = `https://example.com/generated-images/${id}_${Date.now()}.jpg`;
    
    const { data, error } = await supabase
      .from('evenements')
      .update({ 
        illustration_url: nouvelleIllustration,
        statut: 'illustration_regenerated',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Illustration regénérée avec succès',
      event: data
    });

  } catch (error) {
    console.error(`Erreur POST /api/events/${req.params.id}/regenerate-illustration:`, error);
    res.status(500).json({ error: 'Erreur lors de la régénération de l\'illustration' });
  }
});

// POST /api/events/:id/verify-date - Vérifier la date
app.post('/api/events/:id/verify-date', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Intégrer avec ton système de vérification de dates
    // Pour l'instant, on simule une vérification
    const dateVerifiee = true;
    
    const { data, error } = await supabase
      .from('evenements')
      .update({ 
        statut: dateVerifiee ? 'date_verified' : 'date_invalid',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Date vérifiée avec succès',
      event: data,
      dateValid: dateVerifiee
    });

  } catch (error) {
    console.error(`Erreur POST /api/events/${req.params.id}/verify-date:`, error);
    res.status(500).json({ error: 'Erreur lors de la vérification de la date' });
  }
});

// GET /api/categories - Lister toutes les catégories
app.get('/api/categories', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('evenements')
      .select('categorie')
      .not('categorie', 'is', null);

    if (error) throw error;

    const categories = [...new Set(data.map(item => item.categorie).filter(Boolean))];
    
    res.json({
      categories: categories.sort()
    });

  } catch (error) {
    console.error('Erreur GET /api/categories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

// POST /api/events/batch - Traitement par lot
app.post('/api/events/batch', verifyAdmin, async (req, res) => {
  try {
    const { eventIds, action } = req.body;

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'IDs d\'événements invalides' });
    }

    if (!action) {
      return res.status(400).json({ error: 'Action spécifiée invalide' });
    }

    const results = [];

    for (const eventId of eventIds) {
      try {
        let updateData = {};
        let endpoint = '';

        switch (action) {
          case 'regenerate-titles':
            updateData = { 
              titre: `Batch titre - ${Date.now()}`,
              statut: 'titre_regenerated',
              updated_at: new Date().toISOString()
            };
            break;
          case 'regenerate-illustrations':
            updateData = { 
              illustration_url: `https://example.com/batch/${eventId}_${Date.now()}.jpg`,
              statut: 'illustration_regenerated',
              updated_at: new Date().toISOString()
            };
            break;
          case 'verify-dates':
            updateData = { 
              statut: 'date_verified',
              updated_at: new Date().toISOString()
            };
            break;
          default:
            throw new Error('Action non reconnue');
        }

        const { data, error } = await supabase
          .from('evenements')
          .update(updateData)
          .eq('id', eventId)
          .select()
          .single();

        if (error) throw error;

        results.push({ eventId, success: true, event: data });

      } catch (error) {
        results.push({ 
          eventId, 
          success: false, 
          error: error.message 
        });
      }
    }

    res.json({
      message: `Traitement par lot terminé: ${results.filter(r => r.success).length}/${results.length} succès`,
      results
    });

  } catch (error) {
    console.error('Erreur POST /api/events/batch:', error);
    res.status(500).json({ error: 'Erreur lors du traitement par lot' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Timalaus Admin API'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trouvé' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Timalaus Admin API démarrée sur le port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Accès admin requis: pierre.cousin7@gmail.com`);
});

module.exports = app;

