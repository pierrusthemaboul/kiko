import React, { useState, useRef, useEffect } from 'react';
import { 
  Zap,
  Layout,
  RefreshCw,
  Send,
  Database,
  Terminal,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './AdminOptionsPage.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface EventSuggestion {
  id: string;
  titre: string;
  date: string;
  description: string;
  score_popularite: number;
}

interface QpucTheme {
  id: string;
  label: string;
  events: EventSuggestion[];
}

interface CenturyStat {
  century_label: string;
  event_count: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'error' | 'success' | 'ai';
  message: string;
}

const AdminOptionsPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Expert Curateur prêt. Préparez vos thématiques ou lancez un QPUC Live." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [suggestionCount, setSuggestionCount] = useState(10);
  const [qpucThemes, setQpucThemes] = useState<QpucTheme[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [centuryStats, setCenturyStats] = useState<CenturyStat[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);
  
  const [config, setConfig] = useState({
    modeQpucLive: false,
    antiDoublon: true,
    avoidDeaths: true,
    tripleCheck: true
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (showLogs) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showLogs]);

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'ai' = 'info') => {
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    }]);
  };

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      const { data: stats, error } = await supabase.rpc('get_event_stats_by_century');
      if (isMounted && !error && stats) {
        setCenturyStats(stats);
        setTotalEvents(stats.reduce((acc: number, curr: any) => acc + Number(curr.event_count), 0));
      }
    };
    loadStats();
    return () => { isMounted = false };
  }, []);

  const handleImport = async (theme: QpucTheme) => {
    addLog(`Importation du deck "${theme.label}" en cours...`, "info");
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    const tableName = `sas_${todayStr}`;
    
    try {
      await supabase.rpc('create_dynamic_sas_table', { table_name: tableName });
      const { error } = await supabase.from(tableName).insert(theme.events.map(ev => ({
        titre: ev.titre,
        date: ev.date,
        description: ev.description,
        score_popularite: ev.score_popularite
      })));
      if (error) throw error;
      addLog(`Succès ! Deck importé dans ${tableName}`, "success");
      alert("Deck importé avec succès.");
    } catch (err: any) {
      addLog("Erreur import : " + err.message, "error");
    }
  };

  const handleStop = async () => {
    try {
      const envUrl = import.meta.env.VITE_CURATEUR_URL;
      const baseUrl = 'http://localhost:3010';
      addLog("🛑 Envoi du signal d'arrêt...", "info");
      await fetch(`${baseUrl}/api/curateur/stop`, { method: 'POST' });
    } catch (err: any) {
      addLog("Erreur lors de l'arrêt : " + err.message, "error");
    }
  };

  const handleGenerate = async () => {
    // 1. FORCE FEEDBACK IMMEDIAT
    console.log("🖱️ CLIC DÉTECTÉ SUR RAFALE");
    setIsGenerating(true);
    const themeLabel = config.modeQpucLive ? "QPUC LIVE (Archives)" : (chatInput || "Thème Aléatoire");
    
    addLog(`🚀 [UI] Déclenchement de la rafale...`, "ai");
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: themeLabel }]);

    const currentThemeId = crypto.randomUUID();
    setQpucThemes(prev => [{
      id: currentThemeId,
      label: themeLabel,
      events: []
    }, ...prev]);

    const eventBuffer: EventSuggestion[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushBuffer = () => {
      if (eventBuffer.length > 0) {
        const batch = [...eventBuffer];
        eventBuffer.length = 0;
        setQpucThemes(prev => prev.map(t => 
          t.id === currentThemeId 
            ? { ...t, events: [...t.events, ...batch] }
            : t
        ));
      }
    };

    try {
      const envUrl = import.meta.env.VITE_CURATEUR_URL;
      const baseUrl = 'http://localhost:3010';
      
      addLog(`📡 Appel du cerveau (${baseUrl})...`, "info");
      
      const response = await fetch(`${baseUrl}/api/curateur/rafale`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          quantity: suggestionCount, 
          mode: config.modeQpucLive ? 'qpuc' : 'manual',
          theme: themeLabel
        })
      });

      if (!response.ok) {
        throw new Error(`Service injoignable (Status: ${response.status})`);
      }

      if (!response.body) throw new Error("Flux corrompu");
      
      addLog("✅ Connexion établie avec le cerveau IA.", "success");
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.status === 'log') {
                addLog(data.message, "info");
              } else if (data.status === 'info' && data.event) {
                eventBuffer.push({ ...data.event, id: crypto.randomUUID() });
                if (!flushTimer) {
                  flushTimer = setTimeout(() => {
                    flushBuffer();
                    flushTimer = null;
                  }, 200);
                }
              } else if (data.status === 'done') {
                addLog(data.message, "success");
              } else if (data.status === 'error') {
                addLog(data.message, "error");
              }
            } catch {
              // chunk partiel, on ignore
            }
          }
        });
      }
      flushBuffer();
    } catch (err: any) {
       addLog(`❌ ERREUR DE CONNEXION : ${err.message}`, "error");
       console.error(err);
    } finally {
      if (flushTimer) clearTimeout(flushTimer);
      setIsGenerating(false);
      setChatInput('');
    }
  };

  return (
    <div className="admin-options-container">
      <header className="options-header">
        <div className="header-title">
          <Zap className="zap-icon pulse-blue" />
          <div>
            <h1>CURATEUR IA <span className="version">v2.12</span></h1>
            <p>Expertise Historique & Inspiration QPUC</p>
          </div>
        </div>
        
        <div className="main-controls">
           <div className="control-group">
              <label>Plateforme</label>
              <div className="toggle-buttons">
                 <button className={!config.modeQpucLive ? 'active' : ''} onClick={() => setConfig({...config, modeQpucLive: false})}>MODÈLE LIBRE</button>
                 <button className={config.modeQpucLive ? 'active' : ''} onClick={() => setConfig({...config, modeQpucLive: true})}>QPUC LIVE</button>
              </div>
           </div>

           <div className="control-group">
              <label>Quantité</label>
              <input type="number" className="count-input" value={suggestionCount} onChange={(e) => setSuggestionCount(Number(e.target.value))} min="1" max="200" />
           </div>

           <div className="action-buttons">
              <button className="btn-rafale" onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <RefreshCw className="spin" /> : <Zap />}
                {isGenerating ? "PROTOCOLE EN COURS..." : "LANCER LA RAFALE"}
              </button>
              
              {isGenerating && (
                <button className="btn-stop" onClick={handleStop}>
                  <AlertTriangle size={18} /> STOP
                </button>
              )}
           </div>
        </div>
      </header>

      <main className="split-view">
        <aside className="options-panel">
          <div className="panel-section">
             <h3>FILTRES & SÉCURITÉ</h3>
             <div className="status-grid">
                <div className={`status-item ${config.antiDoublon ? 'on' : ''}`} onClick={() => setConfig({...config, antiDoublon: !config.antiDoublon})}>
                   <ShieldCheck size={16} /> Anti-Doublon Sémantique
                </div>
                <div className={`status-item ${config.tripleCheck ? 'on' : ''}`} onClick={() => setConfig({...config, tripleCheck: !config.tripleCheck})}>
                   <RefreshCw size={16} /> Triple Check Wikipédia
                </div>
                <div className={`status-item ${config.avoidDeaths ? 'on' : ''}`} onClick={() => setConfig({...config, avoidDeaths: !config.avoidDeaths})}>
                   <AlertTriangle size={16} /> Filtrer les "Décès"
                </div>
             </div>
          </div>

          <div className="panel-section">
             <h3>DISCUTER AVEC L'IA</h3>
             <div className="chat-log">
                {messages.map(m => (
                  <div key={m.id} className={`chat-line ${m.role}`}>{m.content}</div>
                ))}
                <div ref={chatEndRef} />
             </div>
             {!config.modeQpucLive && (
               <div className="chat-input-row">
                  <input type="text" placeholder="Entrez une thématique..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGenerate()} />
                  <button className="chat-send" onClick={handleGenerate}><Send size={16} /></button>
               </div>
             )}
          </div>

          <div className="panel-section">
             <h3>ANALYSEUR DE VIDES RÉEL</h3>
             <div className="gap-mini-map">
                {centuryStats.slice(-15).map((s, i) => (
                   <div key={i} className="gap-bar" title={`${s.century_label}: ${s.event_count}`} style={{ height: `${Math.min(100, (Number(s.event_count) / 100) * 100)}%`, backgroundColor: Number(s.event_count) < 20 ? '#EBACA2' : '#4a919e' }}></div>
                ))}
             </div>
             <p className="gap-text">Base indexée : <b>{totalEvents}</b> événements.<br/>Focus conseillé : <b>Antiquité</b></p>
          </div>
        </aside>

        <section className="display-area">
           {qpucThemes.length === 0 && !isGenerating && (
             <div className="empty-display">
                <Layout size={64} style={{ opacity: 0.1 }} />
                <h2>PRÊT POUR LA RAFALE</h2>
                <p>Configurez vos filtres et lancez la génération thématique.</p>
             </div>
           )}

           {isGenerating && (
             <div className="generator-loader">
                <RefreshCw className="spin" size={64} style={{ color: '#EBACA2' }} />
                <h3>L'IA exécute ses protocoles de vérification...</h3>
                <p>Recherche sémantique, Wikipédia et détection de doublons.</p>
             </div>
           )}

           {qpucThemes.map(theme => (
             <div key={theme.id} className="deck-block">
                <div className="deck-header">
                   <div className="deck-info">
                     <h3>{theme.label}</h3>
                     <span className="badge counter">{theme.events.length} événements</span>
                   </div>
                   <button className="btn-import" onClick={() => handleImport(theme)}>
                      <Database size={18} /> VALIDER VERS SAS
                   </button>
                </div>
                <div className="event-stream">
                   {theme.events.map(ev => (
                     <div key={ev.id} className="event-capsule">
                        <span className="ev-date">{ev.date}</span>
                        <span className="ev-titre">{ev.titre}</span>
                        <span className="ev-pop">{ev.score_popularite}%</span>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </section>
      </main>

      <footer className={`admin-footer ${showLogs ? 'expanded' : ''}`}>
         <div className="footer-bar" onClick={() => setShowLogs(!showLogs)}>
            <div className="left"><Terminal size={14} /> <span>PROTOCOLE DE DIAGNOSTIC LIVE</span></div>
            <div className="right"><span>IA Status: <b>Gemini Core v2.2</b></span> {showLogs ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</div>
         </div>
         {showLogs && (
            <div className="logs-content">
               {logs.map(log => (
                  <div key={log.id} className={`log-entry ${log.type}`}>
                     <span className="timestamp">[{log.timestamp}]</span>
                     <span className="message">{log.message}</span>
                  </div>
               ))}
               <div ref={logEndRef} />
            </div>
         )}
      </footer>
    </div>
  );
};

export default AdminOptionsPage;
