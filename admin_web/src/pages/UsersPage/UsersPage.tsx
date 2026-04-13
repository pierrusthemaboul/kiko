import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Mail, 
  User, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Trophy, 
  Star,
  RefreshCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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
  games_played: number;
  created_at: string;
  high_score: number;
}

const UsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc('search_users_admin', { 
        search_term: searchTerm 
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: unknown) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage({ text: 'Erreur lors de la recherche: ' + errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (user: UserProfile, updates: Partial<UserProfile>) => {
    setUpdatingId(user.id);
    setMessage(null);
    try {
      const { error } = await supabase.rpc('admin_update_user_profile', {
        p_user_id: user.id,
        p_parties_per_day: updates.parties_per_day,
        p_is_admin: updates.is_admin,
        p_xp_total: updates.xp_total
      });

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updates } : u));
      setMessage({ text: 'Profil mis à jour avec succès', type: 'success' });
    } catch (err: unknown) {
      console.error('Update error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage({ text: 'Erreur lors de la mise à jour: ' + errorMessage, type: 'error' });
    } finally {
      setUpdatingId(null);
      // Auto clear success message
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const adjustParties = (user: UserProfile, delta: number) => {
    const newValue = Math.max(0, user.parties_per_day + delta);
    if (newValue !== user.parties_per_day) {
      handleUpdateUser(user, { parties_per_day: newValue });
    }
  };

  const toggleAdmin = (user: UserProfile) => {
    handleUpdateUser(user, { is_admin: !user.is_admin });
  };

  return (
    <div className="users-page">
      <header className="page-header glass">
        <div className="header-title">
          <Users className="header-icon" />
          <h1>Gestion des Utilisateurs</h1>
        </div>
        
        <div className="search-container glass">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher par email ou nom..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          />
          <button 
            className="search-btn"
            onClick={fetchUsers}
            disabled={loading || !searchTerm.trim()}
          >
            {loading ? <RefreshCcw size={18} className="spin" /> : 'Rechercher'}
          </button>
        </div>
      </header>

      <main className="users-content">
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`message-banner ${message.type}`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="loading-state">
            <RefreshCcw className="spin" size={48} />
            <p>Recherche des utilisateurs...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state glass">
            <Users size={64} opacity={0.2} />
            <p>{searchTerm ? 'Aucun utilisateur trouvé' : 'Utilisez la barre de recherche pour trouver un utilisateur'}</p>
          </div>
        ) : (
          <div className="users-grid">
            {users.map((user, index) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="user-card glass"
              >
                <div className="user-card-header">
                  <div className="user-avatar">
                    <User size={24} />
                  </div>
                  <div className="user-main-info">
                    <h3>{user.display_name || 'Utilisateur sans nom'}</h3>
                    <div className="user-email">
                      <Mail size={14} />
                      <span>{user.email}</span>
                    </div>
                  </div>
                  {user.is_admin && <div className="admin-badge"><ShieldCheck size={14} /> Admin</div>}
                </div>

                <div className="user-stats">
                  <div className="stat-item">
                    <Star size={18} className="stat-icon xp" />
                    <div className="stat-value">
                      <span className="label">Points XP</span>
                      <span className="number">{user.xp_total.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Trophy size={18} className="stat-icon high-score" />
                    <div className="stat-value">
                      <span className="label">Record / Parties</span>
                      <span className="number">{user.high_score.toLocaleString()} / {user.games_played}</span>
                    </div>
                  </div>
                </div>

                <div className="user-actions">
                  <div className="action-group">
                    <label>Parties / Jour</label>
                    <div className="counter">
                      <button 
                        onClick={() => adjustParties(user, -1)}
                        disabled={updatingId === user.id || user.parties_per_day <= 0}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="counter-value">{user.parties_per_day}</span>
                      <button 
                        onClick={() => adjustParties(user, 1)}
                        disabled={updatingId === user.id}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <button 
                    className={`toggle-admin-btn ${user.is_admin ? 'is-admin' : ''}`}
                    onClick={() => toggleAdmin(user)}
                    disabled={updatingId === user.id}
                  >
                    {user.is_admin ? 'Retirer Admin' : 'Nommer Admin'}
                  </button>
                </div>

                <div className="user-footer">
                  <span>Inscrit le {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default UsersPage;
