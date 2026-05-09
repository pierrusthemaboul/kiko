import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Image as ImageIcon, 
  Search, 
  Save, 
  Trash2, 
  Wand2, 
  ChevronUp, 
  ChevronDown, 
  Globe, 
  Calendar, 
  Activity, 
  FileText,
  Info
} from 'lucide-react';
import ImageRegenPanel from './CreativeLab/ImageRegenPanel';
import './SasPage.css';

interface SasRecord {
  id: string;
  titre: string;
  date: string;
  description: string;
  wikidata_id: string;
  theme: string;
  statut: string;
  created_at: string;
  illustration_url?: string;
  universel?: boolean;
  region?: string;
  langue?: string;
  ecart_temps_max?: number;
  facteur_variation?: number;
  niveau_difficulte?: number;
  epoque?: string;
  date_formatee?: string;
  code?: string;
  date_precision?: string;
  ecart_temps_min?: number;
  frequency_score?: number;
  notoriete?: number;
  notoriete_fr?: number;
  notoriete_source?: string;
}

const SasPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<SasRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [isRegenPanelOpen, setIsRegenPanelOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'notoriete_fr', direction: 'asc' | 'desc' }>({ key: 'notoriete_fr', direction: 'desc' });

  useEffect(() => {
    let isMounted = true;
    const fetchSasRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sas')
        .select('*')
        .or('statut.is.null,statut.neq.ENVOYE_ANTICHAMBRE')
        .order('created_at', { ascending: false });
        
      if (error) {
         console.error("Erreur de récupération sas : ", error);
      } else if (isMounted) {
         setRecords(data || []);
         setSelectedRecordId(prev => prev || (data && data.length > 0 ? data[0].id : null));
      }
      if (isMounted) setLoading(false);
    };
    fetchSasRecords();
    return () => { isMounted = false; };
  }, []);

  const themes = useMemo(() => {
    const t = new Set(records.map(r => r.theme).filter(Boolean));
    return Array.from(t).sort((a, b) => {
       if (a.includes('🛑')) return -1;
       if (b.includes('🛑')) return 1;
       return a.localeCompare(b);
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    let result = records.filter(r => {
      const matchSearch = r.titre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTheme = selectedTheme ? r.theme === selectedTheme : true;
      return matchSearch && matchTheme;
    });

    // Sort logic
    result.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      if (sortConfig.key === 'date') {
        // Simple string comparison for dates
        valA = valA || '';
        valB = valB || '';
      } else {
        valA = valA || 0;
        valB = valB || 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchTerm, selectedTheme, sortConfig]);

  const selectedRecord = records.find(r => r.id === selectedRecordId);

  const toggleSort = (key: 'date' | 'notoriete_fr') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const navigateRecord = useCallback((direction: 'next' | 'prev') => {
    if (!selectedRecordId) return;
    const currentIndex = filteredRecords.findIndex(r => r.id === selectedRecordId);
    if (currentIndex === -1) return;
    
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= 0 && nextIndex < filteredRecords.length) {
      setSelectedRecordId(filteredRecords[nextIndex].id);
    }
  }, [selectedRecordId, filteredRecords]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateRecord('next');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateRecord('prev');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateRecord]);

  const handleUpdateImage = (eventId: string, newUrl: string) => {
    setRecords(prev => prev.map(r => r.id === eventId ? { ...r, illustration_url: newUrl } : r));
  };

  const toggleEventSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedEventIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const allIds = filteredRecords.map(r => r.id);
    const areAllSelected = allIds.every(id => selectedEventIds.includes(id));
    if (areAllSelected) {
       setSelectedEventIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
       setSelectedEventIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const selectIllustrated = () => {
    const illustratedIds = filteredRecords
      .filter(r => r.illustration_url)
      .map(r => r.id);
    setSelectedEventIds(prev => Array.from(new Set([...prev, ...illustratedIds])));
  };

  const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedEventIds.includes(r.id));

  const handleBulkTransfer = async () => {
    const selectedRecords = records.filter(r => selectedEventIds.includes(r.id) && r.illustration_url);
    if (selectedRecords.length === 0) {
      alert("Aucun des événements sélectionnés n'a d'illustration.");
      return;
    }

    if (!window.confirm(`Transférer ${selectedRecords.length} événements vers l'Antichambre ?`)) return;

    const toInsert = selectedRecords.map(r => {
      let normalizedDate = r.date;
      if (r.date !== null && r.date !== undefined) {
        const dateStr = String(r.date).trim();
        if (/^\d{1,4}$/.test(dateStr)) {
          normalizedDate = dateStr.padStart(4, '0') + '-01-01';
        }
      }

      return {
        titre: r.titre,
        date: normalizedDate,
        illustration_url: r.illustration_url,
        types_evenement: r.theme ? [r.theme] : [],
        notoriete_fr: r.notoriete_fr || r.notoriete || 50,
        statut_validation: 'EN_ATTENTE_VIDEUR'
      };
    });

    const { error: insErr } = await supabase.from('antichambre').insert(toInsert);

    if (!insErr) {
      await supabase
        .from('sas')
        .update({ statut: 'ENVOYE_ANTICHAMBRE' })
        .in('id', selectedRecords.map(r => r.id));
      
      const transferredIds = selectedRecords.map(r => r.id);
      setRecords(prev => prev.filter(r => !transferredIds.includes(r.id)));
      setSelectedEventIds([]);
      alert(`${selectedRecords.length} événements transférés avec succès !`);
    } else {
      alert("Erreur lors du transfert : " + insErr.message);
    }
  };

  const goToRetoucheImage = useCallback(() => {
    if (!selectedRecord) return;
    navigate(`/retouche-image?eventId=${selectedRecord.id}&source=sas`, {
      state: {
        event: {
          id: selectedRecord.id,
          titre: selectedRecord.titre,
          date: selectedRecord.date,
          description_detaillee: selectedRecord.description,
          illustration_url: selectedRecord.illustration_url
        }
      }
    });
  }, [navigate, selectedRecord]);

  const handleDelete = async () => {
    if (!selectedRecord) return;
    if (!window.confirm(`Supprimer définitivement "${selectedRecord.titre}" du SAS ?`)) return;

    const { error } = await supabase
      .from('sas')
      .delete()
      .eq('id', selectedRecord.id);

    if (!error) {
      const deletedId = selectedRecord.id;
      setRecords(prev => prev.filter(r => r.id !== deletedId));
      setSelectedEventIds(prev => prev.filter(id => id !== deletedId));
      
      const currentIndex = filteredRecords.findIndex(r => r.id === deletedId);
      if (filteredRecords.length > 1) {
        const nextIdx = currentIndex < filteredRecords.length - 1 ? currentIndex + 1 : currentIndex - 1;
        setSelectedRecordId(filteredRecords[nextIdx].id);
      } else {
        setSelectedRecordId(null);
      }
    } else {
      alert("Erreur lors de la suppression : " + error.message);
    }
  };

  return (
    <div className="sas-page-container">
      {/* Colonne de Gauche : Liste des sas */}
      <aside className="sas-list-panel">
        <div className="sas-list-header">
           <div className="header-top">
              <div onClick={selectAllFiltered} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={allFilteredSelected} 
                  onChange={() => {}} // Controlled by div onClick
                  style={{ cursor: 'pointer', transform: 'scale(1.3)' }}
                />
                <h2>LISTE SAS ({filteredRecords.length})</h2>
              </div>
              {selectedEventIds.length > 0 && (
                <button className="btn-clear-selection" onClick={() => setSelectedEventIds([])}>
                  Reset ({selectedEventIds.length})
                </button>
              )}
           </div>
           
           <div className="search-bar">
             <Search size={16} />
             <input 
               type="text" 
               placeholder="Rechercher..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)} 
             />
           </div>
           
           <div className="filter-row">
             <select 
               className="theme-filter" 
               value={selectedTheme} 
               onChange={(e) => setSelectedTheme(e.target.value)}
             >
                <option value="">Toutes les catégories</option>
                {themes.map(t => (
                   <option key={t} value={t}>{t}</option>
                ))}
             </select>
           </div>

           <div className="sort-bar">
              <button 
                className={`sort-btn ${sortConfig.key === 'date' ? 'active' : ''}`}
                onClick={() => toggleSort('date')}
              >
                <Calendar size={14} /> Date {sortConfig.key === 'date' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
              </button>
              <button 
                className={`sort-btn ${sortConfig.key === 'notoriete_fr' ? 'active' : ''}`}
                onClick={() => toggleSort('notoriete_fr')}
              >
                <Activity size={14} /> Notoriété {sortConfig.key === 'notoriete_fr' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
              </button>
           </div>
        </div>
        
        <div className="sas-list-content">
          {loading ? (
             <div className="loading-overlay">Chargement...</div>
          ) : (
            filteredRecords.map(r => (
               <div 
                 key={r.id}
                 className={`sas-list-item ${selectedRecordId === r.id ? 'active' : ''} ${selectedEventIds.includes(r.id) ? 'checked' : ''}`}
                 onClick={() => setSelectedRecordId(r.id)}
               >
                 <div className="item-visual">
                    {r.illustration_url ? (
                      <img src={r.illustration_url} alt="" />
                    ) : (
                      <ImageIcon size={20} color="#3f3f46" />
                    )}
                    <div className={`img-status-indicator ${r.illustration_url ? 'ok' : 'missing'}`} />
                 </div>

                 <div className="item-main">
                   <div className="item-header">
                     <span className="sas-item-title">{r.titre}</span>
                     <span className={`noto-badge ${r.notoriete_fr && r.notoriete_fr > 60 ? 'high' : ''}`}>
                        {r.notoriete_fr || r.notoriete || 0}
                     </span>
                   </div>
                   <div className="item-footer">
                     <span className="sas-item-date">{r.date || 'Sans date'}</span>
                     {r.notoriete_fr && r.notoriete_fr > 80 && (
                        <div className="gem-indicator" title="Pépite potentielle">
                           <Globe size={12} />
                        </div>
                     )}
                   </div>
                 </div>

                 <div className="selection-area" onClick={(e) => toggleEventSelection(e, r.id)} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 5 }}>
                   <input 
                      type="checkbox" 
                      checked={selectedEventIds.includes(r.id)} 
                      readOnly 
                      style={{ opacity: selectedEventIds.includes(r.id) ? 1 : 0, transition: 'opacity 0.2s' }}
                   />
                 </div>
               </div>
             ))
          )}
        </div>
      </aside>

      {/* Colonne de Droite : Editeur Complet */}
      <main className="sas-editor-panel">
         {selectedRecord ? (
            <div className="editor-container">
               <header className="editor-sticky-header">
                 <div className="record-navigation">
                    <button className="nav-btn" onClick={() => navigateRecord('prev')} title="Précédent (↑)">
                       <ChevronUp size={20} />
                    </button>
                    <button className="nav-btn" onClick={() => navigateRecord('next')} title="Suivant (↓)">
                       <ChevronDown size={20} />
                    </button>
                 </div>

                 <div className="record-identity">
                    <h2>{selectedRecord.titre}</h2>
                    <div className="record-badges">
                       {selectedRecord.theme && <span className="badge theme">{selectedRecord.theme}</span>}
                       <span className={`badge status ${selectedRecord.statut?.toLowerCase()}`}>{selectedRecord.statut || 'BROUILLON'}</span>
                       {selectedRecord.universel && <span className="badge universal">Universel</span>}
                    </div>
                 </div>

                 <div className="editor-actions">
                   <button className="btn-save" onClick={goToRetoucheImage}>
                     <Wand2 size={18} /> Retouche Image
                   </button>
                   <button className="btn-save"><Save size={18} /> Enregistrer</button>
                   <button className="btn-delete-plain" onClick={handleDelete} title="Supprimer définitivement"><Trash2 size={18} /></button>
                 </div>
               </header>

               {/* Nouvelle barre d'action de transfert SAS -> Antichambre */}
               {selectedRecord.illustration_url && selectedRecord.statut !== 'ENVOYE_ANTICHAMBRE' && (
                  <div className="transfer-bar glass" style={{ padding: '1rem', margin: '0 1rem 1rem', background: 'rgba(5, 150, 105, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>
                     <div>
                       <strong style={{ color: '#10b981' }}>Illustration générée !</strong>
                       <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.8 }}>Cet événement est prêt à rejoindre l'Antichambre.</p>
                     </div>
                     <button 
                       className="btn-creative-gen-v3 small"
                       style={{ background: '#059669', borderColor: '#059669' }}
                       onClick={async () => {
                         if (window.confirm("Envoyer vers l'Antichambre ?")) {
                           // 1. Insert into antichambre
                           const { error: insErr } = await supabase.from('antichambre').insert([{
                             titre: selectedRecord.titre,
                             date: selectedRecord.date,
                             illustration_url: selectedRecord.illustration_url,
                             // Conversion theme string -> types_evenement array
                             types_evenement: selectedRecord.theme ? [selectedRecord.theme] : [],
                             notoriete_fr: selectedRecord.notoriete || 50,
                             statut_validation: 'EN_ATTENTE_VIDEUR'
                           }]);
                           if (!insErr) {
                             // 2. Update SAS
                             await supabase.from('sas').update({ statut: 'ENVOYE_ANTICHAMBRE' }).eq('id', selectedRecord.id);
                             setRecords(prev => prev.filter(r => r.id !== selectedRecord.id));
                           } else {
                             alert("Erreur: " + insErr.message);
                           }
                         }
                       }}
                     >
                        Envoyer à l'Antichambre
                     </button>
                  </div>
               )}

               <div className="editor-content-grid" key={selectedRecord.id}>
                  {/* LEFT: Image & Core Context */}
                  <div className="editor-sidebar-box">
                     <div className="image-hero-box glass">
                        {selectedRecord.illustration_url ? (
                           <img src={selectedRecord.illustration_url} alt="Illustration" />
                        ) : (
                           <div className="image-placeholder-v3 alarm">
                              <ImageIcon size={48} />
                              <p>ILLUSTRATION MANQUANTE</p>
                              <span>Générez une image pour valider cet événement</span>
                           </div>
                        )}
                        <button className="btn-float-regen" onClick={() => {
                           if (selectedEventIds.length === 0) setSelectedEventIds([selectedRecord.id]);
                           setIsRegenPanelOpen(true);
                        }}>
                           <Wand2 size={18} /> Lab Créatif
                        </button>
                     </div>

                     <div className="field-group-box glass">
                        <h3><Calendar size={16} /> Temporalité</h3>
                        <div className="field-row">
                           <label>Date Brute</label>
                           <input type="text" defaultValue={selectedRecord.date || ''} />
                        </div>
                        <div className="field-row">
                           <label>Formatage</label>
                           <input type="text" defaultValue={selectedRecord.date_formatee || ''} />
                        </div>
                        <div className="field-row">
                           <label>Précision</label>
                           <input type="text" defaultValue={selectedRecord.date_precision || ''} />
                        </div>
                     </div>

                     <div className="field-group-box glass">
                        <h3><Globe size={16} /> Localisation</h3>
                        <div className="field-row">
                           <label>Région</label>
                           <input type="text" defaultValue={selectedRecord.region || ''} />
                        </div>
                        <div className="field-row">
                           <label>Langue</label>
                           <input type="text" defaultValue={selectedRecord.langue || ''} />
                        </div>
                     </div>
                  </div>

                  {/* RIGHT: Biography & Scores */}
                  <div className="editor-main-box">
                     <div className="field-group-box full glass">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                           <h3 style={{ margin: 0 }}><FileText size={16} /> Description & Narration</h3>
                           {(selectedRecord.notoriete_fr || selectedRecord.notoriete || 0) > 80 && (
                              <span className="badge status ready" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                 💎 Pépite Historique
                              </span>
                           )}
                        </div>
                        <textarea 
                           className="description-editor" 
                           defaultValue={selectedRecord.description || ''} 
                           placeholder="Histoire détaillée de l'événement..."
                        />
                     </div>

                     <div className="scores-grid-v3">
                        <div className="score-card glass">
                           <label><Activity size={14} /> Notoriété</label>
                           <input type="number" defaultValue={selectedRecord.notoriete || ''} />
                           <div className="score-track"><div className="score-fill" style={{width: `${selectedRecord.notoriete || 0}%`}} /></div>
                        </div>
                        <div className="score-card glass">
                           <label><Info size={14} /> Difficulté</label>
                           <input type="number" defaultValue={selectedRecord.niveau_difficulte || ''} max={5} />
                           <div className="stars">{'★'.repeat(selectedRecord.niveau_difficulte || 0)}</div>
                        </div>
                        <div className="score-card glass">
                           <label>Variation</label>
                           <input type="number" step="0.1" defaultValue={selectedRecord.facteur_variation || ''} />
                        </div>
                        <div className="score-card glass">
                           <label>Écart Max</label>
                           <input type="number" defaultValue={selectedRecord.ecart_temps_max || ''} />
                        </div>
                     </div>

                     <div className="field-group-box glass metadata-box">
                        <h3>Technique</h3>
                        <div className="metadata-grid">
                           <div className="m-field">
                              <label>Code Unique</label>
                              <input type="text" defaultValue={selectedRecord.code || ''} />
                           </div>
                           <div className="m-field">
                              <label>Époque</label>
                              <input type="text" defaultValue={selectedRecord.epoque || ''} />
                           </div>
                           <div className="m-field">
                              <label>Wikidata</label>
                              <input type="text" defaultValue={selectedRecord.wikidata_id || ''} />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         ) : (
            <div className="empty-selection-v3">
               <div className="empty-content">
                  <Info size={48} />
                  <p>Sélectionnez un événement pour l'éditer</p>
                  <small>Utilisez les flèches ↑ ↓ pour naviguer</small>
               </div>
            </div>
         )}
      </main>

      {isRegenPanelOpen && selectedEventIds.length > 0 && (
         <ImageRegenPanel
           events={records.filter(r => selectedEventIds.includes(r.id))}
           onClose={() => {
             setIsRegenPanelOpen(false);
             // Keep the selection active or clear it? Better to keep it active so users can retry
           }}
           onUpdateImage={handleUpdateImage}
           source="sas"
         />
      )}

      {selectedEventIds.length > 1 && !isRegenPanelOpen && (
         <div className="bulk-actions-bar glass">
            <span>{selectedEventIds.length} événements sélectionnés</span>
             <button className="btn-bulk-regen" onClick={() => setIsRegenPanelOpen(true)}>
                <Wand2 size={16} /> Génération assistée par lot
             </button>
             <button 
               className="btn-bulk-regen" 
               style={{ background: '#059669', borderColor: '#059669' }}
               onClick={handleBulkTransfer}
             >
                <Save size={16} /> Transférer vers l'Antichambre
             </button>
             <button className="btn-bulk-clear" onClick={() => setSelectedEventIds([])}>Annuler</button>
         </div>
      )}
    </div>
  );
};

export default SasPage;
