import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare,
  Calendar,
  Image as ImageIcon,
  Type,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import './ModerationPage.css';

interface Report {
  id: string;
  evenement_id: string;
  user_id: string | null;
  type_erreur: 'DATE_FAUSSE' | 'DESCRIPTION_FAUSSE' | 'IMAGE_INCOHERENTE' | 'TYPO' | 'AUTRE';
  message: string | null;
  created_at: string;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  evenements: {
    id: string;
    titre: string;
    date: string;
    illustration_url: string;
  };
}

const ModerationPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDING' | 'RESOLVED' | 'IGNORED'>('PENDING');

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('evenements_signalements')
        .select('*, evenements(id, titre, date, illustration_url)')
        .eq('status', filter)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data as unknown as Report[]);
      }
      setLoading(false);
    };

    fetchReports();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: 'RESOLVED' | 'IGNORED') => {
    const { error } = await supabase
      .from('evenements_signalements')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setReports(prev => prev.filter(r => r.id !== id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DATE_FAUSSE': return <Calendar size={16} className="type-icon date" />;
      case 'IMAGE_INCOHERENTE': return <ImageIcon size={16} className="type-icon image" />;
      case 'TYPO': return <Type size={16} className="type-icon typo" />;
      default: return <AlertTriangle size={16} className="type-icon other" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'DATE_FAUSSE': return 'Date incorrecte';
      case 'DESCRIPTION_FAUSSE': return 'Texte erroné';
      case 'IMAGE_INCOHERENTE': return 'Image HS';
      case 'TYPO': return 'Coquille / Typo';
      default: return 'Autre';
    }
  };

  return (
    <div className="moderation-page">
      <header className="page-header glass">
        <div className="header-content">
          <div className="title-group">
            <Shield className="header-icon" />
            <h1>Centre de Modération</h1>
          </div>
          <div className="status-tabs glass">
            <button 
              className={filter === 'PENDING' ? 'active' : ''} 
              onClick={() => setFilter('PENDING')}
            >
              En attente
            </button>
            <button 
              className={filter === 'RESOLVED' ? 'active' : ''} 
              onClick={() => setFilter('RESOLVED')}
            >
              Résolus
            </button>
            <button 
              className={filter === 'IGNORED' ? 'active' : ''} 
              onClick={() => setFilter('IGNORED')}
            >
              Ignorés
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {loading ? (
          <div className="loading-state">
            <Clock className="spin" size={40} />
            <p>Récupération des signalements...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="empty-state glass">
             <CheckCircle size={48} color="#22c55e" />
             <h2>Tout est propre !</h2>
             <p>Aucun signalement {filter === 'PENDING' ? 'en attente' : 'dans cette catégorie'}.</p>
          </div>
        ) : (
          <div className="reports-grid">
            <AnimatePresence>
              {reports.map((report, index) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="report-card glass"
                >
                  <div className="report-header">
                    <div className="type-badge">
                      {getTypeIcon(report.type_erreur)}
                      <span>{getTypeName(report.type_erreur)}</span>
                    </div>
                    <span className="report-date">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="report-body">
                    <div className="event-preview glass">
                      {report.evenements?.illustration_url && (
                        <img src={report.evenements.illustration_url} alt="Event" />
                      )}
                      <div className="event-info">
                        <h4>{report.evenements?.titre}</h4>
                        <span>{report.evenements?.date}</span>
                      </div>
                      <Link to={`/?search=${report.evenements?.id}`} className="view-event-btn">
                        <ArrowRight size={16} />
                      </Link>
                    </div>

                    {report.message && (
                      <div className="report-message glass">
                        <MessageSquare size={14} />
                        <p>{report.message}</p>
                      </div>
                    )}
                  </div>

                  <div className="report-actions">
                    <button 
                      className="action-btn resolve" 
                      onClick={() => updateStatus(report.id, 'RESOLVED')}
                    >
                      <CheckCircle size={16} /> Résolu
                    </button>
                    <button 
                      className="action-btn ignore" 
                      onClick={() => updateStatus(report.id, 'IGNORED')}
                    >
                      <XCircle size={16} /> Ignorer
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModerationPage;
