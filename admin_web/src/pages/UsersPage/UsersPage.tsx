import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  RefreshCcw, 
  Shield, 
  Zap, 
  Trophy, 
  Star,
  Gamepad2,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import './UsersPage.css';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  xp_total: number;
  parties_per_day: number;
  parties_restantes: number;
  title_key: string;
  games_played: number;
  created_at: string;
  high_score: number;
  total_count: number;
}

const ITEMS_PER_PAGE = 100;

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchUsers = useCallback(async (pageToFetch = 0, isInitial = false) => {
    if (isInitial) setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('search_users_admin', { 
        p_search_term: searchTerm || '',
        p_offset: pageToFetch * ITEMS_PER_PAGE,
        p_limit: ITEMS_PER_PAGE
      });

      if (error) throw error;
      setUsers(data || []);
      if (data && data.length > 0) {
        setTotalCount(Number(data[0].total_count));
      } else {
        setTotalCount(0);
      }
    } catch (err: unknown) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage({ text: 'Erreur lors de la recherche: ' + errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers(0, true);
  }, [fetchUsers]);

  const handleSearch = () => {
    setPage(0);
    fetchUsers(0, true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchUsers(newPage);
  };

  return (
    <div className="users-page">
      <header className="page-header glass">
        <div className="header-icon">
          <Users size={32} />
        </div>
        <div className="header-title">
          <h1>Gestion des Utilisateurs</h1>
          <p>Administrez les profils et les quotas de jeu</p>
        </div>
        <div className="header-search">
          <div className="search-input-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par email ou nom..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            className="search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? <RefreshCcw size={18} className="spin" /> : 'Rechercher'}
          </button>
        </div>
      </header>

      <main className="users-content">
        <div className="content-meta">
          <p>{totalCount} utilisateur(s) trouvé(s)</p>
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

        <div className="users-grid">
          {users.map((user) => (
            <motion.div 
              key={user.id} 
              className="user-card glass premium"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => navigate(`/users/${user.id}`)}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="card-accent"></div>
              <div className="card-header">
                <div className="user-main-info">
                  <div className="user-avatar">
                    {user.display_name?.charAt(0) || 'U'}
                  </div>
                  <div className="user-names">
                    <h3>{user.display_name || 'Joueur'}</h3>
                    <span className="user-email">{user.email}</span>
                  </div>
                </div>
                {user.is_admin && (
                  <div className="admin-badge">
                    <Shield size={12} />
                    Admin
                  </div>
                )}
              </div>
              
              <div className="user-rank-line">
                <Star size={14} className="rank-icon" />
                <span className="rank-label">{user.title_key || 'Joueur'}</span>
              </div>

              <div className="stats-container">
                <div className="stat-item">
                  <Zap size={14} />
                  <span>{user.xp_total} XP</span>
                </div>
                <div className="stat-item">
                  <Gamepad2 size={14} />
                  <span>{user.games_played} parties</span>
                </div>
                <div className="stat-item">
                  <Trophy size={14} />
                  <span>HighScore: {user.high_score.toLocaleString()}</span>
                </div>
              </div>

              <div className="parties-status">
                <div className="party-counters">
                  <div className="counter-item">
                    <span className="counter-label">Quota</span>
                    <span className="counter-value">{user.parties_per_day}</span>
                  </div>
                  <div className="counter-separator">/</div>
                  <div className="counter-item">
                    <span className="counter-label">Solde</span>
                    <span className="counter-value v-accent">{user.parties_restantes}</span>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <span className="joined-date">Inscrit le {new Date(user.created_at).toLocaleDateString()}</span>
                <div className="view-profile-link">
                  Voir profil <ChevronRight size={14} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default UsersPage;
