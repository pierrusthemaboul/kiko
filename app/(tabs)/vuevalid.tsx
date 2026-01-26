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
  // Nouvelles colonnes pour la validation IA
  validation_score?: number;
  validation_explanation?: string;
  validation_detailed_analysis?: any;
}

interface ValidationStats {
  total: number;
  pending: number;
  validated: number;
  needsImageChange: number;
  needsTitleChange: number;
  rejected: number;
}

interface PromptGenerationState {
  isGenerating: boolean;
  generatedPrompt: string;
  isEditing: boolean;
  isSending: boolean;
  error: string | null;
  success: boolean;
}

// ==============================================================================
// COMPOSANT D'ÉVALUATION IA DE L'IMAGE
// ==============================================================================

function ImageEvaluator({ 
  currentEvent
}: {
  currentEvent: ValidationEvent;
}) {
  // Utiliser les données de validation stockées en base
  const score = currentEvent.validation_score || 0;
  const explanation = currentEvent.validation_explanation || 'Aucune évaluation IA disponible';
  const hasValidation = currentEvent.validation_score !== null;

  if (!currentEvent.illustration_url) return null;

  const getScoreColor = (score: number) => {
    if (score >= 8) return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
    if (score >= 6) return { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' };
    if (score >= 1) return { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' };
    return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' }; // Pas d'évaluation
  };

  const scoreColors = getScoreColor(score);

  return (
    <View style={{ 
      backgroundColor: scoreColors.bg, 
      borderWidth: 1, 
      borderColor: scoreColors.border, 
      borderRadius: 8, 
      padding: 12, 
      marginBottom: 16 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons 
            name={!hasValidation ? "help" : score >= 8 ? "check-circle" : score >= 6 ? "info" : "warning"} 
            size={20} 
            color={scoreColors.text} 
          />
          <Text style={{ marginLeft: 8, fontWeight: '600', color: scoreColors.text }}>
            {hasValidation ? 'Évaluation IA (sayon2.mjs)' : 'Pas d\'évaluation IA'}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: scoreColors.text }}>
            {hasValidation ? score : '?'}
          </Text>
          <Text style={{ fontSize: 14, color: scoreColors.text }}>/10</Text>
        </View>
      </View>
      
      <Text style={{ 
        fontSize: 14, 
        color: scoreColors.text, 
        marginTop: 8
      }}>
        {explanation}
      </Text>
      
      {hasValidation && currentEvent.validation_detailed_analysis && (
        <Text style={{ fontSize: 12, color: scoreColors.text, marginTop: 4, opacity: 0.8 }}>
          📊 Validation automatique lors de la génération
        </Text>
      )}
    </View>
  );
}

// ==============================================================================
// COMPOSANT DE GÉNÉRATION DE PROMPT ET IMAGE
// ==============================================================================

function PromptGenerator({ 
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
  const [state, setState] = useState<PromptGenerationState>({
    isGenerating: false,
    generatedPrompt: '',
    isEditing: false,
    isSending: false,
    error: null,
    success: false
  });

  // Générer le prompt avec GPT
  const generatePrompt = async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Pointer vers le serveur Express avec IP locale
      const response = await fetch('http://192.168.1.18:3001/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generatePrompt',
          titre,
          year,
          currentImageUrl
        })
      });

      if (!response.ok) throw new Error('Erreur génération prompt');
      
      const data = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generatedPrompt: data.prompt,
        isEditing: true
      }));

    } catch (error) {
      // Fallback avec prompt généré localement si l'API n'est pas disponible
      const fallbackPrompt = `A historical illustration depicting "${titre}" from year ${year}. Professional historical artwork style, detailed and accurate representation, muted historical colors, educational quality. No text, no modern elements, historically accurate scene.`;
      
      setState(prev => ({ 
        ...prev, 
        isGenerating: false,
        generatedPrompt: fallbackPrompt,
        isEditing: true,
        error: 'API non disponible - prompt généré localement'
      }));
    }
  };

  // Envoyer le prompt à Flux-schnell
  const sendToFlux = async () => {
    if (!state.generatedPrompt.trim()) return;

    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      const response = await fetch('http://192.168.1.18:3001/api/validation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generateImage',
          prompt: state.generatedPrompt,
          model: 'flux-schnell',
          num_inference_steps: 8,
          output_quality: 90
        })
      });

      if (!response.ok) throw new Error('Erreur génération image');
      
      const data = await response.json();
      
      // Sauvegarder en base
      const { error } = await supabase
        .from('goju')
        .update({
          illustration_url: data.imageUrl,
          prompt_flux: state.generatedPrompt,
          validation_notes: `Image régénérée avec prompt IA`,
          validated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        isSending: false,
        success: true
      }));
      
      onImageUpdated(data.imageUrl);

      // Reset après succès
      setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          success: false,
          isEditing: false,
          generatedPrompt: ''
        }));
      }, 3000);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isSending: false,
        error: error.message
      }));
    }
  };

  // Réinitialiser
  const reset = () => {
    setState({
      isGenerating: false,
      generatedPrompt: '',
      isEditing: false,
      isSending: false,
      error: null,
      success: false
    });
  };

  return (
    <View style={{ 
      backgroundColor: '#f8fafc', 
      borderWidth: 1, 
      borderColor: '#e2e8f0', 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 24 
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <MaterialCommunityIcons name="lightning-bolt" size={20} color="#7c3aed" />
        <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
          Génération d'image IA
        </Text>
      </View>

      {!state.isEditing && !state.success && (
        <Pressable
          onPress={generatePrompt}
          disabled={state.isGenerating}
          style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            backgroundColor: state.isGenerating ? '#e5e7eb' : '#7c3aed', 
            borderRadius: 8
          }}
        >
          {state.isGenerating ? (
            <MaterialIcons name="hourglass-empty" size={20} color="#6b7280" />
          ) : (
            <MaterialCommunityIcons name="magic-staff" size={20} color="white" />
          )}
          <Text style={{ 
            color: state.isGenerating ? '#6b7280' : 'white', 
            fontWeight: '600', 
            marginLeft: 8 
          }}>
            {state.isGenerating ? 'Génération du prompt...' : 'Générer un prompt IA'}
          </Text>
        </Pressable>
      )}

      {state.isEditing && (
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Prompt généré (modifiable)
          </Text>
          <TextInput
            value={state.generatedPrompt}
            onChangeText={(text) => setState(prev => ({ ...prev, generatedPrompt: text }))}
            style={{ 
              borderWidth: 1, 
              borderColor: '#d1d5db', 
              borderRadius: 8, 
              padding: 12, 
              minHeight: 100, 
              textAlignVertical: 'top',
              fontSize: 14,
              backgroundColor: 'white'
            }}
            multiline={true}
            placeholder="Modifiez le prompt avant l'envoi..."
            placeholderTextColor="#9ca3af"
          />
          
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={sendToFlux}
              disabled={state.isSending || !state.generatedPrompt.trim()}
              style={{ 
                flex: 1,
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingHorizontal: 16, 
                paddingVertical: 10, 
                backgroundColor: state.isSending ? '#e5e7eb' : '#059669', 
                borderRadius: 8
              }}
            >
              {state.isSending ? (
                <MaterialIcons name="hourglass-empty" size={18} color="#6b7280" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
              <Text style={{ 
                color: state.isSending ? '#6b7280' : 'white', 
                fontWeight: '600', 
                marginLeft: 8,
                fontSize: 14
              }}>
                {state.isSending ? 'Génération...' : 'Envoyer à Flux'}
              </Text>
            </Pressable>

            <Pressable
              onPress={reset}
              style={{ 
                paddingHorizontal: 16, 
                paddingVertical: 10, 
                backgroundColor: '#6b7280', 
                borderRadius: 8
              }}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      )}

      {state.success && (
        <View style={{ backgroundColor: '#dcfce7', borderColor: '#86efac', borderWidth: 1, borderRadius: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#15803d' }}>
              Image générée avec succès !
            </Text>
          </View>
        </View>
      )}

      {state.error && (
        <View style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="error" size={20} color="#ef4444" />
            <Text style={{ marginLeft: 8, fontWeight: '600', color: '#991b1b', flex: 1 }}>
              {state.error}
            </Text>
          </View>
        </View>
      )}
    </View>
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

  // Charger tous les événements et aller au premier non traité
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

      // Trouver le premier événement non traité
      const firstPendingIndex = (data || []).findIndex(event => 
        !event.validation_status || event.validation_status === 'pending'
      );
      
      if (firstPendingIndex !== -1) {
        setCurrentIndex(firstPendingIndex);
      } else {
        // Si tous sont traités, aller au premier
        setCurrentIndex(0);
      }

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
      const status = event.validation_status || 'pending';
      switch (status) {
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

      // Réinitialiser les notes et passer au suivant non traité
      setNotes('');
      goToNextPending();

      return true;
    } catch (error) {
      console.error('Erreur validation:', error);
      Alert.alert('Erreur', 'Impossible de valider l\'événement');
      return false;
    }
  };

  // Navigation vers le suivant non traité
  const goToNextPending = () => {
    const nextPendingIndex = events.findIndex((event, index) => 
      index > currentIndex && (!event.validation_status || event.validation_status === 'pending')
    );
    
    if (nextPendingIndex !== -1) {
      setCurrentIndex(nextPendingIndex);
    } else {
      // Si pas de suivant, aller au prochain dans l'ordre
      if (currentIndex < events.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
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
    const filteredEvents = events.filter(event => 
      (event.validation_status || 'pending') === status
    );
    if (filteredEvents.length > 0) {
      const firstIndex = events.findIndex(event => 
        (event.validation_status || 'pending') === status
      );
      setCurrentIndex(firstIndex);
    }
  };

  // Obtenir le badge de statut
  const getStatusBadge = (status: string) => {
    const actualStatus = status || 'pending';
    const statusConfig = {
      pending: { bg: '#fef3c7', text: '#92400e', label: 'En attente' },
      validated: { bg: '#d1fae5', text: '#065f46', label: 'Validé' },
      needs_image_change: { bg: '#fed7aa', text: '#9a3412', label: 'Image à changer' },
      needs_title_change: { bg: '#e9d5ff', text: '#6b21a8', label: 'Titre à changer' },
      rejected: { bg: '#fecaca', text: '#991b1b', label: 'Rejeté' }
    };

    const config = statusConfig[actualStatus] || statusConfig.pending;
    
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
            {/* Statut et titre */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#1f2937', flex: 1 }}>
                {currentEvent.titre}
              </Text>
              {getStatusBadge(currentEvent.validation_status)}
            </View>

            {/* Image et métadonnées */}
            <View style={{ marginBottom: 32 }}>
              {/* Évaluation IA de l'image */}
              <ImageEvaluator
                currentEvent={currentEvent}
              />
              
              <View style={{ aspectRatio: 16/9, backgroundColor: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {currentEvent.illustration_url ? (
                  <Image
                    source={{ uri: currentEvent.illustration_url }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('[vuevalid] Image load error', {
                        title: currentEvent.titre,
                        url: currentEvent.illustration_url,
                        error,
                      });
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
                  </View>
                )}
              </View>
              
              {/* Métadonnées */}
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>
                  {currentEvent.date_formatee}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>Époque:</Text> {currentEvent.epoque}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold' }}>Types:</Text> {currentEvent.types_evenement?.join(', ') || 'Non défini'}
                </Text>
                
                {currentEvent.description_detaillee && (
                  <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                    {currentEvent.description_detaillee}
                  </Text>
                )}
              </View>
            </View>

            {/* Boutons de validation - Maintenant en premier */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1f2937' }}>
                Décision de validation
              </Text>
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
                    paddingVertical: 14, 
                    backgroundColor: '#059669', 
                    borderRadius: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
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
                    paddingVertical: 14, 
                    backgroundColor: '#ea580c', 
                    borderRadius: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
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
                    paddingVertical: 14, 
                    backgroundColor: '#7c3aed', 
                    borderRadius: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
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
                    paddingVertical: 14, 
                    backgroundColor: '#dc2626', 
                    borderRadius: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <Ionicons name="close" size={20} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Rejeter</Text>
                </Pressable>
              </View>
            </View>

            {/* Génération de prompt IA - Maintenant après les boutons */}
            <PromptGenerator
              eventId={currentEvent.id}
              titre={currentEvent.titre}
              year={parseInt(currentEvent.date_formatee)}
              currentImageUrl={currentEvent.illustration_url}
              onImageUpdated={handleImageUpdated}
            />

            {/* Notes de validation */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                Notes (optionnel)
              </Text>
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
                  fontSize: 16,
                  backgroundColor: 'white'
                }}
                multiline={true}
                placeholder="Ajoutez des notes pour expliquer votre décision..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Informations de validation existante */}
            {currentEvent.validated_by && (
              <View style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: '#374151' }}>
                  <Text style={{ fontWeight: 'bold' }}>Validé par:</Text> {currentEvent.validated_by}
                </Text>
                <Text style={{ fontSize: 14, color: '#374151' }}>
                  <Text style={{ fontWeight: 'bold' }}>Le:</Text> {new Date(currentEvent.validated_at!).toLocaleString('fr-FR')}
                </Text>
                {currentEvent.validation_notes && (
                  <Text style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>
                    <Text style={{ fontWeight: 'bold' }}>Notes:</Text> {currentEvent.validation_notes}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Navigation rapide en bas */}
        <View style={{ marginTop: 24, backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#1f2937' }}>Navigation rapide</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Pressable
              onPress={() => {
                const nextPending = events.findIndex((e, i) => 
                  i > currentIndex && (!e.validation_status || e.validation_status === 'pending')
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
              onPress={() => {
                const firstPending = events.findIndex(e => 
                  !e.validation_status || e.validation_status === 'pending'
                );
                if (firstPending !== -1) setCurrentIndex(firstPending);
                else setCurrentIndex(0);
              }}
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
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginLeft: 4 }}>Premier en attente</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
