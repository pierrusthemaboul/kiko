'use client';

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert, Text, TextInput, Image } from 'react-native';
import { 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons 
} from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/supabaseClients';
import { router } from 'expo-router';

// ==============================================================================
// TYPES ET INTERFACES
// ==============================================================================

interface ValidationEvent {
  id: string;
  titre: string;
  date: string;
  date_formatee: string;
  illustration_url: string;
  description_detaillee?: string;
  epoque: string;
  types_evenement: string[];
  validation_status: 'pending' | 'validated' | 'needs_image_change' | 'needs_title_change' | 'rejected';
  validation_notes?: string;
  validated_by?: string;
  validated_at?: string;
  needs_image_change: boolean;
  needs_title_change: boolean;
  prompt_flux?: string;
}

interface ValidationStats {
  total: number;
  pending: number;
  validated: number;
  needsImageChange: number;
  needsTitleChange: number;
  rejected: number;
}

interface RegenerationState {
  isRegenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

// ==============================================================================
// COMPOSANT DE RÉGÉNÉRATION D'IMAGE
// ==============================================================================

function RegenerationButton({ 
  eventId, 
  titre, 
  year, 
  currentImageUrl, 
  onImageUpdated 
}: {
  eventId: string;
  titre: string;
  year: number;
  currentImageUrl: string;
  onImageUpdated: (newImageUrl: string) => void;
}) {
  const [state, setState] = useState<RegenerationState>({
    isRegenerating: false,
    progress: 0,
    currentStep: '',
    error: null
  });
  const [lastResult, setLastResult] = useState<any>(null);

  // Régénération en un seul appel
  const regenerateImageOneCall = async (imageUrl: string, titre: string, year: number) => {
    try {
      const response = await fetch('/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'regenerate',
          imageUrl,
          titre,
          year,
          model: 'flux-schnell',
          num_inference_steps: 8,
          output_quality: 90
        })
      });

      if (!response.ok) throw new Error('Erreur régénération');
      const result = await response.json();
      
      return {
        success: true,
        newImageUrl: result.newImageUrl,
        improvedPrompt: result.improvedPrompt,
        validation: result.validation,
        analysis: result.analysis
      };
    } catch (error) {
      console.error('Erreur régénération:', error);
      throw new Error('Impossible de régénérer l\'image');
    }
  };

  // Fonction de régénération simplifiée
  const regenerateImage = async () => {
    setState(prev => ({ ...prev, isRegenerating: true, error: null, progress: 0 }));

    try {
      setState(prev => ({ ...prev, currentStep: 'Régénération complète en cours...', progress: 50 }));
      
      // Un seul appel API qui fait tout !
      const result = await regenerateImageOneCall(currentImageUrl, titre, year);
      
      setState(prev => ({ ...prev, currentStep: 'Sauvegarde...', progress: 90 }));
      
      // Sauvegarder en base
      const { error } = await supabase
        .from('goju')
        .update({
          illustration_url: result.newImageUrl,
          prompt_flux: result.improvedPrompt,
          validation_status: result.validation.overallValid ? 'validated' : 'needs_image_change',
          validation_notes: `Régénérée: ${result.validation.feedback}`,
          validated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      setState(prev => ({ ...prev, currentStep: 'Terminé !', progress: 100 }));
      
      setLastResult(result);
      onImageUpdated(result.newImageUrl);

      return result;

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isRegenerating: false 
      }));
      return { success: false, error: error.message };
    } finally {
      setTimeout(() => {
        setState(prev => ({ ...prev, isRegenerating: false, progress: 0, currentStep: '' }));
      }, 2000);
    }
  };

  if (state.isRegenerating) {
    return (
      <View style={{ backgroundColor: '#dbeafe', borderColor: '#93c5fd', borderWidth: 1, borderRadius: 8, padding: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MaterialIcons name="refresh" size={20} color="#3b82f6" />
          <Text style={{ marginLeft: 8, fontWeight: '600', color: '#1e40af' }}>Régénération en cours...</Text>
        </View>
        
        {/* Barre de progression */}
        <View style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: 4, height: 8, marginBottom: 12 }}>
          <View 
            style={{ 
              backgroundColor: '#3b82f6', 
              height: 8, 
              borderRadius: 4, 
              width: `${state.progress}%`,
              transition: 'width 0.3s ease'
            }}
          />
        </View>
        
        <Text style={{ fontSize: 14, color: '#4b5563' }}>{state.currentStep}</Text>
      </View>
    );
  }

  if (state.error) {
    return (
      <View style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, padding: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialIcons name="error" size={20} color="#ef4444" />
          <Text style={{ marginLeft: 8, fontWeight: '600', color: '#991b1b' }}>Erreur de régénération</Text>
        </View>
        <Text style={{ fontSize: 14, color: '#dc2626', marginBottom: 8 }}>{state.error}</Text>
        <Pressable
          onPress={regenerateImage}
          style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#fef2f2', borderRadius: 4 }}
        >
          <Text style={{ color: '#dc2626', fontSize: 14 }}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  if (lastResult?.success) {
    return (
      <View style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1, borderRadius: 8, padding: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={{ marginLeft: 8, fontWeight: '600', color: '#15803d' }}>Image régénérée avec succès !</Text>
        </View>
        
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: '#166534' }}>
            <Text style={{ fontWeight: 'bold' }}>Score IA:</Text> {lastResult.validation.score}/10
          </Text>
          <Text style={{ fontSize: 14, color: '#166534' }}>
            <Text style={{ fontWeight: 'bold' }}>Feedback:</Text> {lastResult.validation.feedback}
          </Text>
          {lastResult.analysis.problems.length > 0 && (
            <Text style={{ fontSize: 14, color: '#166534' }}>
              <Text style={{ fontWeight: 'bold' }}>Problèmes corrigés:</Text> {lastResult.analysis.problems.join(', ')}
            </Text>
          )}
        </View>
        
        <Pressable
          onPress={regenerateImage}
          style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#dcfce7', borderRadius: 4 }}
        >
          <Text style={{ color: '#166534', fontSize: 14 }}>Régénérer à nouveau</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={regenerateImage}
      style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: '#7c3aed', 
        borderRadius: 8, 
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
      }}
    >
      <MaterialCommunityIcons name="lightning-bolt" size={20} color="white" />
      <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>
        Régénérer Image IA (Flux-schnell)
      </Text>
    </Pressable>
  );
}

