import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase/supabaseClients';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Evenement {
  id: string;
  titre: string;
  date: string;
  illustration_url: string;
  categorie: string;
  tags: string[];
  statut?: string;
}

const ADMIN_EMAIL = 'pierre.cousin7@gmail.com';

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('toutes');
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Vérifier si l'utilisateur est autorisé
  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === ADMIN_EMAIL) {
      setUser(user);
      loadEvenements();
    } else {
      Alert.alert('Accès refusé', 'Vous n\'êtes pas autorisé à accéder à ce panneau d\'administration.');
    }
  };

  const loadEvenements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      const eventsWithStatus = data.map(event => ({
        ...event,
        statut: event.statut || 'actif'
      }));
      
      setEvenements(eventsWithStatus);
      setFilteredEvents(eventsWithStatus);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      Alert.alert('Erreur', 'Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvenements();
    setRefreshing(false);
  }, []);

  // Filtrage
  useEffect(() => {
    let filtered = evenements;

    // Filtrage par texte
    if (searchText) {
      filtered = filtered.filter(event =>
        event.titre.toLowerCase().includes(searchText.toLowerCase()) ||
        event.categorie?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtrage par catégorie
    if (selectedCategory !== 'toutes') {
      filtered = filtered.filter(event => event.categorie === selectedCategory);
    }

    setFilteredEvents(filtered);
  }, [evenements, searchText, selectedCategory]);

  // Actions rapides
  const handleRegenerateTitle = async (eventId: string) => {
    try {
      Alert.alert('Confirmation', 'Voulez-vous regénérer le titre de cet événement ?', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3001/api/events/${eventId}/regenerate-title`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': 'pierre.cousin7@gmail.com'
                }
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Succès', 'Titre regénéré avec succès');
                loadEvenements(); // Recharger la liste
              } else {
                throw new Error('Erreur API');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de regénérer le titre');
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de regénérer le titre');
    }
  };

  const handleRegenerateIllustration = async (eventId: string) => {
    try {
      Alert.alert('Confirmation', 'Voulez-vous regénérer l\'illustration de cet événement ?', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3001/api/events/${eventId}/regenerate-illustration`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': 'pierre.cousin7@gmail.com'
                }
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Succès', 'Illustration regénérée avec succès');
                loadEvenements(); // Recharger la liste
              } else {
                throw new Error('Erreur API');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de regénérer l\'illustration');
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de regénérer l\'illustration');
    }
  };

  const handleVerifyDate = async (eventId: string) => {
    try {
      Alert.alert('Confirmation', 'Voulez-vous vérifier la date de cet événement ?', [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: async () => {
            try {
              const response = await fetch(`http://localhost:3001/api/events/${eventId}/verify-date`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Email': 'pierre.cousin7@gmail.com'
                }
              });

              if (response.ok) {
                const result = await response.json();
                Alert.alert('Succès', `Date vérifiée: ${result.dateValid ? 'Valide' : 'Invalide'}`);
                loadEvenements(); // Recharger la liste
              } else {
                throw new Error('Erreur API');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de vérifier la date');
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de vérifier la date');
    }
  };

  // Obtenir les catégories uniques
  const categories = ['toutes', ...Array.from(new Set(evenements.map(e => e.categorie).filter(Boolean)))];

  const renderEventItem = ({ item }: { item: Evenement }) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => {
        setSelectedEvent(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.eventDate}>{item.date}</Text>
      </View>
      
      {item.illustration_url && (
        <View style={styles.imagePreview}>
          <Ionicons name="image" size={24} color="#00305A" />
          <Text style={styles.imageText}>Illustration</Text>
        </View>
      )}
      
      <View style={styles.eventFooter}>
        <Text style={styles.eventCategory}>{item.categorie || 'Non catégorisé'}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.statut}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.titleButton]}
          onPress={() => handleRegenerateTitle(item.id)}
        >
          <Ionicons name="refresh" size={16} color="white" />
          <Text style={styles.actionButtonText}>Titre</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.imageButton]}
          onPress={() => handleRegenerateIllustration(item.id)}
        >
          <Ionicons name="image-outline" size={16} color="white" />
          <Text style={styles.actionButtonText}>Image</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.dateButton]}
          onPress={() => handleVerifyDate(item.id)}
        >
          <Ionicons name="calendar-outline" size={16} color="white" />
          <Text style={styles.actionButtonText}>Date</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Accès non autorisé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00305A', '#F5821F']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🔧 Panneau Admin</Text>
        <Text style={styles.headerSubtitle}>Gestion des événements</Text>
      </LinearGradient>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un événement..."
          value={searchText}
          onChangeText={setSearchText}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des événements */}
      {loading ? (
        <ActivityIndicator size="large" color="#00305A" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal détails */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedEvent && (
              <>
                <Text style={styles.modalTitle}>{selectedEvent.titre}</Text>
                <Text style={styles.modalDate}>Date: {selectedEvent.date}</Text>
                <Text style={styles.modalCategory}>Catégorie: {selectedEvent.categorie}</Text>
                <Text style={styles.modalStatus}>Statut: {selectedEvent.statut}</Text>
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    marginBottom: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  categoryChipActive: {
    backgroundColor: '#00305A',
    borderColor: '#00305A',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#6C757D',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 15,
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 12,
    color: '#6C757D',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  imageText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#00305A',
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventCategory: {
    fontSize: 12,
    color: '#6C757D',
    fontStyle: 'italic',
  },
  statusBadge: {
    backgroundColor: '#E9967A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  titleButton: {
    backgroundColor: '#00305A',
  },
  imageButton: {
    backgroundColor: '#F5821F',
  },
  dateButton: {
    backgroundColor: '#E9967A',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    margin: 20,
    maxWidth: width * 0.9,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  modalDate: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 5,
  },
  modalCategory: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 5,
  },
  modalStatus: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#00305A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginTop: 50,
  },
});
