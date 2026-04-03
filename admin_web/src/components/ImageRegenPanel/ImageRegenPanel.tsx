import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  X, 
  RefreshCcw, 
  ChevronRight, 
  ChevronDown,
  Brain,
  Send,
  Sparkles,
  Camera,
  Palette,
  LayoutGrid,
  Library,
  Lightbulb,
  Shield,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';
import { CREATIVE_OPTIONS, STYLE_CATEGORIES } from '../../data/creativeOptions';
import './ImageRegenPanel.css';

// Groupes de niveau 1
const MASTER_LISTS = [
  { id: 'styles_mediums', label: 'Styles & Médiums', icon: Palette, categoryIds: ['photo', 'drawing', 'painting', 'print', 'mixed'] },
  { id: 'digital_multimedia', label: 'Digital & Multimédia', icon: LayoutGrid, categoryIds: ['digital', 'video', 'narrative'] },
  { id: 'mise_en_scene', label: 'Mise en Scène & Cadrage', icon: Camera, categoryIds: ['view_angle', 'timing_focus', 'vision_interp', 'atmos_light', 'state_texture', 'comp_layout', 'visual_narrative'] },
  { id: 'artistes_refs', label: 'Artistes & Références', icon: Library, categoryIds: ['masters_classic', 'masters_light', 'masters_impression', 'masters_modern', 'masters_illustra', 'masters_photo', 'masters_directors'] },
  { id: 'procedes_narration', label: 'Procédés & Narration Conceptuelle', icon: Lightbulb, categoryIds: ['rhetoric_visu', 'indirect_repr', 'image_const', 'time_relation', 'perception_pov', 'symbol_abstract', 'creative_power'] },
];

interface ImageRegenPanelProps {
  event: any;
  onClose: () => void;
  onUpdateImage: (newUrl: string) => void;
  source: string;
}

