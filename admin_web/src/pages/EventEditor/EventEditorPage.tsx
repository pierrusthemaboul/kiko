import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, Wand2, ArrowLeft, ArrowRight, Image as ImageIcon, Calendar, FileText, UploadCloud, Trash2 } from 'lucide-react';
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
  
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [cachedIds, setCachedIds] = useState<string[]>([]);

  useEffect(() => {
    const list = sessionStorage.getItem('currentEventsIdsList');
    if (list) {
      try {
        const ids = JSON.parse(list) as string[];
        setCachedIds(ids);
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (id && cachedIds.length > 0) {
      const idx = cachedIds.indexOf(id);
      setCurrentIndex(idx !== -1 ? idx : null);
    }
  }, [id, cachedIds]);

  const goNext = () => {
    if (currentIndex !== null && currentIndex < cachedIds.length - 1) {
      navigate(`/edit-event/${cachedIds[currentIndex + 1]}?source=${source}`, { replace: true });
    }
  };

  const goPrev = () => {
    if (currentIndex !== null && currentIndex > 0) {
      navigate(`/edit-event/${cachedIds[currentIndex - 1]}?source=${source}`, { replace: true });
    }
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
      navigate(-1);
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
      navigate(-1);
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

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventData) return;
    
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

  if (loading) return <div className="editor-loading">Chargement...</div>;
  if (!eventData) return <div className="editor-loading">Événement introuvable.</div>;

  return (
    <div className="event-editor-fullpage">
      <header className="editor-header glass">
        <button className="back-btn" onClick={() => navigate(-1)} style={{ color: 'var(--text-primary)', borderColor: 'var(--glass-border)', background: 'var(--bg-secondary)' }}>
          <ArrowLeft size={20} /> Retour
        </button>
        <div className="header-info">
          <h2>Édition : {eventData.titre}</h2>
          <span className="source-badge">{source.toUpperCase()}</span>
        </div>
        <div className="header-actions">
          {currentIndex !== null && currentIndex > 0 && (
            <button className="btn-secondary" onClick={goPrev} disabled={saving} style={{display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)'}}>
              <ArrowLeft size={16} />
            </button>
          )}
          {currentIndex !== null && currentIndex < cachedIds.length - 1 && (
            <button className="btn-secondary" onClick={goNext} disabled={saving} style={{display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)'}}>
              <ArrowRight size={16} />
            </button>
          )}
          <button 
            className="btn-secondary" 
            onClick={handleDelete} 
            disabled={saving} 
            style={{marginLeft: '12px', color: '#ef4444', borderColor: '#fca5a5', background: 'transparent'}}
            title="Supprimer l'événement">
            <Trash2 size={18} />
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{marginLeft: '12px'}}>
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
                  onChange={e => setEventData({...eventData, illustration_url: e.target.value})} 
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
              <label><FileText size={16}/> Titre</label>
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
