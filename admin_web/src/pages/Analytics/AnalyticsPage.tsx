import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Database, 
  ExternalLink,
  Activity,
  Play,
  Server,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';
import './AnalyticsPage.css';

const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState({
    users: 0,
    eventsProd: 0,
    eventsAntichambre: 0,
    eventsSas: 0,
    loading: true
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch users count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch prod events count
        const { count: prodCount } = await supabase
          .from('evenements')
          .select('*', { count: 'exact', head: true });

        // Fetch antichambre events count
        const { count: antichambreCount } = await supabase
          .from('antichambre')
          .select('*', { count: 'exact', head: true });
          
        // Fetch sas events count
        let sasCountResult = 0;
        try {
          const { count } = await supabase
            .from('sas_events')
            .select('*', { count: 'exact', head: true });
          sasCountResult = count || 0;
        } catch {
          // ignore
        }

        setMetrics({
          users: usersCount || 0,
          eventsProd: prodCount || 0,
          eventsAntichambre: antichambreCount || 0,
          eventsSas: sasCountResult,
          loading: false
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des métriques", error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchMetrics();
  }, []);

  const thirdPartyLinks = [
    {
      name: 'Firebase Analytics',
      description: 'Analytics in-app, Crashlytics, Performance, App State',
      icon: <Activity size={24} />,
      url: 'https://console.firebase.google.com/',
      color: '#FFCA28'
    },
    {
      name: 'Google Play Console',
      description: 'Acquisition, Notes, Revenus, Crashs Android',
      icon: <Play size={24} />,
      url: 'https://play.google.com/console/',
      color: '#4CAF50'
    },
    {
      name: 'Supabase',
      description: 'Base de données, Auth, Realtime, Storage',
      icon: <Database size={24} />,
      url: 'https://supabase.com/dashboard',
      color: '#3ECF8E'
    },
    {
      name: 'Vercel',
      description: 'Déploiement Admin Web, Web Vitals, Logs',
      icon: <Globe size={24} />,
      url: 'https://vercel.com/dashboard',
      color: '#FFFFFF'
    }
  ];

  return (
    <div className="analytics-page">
      <header className="page-header glass">
        <div className="header-top">
          <div className="app-logo">
            <span className="gradient-text">K</span>
            <h1>Analytics & Diagnostic</h1>
          </div>
        </div>
      </header>

      <main className="analytics-content">
        <section className="metrics-section">
          <h2 className="section-title">En Temps Réel (Supabase)</h2>
          <div className="metrics-grid">
            {metrics.loading ? (
               <div className="loading-metrics">Chargement des données...</div>
            ) : (
              <>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="metric-card glass"
                >
                  <div className="metric-icon-wrapper" style={{background: 'rgba(99, 102, 241, 0.1)'}}>
                    <Users size={24} color="#6366f1" />
                  </div>
                  <div className="metric-info">
                    <h3>Utilisateurs Inscrits</h3>
                    <p className="metric-value">{metrics.users.toLocaleString()}</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="metric-card glass"
                >
                  <div className="metric-icon-wrapper" style={{background: 'rgba(62, 207, 142, 0.1)'}}>
                    <Database size={24} color="#3ECF8E" />
                  </div>
                  <div className="metric-info">
                    <h3>Événements en Production</h3>
                    <p className="metric-value">{metrics.eventsProd.toLocaleString()}</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="metric-card glass"
                >
                  <div className="metric-icon-wrapper" style={{background: 'rgba(245, 158, 11, 0.1)'}}>
                    <Server size={24} color="#f59e0b" />
                  </div>
                  <div className="metric-info">
                    <h3>Événements en Antichambre</h3>
                    <p className="metric-value">{metrics.eventsAntichambre.toLocaleString()}</p>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </section>

        <section className="links-section mt-8">
          <h2 className="section-title">Plateformes Tiers Professionnelles</h2>
          <p className="section-subtitle">
            Kiko utilise plusieurs plateformes pour un suivi optimal. 
            Firebase est intégré dans l'app mobile pour tracker tous les comportements en jeu (erreurs, analytics, etc.).
          </p>

          <div className="platform-links-grid">
            {thirdPartyLinks.map((platform, idx) => (
              <motion.div 
                key={platform.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + (idx * 0.1) }}
                className="platform-card glass"
                onClick={() => window.open(platform.url, '_blank')}
              >
                <div className="platform-icon" style={{ color: platform.color }}>
                  {platform.icon}
                </div>
                <div className="platform-details">
                  <h3>{platform.name}</h3>
                  <p>{platform.description}</p>
                </div>
                <ExternalLink size={18} className="external-icon" />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPage;
