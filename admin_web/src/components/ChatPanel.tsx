import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Trash2, Bot, Zap } from 'lucide-react';
import './ChatPanel.css';

interface ChatEvent {
  id: string;
  titre: string;
  date: string;
  illustration_url?: string;
  types_evenement?: string[];
  region?: string;
  donnee_corrigee?: boolean;
  notoriete?: number;
  similarity?: number;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  events?: ChatEvent[];
  timestamp: number;
}

// Historique Gemini (format API, stocké séparément)
type GeminiHistory = Array<{ role: string; parts: Array<{ text: string }> }>;

const STORAGE_KEY_MESSAGES = 'timalaus_chat_messages';
const STORAGE_KEY_HISTORY   = 'timalaus_chat_history';

interface ChatPanelProps {
  onEventsFound?: (events: ChatEvent[], query: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onEventsFound }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [geminiHistory, setGeminiHistory] = useState<GeminiHistory>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // On ne ferme que si le clic est hors du panel ET hors du bouton (fab)
      if (
        isOpen && 
        panelRef.current && 
        !panelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.chat-fab')
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Persister messages + historique Gemini dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(geminiHistory));
  }, [geminiHistory]);

  // Auto-scroll en bas
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  // Focus input à l'ouverture
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // On utilise l'URL de la fonction Supabase en production
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/admin-chat`;

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ message: text, history: geminiHistory }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        role: 'assistant',
        text: data.text,
        events: data.events || [],
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setGeminiHistory(data.history || []);

      // Injection des résultats dans la grille principale si onEventsFound est fourni
      if (onEventsFound && data.events && data.events.length > 0) {
        onEventsFound(data.events, text);
      }
    } catch (err: any) {
      setError(err.message || 'Impossible de contacter le serveur.');
      // Retirer le message user si erreur
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, geminiHistory, onEventsFound]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setGeminiHistory([]);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  };


  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        className="chat-fab"
        onClick={() => setIsOpen(prev => !prev)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Assistant IA Timalaus"
      >
        <AnimatePresence mode="wait">
          {isOpen
            ? <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} /></motion.span>
            : <motion.span key="open"  initial={{ rotate: 90,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquare size={22} /></motion.span>
          }
        </AnimatePresence>
        {messages.length > 0 && !isOpen && (
          <span className="chat-fab-badge">{messages.filter(m => m.role === 'assistant').length}</span>
        )}
      </motion.button>

      {/* Panel de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className="chat-panel glass"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <div className="chat-avatar">
                  <Bot size={16} />
                </div>
                <div>
                  <h3>Assistant Timalaus</h3>
                  <p>Propulsé par Gemini 2.0 Flash</p>
                </div>
              </div>
              <button className="chat-clear-btn" onClick={clearChat} title="Effacer la conversation">
                <Trash2 size={15} />
              </button>
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">
                  <Bot size={32} className="chat-empty-icon" />
                  <p>Bonjour ! Je peux fouiller ta base de données pour toi.</p>
                  <div className="chat-suggestions">
                    {[
                      'Événements sans image',
                      'Morts de personnalités célèbres',
                      'Combien d\'événements non corrigés ?',
                      'Catastrophes naturelles en Asie',
                    ].map(s => (
                      <button key={s} className="suggestion-chip" onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* On affiche juste un petit résumé au lieu des grosses miniatures qui encombrent */}
                  {msg.events && msg.events.length > 0 && (
                    <div className="message-status-pill">
                      <Zap size={10} />
                      <span>{msg.events.length} événements injectés dans la grille</span>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="chat-message assistant">
                  <div className="message-bubble loading">
                    <div className="loading-content">
                      <Loader2 size={16} className="spin" />
                      <span>{messages.length > 0 && messages[messages.length-1].role === 'user' && messages[messages.length-1].text.length > 30 ? 'Recherche approfondie...' : 'Gemini réfléchit...'}</span>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar" />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="chat-error">
                  <p>⚠️ {error.includes('Resource exhausted') || error.includes('429') 
                    ? "Quota Gemini atteint. L'IA est trop sollicitée actuellement, réessaye dans une minute." 
                    : error}</p>
                  <button className="error-retry-btn" onClick={() => {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                      setInput(lastUserMsg.text);
                      setError(null);
                    }
                  }}>Réessayer</button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Pose ta question sur la base de données..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isLoading}
              />
              <button
                className={`chat-send-btn ${isLoading || !input.trim() ? 'disabled' : ''}`}
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatPanel;
