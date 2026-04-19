import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Image as ImageIcon, Search, Trash2, Wand2, 
  ShieldAlert, ShieldCheck, UserCheck, ChevronLeft, ChevronRight, X, Edit3
} from 'lucide-react';
import ImageRegenPanel from '../../components/ImageRegenPanel/ImageRegenPanel';
import './AntichambrePage.css';

interface AntichambreRecord {
  id: string;
  titre: string;
  date: string;
  types_evenement?: string[];
  created_at: string;
  illustration_url?: string;
  notoriete_fr?: number;
  statut_validation?: string;
  motif_refus?: string;
  description?: string;
}

const ITEMS_PER_PAGE = 30;

const AntichambrePage: React.FC = () => {
  const [records, setRecords] = useState<AntichambreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Regen Panel
  const [isRegenPanelOpen, setIsRegenPanelOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [inspectedEvent, setInspectedEvent] = useState<AntichambreRecord | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('antichambre')
      .select('id, titre, date, types_evenement, created_at, illustration_url, notoriete_fr, statut_validation, motif_refus, description')
      .order('created_at', { ascending: false });
      
    if (error) {
       console.error("Erreur de récupération antichambre : ", error);
    } else {
       setRecords(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Supprimer définitivement cet événement ?")) {
       await supabase.from('antichambre').delete().eq('id', id);
       setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleUpdateImage = (eventId: string, newUrl: string) => {
    setRecords(prev => prev.map(r => r.id === eventId ? { ...r, illustration_url: newUrl } : r));
  };

  const themes = useMemo(() => {
    const t = new Set<string>();
    records.forEach(r => {
       if (r.types_evenement && r.types_evenement.length > 0) {
          r.types_evenement.forEach(type => t.add(type));
       }
    });
    return Array.from(t).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = r.titre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTheme = selectedTheme ? r.types_evenement?.includes(selectedTheme) : true;
      const matchStatus = statusFilter ? r.statut_validation === statusFilter : true;
      return matchSearch && matchTheme && matchStatus;
    });
  }, [records, searchTerm, selectedTheme, statusFilter]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const currentRecords = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedTheme, statusFilter]);

  // Gestion de la sélection multiple (Ctrl/Shift-Click)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const handleCardClick = (e: React.MouseEvent, id: string) => {
      // Ignorer si on clique sur un bouton d'action
      if ((e.target as HTMLElement).closest('button')) return;

      const newSelection = new Set(selectedCards);

      if (e.shiftKey && lastSelected) {
          // Trouver l'index du début et de la fin dans currentRecords
          const startIndex = currentRecords.findIndex(r => r.id === lastSelected);
          const endIndex = currentRecords.findIndex(r => r.id === id);
          
          if (startIndex !== -1 && endIndex !== -1) {
              const start = Math.min(startIndex, endIndex);
              const end = Math.max(startIndex, endIndex);
              for (let i = start; i <= end; i++) {
                  newSelection.add(currentRecords[i].id);
              }
          }
      } else if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          if (newSelection.has(id)) {
              newSelection.delete(id);
          } else {
              newSelection.add(id);
          }
      } else {
          // Clic normal : tout désélectionner sauf lui (ou toggle si déjà le seul sélectionné)
          if (newSelection.size === 1 && newSelection.has(id)) {
              newSelection.clear();
          } else {
              newSelection.clear();
              newSelection.add(id);
          }
      }

      setSelectedCards(newSelection);
      setLastSelected(id);
      
      // Ouvrir le panneau de détails pour l'événement cliqué
      const clickedRecord = records.find(r => r.id === id);
      if (clickedRecord) setInspectedEvent(clickedRecord);
  };

  const selectAll = () => {
      if (selectedCards.size === filteredRecords.length && filteredRecords.length > 0) {
          setSelectedCards(new Set());
      } else {
          setSelectedCards(new Set(filteredRecords.map(r => r.id)));
      }
  };

  const handleLancerVideur = () => {
      if (selectedCards.size === 0) {
          alert('Veuillez sélectionner au moins un événement à faire passer par le Videur.');
          return;
      }
      const idsCmd = Array.from(selectedCards).join(' ');
      const cmd = `node tools/videur_evenements/agent.mjs ${idsCmd}`;
      navigator.clipboard.writeText(cmd);
      alert(`Commande copiée dans le presse-papier !\n\nCollez-la dans votre terminal pour lancer le Videur sur ces ${selectedCards.size} événements.\n\nCommande : ${cmd.substring(0, 50)}...`);
  };

  const getStatusBadge = (status: string | undefined) => {
    if (status === 'ACCEPTE') return <div className="status-badge accepte" title="Accepté"><ShieldCheck size={16} /></div>;
    if (status === 'REFUSE') return <div className="status-badge refuse" title="Refusé !"><ShieldAlert size={16} /></div>;
    if (status === 'CORRIGE') return <div className="status-badge corrige" title="Corrigé - À revalider" style={{ color: 'orange' }}><Wand2 size={16} /></div>;
    return <div className="status-badge attente" title="En attente de vérification"><UserCheck size={16} /></div>;
  };

  return (
    <div className="antichambre-grid-container" onClick={(e) => {
        // Désélection si clic dans le vide
        if (!(e.target as HTMLElement).closest('.event-card') && !(e.target as HTMLElement).closest('.filters-bar')) {
            setSelectedCards(new Set());
        }
    }}>
      <header className="antichambre-header glass">
        <div className="header-title">
          <h2>ANTICHAMBRE <span>({filteredRecords.length} / {records.length})</span></h2>
        </div>
        
        <div className="filters-bar">
          <div className="search-input">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>
            <option value="">Tous les Thèmes</option>
            {themes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE_VIDEUR">En Attente</option>
            <option value="ACCEPTE">Acceptés</option>
            <option value="REFUSE">Refusés</option>
            <option value="CORRIGE">Corrigés</option>
          </select>

          <button className="btn-select-all-antichambre" onClick={selectAll}>
            {selectedCards.size === filteredRecords.length && filteredRecords.length > 0 ? "Désélectionner" : "Tout sélectionner"}
          </button>

          <button className="btn-run-videur" onClick={handleLancerVideur} disabled={selectedCards.size === 0}>
             <ShieldCheck size={18} /> Lancer le Videur IA {selectedCards.size > 0 && `(${selectedCards.size})`}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Chargement massif en cours...</div>
      ) : (
        <>
           <div className="cards-grid">
             {currentRecords.map(record => {
                 const isSelected = selectedCards.has(record.id);
                 return (
                 <div 
                   key={record.id} 
                   className={`event-card ${record.statut_validation === 'REFUSE' ? 'card-refused' : ''} ${isSelected ? 'card-selected' : ''}`}
                   onClick={(e) => handleCardClick(e, record.id)}
                 >
                   
                   <div className="card-image-wrapper">
                      {record.illustration_url ? (
                        <img src={record.illustration_url} alt={record.titre} className="card-bg" loading="lazy" />
                      ) : (
                        <div className="no-image"><ImageIcon size={32} /></div>
                      )}
                      
                      {/* Checkbox virtuelle visuelle pour la sélection */}
                      {isSelected && (
                          <div className="card-selection-check">✓</div>
                      )}

                      <div className="card-overlay">
                         <div className="card-top-actions">
                            {getStatusBadge(record.statut_validation)}
                            <button 
                               className="btn-icon-danger" 
                               onClick={(e) => handleDelete(e, record.id)}
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                         
                         <div className="card-bottom-info">
                            <span className="card-theme">{record.types_evenement?.[0] || 'Général'}</span>
                            <h3 className="card-title">{record.titre}</h3>
                            <div className="card-meta">
                               <span className="card-date">{record.date}</span>
                               <span className="card-score">Score: {Math.round(record.notoriete_fr || 0)}</span>
                            </div>
                         </div>
                      </div>

                         {/* Hover Actions */}
                      <div className="card-hover-actions">
                        <button 
                          className="btn-grid-action"
                          onClick={() => {
                             setSelectedEventIds([record.id]);
                             setIsRegenPanelOpen(true);
                           }}
                        >
                            <Wand2 size={16} /> Retoucher {record.id.slice(0, 4)}
                         </button>
                         {record.statut_validation === 'REFUSE' && (
                           <div className="refusal-tooltip">
                              {record.motif_refus || "Motif inconnu"}
                           </div>
                         )}
                      </div>
                   </div>
                 </div>
                 );
             })}
           </div>

           {/* Pagination */}
           {totalPages > 1 && (
              <div className="pagination-bar">
                 <button 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => p - 1)}
                 ><ChevronLeft size={20} /></button>
                 
                 <span className="page-indicator">
                    Page {currentPage} sur {totalPages}
                 </span>

                 <button 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(p => p + 1)}
                 ><ChevronRight size={20} /></button>
              </div>
           )}
        </>
      )}

      {isRegenPanelOpen && selectedEventIds.length > 0 && records.find(r => r.id === selectedEventIds[0]) && (
         <ImageRegenPanel
           event={records.find(r => r.id === selectedEventIds[0])}
           onClose={() => setIsRegenPanelOpen(false)}
           onUpdateImage={(newUrl) => handleUpdateImage(selectedEventIds[0], newUrl)}
           source="antichambre"
         />
      )}

      {/* Panneau de détails (Inspecteur) */}
      {inspectedEvent && (
        <div className="event-details-drawer glass">
            <div className="drawer-header">
                <h3>Détails de l'événement</h3>
                <button className="btn-close-drawer" onClick={() => setInspectedEvent(null)}>
                    <X size={24} />
                </button>
            </div>
            
            <div className="drawer-content">
                {inspectedEvent.illustration_url && (
                    <img src={inspectedEvent.illustration_url} alt="" className="drawer-image" />
                )}
                
                <div className="drawer-section">
                    <h4>Titre</h4>
                    <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{inspectedEvent.titre}</p>
                </div>

                <div className="drawer-section">
                    <h4>Date</h4>
                    <p>{inspectedEvent.date}</p>
                </div>

                {inspectedEvent.statut_validation === 'REFUSE' && (
                    <div className="drawer-section">
                        <h4>⚠️ Motif du refus</h4>
                        <div className="drawer-refusal">
                            {inspectedEvent.motif_refus}
                        </div>
                    </div>
                )}

                <div className="drawer-section">
                    <h4>Description</h4>
                    <div className="drawer-description">
                        {inspectedEvent.description || "Aucune description disponible."}
                    </div>
                </div>

                <div className="drawer-section">
                    <h4>Thèmes</h4>
                    <div className="theme-chips">
                        {inspectedEvent.types_evenement?.map(t => (
                            <span key={t} className="status-badge" style={{ marginRight: '5px' }}>{t}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="drawer-footer">
                <button 
                  className="btn-run-videur" 
                  style={{ flex: 1 }}
                  onClick={() => {
                      setSelectedEventIds([inspectedEvent.id]);
                      setIsRegenPanelOpen(true);
                  }}
                >
                    <Edit3 size={18} /> Modifier l'image
                </button>
                <button 
                   className="btn-icon-danger" 
                   style={{ padding: '0.75rem', opacity: 1 }}
                   onClick={(e) => {
                       handleDelete(e, inspectedEvent.id);
                       setInspectedEvent(null);
                   }}
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AntichambrePage;
