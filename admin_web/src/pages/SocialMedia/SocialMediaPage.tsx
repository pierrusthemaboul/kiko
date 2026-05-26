import React, { useState } from 'react';
import { 
  Smartphone, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Sparkles, 
  Copy, 
  Download,
  Loader2,
  Check,
  Video
} from 'lucide-react';
import './SocialMediaPage.css';

interface GeneratedContent {
  platform: string;
  topic: string;
  content: any;
  rawResponse: string;
  generatedAt: string;
}

interface CaptureResult {
  success: boolean;
  videoPath: string;
  platform: string;
  duration: number;
  generatedAt: string;
}

const SocialMediaPage: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok']);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Gameplay capture states
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);

  // API URL - utilise variable d'environnement ou localhost
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const platforms = [
    { id: 'tiktok', name: 'TikTok', icon: Smartphone, color: '#FF0050' },
    { id: 'instagram', name: 'Instagram Reels', icon: Instagram, color: '#E4405F' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook Reels', icon: Facebook, color: '#1877F2' },
    { id: 'youtube', name: 'YouTube Shorts', icon: Youtube, color: '#FF0000' },
  ];

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const captureGameplay = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Veuillez sélectionner au moins une plateforme');
      return;
    }

    setCaptureLoading(true);
    setCaptureResult(null);

    try {
      const platform = selectedPlatforms[0]; // Utiliser la première plateforme sélectionnée

      // Étape 1: Démarrer la capture (POST)
      const startResponse = await fetch(`${apiUrl}/api/gameplay/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captureDuration: 60,
          targetDuration: 30,
          platform
        }),
      });

      if (!startResponse.ok) {
        throw new Error(`HTTP error! status: ${startResponse.status}`);
      }

      const { jobId } = await startResponse.json();

      // Étape 2: Streamer la progression (GET SSE)
      const streamResponse = await fetch(`${apiUrl}/api/gameplay/stream/${jobId}`);

      if (!streamResponse.ok) {
        throw new Error(`HTTP error! status: ${streamResponse.status}`);
      }

      // Lire le flux SSE
      const reader = streamResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Impossible de lire le flux de réponse');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            console.log('SSE Event:', data);

            if (data.step === 'complete') {
              setCaptureResult(data.result);
            } else if (data.step === 'error') {
              throw new Error(data.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur capture:', error);
      alert('Erreur lors de la capture: ' + (error as Error).message);
    } finally {
      setCaptureLoading(false);
    }
  };

  const generateContent = async () => {
    if (!topic.trim()) {
      alert('Veuillez entrer un sujet');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Veuillez sélectionner au moins une plateforme');
      return;
    }

    setLoading(true);
    setGeneratedContent([]);

    try {
      const response = await fetch(`${apiUrl}/api/social-media/generate-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          platforms: selectedPlatforms,
          eventType,
          eventDate,
          eventDescription,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedContent(data.results);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const downloadContent = (content: GeneratedContent) => {
    const text = JSON.stringify(content.content, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content.platform}_${content.topic.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = (content: GeneratedContent) => {
    const platform = platforms.find(p => p.id === content.platform);
    const Icon = platform?.icon || Smartphone;

    return (
      <div key={content.platform} className="platform-card glass">
        <div className="platform-header" style={{ borderColor: platform?.color }}>
          <div className="platform-info">
            <Icon size={24} style={{ color: platform?.color }} />
            <h3>{platform?.name}</h3>
          </div>
          <button 
            className="icon-button"
            onClick={() => downloadContent(content)}
            title="Télécharger"
          >
            <Download size={18} />
          </button>
        </div>

        <div className="content-body">
          {Object.entries(content.content).map(([key, value]) => {
            if (key === 'rawResponse') return null;
            
            return (
              <div key={key} className="content-section">
                <div className="section-header">
                  <h4>{key.replace(/_/g, ' ').toUpperCase()}</h4>
                  {typeof value === 'string' && (
                    <button 
                      className="copy-button"
                      onClick={() => copyToClipboard(value, `${content.platform}-${key}`)}
                    >
                      {copiedStates[`${content.platform}-${key}`] ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                </div>
                
                {Array.isArray(value) ? (
                  <ul className="content-list">
                    {value.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                ) : typeof value === 'string' ? (
                  <p className="content-text">{value}</p>
                ) : (
                  <pre className="content-json">{JSON.stringify(value, null, 2)}</pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="social-media-page">
      <header className="page-header glass">
        <div className="header-content">
          <div className="app-logo">
            <Sparkles className="gradient-text" size={32} />
            <h1>Générateur Social Media</h1>
          </div>
          <p className="header-subtitle">
            Créez du contenu optimisé pour TikTok, Instagram, Twitter, Facebook et YouTube
          </p>
        </div>
      </header>

      <main className="content">
        {/* Section Capture Gameplay */}
        <div className="generator-section glass">
          <h2>📱 Capture Gameplay (One-Click)</h2>

          <div className="form-group">
            <label>Plateforme cible *</label>
            <div className="platforms-grid">
              {platforms.map(platform => (
                <button
                  key={platform.id}
                  className={`platform-chip ${selectedPlatforms.includes(platform.id) ? 'active' : ''}`}
                  onClick={() => togglePlatform(platform.id)}
                  style={selectedPlatforms.includes(platform.id) ? { 
                    backgroundColor: platform.color + '20',
                    borderColor: platform.color 
                  } : {}}
                >
                  <platform.icon size={18} />
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="generate-button capture-button"
            onClick={captureGameplay}
            disabled={captureLoading}
          >
            {captureLoading ? (
              <>
                <Loader2 className="spin" size={20} />
                Capture en cours (60s)...
              </>
            ) : (
              <>
                <Video size={20} />
                Capturer Gameplay
              </>
            )}
          </button>

          {captureResult && (
            <div className="capture-result glass">
              <h3>✅ Capture réussie!</h3>
              <p>Plateforme: {captureResult.platform}</p>
              <p>Durée: {captureResult.duration}s</p>
              <p>Fichier: {captureResult.videoPath}</p>
              <button
                className="download-button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/${captureResult.videoPath}`;
                  link.download = `${captureResult.platform}_gameplay.mp4`;
                  link.click();
                }}
              >
                <Download size={16} />
                Télécharger la vidéo
              </button>
            </div>
          )}
        </div>

        <div className="generator-section glass">
          <h2>Configuration (Génération Texte)</h2>
          
          <div className="form-group">
            <label>Sujet / Thème *</label>
            <input
              type="text"
              placeholder="Ex: La Révolution Française, Les pyramides d'Égypte..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Type d'événement (optionnel)</label>
            <input
              type="text"
              placeholder="Ex: Bataille, Découverte, Scandale..."
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Date (optionnel)</label>
            <input
              type="text"
              placeholder="Ex: 1789, 14 juillet 1789..."
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description (optionnel)</label>
            <textarea
              placeholder="Description détaillée de l'événement..."
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Plateformes *</label>
            <div className="platforms-grid">
              {platforms.map(platform => (
                <button
                  key={platform.id}
                  className={`platform-chip ${selectedPlatforms.includes(platform.id) ? 'active' : ''}`}
                  onClick={() => togglePlatform(platform.id)}
                  style={selectedPlatforms.includes(platform.id) ? { 
                    backgroundColor: platform.color + '20',
                    borderColor: platform.color 
                  } : {}}
                >
                  <platform.icon size={18} />
                  {platform.name}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="generate-button"
            onClick={generateContent}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="spin" size={20} />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Générer le contenu
              </>
            )}
          </button>
        </div>

        {generatedContent.length > 0 && (
          <div className="results-section">
            <h2>Contenu généré</h2>
            <div className="results-grid">
              {generatedContent.map(renderContent)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SocialMediaPage;
