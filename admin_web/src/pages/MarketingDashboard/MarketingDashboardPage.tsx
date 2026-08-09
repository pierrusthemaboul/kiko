import React, { useCallback, useEffect, useState } from 'react';
import {
  Smartphone,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  RefreshCw,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  TrendingUp,
  Download,
  AlertTriangle,
  Apple,
  PlayCircle,
} from 'lucide-react';
import './MarketingDashboardPage.css';

interface ChannelMetrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  reach: number | null;
  engagementRate: number | null;
}

interface LastPost {
  text: string;
  dueAt: string;
  metrics: ChannelMetrics;
}

interface ChannelData {
  id: string;
  name: string;
  service: string;
  avatar: string;
  lastPost: LastPost | null;
  error: string | null;
}

interface AppStoreData {
  date?: string;
  downloads?: number;
  updates?: number;
  redownloads?: number;
  countries?: string[];
  error?: string;
}

interface GooglePlayData {
  files?: string[];
  count?: number;
  error?: string;
}

interface MarketingOverview {
  buffer: ChannelData[] | { error: string };
  appStore: AppStoreData;
  googlePlay: GooglePlayData;
  fetchedAt: string;
}

const SERVICE_META: Record<string, { name: string; icon: React.FC<any>; color: string }> = {
  tiktok: { name: 'TikTok', icon: Smartphone, color: '#FF0050' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E4405F' },
  twitter: { name: 'Twitter/X', icon: Twitter, color: '#1DA1F2' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2' },
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000' },
};

const REFRESH_INTERVAL_MS = 120000; // 2 minutes

const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

class DebugBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: 'red', background: '#111', padding: 20, whiteSpace: 'pre-wrap' }}>
          {this.state.error.message}
          {'\n'}
          {this.state.error.stack}
        </pre>
      );
    }
    return this.props.children;
  }
}

const MarketingDashboardPageInner: React.FC = () => {
  const [data, setData] = useState<MarketingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/marketing/overview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const renderChannelCard = (channel: ChannelData) => {
    const meta = SERVICE_META[channel.service] || {
      name: channel.service,
      icon: Smartphone,
      color: '#9ca3af',
    };
    const Icon = meta.icon;

    return (
      <div key={channel.id} className="channel-card glass">
        <div className="channel-header" style={{ borderColor: meta.color }}>
          <div className="channel-info">
            {channel.avatar ? (
              <img src={channel.avatar} alt={channel.name} className="channel-avatar" />
            ) : (
              <Icon size={24} style={{ color: meta.color }} />
            )}
            <div>
              <h3>{channel.name}</h3>
              <span className="channel-service" style={{ color: meta.color }}>
                {meta.name}
              </span>
            </div>
          </div>
          <Icon size={20} style={{ color: meta.color, opacity: 0.6 }} />
        </div>

        <div className="channel-body">
          {channel.error && (
            <div className="channel-error">
              <AlertTriangle size={16} />
              <span>{channel.error}</span>
            </div>
          )}

          {!channel.error && !channel.lastPost && (
            <p className="no-post">Aucun post publié pour l'instant.</p>
          )}

          {channel.lastPost && (
            <>
              <p className="post-text">{channel.lastPost.text}</p>
              <p className="post-date">{formatDate(channel.lastPost.dueAt)}</p>

              <div className="metrics-grid">
                <div className="metric">
                  <Eye size={16} />
                  <span>{formatNumber(channel.lastPost.metrics.views)}</span>
                </div>
                <div className="metric">
                  <Heart size={16} />
                  <span>{formatNumber(channel.lastPost.metrics.likes)}</span>
                </div>
                <div className="metric">
                  <MessageCircle size={16} />
                  <span>{formatNumber(channel.lastPost.metrics.comments)}</span>
                </div>
                <div className="metric">
                  <Share2 size={16} />
                  <span>{formatNumber(channel.lastPost.metrics.shares)}</span>
                </div>
                <div className="metric">
                  <Users size={16} />
                  <span>{formatNumber(channel.lastPost.metrics.reach)}</span>
                </div>
                <div className="metric">
                  <TrendingUp size={16} />
                  <span>
                    {channel.lastPost.metrics.engagementRate != null
                      ? `${channel.lastPost.metrics.engagementRate.toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const bufferChannels = Array.isArray(data?.buffer) ? data!.buffer : [];
  const bufferError = !Array.isArray(data?.buffer) && data?.buffer ? (data.buffer as any).error : null;

  return (
    <div className="marketing-dashboard-page">
      <header className="page-header glass">
        <div className="header-content">
          <div className="app-logo">
            <TrendingUp className="gradient-text" size={32} />
            <h1>Marketing Dashboard</h1>
          </div>
          <p className="header-subtitle">
            Vue d'ensemble en temps quasi-réel de tous les réseaux sociaux Timalaus
          </p>
        </div>
        <div className="header-actions">
          {lastRefresh && (
            <span className="last-refresh">
              Actualisé à {lastRefresh.toLocaleTimeString('fr-FR')}
            </span>
          )}
          <button className="refresh-button" onClick={fetchOverview} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Rafraîchir
          </button>
        </div>
      </header>

      <main className="content">
        {error && (
          <div className="global-error glass">
            <AlertTriangle size={20} />
            <span>Erreur de connexion au serveur local: {error}</span>
            <p className="hint">
              Assure-toi que le serveur backend tourne (`npm run server` dans admin_web).
            </p>
          </div>
        )}

        {/* Store downloads summary */}
        <div className="stores-row">
          <div className="store-card glass">
            <div className="store-icon apple">
              <Apple size={24} />
            </div>
            <div className="store-info">
              <h4>App Store</h4>
              {data?.appStore?.error ? (
                <p className="store-error">{data.appStore.error}</p>
              ) : (
                <>
                  <p className="store-number">{formatNumber(data?.appStore?.downloads)}</p>
                  <p className="store-label">téléchargements ({data?.appStore?.date})</p>
                </>
              )}
            </div>
          </div>

          <div className="store-card glass">
            <div className="store-icon google">
              <PlayCircle size={24} />
            </div>
            <div className="store-info">
              <h4>Google Play</h4>
              {data?.googlePlay?.error ? (
                <p className="store-error">{data.googlePlay.error}</p>
              ) : (
                <>
                  <p className="store-number">{data?.googlePlay?.count ?? '—'}</p>
                  <p className="store-label">rapports disponibles</p>
                </>
              )}
            </div>
          </div>

          <div className="store-card glass total-card">
            <div className="store-icon total">
              <Download size={24} />
            </div>
            <div className="store-info">
              <h4>Objectif</h4>
              <p className="store-label">
                Maximiser les téléchargements Play Store &amp; App Store via les réseaux sociaux
              </p>
            </div>
          </div>
        </div>

        {/* Social channels grid */}
        {bufferError && (
          <div className="global-error glass">
            <AlertTriangle size={20} />
            <span>{bufferError}</span>
          </div>
        )}

        <div className="channels-grid">
          {bufferChannels.map(renderChannelCard)}
          {!loading && bufferChannels.length === 0 && !bufferError && (
            <p className="no-post">Aucun canal social connecté.</p>
          )}
        </div>
      </main>
    </div>
  );
};

const MarketingDashboardPage: React.FC = () => (
  <DebugBoundary>
    <MarketingDashboardPageInner />
  </DebugBoundary>
);

export default MarketingDashboardPage;
