import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Calendar, 
  Tag, 
  ChevronRight,
  ChevronLeft,
  LayoutGrid, 
  List as ListIcon,
  LogOut,
  RefreshCcw,
  Plus,
  ListFilter,
  Grid,
  Zap,
  Trash2,
  Bot,
  Sparkles,
  X,
  ArrowUpCircle,
  Dices
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatPanel from '../components/ChatPanel';
import ImageRegenPanel from '../components/ImageRegenPanel/ImageRegenPanel';
import { VERSION } from '../version';
import './EventsPage.css';

interface Event {
  id: string;
  titre: string;
  date: string;
  date_evenement?: string;
  categorie: string;
  illustration_url: string;
  universel: boolean;
  donnee_corrigee: boolean;
  region: string;
  epoque: string;
  notoriete: number;
  niveau_difficulte: number;
  description_detaillee: string;
  created_at: string;
  inspection_one_by_one_status?: 'VALIDATED' | 'TITLE_REVIEW' | 'IMAGE_REVIEW' | null;
}


const PAGE_SIZE = 50;

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [epoqueFilter, setEpoqueFilter] = useState('all');
  const [isUniversel, setIsUniversel] = useState<boolean | null>(null);
  const [isCorrigé, setIsCorrigé] = useState<boolean | null>(null);
  const [hasImage, setHasImage] = useState<boolean | null>(null);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalCount, setTotalCount] = useState(2500);
  const [randomOffset, setRandomOffset] = useState(0);

  // Restore state from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('eventsPageState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.currentPage) setCurrentPage(state.currentPage);
        if (state.searchTerm !== undefined) setSearchTerm(state.searchTerm);
        if (state.categoryFilter) setCategoryFilter(state.categoryFilter);
        if (state.regionFilter) setRegionFilter(state.regionFilter);
        if (state.epoqueFilter) setEpoqueFilter(state.epoqueFilter);
        if (state.isUniversel !== undefined) setIsUniversel(state.isUniversel);
        if (state.isCorrigé !== undefined) setIsCorrigé(state.isCorrigé);
        if (state.hasImage !== undefined) setHasImage(state.hasImage);
        if (state.isRandomMode !== undefined) setIsRandomMode(state.isRandomMode);
        if (state.isRandomMode !== undefined) setIsRandomMode(state.isRandomMode);
      } catch (err) {
        console.error('Failed to parse session state', err);
      }
    }

    // Restore scroll position securely after a short delay
    const scrollPos = sessionStorage.getItem('eventsScrollPos');
    if (scrollPos) {
      setTimeout(() => window.scrollTo(0, parseInt(scrollPos, 10)), 100);
    }

    // Setup scroll listener
    const handleScroll = () => {
      sessionStorage.setItem('eventsScrollPos', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('eventsPageState', JSON.stringify({
      currentPage, searchTerm, categoryFilter, regionFilter, epoqueFilter, 
      isUniversel, isCorrigé, hasImage, isRandomMode
    }));
  }, [currentPage, searchTerm, categoryFilter, regionFilter, epoqueFilter, isUniversel, isCorrigé, hasImage, isRandomMode]);

  
  const [categories, setCategories] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [epoques, setEpoques] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Event>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  // --- Source Selection ---
  const [source, setSource] = useState<'evenements' | 'antichambre'>('evenements');

  // --- Régénération d'image ---
  const [isRegenPanelOpen, setIsRegenPanelOpen] = useState(false);

  // --- Filtre IA (résultats du chat injectés dans la grille) ---
  const [aiEvents, setAiEvents] = useState<Event[] | null>(null);
  const [aiQuery, setAiQuery] = useState<string>('');

  const displayedEvents = aiEvents ?? events;

  const clearAiFilter = () => { setAiEvents(null); setAiQuery(''); };

  const handleEventsFromChat = (found: Event[], query: string) => {
    setAiEvents(found);
    setAiQuery(query);
    // Fermer les filtres manuels si ouverts
    setShowFilters(false);
  };

  useEffect(() => {
    fetchMetadata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    resetAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, categoryFilter, regionFilter, epoqueFilter, isUniversel, isCorrigé, hasImage, debouncedSearch, isRandomMode]);

  const fetchMetadata = async () => {
    // Get unique values for filters using a better sample or dedicated query if possible
    // For now, let's just get more data to ensure we hit all categories
    const { data: eventsData, error } = await supabase.from(source).select('types_evenement, region, epoque').limit(3000);
    if (error) {
      console.error("Error fetching metadata:", error);
      return;
    }
    if (eventsData) {
      const allCats = eventsData.flatMap(i => i.types_evenement || []).filter(Boolean);
      setCategories([...new Set(allCats)].sort());
      setRegions([...new Set(eventsData.map(i => i.region).filter(Boolean))].sort());
      setEpoques([...new Set(eventsData.map(i => i.epoque).filter(Boolean))].sort());
      
      // Get real total count if possible
      const { count } = await supabase.from(source).select('*', { count: 'exact', head: true });
      if (count) setTotalCount(count);
    }
  };

  const resetAndFetch = async () => {
    setCurrentPage(1);
    setEvents([]);
    // On réinitialise aussi les résultats IA quand on change manuellement de source ou de filtres
    setAiEvents(null);
    setAiQuery('');
    
    let newOffset = 0;
    // Si on active le mode random, on définit un offset aléatoire immédiatement
    if (isRandomMode && !debouncedSearch) {
      const safeMax = Math.max(0, totalCount - PAGE_SIZE);
      newOffset = Math.floor(Math.random() * safeMax);
      setRandomOffset(newOffset);
    } else {
      setRandomOffset(0);
    }
    
    await fetchEvents(0, true, newOffset);
  };

  const fetchEvents = async (pageIdx: number, isReset: boolean = false, overrideOffset?: number) => {
    setLoading(true);

    const currentOffset = overrideOffset !== undefined ? overrideOffset : randomOffset;
    console.log('[DEBUG] fetchEvents called', { source, pageIdx, debouncedSearch, isRandomMode, offset: currentOffset });
    
    let query = supabase.from(aiEvents ? 'evenements_ai' : 'evenements').select('*', { count: 'exact' });
      
    // Store current navigation context for EventEditorPage Next/Prev features
    sessionStorage.setItem('currentEventsListContext', JSON.stringify({
       page: currentPage,
       totalItems: totalCount,
       filters: { searchTerm, categoryFilter, regionFilter, epoqueFilter, isUniversel, isCorrigé, hasImage }
    }));
    
    // Also grab all IDs for immediate adjacent navigation locally
    // Note: This requires the query to have been executed to get the data
    
    if (!debouncedSearch) {
      query = query.order('date', { ascending: false });
    }

    const start = (pageIdx * PAGE_SIZE) + currentOffset;
    query = query.range(start, start + PAGE_SIZE - 1);

    if (categoryFilter !== 'all') query = query.contains('types_evenement', [categoryFilter]);
    if (regionFilter !== 'all') query = query.eq('region', regionFilter);
    if (epoqueFilter !== 'all') query = query.eq('epoque', epoqueFilter);
    if (isUniversel !== null) query = query.eq('universel', isUniversel);
    if (isCorrigé !== null) query = query.eq('donnee_corrigee', isCorrigé);
    
    if (hasImage === true) query = query.not('illustration_url', 'is', null);
    if (hasImage === false) query = query.is('illustration_url', null);

    if (debouncedSearch) {
      console.log('[DEBUG] Searching for:', debouncedSearch);
      // On cherche uniquement dans titre et date_formatee pour éviter l'erreur SQL sur le type Date
      const term = `%${debouncedSearch}%`;
      query = query.or(`titre.ilike.${term},date_formatee.ilike.${term}`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[DEBUG] Supabase Fetch Error:', error);
      setLoading(false);
      return;
    }

    if (data) {
      console.log(`[DEBUG] Received ${data.length} events (Total count: ${count})`);
      if (isReset) {
        setEvents(data);
        sessionStorage.setItem('currentEventsIdsList', JSON.stringify(data.map(e => e.id)));
      } else {
        setEvents(prev => {
          const newEvents = [...prev, ...data];
          sessionStorage.setItem('currentEventsIdsList', JSON.stringify(newEvents.map(e => e.id)));
          return newEvents;
        });
      }
    }
    
    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const newPageIdx = newPage - 1;
    fetchEvents(newPageIdx, true);
    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };


  const handleLogout = () => supabase.auth.signOut();

  const handleEdit = (event: Event) => {
    setEditData({ ...event });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedEvent) return;
    setIsSaving(true);
    
    // Si on est en mode IA, l'événement provient de 'evenements'
    const updateSource = aiEvents ? 'evenements' : source;

    const { data, error } = await supabase
      .from(updateSource)
      .update(editData)
      .eq('id', selectedEvent.id)
      .select()
      .single();

    if (!error && data) {
      setEvents(prev => prev.map(e => e.id === data.id ? data : e));
      if (aiEvents) {
        setAiEvents(prev => prev ? prev.map(e => e.id === data.id ? data : e) : null);
      }
      setSelectedEvent(data);
      setIsEditing(false);
    } else if (error) {
      alert("Erreur lors de la mise à jour : " + error.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;

    // Si on est en mode IA, l'événement provient forcément de 'evenements' (voir chat_service.mjs)
    // Sinon, on utilise la source actuelle.
    const deleteSource = aiEvents ? 'evenements' : source;

    const { error } = await supabase
      .from(deleteSource)
      .delete()
      .eq('id', selectedEvent.id);

    if (!error) {
      // Mettre à jour les deux états pour garantir la disparition de la carte
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      if (aiEvents) {
        setAiEvents(prev => prev ? prev.filter(e => e.id !== selectedEvent.id) : null);
      }
      setSelectedEvent(null);
    } else {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };

  const closeDetails = () => {
    setSelectedEvent(null);
    setIsEditing(false);
    setIsRegenPanelOpen(false);
  };

  const handleChangeInspectionStatus = async (eventId: string, newStatus: Event['inspection_one_by_one_status'], e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    const updateSource = aiEvents ? 'evenements' : source;
    
    // Opt-in UI update for immediate feedback
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, inspection_one_by_one_status: newStatus } : ev));
    if (aiEvents) {
      setAiEvents(prev => prev ? prev.map(ev => ev.id === eventId ? { ...ev, inspection_one_by_one_status: newStatus } : ev) : null);
    }
    
    // DB Update
    const { error } = await supabase
      .from(updateSource)
      .update({ inspection_one_by_one_status: newStatus })
      .eq('id', eventId);
      
    if (error) {
      alert("Erreur: " + error.message);
    }
  };
  
  const handlePromote = async () => {
    if (!selectedEvent || source !== 'antichambre') return;
    if (!window.confirm("Voulez-vous vraiment envoyer cet événement en production ?")) return;
    
    setIsSaving(true);
    try {
      // 1. Désactiver les contraintes temporairement ou gérer l'ID si déjà existant
      // Le plus simple : on insère tout sauf l'ID (ou on le garde si on veut préserver les liens)
      const dataToInsert = { ...selectedEvent, donnee_corrigee: true };
      // @ts-expect-error - id exists on Event
      delete dataToInsert.id;
      
      const { error: insertError } = await supabase
        .from('evenements')
        .insert([dataToInsert]);
        
      if (insertError) throw insertError;
      
      // 2. Supprimer de l'antichambre
      const { error: deleteError } = await supabase
        .from('antichambre')
        .delete()
        .eq('id', selectedEvent.id);
        
      if (deleteError) throw deleteError;
      
      alert("Événement promu avec succès !");
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setSelectedEvent(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert("Erreur lors de la promotion : " + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = () => {
    if (!selectedEvent) return;
    setIsRegenPanelOpen(true);
  };

  const goToRetoucheImage = () => {
    if (!selectedEvent) return;
    const currentSource = aiEvents ? 'evenements' : source;
    navigate(`/retouche-image?eventId=${selectedEvent.id}&source=${currentSource}`, {
      state: { event: selectedEvent }
    });
  };

  return (
    <div className="events-container">
      {/* Header */}
      <header className="page-header glass">
        <div className="header-top">
          <div className="app-logo">
            <span className="gradient-text">K</span>
            <h1>Events <small style={{fontSize: '11px', color: '#4f46e5', fontWeight: 'bold'}}>[{VERSION}]</small></h1>
          </div>
          <button onClick={handleLogout} className="icon-button logout-btn">
            <LogOut size={20} />
          </button>
        </div>

        <div className="source-selector glass">
          <button 
            className={source === 'evenements' ? 'active' : ''} 
            onClick={() => setSource('evenements')}
          >
            🚀 Production
          </button>
          <button 
            className={source === 'antichambre' ? 'active' : ''} 
            onClick={() => setSource('antichambre')}
          >
            ⏳ Antichambre
          </button>
        </div>

        <div className="filters-row">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && resetAndFetch()}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`icon-button ${showFilters ? 'active' : ''}`}>
            <ListFilter size={20} />
          </button>
          
          <button 
             onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')} 
             className="icon-button"
             title="Changer l'affichage"
          >
             {viewMode === 'list' ? <LayoutGrid size={20} /> : <Grid size={20} />}
          </button>
          <button 
            className={`icon-button random-toggle ${isRandomMode ? 'active' : ''}`}
            onClick={() => setIsRandomMode(!isRandomMode)}
            title="Mode Aléatoire (Mélanger les époques)"
          >
             <Dices size={20} className={isRandomMode ? 'spin' : ''} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="filters-expanded"
            >
              <div className="filter-group">
                <label>Catégorie</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">Toutes</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Région</label>
                <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="all">Toutes</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="filter-group">
                <label>Époque</label>
                <select value={epoqueFilter} onChange={(e) => setEpoqueFilter(e.target.value)}>
                  <option value="all">Toutes</option>
                  {epoques.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div className="filter-switches">
                <button 
                  className={`switch-btn ${isUniversel === true ? 'active' : ''}`}
                  onClick={() => setIsUniversel(isUniversel === true ? null : true)}
                >
                  🌍 Universel
                </button>
                <button 
                  className={`switch-btn ${isCorrigé === true ? 'active' : ''}`}
                  onClick={() => setIsCorrigé(isCorrigé === true ? null : true)}
                >
                  ✅ Corrigé
                </button>
                <button 
                  className={`switch-btn ${hasImage === false ? 'active' : ''}`}
                  onClick={() => setHasImage(hasImage === false ? null : false)}
                >
                  🖼️ Sans image
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="content">
        {/* Bannière filtre IA */}
        {aiEvents && (
          <motion.div
            className="ai-filter-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="ai-filter-info">
              <Bot size={16} />
              <span><strong>Filtre IA</strong> — "{aiQuery}" — {aiEvents.length} résultat{aiEvents.length > 1 ? 's' : ''}</span>
            </div>
            <button className="ai-filter-clear" onClick={clearAiFilter} title="Revenir à la liste normale">
              <X size={16} /> Réinitialiser
            </button>
          </motion.div>
        )}

        <div className="content-header">
          <p className="stats">{displayedEvents.length} événements trouvés</p>
          <div className="view-toggle">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={18} />
            </button>
          </div>
        </div>

        {loading && !aiEvents ? (
          <div className="loading-state">
            <RefreshCcw className="spin" size={40} />
            <p>Chargement des événements...</p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="empty-state">
            <p>Aucun événement trouvé</p>
          </div>
        ) : (
          <div className={`events-${viewMode}`}>
            <AnimatePresence>
              {displayedEvents.map((event, index) => (
                <motion.div 
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`event-card glass ${viewMode}`}
                  onClick={() => navigate(`/edit-event/${event.id}?source=${aiEvents ? 'evenements' : source}`)}
                >
                  <div className="event-image">
                    {event.illustration_url ? (
                      <img src={event.illustration_url} alt={event.titre} loading="lazy" />
                    ) : (
                      <div className="image-placeholder">
                        <Tag size={30} />
                      </div>
                    )}
                    <div className="event-badge">{event.categorie}</div>
                  </div>
                  
                  <div className="event-info">
                    {viewMode === 'list' ? (
                       <div className="event-main-details">
                         <h3>{event.titre}</h3>
                         <div className="event-meta">
                           <span className="event-meta-item"><Calendar size={12}/> {event.date}</span>
                           <span className="event-meta-item"><Tag size={12}/> {event.categorie}</span>
                           <span className="event-meta-item">Niv. {event.niveau_difficulte || 1}</span>
                         </div>
                       </div>
                    ) : (
                       <div className="event-main-details">
                         <div className="event-meta" style={{ marginBottom: '4px' }}>
                           <span className="event-meta-item"><Calendar size={12}/> {event.date}</span>
                         </div>
                         <h3 style={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.titre}</h3>
                         <div className="event-meta" style={{ marginTop: '8px' }}>
                           <span className="event-meta-item">Niv. {event.niveau_difficulte || 1}</span>
                         </div>
                       </div>
                    )}

                     <div className="event-footer">
                       <span className={`status-pill ${event.donnee_corrigee ? 'corrigé' : 'à-corriger'}`}>
                         {event.donnee_corrigee ? 'Vérifié' : 'À corriger'}
                       </span>
                          <select 
                            className={`inline-status-select ${event.inspection_one_by_one_status ? event.inspection_one_by_one_status : 'PENDING'}`}
                            value={event.inspection_one_by_one_status || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => void handleChangeInspectionStatus(event.id, (e.target.value as Event['inspection_one_by_one_status']) || null, e)}
                          >
                            <option value="">Status: À évaluer</option>
                            <option value="VALIDATED">✅ Validé</option>
                            <option value="TITLE_REVIEW">📝 Titre à revoir</option>
                            <option value="IMAGE_REVIEW">🖼️ Image à revoir</option>
                          </select>
                       <ChevronRight size={16} className="arrow" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {totalPages > 1 && !loading && !aiEvents && (
          <div className="pagination-container glass">
            <button 
              className="pagination-btn" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            
            {getPageNumbers()[0] > 1 && (
              <>
                <button className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => handlePageChange(1)}>1</button>
                {getPageNumbers()[0] > 2 && <span className="pagination-ellipsis">...</span>}
              </>
            )}

            {getPageNumbers().map(p => (
              <button 
                key={p} 
                className={`pagination-btn ${currentPage === p ? 'active' : ''}`}
                onClick={() => handlePageChange(p)}
              >
                {p}
              </button>
            ))}

            {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
              <>
                {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                <button className={`pagination-btn ${currentPage === totalPages ? 'active' : ''}`} onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
              </>
            )}

            <button 
              className="pagination-btn" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>

      {/* FAB (Floating Action Button) */}
      <button className="fab">
        <Plus size={24} />
      </button>

      {/* Chat Panel IA */}
      <ChatPanel
        onEventsFound={(found, query) => handleEventsFromChat(found as Event[], query)}
      />

      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="modal-overlay" onClick={closeDetails}>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="event-detail-panel glass"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="detail-drag-handle"></div>
              
              <div className="detail-header">
                <button className="close-btn" onClick={closeDetails}>×</button>
                <div className="detail-meta">
                   <div className="detail-date">
                     <Calendar size={16} />
                     {selectedEvent.date}
                   </div>
                   <div className="detail-badge">{selectedEvent.region} • {selectedEvent.epoque}</div>
                </div>
              </div>

              <div className="detail-body">
                {isEditing ? (
                  <div className="edit-form">
                    <div className="edit-field">
                      <label>Titre</label>
                      <input 
                        type="text" 
                        value={editData.titre || ''} 
                        onChange={(e) => setEditData({...editData, titre: e.target.value})}
                      />
                    </div>
                    
                    <div className="edit-field">
                      <label>URL Illustration</label>
                      <input 
                        type="text" 
                        value={editData.illustration_url || ''} 
                        onChange={(e) => setEditData({...editData, illustration_url: e.target.value})}
                      />
                    </div>

                    <div className="edit-field">
                      <label>Description Détaillée</label>
                      <textarea 
                        rows={6}
                        value={editData.description_detaillee || ''} 
                        onChange={(e) => setEditData({...editData, description_detaillee: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="detail-image-container">
                      {selectedEvent.illustration_url ? (
                        <img src={selectedEvent.illustration_url} alt={selectedEvent.titre} />
                      ) : (
                        <div className="detail-image-placeholder">
                          <Tag size={48} />
                        </div>
                      )}
                    </div>

                    <h2 className="detail-title">{selectedEvent.titre}</h2>
                    
                    <div className="detail-section">
                      <h3>Catégories</h3>
                      <div className="detail-tags">
                        {((selectedEvent as unknown) as { types_evenement: string[] }).types_evenement?.map((t: string) => (
                          <span key={t} className="category-tag">{t}</span>
                        )) || <span className="category-tag">{selectedEvent.categorie}</span>}
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>Description Détaillée</h3>
                      <div className="detail-description">
                        {selectedEvent.description_detaillee || "Aucune description disponible."}
                      </div>
                    </div>
                  </>
                )}

                {/* Zone de régénération ancienne supprimée */}

                <div className="detail-actions">
                  {isEditing ? (
                    <>
                      <button className="action-btn primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button className="action-btn secondary" onClick={() => setIsEditing(false)}>Annuler</button>
                    </>
                  ) : (
                    <div className="actions-grid">
                      {source === 'antichambre' && (
                        <button className="action-btn promote" onClick={handlePromote} disabled={isSaving}>
                          <ArrowUpCircle size={14} /> Promouvoir en Prod
                        </button>
                      )}
                      <button className="action-btn primary" onClick={() => handleEdit(selectedEvent)}>Modifier</button>
                      <button
                        className="action-btn retouch"
                        onClick={goToRetoucheImage}
                        title="Ouvrir la page Retouche Image"
                      >
                        <Sparkles size={14} /> Retouche Image
                      </button>
                      <button
                        className="action-btn regen"
                        onClick={handleRegenerate}
                        title="Ouvrir le centre de régénération créative"
                      >
                        <Zap size={14} /> Régénérer l'image
                      </button>
                      <button className="action-btn danger" onClick={handleDelete}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Panel dédié à la régénération créative */}
      <AnimatePresence>
        {isRegenPanelOpen && selectedEvent && (
          <ImageRegenPanel 
            event={selectedEvent} 
            source={aiEvents ? 'evenements' : source}
            onClose={() => setIsRegenPanelOpen(false)}
            onUpdateImage={(newUrl: string) => {
              setEvents(prev => prev.map(ev =>
                ev.id === selectedEvent.id ? { ...ev, illustration_url: newUrl } : ev
              ));
              if (aiEvents) {
                setAiEvents(prev => prev ? prev.map(ev =>
                  ev.id === selectedEvent.id ? { ...ev, illustration_url: newUrl } : ev
                ) : null);
              }
              setSelectedEvent(prev => prev ? { ...prev, illustration_url: newUrl } : prev);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventsPage;
