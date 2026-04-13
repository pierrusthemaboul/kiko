import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Trophy, 
  Target, 
  Zap, 
  Calendar,
  History,
  Award,
  Shield,
  Star,
  Gamepad2,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import './UserProfilePage.css';

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
  current_level: number;
}

interface UserAchievement {
  achievement_key: string;
  unlocked_at: string;
}

interface UserReward {
  period_type: string;
  plays_awarded: number;
  created_at: string;
  rank: number;
}

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch Basic Profile
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profError) throw profError;

      // Get email from auth.users (requires service role or admin access)
      // Since we are admins, let's assume we can get it via RPC or our previous search function
      // For now, let's use search_users_admin with the specific ID if possible, 
      // or just assume we have it if it comes from props. 
      // Actually, let's call our search RPC with the specific ID as search term.
      const { data: searchData, error: searchError } = await supabase.rpc('search_users_admin', {
        p_search_term: userId 
      });

      if (searchError) throw searchError;
      
      const fullProf = searchData?.[0];
      if (fullProf) {
        setProfile({
          ...profData,
          email: fullProf.email
        });
      } else {
        setProfile(profData);
      }

      // Fetch Achievements
      const { data: achData, error: achError } = await supabase
        .from('user_achievements')
        .select('achievement_key, unlocked_at')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });
      
      if (!achError) setAchievements(achData || []);

      // Fetch Rewards
      const { data: rewData, error: rewError } = await supabase
        .from('leaderboard_rewards')
        .select('period_type, plays_awarded, created_at, rank')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!rewError) setRewards(rewData || []);

    } catch (err) {
      console.error('Error fetching user data:', err);
      setMessage({ text: 'Erreur lors du chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc('admin_update_user_profile', {
        p_user_id: profile.id,
        p_parties_per_day: profile.parties_per_day,
        p_parties_restantes: profile.parties_restantes,
        p_is_admin: profile.is_admin,
        p_xp_total: profile.xp_total,
        p_title_key: profile.title_key
      });

      if (error) throw error;
      setMessage({ text: 'Profil mis à jour avec succès', type: 'success' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({ text: 'Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <RefreshCcw className="spin" size={48} />
        <p>Chargement du profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-error">
        <h2>Utilisateur non trouvé</h2>
        <button onClick={() => navigate('/users')}>Retour à la liste</button>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate('/users')}>
          <ArrowLeft size={20} />
          Retour
        </button>
        <div className="header-title">
          <h1>Profil de {profile.display_name || 'Joueur Inconnu'}</h1>
          <span className="user-id">{profile.id}</span>
        </div>
        <button 
          className="save-btn" 
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? <RefreshCcw size={18} className="spin" /> : <Save size={18} />}
          Enregistrer
        </button>
      </header>

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

      <div className="profile-grid">
        {/* Colonne de Gauche : Infos de Base & Quotas */}
        <section className="profile-section glass">
          <div className="section-header">
            <Shield size={20} />
            <h2>Informations & Quotas</h2>
          </div>
          
          <div className="info-group">
            <label>Email</label>
            <input type="text" value={profile.email || ''} readOnly className="readonly-input" />
          </div>

          <div className="info-group">
            <label>Pseudo</label>
            <input type="text" value={profile.display_name || ''} readOnly className="readonly-input" />
          </div>

          <div className="stats-row">
            <div className="info-group">
              <label>Parties / Jour (Quota)</label>
              <input 
                type="number" 
                value={profile.parties_per_day} 
                onChange={e => setProfile({...profile, parties_per_day: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="info-group">
              <label>Parties Actuelles (Solde)</label>
              <input 
                type="number" 
                value={profile.parties_restantes} 
                onChange={e => setProfile({...profile, parties_restantes: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="info-group">
            <label>Rang / Titre</label>
            <div className="rank-input-wrapper">
              <Star size={16} />
              <input 
                type="text" 
                value={profile.title_key} 
                onChange={e => setProfile({...profile, title_key: e.target.value})}
              />
            </div>
          </div>

          <div className="info-group checkbox">
            <label>Est Administrateur</label>
            <input 
              type="checkbox" 
              checked={profile.is_admin} 
              onChange={e => setProfile({...profile, is_admin: e.target.checked})}
            />
          </div>
        </section>

        {/* Colonne du Milieu : Progression & Stats */}
        <section className="profile-section glass">
          <div className="section-header">
            <Target size={20} />
            <h2>Progression</h2>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <Zap size={20} />
              <div className="stat-value">{profile.xp_total}</div>
              <div className="stat-label">XP Total</div>
              <input 
                type="number" 
                value={profile.xp_total} 
                onChange={e => setProfile({...profile, xp_total: parseInt(e.target.value) || 0})}
                className="mini-input"
              />
            </div>
            <div className="stat-card">
              <Gamepad2 size={20} />
              <div className="stat-value">{profile.games_played}</div>
              <div className="stat-label">Parties Jouées</div>
            </div>
            <div className="stat-card">
              <Trophy size={20} />
              <div className="stat-value">{profile.high_score.toLocaleString()}</div>
              <div className="stat-label">Record Score</div>
            </div>
            <div className="stat-card">
              <Award size={20} />
              <div className="stat-value">{profile.current_level}</div>
              <div className="stat-label">Niveau Actuel</div>
            </div>
          </div>

          <div className="info-group">
            <label>Créé le</label>
            <div className="readonly-date">
              <Calendar size={16} />
              {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </section>

        {/* Colonne de Droite : Historique (Récompenses & succès) */}
        <section className="profile-section glass scrollable">
          <div className="section-header">
            <History size={20} />
            <h2>Activité Récente</h2>
          </div>

          <div className="activity-tabs">
            <h3>Dernières Récompenses</h3>
            <div className="reward-list">
              {rewards.length > 0 ? rewards.map((rew, i) => (
                <div key={i} className="activity-item reward">
                  <div className="activity-icon"><Star size={14} /></div>
                  <div className="activity-details">
                    <span className="activity-title">
                      {rew.period_type === 'daily' ? 'Classement Quotidien' : 
                       rew.period_type === 'weekly' ? 'Classement Hebdo' : 'Classement Mensuel'}
                    </span>
                    <span className="activity-meta">
                      Position: {rew.rank} • +{rew.plays_awarded} parties
                    </span>
                  </div>
                  <span className="activity-date">{new Date(rew.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )) : <p className="empty-state">Aucune récompense obtenue</p>}
            </div>

            <h3>Derniers Succès</h3>
            <div className="achievement-list">
              {achievements.length > 0 ? achievements.map((ach, i) => (
                <div key={i} className="activity-item achievement">
                  <div className="activity-icon"><Award size={14} /></div>
                  <div className="activity-details">
                    <span className="activity-title">{ach.achievement_key}</span>
                  </div>
                  <span className="activity-date">{new Date(ach.unlocked_at).toLocaleDateString('fr-FR')}</span>
                </div>
              )) : <p className="empty-state">Aucun succès débloqué</p>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserProfilePage;