// ==============================================================================
// COMPOSANT PRINCIPAL DE VALIDATION
// ==============================================================================

export default function VueValid() {
  // État principal
  const [events, setEvents] = useState<ValidationEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Statistiques
  const [stats, setStats] = useState<ValidationStats>({
    total: 0,
    pending: 0,
    validated: 0,
    needsImageChange: 0,
    needsTitleChange: 0,
    rejected: 0
  });

  // Constantes utilisateur
  const AUTHORIZED_EMAIL = "pierrecousin2@proton.me";

  // Charger le profil utilisateur
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        // Vérifier l'autorisation avec l'email de l'auth user
        if (user.email !== AUTHORIZED_EMAIL) {
          Alert.alert(
            'Accès refusé',
            'Vous n\'êtes pas autorisé à accéder à cette vue.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setUserProfile({
          ...profile,
          email: user.email // Ajouter l'email depuis l'auth
        });

        // Charger les événements
        loadEvents();
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        router.replace('/login');
      }
    };

    loadUserProfile();
  }, []);

  // Charger tous les événements de goju
  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goju')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      Alert.alert('Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const calculateStats = (eventsList: ValidationEvent[]) => {
    const newStats = eventsList.reduce((acc, event) => {
      acc.total++;
      switch (event.validation_status) {
        case 'pending':
          acc.pending++;
          break;
        case 'validated':
          acc.validated++;
          break;
        case 'needs_image_change':
          acc.needsImageChange++;
          break;
        case 'needs_title_change':
          acc.needsTitleChange++;
          break;
        case 'rejected':
          acc.rejected++;
          break;
      }
      return acc;
    }, {
      total: 0,
      pending: 0,
      validated: 0,
      needsImageChange: 0,
      needsTitleChange: 0,
      rejected: 0
    });

    setStats(newStats);
  };

  // Valider un événement
  const validateEvent = async (status: ValidationEvent['validation_status']) => {
    if (!events[currentIndex]) return;

    try {
      const { error } = await supabase
        .from('goju')
        .update({
          validation_status: status,
          validation_notes: notes,
          validated_by: userProfile?.email,
          validated_at: new Date().toISOString(),
          needs_image_change: status === 'needs_image_change',
          needs_title_change: status === 'needs_title_change'
        })
        .eq('id', events[currentIndex].id);

      if (error) throw error;

      // Mettre à jour l'état local
      setEvents(prev => prev.map(event => 
        event.id === events[currentIndex].id 
          ? { 
              ...event, 
              validation_status: status,
              validation_notes: notes,
              validated_by: userProfile?.email,
              validated_at: new Date().toISOString(),
              needs_image_change: status === 'needs_image_change',
              needs_title_change: status === 'needs_title_change'
            }
          : event
      ));

      // Recalculer les stats
      const updatedEvents = events.map(event => 
        event.id === events[currentIndex].id 
          ? { ...event, validation_status: status }
          : event
      );
      calculateStats(updatedEvents);

      // Réinitialiser les notes et passer au suivant
      setNotes('');
      if (currentIndex < events.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }

      return true;
    } catch (error) {
      console.error('Erreur validation:', error);
      Alert.alert('Erreur', 'Impossible de valider l\'événement');
      return false;
    }
  };

  // Navigation
  const goToNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, events.length - 1));
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, events.length - 1)));
  };

  // Filtrer par statut
  const filterByStatus = (status: ValidationEvent['validation_status']) => {
    const filteredEvents = events.filter(event => event.validation_status === status);
    if (filteredEvents.length > 0) {
      const firstIndex = events.findIndex(event => event.validation_status === status);
      setCurrentIndex(firstIndex);
    }
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'En attente' },
      validated: { bg: '#d1fae5', text: '#065f46', label: 'Validé' },
      needs_image_change: { bg: '#fed7aa', text: '#9a3412', label: 'Image à changer' },
      needs_title_change: { bg: '#e9d5ff', text: '#6b21a8', label: 'Titre à changer' },
      rejected: { bg: '#fecaca', text: '#991b1b', label: 'Rejeté' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <View style={{ 
        backgroundColor: config.bg, 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 12 
      }}>
        <Text style={{ color: config.text, fontSize: 12, fontWeight: '600' }}>
          {config.label}
        </Text>
      </View>
    );
  };

  // Gérer la mise à jour d'image
  const handleImageUpdated = (newImageUrl: string) => {
    setEvents(prev => prev.map(event => 
      event.id === events[currentIndex]?.id 
        ? { ...event, illustration_url: newImageUrl }
        : event
    ));
  };

  // États de chargement
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#64748b', fontSize: 16 }}>Chargement des événements...</Text>
      </View>
    );
  }

  if (!events[currentIndex]) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ color: '#64748b', fontSize: 16, marginBottom: 16 }}>Aucun événement à valider</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#4f46e5', borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const currentEvent = events[currentIndex];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header avec stats */}
      <View style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => router.back()}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 8, marginRight: 16 }}
              >
                <Ionicons name="arrow-back" size={20} color="#475569" />
                <Text style={{ marginLeft: 8, color: '#475569' }}>Retour</Text>
              </Pressable>
              
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>
                Validation des Événements
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => setShowStats(!showStats)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e0e7ff', borderRadius: 8, marginRight: 16 }}
              >
                <MaterialIcons name="bar-chart" size={20} color="#4338ca" />
                <Text style={{ marginLeft: 8, color: '#4338ca' }}>Stats</Text>
              </Pressable>
              
              <Text style={{ fontSize: 14, color: '#64748b' }}>
                {currentIndex + 1} / {events.length}
              </Text>
            </View>
          </View>

          {/* Statistiques */}
          {showStats && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 80 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>{stats.total}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Total</Text>
              </View>
              <Pressable onPress={() => filterByStatus('pending')} style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 80 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#92400e' }}>{stats.pending}</Text>
                <Text style={{ fontSize: 12, color: '#a16207' }}>En attente</Text>
              </Pressable>
              <Pressable onPress={() => filterByStatus('validated')} style={{ backgroundColor: '#d1fae5', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 80 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#065f46' }}>{stats.validated}</Text>
                <Text style={{ fontSize: 12, color: '#047857' }}>Validés</Text>
              </Pressable>
              <Pressable onPress={() => filterByStatus('needs_image_change')} style={{ backgroundColor: '#fed7aa', padding: 12, borderRadius: 8, alignItems: 'center', minWidth: 80 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#9a3412' }}>{stats.needsImageChange}</Text>
                <Text style={{ fontSize: 12, color: '#c2410c' }}>Image</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Corps principal */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 32 }}>
        <View style={{ backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
          
          {/* Navigation */}
          <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              onPress={goToPrevious}
              disabled={currentIndex === 0}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                backgroundColor: 'white', 
                borderRadius: 8, 
                opacity: currentIndex === 0 ? 0.5 : 1 
              }}
            >
              <Ionicons name="chevron-back" size={20} color="#374151" />
              <Text style={{ marginLeft: 8, color: '#374151' }}>Précédent</Text>
            </Pressable>

            <Text style={{ fontSize: 14, color: '#64748b' }}>
              {currentIndex + 1} / {events.length}
            </Text>

            <Pressable
              onPress={goToNext}
              disabled={currentIndex === events.length - 1}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingHorizontal: 16, 
                paddingVertical: 8, 
                backgroundColor: 'white', 
                borderRadius: 8,
                opacity: currentIndex === events.length - 1 ? 0.5 : 1 
              }}
            >
              <Text style={{ marginRight: 8, color: '#374151' }}>Suivant</Text>
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Contenu de l'événement */}
          <View style={{ padding: 24 }}>
            {/* Image et métadonnées */}
            <View style={{ marginBottom: 32 }}>
              <View style={{ aspectRatio: 16/9, backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {currentEvent.illustration_url ? (
                  <Image
                    source={{ uri: currentEvent.illustration_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('=== 🚨 ERREUR IMAGE ===');
                      console.log('Titre:', currentEvent.titre);
                      console.log('URL:', currentEvent.illustration_url);
                      console.log('Erreur complète:', error);
                      
                      // Test HTTP pour diagnostiquer
                      fetch(currentEvent.illustration_url, { method: 'HEAD' })
                        .then(response => {
                          console.log('📊 Status HTTP:', response.status);
                          console.log('📊 OK:', response.ok);
                          if (!response.ok) {
                            console.log('❌ Problème d\'accès - vérifiez l\'URL');
                          }
                        })
                        .catch(err => {
                          console.log('❌ Erreur réseau:', err.message);
                        });
                    }}
                    onLoad={() => {
                      console.log('✅ Image chargée avec succès:', currentEvent.titre);
                    }}
                    onLoadStart={() => {
                      console.log('🔄 Début chargement image:', currentEvent.titre);
                    }}
                  />
                ) : (
                  <View style={{ 
                    flex: 1, 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    padding: 16 
                  }}>
                    <MaterialIcons name="image" size={32} color="#9ca3af" />
                    <Text style={{ 
                      textAlign: 'center', 
                      color: '#6b7280',
                      marginTop: 8 
                    }}>
                      Pas d'image disponible
                    </Text>
                    <Text style={{ 
                      textAlign: 'center', 
                      color: '#9ca3af',
                      fontSize: 12,
                      marginTop: 4 
                    }}>
                      {currentEvent.titre}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Métadonnées */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>Époque:</Text> {currentEvent.epoque}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold' }}>Types:</Text> {currentEvent.types_evenement?.join(', ') || 'Non défini'}
                </Text>
                {currentEvent.validation_notes && (
                  <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold' }}>Notes:</Text> {currentEvent.validation_notes}
                  </Text>
                )}
              </View>

              {/* Bouton de régénération */}
              <RegenerationButton
                eventId={currentEvent.id}
                titre={currentEvent.titre}
                year={parseInt(currentEvent.date_formatee)}
                currentImageUrl={currentEvent.illustration_url}
                onImageUpdated={handleImageUpdated}
              />
            </View>

            {/* Informations et validation */}
            <View>
              {/* Statut actuel */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#1f2937' }}>Validation</Text>
                {getStatusBadge(currentEvent.validation_status)}
              </View>

              {/* Titre et date */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Titre</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>{currentEvent.titre}</Text>
                </View>
                
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Date</Text>
                  <Text style={{ fontSize: 18, color: '#1f2937' }}>{currentEvent.date_formatee}</Text>
                </View>

                {currentEvent.description_detaillee && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Description</Text>
                    <Text style={{ fontSize: 16, color: '#374151' }}>{currentEvent.description_detaillee}</Text>
                  </View>
                )}
              </View>

              {/* Notes de validation */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Notes (optionnel)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  style={{ 
                    borderWidth: 1, 
                    borderColor: '#d1d5db', 
                    borderRadius: 8, 
                    padding: 12, 
                    minHeight: 80, 
                    textAlignVertical: 'top',
                    fontSize: 16
                  }}
                  multiline={true}
                  placeholder="Ajoutez des notes pour expliquer votre décision..."
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Boutons de validation */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <Pressable
                  onPress={() => validateEvent('validated')}
                  style={{ 
                    flex: 1, 
                    minWidth: 140,
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    backgroundColor: '#059669', 
                    borderRadius: 8 
                  }}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Valider</Text>
                </Pressable>

                <Pressable
                  onPress={() => validateEvent('needs_image_change')}
                  style={{ 
                    flex: 1, 
                    minWidth: 140,
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    backgroundColor: '#ea580c', 
                    borderRadius: 8 
                  }}
                >
                  <MaterialIcons name="image" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Changer Image</Text>
                </Pressable>

                <Pressable
                  onPress={() => validateEvent('needs_title_change')}
                  style={{ 
                    flex: 1, 
                    minWidth: 140,
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    backgroundColor: '#7c3aed', 
                    borderRadius: 8 
                  }}
                >
                  <MaterialIcons name="edit" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Changer Titre</Text>
                </Pressable>

                <Pressable
                  onPress={() => validateEvent('rejected')}
                  style={{ 
                    flex: 1, 
                    minWidth: 140,
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    paddingHorizontal: 16, 
                    paddingVertical: 12, 
                    backgroundColor: '#dc2626', 
                    borderRadius: 8 
                  }}
                >
                  <Ionicons name="close" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Rejeter</Text>
                </Pressable>
              </View>

              {/* Informations de validation existante */}
              {currentEvent.validated_by && (
                <View style={{ marginTop: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, color: '#374151' }}>
                    <Text style={{ fontWeight: 'bold' }}>Validé par:</Text> {currentEvent.validated_by}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#374151' }}>
                    <Text style={{ fontWeight: 'bold' }}>Le:</Text> {new Date(currentEvent.validated_at!).toLocaleString('fr-FR')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Navigation rapide en bas */}
        <View style={{ marginTop: 24, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1f2937' }}>Navigation rapide</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Pressable
              onPress={() => {
                const nextPending = events.findIndex((e, i) => 
                  i > currentIndex && e.validation_status === 'pending'
                );
                if (nextPending !== -1) setCurrentIndex(nextPending);
              }}
              style={{ 
                flex: 1, 
                minWidth: 120,
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingHorizontal: 12, 
                paddingVertical: 12, 
                backgroundColor: '#fef3c7', 
                borderRadius: 8 
              }}
            >
              <MaterialIcons name="visibility" size={16} color="#92400e" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e', marginLeft: 4 }}>Suivant en attente</Text>
            </Pressable>

            <Pressable
              onPress={() => setCurrentIndex(0)}
              style={{ 
                flex: 1, 
                minWidth: 120,
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingHorizontal: 12, 
                paddingVertical: 12, 
                backgroundColor: '#f1f5f9', 
                borderRadius: 8 
              }}
            >
              <MaterialIcons name="refresh" size={16} color="#475569" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginLeft: 4 }}>Retour début</Text>
            </Pressable>
          </View>
        </View>

        {/* Raccourcis mobile */}
        <View style={{ marginTop: 16, backgroundColor: '#dbeafe', borderColor: '#93c5fd', borderWidth: 1, borderRadius: 8, padding: 16 }}>
          <Text style={{ fontWeight: '600', color: '#1e3a8a', marginBottom: 8 }}>💡 Raccourcis mobiles</Text>
          <View>
            <Text style={{ fontSize: 14, color: '#1e40af', marginBottom: 4 }}>• <Text style={{ fontWeight: 'bold' }}>Swipe gauche/droite</Text> : Navigation</Text>
            <Text style={{ fontSize: 14, color: '#1e40af', marginBottom: 4 }}>• <Text style={{ fontWeight: 'bold' }}>Tap long sur image</Text> : Zoom</Text>
            <Text style={{ fontSize: 14, color: '#1e40af', marginBottom: 4 }}>• <Text style={{ fontWeight: 'bold' }}>Stats colorées</Text> : Tap pour filtrer</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}