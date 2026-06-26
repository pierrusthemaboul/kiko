import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  RefreshCcw, 
  Edit, 
  Save, 
  X,
  TrendingUp,
  Gamepad2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import './DailyScoresPage.css';

interface DailyScore {
  user_id: string;
  display_name: string;
  daily_score: number;
  games_played_today: number;
  score_date: string;
  last_game_at: string;
  total_count: number;
}

const ITEMS_PER_PAGE = 50;

const DailyScoresPage: React.FC = () => {
  const [scores, setScores] = useState<DailyScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchDailyScores = useCallback(async (pageToFetch = 0) => {
    setLoading(true);
    setMessage(null);
    try {
      // Get total count first
      const { count, error: countError } = await supabase
        .from('game_scores')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get daily scores from view
      const { data, error } = await supabase
        .from('daily_scores_view')
        .select('*')
        .order('daily_score', { ascending: false })
        .range(pageToFetch * ITEMS_PER_PAGE, (pageToFetch + 1) * ITEMS_PER_PAGE - 1);

      if (error) throw error;
      
      setScores(data || []);
    } catch (err: unknown) {
      console.error('Error fetching daily scores:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage({ text: 'Erreur lors du chargement: ' + errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyScores(0);
  }, [fetchDailyScores]);

  const handleRefresh = () => {
    fetchDailyScores(page);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchDailyScores(newPage);
  };

  const handleEdit = (score: DailyScore) => {
    setEditingId(score.user_id);
    setEditScore(score.daily_score);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditScore(0);
  };

  const handleSaveScore = async (userId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('update_daily_score', {
        p_user_id: userId,
        p_new_score: editScore
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; action?: string };
      
      if (result.success) {
        setMessage({ text: result.message, type: 'success' });
        setEditingId(null);
        fetchDailyScores(page);
      } else {
        setMessage({ text: result.message || 'Erreur lors de la mise à jour', type: 'error' });
      }
    } catch (err: unknown) {
      console.error('Error updating score:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage({ text: 'Erreur: ' + errorMessage, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="daily-scores-page">
      <header className="page-header glass">
        <div className="header-icon">
          <Trophy size={32} />
        </div>
        <div className="header-title">
          <h1>Scores du Jour</h1>
          <p>Gérez les scores quotidiens des joueurs</p>
        </div>
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCcw size={18} className={loading ? "spin" : ""} />
          Actualiser
        </button>
      </header>

      <main className="scores-content">
        <div className="content-meta">
          <p>{totalCount} joueur(s) avec score aujourd'hui</p>
          {totalCount > ITEMS_PER_PAGE && (
            <div className="pagination glass">
              <button 
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0 || loading}
              >
                Précédent
              </button>
              <span>Page {page + 1} / {Math.ceil(totalCount / ITEMS_PER_PAGE)}</span>
              <button 
                onClick={() => handlePageChange(page + 1)}
                disabled={(page + 1) * ITEMS_PER_PAGE >= totalCount || loading}
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`message-banner ${message.type}`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="scores-grid">
          {scores.map((score, index) => (
            <motion.div 
              key={score.user_id} 
              className="score-card glass premium"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="card-accent"></div>
              <div className="rank-badge">
                #{index + 1}
              </div>
              
              <div className="card-header">
                <div className="player-info">
                  <div className="player-avatar">
                    {score.display_name?.charAt(0) || 'J'}
                  </div>
                  <div className="player-names">
                    <h3>{score.display_name || 'Joueur'}</h3>
                    <span className="player-id">{score.user_id.slice(0, 8)}...</span>
                  </div>
                </div>
                <button 
                  className="edit-btn"
                  onClick={() => editingId === score.user_id ? handleCancelEdit() : handleEdit(score)}
                  disabled={saving}
                >
                  {editingId === score.user_id ? <X size={16} /> : <Edit size={16} />}
                </button>
              </div>
              
              <div className="score-section">
                {editingId === score.user_id ? (
                  <div className="edit-score-input">
                    <input
                      type="number"
                      value={editScore}
                      onChange={(e) => setEditScore(parseInt(e.target.value) || 0)}
                      className="score-input"
                    />
                    <button 
                      className="save-score-btn"
                      onClick={() => handleSaveScore(score.user_id)}
                      disabled={saving}
                    >
                      {saving ? <RefreshCcw size={16} className="spin" /> : <Save size={16} />}
                    </button>
                  </div>
                ) : (
                  <div className="score-display">
                    <TrendingUp size={20} className="score-icon" />
                    <span className="score-value">{score.daily_score.toLocaleString()}</span>
                    <span className="score-label">pts</span>
                  </div>
                )}
              </div>

              <div className="stats-container">
                <div className="stat-item">
                  <Gamepad2 size={14} />
                  <span>{score.games_played_today} parties</span>
                </div>
                <div className="stat-item">
                  <Calendar size={14} />
                  <span>{new Date(score.score_date).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              <div className="card-footer">
                <span className="last-play">
                  Dernière partie: {new Date(score.last_game_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {scores.length === 0 && !loading && (
          <div className="empty-state">
            <Trophy size={48} className="empty-icon" />
            <h3>Aucun score aujourd'hui</h3>
            <p>Les scores du jour apparaîtront ici quand les joueurs commenceront à jouer</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DailyScoresPage;