const ImageRegenPanel: React.FC<ImageRegenPanelProps> = ({ 
  event, 
  onClose, 
  onUpdateImage,
  source 
}) => {
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [activeMaster, setActiveMaster] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLegalSafetyActive, setIsLegalSafetyActive] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenSteps, setRegenSteps] = useState<any[]>([]);
  const [currentUrl, setCurrentUrl] = useState(event.illustration_url);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [directPromptInput, setDirectPromptInput] = useState('');
  const [activeTab, setActiveTab] = useState<'creative' | 'direct'>('creative');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    setIsRegenerating(true);
    setRegenSteps([]);
    setRegenSteps(prev => [...prev, { step: 'info', message: `🚀 Import local : ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` }]);

    try {
      // 1. Compression locale
      setRegenSteps(prev => [...prev, { step: 'brain_thinking', message: "🔧 Optimisation et compression en cours..." }]);
      const compressedBlob = await compressImage(file, 1500, 0.85);
      setRegenSteps(prev => [...prev, { step: 'info', message: `✅ Optimisation terminée : ${(compressedBlob.size / 1024).toFixed(1)} KB` }]);

      const fileName = `manual_${event.id}_${Date.now()}.webp`;
      setRegenSteps(prev => [...prev, { step: 'generate', message: "📤 Upload vers Supabase Storage..." }]);
      
      // 2. Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('evenements-image')
        .upload(fileName, compressedBlob, { 
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) throw new Error(`Erreur Storage: ${uploadError.message}`);

      // 3. Récupérer URL Publique
      const { data: { publicUrl } } = supabase.storage
        .from('evenements-image')
        .getPublicUrl(fileName);

      // 4. Mettre à jour la base de données
      const targetTable = source || 'evenements';
      const { error: dbError } = await supabase
        .from(targetTable)
        .update({ illustration_url: publicUrl })
        .eq('id', event.id);

      if (dbError) throw new Error(`Erreur DB: ${dbError.message}`);

      setRegenSteps(prev => [...prev, { step: 'complete', message: "✨ Illustration mise à jour avec succès !", publicUrl }]);
      setCurrentUrl(publicUrl);
      onUpdateImage(publicUrl);
    } catch (err: any) {
      setRegenSteps(prev => [...prev, { step: 'error', message: `❌ Échec: ${err.message}` }]);
    } finally {
      setIsRegenerating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredSubCategories = useMemo(() => {
    if (!activeMaster) return [];
    const master = MASTER_LISTS.find(m => m.id === activeMaster);
    return STYLE_CATEGORIES.filter(cat => master?.categoryIds.includes(cat.id));
  }, [activeMaster]);

  const filteredOptions = useMemo(() => {
    if (!activeCategory) return [];
    return CREATIVE_OPTIONS.filter(opt => opt.category === activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [regenSteps]);

  useEffect(() => {
     const handleClickOutside = (e: MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
           setActiveCategory(null);
        }
     };
     if (activeCategory) document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCategory]);

  const selectStyleRadio = (id: string, category: string) => {
    setSelectedStyles(prev => {
       const others = prev.filter(sId => {
          const opt = CREATIVE_OPTIONS.find(o => o.id === sId);
          return opt?.category !== category; 
       });
       if (prev.includes(id)) return others;
       return [...others, id];
    });
  };

  const handleAutoGenerate = async (forceAuto = false) => {
    setIsRegenerating(true);
    setRegenSteps([]);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const stylesToDeliver = forceAuto ? [] : selectedStyles.map(s => CREATIVE_OPTIONS.find(o => o.id === s)?.label);

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-regen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          id: event.id,
          titre: event.titre,
          date: event.date_evenement || event.date,
          description: event.description_detaillee,
          source: source,
          custom_styles: stylesToDeliver,
          legal_safety: isLegalSafetyActive
        }),
      });
      if (!res.ok) throw new Error('Erreur réseau');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Impossible d\'ouvrir le flux');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { continue; }
          try {
            const data = JSON.parse(trimmed);
            if (data.step === 'error') throw new Error(data.message);
            setRegenSteps(prev => [...prev, data]);
            if (data.step === 'complete') {
              setCurrentUrl(data.publicUrl);
              onUpdateImage(data.publicUrl);
            }
          } catch (e) { console.error(e); }
        }
      }
    } catch (err: any) {
      setRegenSteps(prev => [...prev, { step: 'error', message: err.message }]);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDirectGenerate = async () => {
    if (!directPromptInput.trim() || isRegenerating) return;
    setIsRegenerating(true);
    setRegenSteps([]);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-regen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          id: event.id,
          titre: event.titre,
          date: event.date_evenement || event.date,
          description: event.description_detaillee,
          source: source,
          direct_prompt: directPromptInput,
          legal_safety: false
        }),
      });
      if (!res.ok) throw new Error('Erreur réseau');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Impossible d\'ouvrir le flux');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { continue; }
          try {
            const data = JSON.parse(trimmed);
            if (data.step === 'error') throw new Error(data.message);
            setRegenSteps(prev => [...prev, data]);
            if (data.step === 'complete') {
              setCurrentUrl(data.publicUrl);
              onUpdateImage(data.publicUrl);
            }
          } catch (e) { console.error(e); }
        }
      }
    } catch (err: any) {
      setRegenSteps(prev => [...prev, { step: 'error', message: err.message }]);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <motion.div 
      className="regen-panel-overlay glass"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="regen-panel-container glass v3">
        <header className="regen-panel-header v3">
          <div className="header-left">
            <Sparkles size={24} className="accent-icon" />
            <div className="title-stack">
              <h3>Laboratoire Créatif V2</h3>
              <p className="event-title-line-v3"><strong>{event.titre}</strong> — {event.date}</p>
              {event.description_detaillee && <p className="event-desc-line-v3" title={event.description_detaillee}>{event.description_detaillee.length > 300 ? event.description_detaillee.substring(0, 300) + '...' : event.description_detaillee}</p>}
            </div>
          </div>
          <div className="header-actions">
             <div className="tab-selector-v3">
                <button 
                  className={`tab-btn-v3 ${activeTab === 'creative' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('creative')}
                >
                  🎭 Laboratoire
                </button>
                <button 
                  className={`tab-btn-v3 ${activeTab === 'direct' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('direct')}
                >
                  ⚡ Agent Direct
                </button>
             </div>
             <button className="close-btn" onClick={onClose}><X size={22} /></button>
          </div>
        </header>

        <div className="regen-panel-layout-v3">
          {/* --- Zone GAUCHE : Menu / Direct Prompt --- */}
          {activeTab === 'creative' ? (
            <aside className="styles-menu-v3">
              <div className="menu-scroll-v3">
                  {MASTER_LISTS.map(master => {
                    const Icon = master.icon;
                    const isOpen = activeMaster === master.id;
                    return (
                      <div key={master.id} className="master-group-v3">
                          <button 
                            className={`master-title-btn-v3 ${isOpen ? 'active' : ''}`}
                            onClick={() => setActiveMaster(isOpen ? null : master.id)}
                          >
                            <div className="label-with-icon">
                              <Icon size={18} />
                              <span>{master.label}</span>
                            </div>
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                                <motion.div 
                                  className="sub-categories-v3"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  {filteredSubCategories.map(cat => {
                                      const hasSelection = selectedStyles.some(sId => CREATIVE_OPTIONS.find(o => o.id === sId)?.category === cat.id);
                                      return (
                                        <button 
                                          key={cat.id}
                                          className={`category-btn-v3 ${activeCategory === cat.id ? 'active' : ''} ${hasSelection ? 'has-val' : ''}`}
                                          onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                        >
                                          <div className="label-content">
                                              {hasSelection && <div className="dot-indicator" />}
                                              <span>{cat.label}</span>
                                          </div>
                                          <ChevronRight size={14} />
                                        </button>
                                      );
                                  })}
                                </motion.div>
                            )}
                          </AnimatePresence>
                      </div>
                    );
                  })}
              </div>
            </aside>
          ) : (
            <aside className="direct-agent-sidebar glass">
               <div className="direct-agent-welcome">
                  <Zap size={32} className="zap-icon" />
                  <h4>Agent Direct</h4>
                  <p>Saisis ton prompt Flux Schnell. Aucune modification ne sera appliquée.</p>
               </div>
               
               <div className="prompt-area-container">
                  <textarea 
                    placeholder="Describe your image in English for Flux Schnell..."
                    value={directPromptInput}
                    onChange={(e) => setDirectPromptInput(e.target.value)}
                  />
                  <button 
                    className="btn-creative-gen-v3 small"
                    onClick={handleDirectGenerate}
                    disabled={isRegenerating || !directPromptInput.trim()}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    {isRegenerating ? <RefreshCcw className="spin" size={18} /> : <Send size={18} />}
                    <span>Générer l'illustration</span>
                  </button>
               </div>
            </aside>
          )}

          {/* --- Zone PRINCIPALE : Workspace --- */}
          <section className="creative-workspace-v3">
             <div className="workspace-scroll-v3">
                
                {/* MEGA MENU FLOATING */}
                <AnimatePresence>
                   {activeCategory && (
                      <motion.div 
                        ref={drawerRef}
                        className="mega-menu-floating glass"
                        initial={{ scale: 0.1, opacity: 0, originX: 0, originY: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.1, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 450 }}
                      >
                        <div className="mega-menu-header-v3">
                           <h4>{STYLE_CATEGORIES.find(c => c.id === activeCategory)?.label}</h4>
                           <p className="radio-hint">Choix unique par liste</p>
                           <button className="close-mega-btn" onClick={() => setActiveCategory(null)}><X size={16} /></button>
                        </div>
                        <div className="mega-menu-body-v3">
                           <div className="mega-menu-grid-v3">
                              {filteredOptions.map(opt => (
                                 <div 
                                   key={opt.id} 
                                   className={`radio-item-v3 ${selectedStyles.includes(opt.id) ? 'checked' : ''}`}
                                   onClick={() => selectStyleRadio(opt.id, opt.category)}
                                 >
                                    <div className="radio-visual-v3">
                                       {selectedStyles.includes(opt.id) && <motion.div layoutId="radio-dot" className="radio-dot" />}
                                    </div>
                                    <span>{opt.label}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                      </motion.div>
                   )}
                </AnimatePresence>

                <div className="creative-layout-3cols-v3">
                   {/* 🖼️ GAUCHE : Preview + Actions */}
                   <div className="layout-col preview-col">
                      <div className="preview-card-mini-v3 glass" onClick={() => currentUrl && setIsLightboxOpen(true)} style={{ cursor: currentUrl ? 'pointer' : 'default' }}>
                        <div className="media-container-small-v3">
                           {currentUrl ? <img src={currentUrl} alt="Preview" /> : <div className="placeholder-v3 small"><Camera size={32} /></div>}
                           {isRegenerating && (
                             <div className="media-loader-small-v3">
                                <RefreshCcw className="spin" size={24} />
                             </div>
                           )}
                        </div>
                        <div className="mini-card-stats-v3">
                           <span className="status-label">{isRegenerating ? 'Extraction créative...' : 'Prêt'}</span>
                        </div>
                      </div>

                      <div className="btn-stack-v3-small">
                        <button 
                          className="btn-auto-gen-v3 small" 
                          onClick={() => handleAutoGenerate(true)} 
                          disabled={isRegenerating}
                        >
                           <Brain size={16} /> Génération Automatique
                        </button>

                        <button 
                          className="btn-upload-v3 small" 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isRegenerating}
                        >
                           <UploadCloud size={16} /> Upload Manuel
                        </button>
                        <input 
                           type="file" 
                           ref={fileInputRef} 
                           style={{ display: 'none' }} 
                           accept="image/*" 
                           onChange={handleManualUpload} 
                        />

                        {selectedStyles.length > 0 && (
                          <button 
                            className="btn-creative-gen-v3 small" 
                            onClick={() => handleAutoGenerate(false)} 
                            disabled={isRegenerating}
                          >
                             <Zap size={16} /> Génération Assistée
                          </button>
                        )}
                      </div>
                   </div>

                   {/* 🔘 CENTRE : Coulisses */}
                   <div className="layout-col center-col glass">
                       <div className="backstage-header-static-v3">
                           <Brain size={16} />
                           <h5>Coulisses & Réflexions</h5>
                       </div>
                       <div className="log-list-v3 persistent">
                          {regenSteps.length === 0 && (
                             <div className="empty-logs">Aucune génération en cours...</div>
                          )}
                          {regenSteps.map((s, i) => (
                            <div key={i} className={`log-entry-v3 ${s.step}`}>
                               {s.step.includes('brain') ? <Brain size={12} /> : <ChevronRight size={10} />}
                               <span>{s.message}</span>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                       </div>
                   </div>

                   {/* 📊 DROITE : Console des Sélections */}
                   <div className="layout-col right-col selection-console-v3 glass">
                      <div className="console-header-v3">
                         <div className="console-title">
                            <Sparkles size={14} className="accent-icon" />
                            <span>Configuration Active</span>
                          </div>

                          <button 
                             className={`btn-legal-safety-v3 ${isLegalSafetyActive ? 'active' : ''}`}
                             onClick={() => setIsLegalSafetyActive(!isLegalSafetyActive)}
                          >
                             <Shield size={18} className={isLegalSafetyActive ? 'pulse-shield' : ''} />
                             <div className="txt">
                                <span>Droit à l'Image</span>
                                <small>{isLegalSafetyActive ? 'SÉCURITÉ MAXIMUM' : 'Standard'}</small>
                             </div>
                          </button>
                      </div>
                      
                      <div className="console-list-v3">
                         {selectedStyles.length === 0 && (
                           <div className="console-placeholder-v3">
                              <p>Aucun réglage actif.<br/>Choisissez un style à gauche.</p>
                           </div>
                         )}
                         {selectedStyles.map(sId => {
                            const opt = CREATIVE_OPTIONS.find(o => o.id === sId);
                            const cat = STYLE_CATEGORIES.find(c => c.id === opt?.category);
                            return (
                               <motion.div 
                                 key={sId} 
                                 className="console-item-v3"
                                 initial={{ opacity: 0, x: 20 }}
                                 animate={{ opacity: 1, x: 0 }}
                               >
                                  <div className="item-details">
                                     <span className="cat-label">{cat?.label.split(' ')[0]}</span>
                                     <span className="opt-label">{opt?.label}</span>
                                  </div>
                                  <button className="remove-item" onClick={() => selectStyleRadio(sId, opt?.category || '')}>
                                     <X size={14} />
                                  </button>
                               </motion.div>
                            );
                         })}
                      </div>
                      
                      {selectedStyles.length > 0 && (
                        <div className="console-footer-v3">
                           <button className="btn-clear-all" onClick={() => setSelectedStyles([])}>
                              <Trash2 size={12} /> Réinitialiser
                           </button>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </section>

          <AnimatePresence>
            {isLightboxOpen && currentUrl && (
                <motion.div 
                   className="lightbox-overlay-v3"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setIsLightboxOpen(false)}
                >
                    <img src={currentUrl} alt="En grand" />
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default ImageRegenPanel;
