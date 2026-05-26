import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, Wand2, ArrowLeft, ArrowRight, Image as ImageIcon, Calendar, FileText, UploadCloud, Trash2, Copy } from 'lucide-react';
import ImageRegenPanel from '../Sas/CreativeLab/ImageRegenPanel';
import './EventEditorPage.css';

interface EventData {
  id: string;
  titre: string;
  date: string;
  description_detaillee?: string;
  illustration_url?: string;
  categorie?: string;
  region?: string;
  epoque?: string;
  notoriete?: number;
  notoriete_fr?: number;
  niveau_difficulte?: number;
  inspection_one_by_one_status?: 'VALIDATED' | 'TITLE_REVIEW' | 'IMAGE_REVIEW' | null;
}

const EventEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'evenements';
  
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRegenPanelOpen, setIsRegenPanelOpen] = useState(false);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [cachedIds, setCachedIds] = useState<string[]>([]);
  const [selectionContext, setSelectionContext] = useState<{selectedIds: string[], currentIndex: number, source: string} | null>(null);

  useEffect(() => {
    // Priorité au contexte de sélection
    const selection = sessionStorage.getItem('selectionContext');
    if (selection) {
      try {
        const context = JSON.parse(selection);
        setSelectionContext(context);
        setCachedIds(context.selectedIds);
        setCurrentIndex(context.currentIndex);
      } catch(e) {
        console.error('Failed to parse selection context', e);
      }
    } else {
      // Fallback à l'ancien système
      const list = sessionStorage.getItem('currentEventsIdsList');
      if (list) {
        try {
          const ids = JSON.parse(list) as string[];
          setCachedIds(ids);
        } catch(e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (id && cachedIds.length > 0) {
      const idx = cachedIds.indexOf(id);
      setCurrentIndex(idx !== -1 ? idx : null);
      
      // Mettre à jour le contexte de sélection si on est en mode sélection
      if (selectionContext && idx !== -1) {
        sessionStorage.setItem('selectionContext', JSON.stringify({
          ...selectionContext,
          currentIndex: idx
        }));
      }
    }
  }, [id, cachedIds, selectionContext]);

  const goNext = () => {
    if (currentIndex !== null && currentIndex < cachedIds.length - 1) {
      const nextId = cachedIds[currentIndex + 1];
      if (selectionContext) {
        sessionStorage.setItem('selectionContext', JSON.stringify({
          ...selectionContext,
          currentIndex: currentIndex + 1
        }));
      }
      navigate(`/edit-event/${nextId}?source=${source}`, { replace: true });
    }
  };

  const goPrev = () => {
    if (currentIndex !== null && currentIndex > 0) {
      const prevId = cachedIds[currentIndex - 1];
      if (selectionContext) {
        sessionStorage.setItem('selectionContext', JSON.stringify({
          ...selectionContext,
          currentIndex: currentIndex - 1
        }));
      }
      navigate(`/edit-event/${prevId}?source=${source}`, { replace: true });
    }
  };

  const exitSelectionMode = () => {
    sessionStorage.removeItem('selectionContext');
    setSelectionContext(null);
  };

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(source)
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setEventData(data as EventData);
        setPreviousImageUrl((data as EventData).illustration_url || null);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [id, source]);

  const handleSave = async () => {
    if (!eventData) return;
    setSaving(true);
    const { error } = await supabase
      .from(source)
      .update({
        titre: eventData.titre,
        date: eventData.date,
        description_detaillee: eventData.description_detaillee,
        illustration_url: eventData.illustration_url,
        inspection_one_by_one_status: eventData.inspection_one_by_one_status,
        notoriete_fr: eventData.notoriete_fr
      })
      .eq('id', eventData.id);

    if (!error) {
      // Stay on the same page after save
    } else {
      alert("Erreur: " + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!eventData) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) return;
    setSaving(true);
    const { error } = await supabase.from(source).delete().eq('id', eventData.id);
    if (!error) {
      // Si on est en mode sélection, naviguer vers l'événement suivant/précédent
      if (selectionContext && cachedIds.length > 1) {
        const currentIndexInSelection = cachedIds.indexOf(eventData.id);
        const newSelectionIds = cachedIds.filter(id => id !== eventData.id);
        
        sessionStorage.setItem('selectionContext', JSON.stringify({
          ...selectionContext,
          selectedIds: newSelectionIds,
          currentIndex: Math.max(0, currentIndexInSelection)
        }));
        
        // Naviguer vers l'événement suivant ou précédent
        if (currentIndexInSelection < newSelectionIds.length) {
          navigate(`/edit-event/${newSelectionIds[currentIndexInSelection]}?source=${source}`);
        } else if (currentIndexInSelection > 0) {
          navigate(`/edit-event/${newSelectionIds[currentIndexInSelection - 1]}?source=${source}`);
        } else {
          // Plus d'événements dans la sélection
          sessionStorage.removeItem('selectionContext');
          navigate('/events');
        }
      } else {
        navigate(-1);
      }
    } else {
      alert("Erreur: " + error.message);
      setSaving(false);
    }
  };

  const goToRetoucheImage = () => {
    if (!eventData) return;
    navigate(`/retouche-image?eventId=${eventData.id}&source=${source}`, {
      state: { event: eventData }
    });
  };

  const handleCopyTitle = async () => {
    if (!eventData?.titre) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(eventData.titre);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = eventData.titre;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Silent fail
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventData) return;
    
    // Sauvegarder l'image précédente
    setPreviousImageUrl(eventData.illustration_url || null);
    
    setSaving(true);
    try {
      // Optimisation locale (WebP + Resize)
      const { compressImage } = await import('../../lib/imageUtils');
      const compressedBlob = await compressImage(file, 1200, 0.8);
      const fileName = `${eventData.id}_manual_${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, compressedBlob, { 
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Immediately save it
      const { error: dbError } = await supabase
        .from(source)
        .update({ illustration_url: publicUrl })
        .eq('id', eventData.id);

      if (dbError) throw dbError;

      setEventData({...eventData, illustration_url: publicUrl});
      alert('Image uploadée avec succès !');
    } catch (err: any) {
      alert(`Erreur lors de l'upload: ${err.message}`);
    }
    setSaving(false);
  };

  const handleRestorePreviousImage = () => {
    if (!eventData || !previousImageUrl) return;
    setEventData({...eventData, illustration_url: previousImageUrl});
  };

  if (loading) return <div className="editor-loading">Chargement...</div>;
  if (!eventData) return <div className="editor-loading">Événement introuvable.</div>;

  return (
    <div className="event-editor-fullpage">
      <header className="editor-header glass">
        <button className="back-btn" onClick={() => {
          // Ne pas supprimer selectionContext lors du retour
          navigate('/events');
        }} style={{ color: 'var(--text-primary)', borderColor: 'var(--glass-border)', background: 'var(--bg-secondary)' }}>
          <ArrowLeft size={20} /> Retour
        </button>
        <div className="header-info">
          <h2>Édition : {eventData.titre}</h2>
          <span className="source-badge">{source.toUpperCase()}</span>
        </div>
        <div className="header-actions">
          {selectionContext && (
            <div className="selection-indicator">
              <span className="selection-badge">Mode sélection: {currentIndex !== null ? currentIndex + 1 : 0} / {cachedIds.length}</span>
              <button 
                className="btn-secondary btn-exit-selection"
                onClick={exitSelectionMode}
                title="Quitter le mode sélection"
                style={{marginLeft: '8px', padding: '4px 8px', fontSize: '0.8rem'}}
              >
                Quitter
              </button>
            </div>
          )}
          <button
            className="btn-secondary btn-copy-title"
            onClick={handleCopyTitle}
            disabled={saving}
            title="Copier le titre"
          >
            <Copy size={16} />
            <span>Copier titre</span>
          </button>
          {currentIndex !== null && currentIndex > 0 && (
            <button className="btn-secondary btn-nav" onClick={goPrev} disabled={saving} style={{display: 'flex', alignItems: 'center', gap: '6px', background: '#6366f1', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #4f46e5', color: 'white'}}>
              <ArrowLeft size={16} />
            </button>
          )}
          {currentIndex !== null && currentIndex < cachedIds.length - 1 && (
            <button className="btn-secondary btn-nav" onClick={goNext} disabled={saving} style={{display: 'flex', alignItems: 'center', gap: '6px', background: '#6366f1', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #4f46e5', color: 'white'}}>
              <ArrowRight size={16} />
            </button>
          )}
          <button 
            className="btn-secondary btn-delete-event" 
            onClick={handleDelete} 
            disabled={saving} 
            style={{marginLeft: '12px', color: '#ef4444', borderColor: '#fca5a5', background: 'transparent'}}
            title="Supprimer l'événement">
            <Trash2 size={18} />
          </button>
          <button className="btn-primary btn-save-event" onClick={handleSave} disabled={saving} style={{marginLeft: '12px'}}>
            <Save size={18} /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </header>

      <main className="editor-grid">
        <div className="editor-left-column">
          <div className="glass panel image-panel">
            {eventData.illustration_url ? (
              <img src={eventData.illustration_url} alt={eventData.titre} />
            ) : (
              <div className="image-placeholder"><ImageIcon size={48} /><p>Sans illustration</p></div>
            )}
            
            <div className="image-tools">
              {previousImageUrl && previousImageUrl !== eventData.illustration_url && (
                <button className="btn-restore" onClick={handleRestorePreviousImage} title="Restaurer l'image précédente">
                  <ArrowLeft size={18} /> Restaurer
                </button>
              )}
              <button className="btn-creative" onClick={() => setIsRegenPanelOpen(true)}>
                <Wand2 size={18} /> Lab Créatif Rapide
              </button>
              <button className="btn-retouche" onClick={goToRetoucheImage}>
                <ImageIcon size={18} /> Lab V2 (Retouche Image Avancée)
              </button>
              <label className="btn-retouche" style={{ cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <UploadCloud size={18} /> Upload Manuel
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleManualUpload} 
                />
              </label>
            </div>
            
            <div className="form-group">
                <label>URL d'illustration</label>
                <input 
                  type="text" 
                  value={eventData.illustration_url || ''} 
                  onChange={e => {
                    // Sauvegarder l'image précédente avant le changement
                    if (eventData.illustration_url && eventData.illustration_url !== e.target.value) {
                      setPreviousImageUrl(eventData.illustration_url);
                    }
                    setEventData({...eventData, illustration_url: e.target.value});
                  }} 
                />
            </div>
          </div>
        </div>

        <div className="editor-right-column">
          <div className="glass panel meta-panel">
            <h3>Meta Données</h3>
            <div className="form-group">
              <label>Statut de Validation (1 par 1)</label>
              <select 
                value={eventData.inspection_one_by_one_status || ''} 
                onChange={e => setEventData({...eventData, inspection_one_by_one_status: (e.target.value as any) || null})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                <option value="">À évaluer</option>
                <option value="VALIDATED">✅ Validé</option>
                <option value="TITLE_REVIEW">📝 Titre à revoir</option>
                <option value="IMAGE_REVIEW">🖼️ Image à revoir</option>
              </select>
            </div>
            <div className="form-group">
              <div className="title-row">
                <label><FileText size={16}/> Titre</label>
                <button
                  type="button"
                  className="btn-secondary btn-copy-inline"
                  onClick={handleCopyTitle}
                  disabled={saving}
                  title="Copier le titre"
                >
                  <Copy size={14} />
                  <span>Copier le titre</span>
                </button>
              </div>
              <input type="text" value={eventData.titre} onChange={e => setEventData({...eventData, titre: e.target.value})} />
            </div>
            <div className="form-group">
              <label><Calendar size={16}/> Date (Brute)</label>
              <input type="text" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>⭐ Notoriété FR (0-100)</label>
              <input 
                type="number" 
                value={eventData.notoriete_fr ?? ''} 
                onChange={e => setEventData({...eventData, notoriete_fr: parseInt(e.target.value) || 0})} 
              />
            </div>
            <div className="form-group">
              <label>Description Détaillée</label>
              <textarea 
                rows={12} 
                value={eventData.description_detaillee || ''} 
                onChange={e => setEventData({...eventData, description_detaillee: e.target.value})} 
              />
            </div>
          </div>
        </div>
      </main>

      {isRegenPanelOpen && (
        <ImageRegenPanel
          events={[eventData] as any}
          onClose={() => setIsRegenPanelOpen(false)}
          onUpdateImage={(_eventId: string, newUrl: string) => {
             setEventData({...eventData, illustration_url: newUrl});
          }}
          source={source}
        />
      )}
    </div>
  );
};

export default EventEditorPage;
