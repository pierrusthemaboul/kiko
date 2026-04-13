import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Save, Wand2, ArrowLeft, Image as ImageIcon, Calendar, FileText } from 'lucide-react';
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
  niveau_difficulte?: number;
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
        illustration_url: eventData.illustration_url
      })
      .eq('id', eventData.id);
      
    if (!error) {
      navigate(-1);
    } else {
      alert("Erreur: " + error.message);
    }
    setSaving(false);
  };

  const goToRetoucheImage = () => {
    if (!eventData) return;
    navigate(`/retouche-image?eventId=${eventData.id}&source=${source}`, {
      state: { event: eventData }
    });
  };

  if (loading) return <div className="editor-loading">Chargement...</div>;
  if (!eventData) return <div className="editor-loading">Événement introuvable.</div>;

  return (
    <div className="event-editor-fullpage">
      <header className="editor-header glass">
        <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20} /> Retour</button>
        <div className="header-info">
          <h2>Édition : {eventData.titre}</h2>
          <span className="source-badge">{source.toUpperCase()}</span>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
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
              <label><FileText size={16}/> Titre</label>
              <input type="text" value={eventData.titre} onChange={e => setEventData({...eventData, titre: e.target.value})} />
            </div>
            <div className="form-group">
              <label><Calendar size={16}/> Date (Brute)</label>
              <input type="text" value={eventData.date} onChange={e => setEventData({...eventData, date: e.target.value})} />
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
