import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Mail,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Image as ImageIcon,
  Type,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import './SignalementsPage.css';

type ReportStatus = 'PENDING' | 'RESOLVED' | 'IGNORED';

type ReportType = 'DATE_FAUSSE' | 'DESCRIPTION_FAUSSE' | 'IMAGE_INCOHERENTE' | 'TYPO' | 'AUTRE';

interface DbReport {
  id: string;
  evenement_id: string;
  user_id: string | null;
  type_erreur: ReportType;
  message: string | null;
  created_at: string;
  status: ReportStatus;
  evenements?: {
    id: string;
    titre: string;
    date: string;
    illustration_url: string | null;
  } | null;
}

interface FallbackLogReport {
  id: string;
  created_at: string;
  user_id: string | null;
  message: string;
  data?: {
    event_id?: string;
    title?: string;
    reported_issue?: string;
    event_year?: string;
  } | null;
}

interface SupportEmailLog {
  id: string;
  created_at: string;
  category: string | null;
  message: string;
  data: Record<string, unknown> | null;
  user_id: string | null;
  app_version: string | null;
  platform: string | null;
}

interface UnifiedReport {
  id: string;
  created_at: string;
  type: string;
  status: ReportStatus;
  user_id: string | null;
  message: string | null;
  event_title: string;
  event_date: string;
  event_image: string | null;
  source: 'reports_table' | 'fallback_logs';
}

const SignalementsPage: React.FC = () => {
  const [reportFilter, setReportFilter] = useState<ReportStatus>('PENDING');
  const [reports, setReports] = useState<UnifiedReport[]>([]);
  const [emails, setEmails] = useState<SupportEmailLog[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'emails'>('reports');
  const [reportsSourceLabel, setReportsSourceLabel] = useState('');

  const fetchReports = async () => {
    setLoadingReports(true);

    const { data, error } = await supabase
      .from('evenements_signalements')
      .select('id, evenement_id, user_id, type_erreur, message, created_at, status, evenements(id, titre, date, illustration_url)')
      .eq('status', reportFilter)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped = (data as unknown as DbReport[]).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        type: r.type_erreur,
        status: r.status,
        user_id: r.user_id,
        message: r.message,
        event_title: r.evenements?.titre || 'Événement inconnu',
        event_date: r.evenements?.date || '-',
        event_image: r.evenements?.illustration_url || null,
        source: 'reports_table' as const,
      }));
      setReports(mapped);
      setReportsSourceLabel('Source : table dédiée de signalements');
      setLoadingReports(false);
      return;
    }

    const missingTable = (error as { code?: string } | null)?.code === 'PGRST205';
    if (missingTable) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('remote_debug_logs')
        .select('id, created_at, user_id, message, data')
        .eq('category', 'event_report')
        .order('created_at', { ascending: false });

      if (!fallbackError && fallbackData) {
        const mapped = (fallbackData as unknown as FallbackLogReport[]).map((log) => ({
          id: log.id,
          created_at: log.created_at,
          type: log.data?.reported_issue || 'AUTRE',
          status: 'PENDING' as ReportStatus,
          user_id: log.user_id,
          message: log.message || null,
          event_title: log.data?.title || 'Événement inconnu',
          event_date: log.data?.event_year || '-',
          event_image: null,
          source: 'fallback_logs' as const,
        }));

        setReports(mapped);
        setReportsSourceLabel('Source : fallback remote_debug_logs (table evenements_signalements absente)');
      } else {
        setReports([]);
        setReportsSourceLabel('Impossible de charger les signalements pour le moment.');
      }
    } else {
      setReports([]);
      setReportsSourceLabel(error?.message || 'Impossible de charger les signalements.');
    }

    setLoadingReports(false);
  };

  const fetchEmails = async () => {
    setLoadingEmails(true);

    const { data, error } = await supabase
      .from('remote_debug_logs')
      .select('id, created_at, category, message, data, user_id, app_version, platform')
      .or('category.ilike.%email%,category.ilike.%mail%,category.ilike.%contact%,category.ilike.%support%,message.ilike.%email%,message.ilike.%mail%,message.ilike.%contact%')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setEmails(data as unknown as SupportEmailLog[]);
    } else {
      setEmails([]);
    }

    setLoadingEmails(false);
  };

  useEffect(() => {
    fetchReports();
  }, [reportFilter]);

  useEffect(() => {
    fetchEmails();
  }, []);

  const updateStatus = async (report: UnifiedReport, newStatus: Extract<ReportStatus, 'RESOLVED' | 'IGNORED'>) => {
    if (report.source !== 'reports_table') return;

    const { error } = await supabase
      .from('evenements_signalements')
      .update({ status: newStatus })
      .eq('id', report.id);

    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    }
  };

  const reportCountLabel = useMemo(() => {
    if (loadingReports) return 'Chargement...';
    return `${reports.length} signalement${reports.length > 1 ? 's' : ''}`;
  }, [loadingReports, reports.length]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'DATE_FAUSSE':
        return <Calendar size={16} />;
      case 'IMAGE_INCOHERENTE':
        return <ImageIcon size={16} />;
      case 'DESCRIPTION_FAUSSE':
      case 'TYPO':
        return <Type size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'DATE_FAUSSE':
        return 'Date incorrecte';
      case 'DESCRIPTION_FAUSSE':
        return 'Titre / texte erroné';
      case 'IMAGE_INCOHERENTE':
        return 'Image incohérente';
      case 'TYPO':
        return 'Coquille / typo';
      default:
        return 'Autre';
    }
  };

  return (
    <div className="signalements-page">
      <header className="signalements-header glass">
        <div className="title-block">
          {activeTab === 'reports' ? <ShieldAlert size={22} /> : <Mail size={22} />}
          <div>
            <h1>Signalements & Emails</h1>
            <p>{activeTab === 'reports' ? reportCountLabel : `${emails.length} email(s) détecté(s)`}</p>
          </div>
        </div>

        <div className="top-actions">
          <div className="tab-switch glass">
            <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
              Signalements
            </button>
            <button className={activeTab === 'emails' ? 'active' : ''} onClick={() => setActiveTab('emails')}>
              Emails
            </button>
          </div>

          <button
            className="refresh-btn"
            onClick={() => {
              if (activeTab === 'reports') fetchReports();
              else fetchEmails();
            }}
          >
            <RefreshCw size={14} />
            Rafraîchir
          </button>
        </div>
      </header>

      {activeTab === 'reports' ? (
        <>
          <div className="reports-toolbar glass">
            <div className="status-tabs">
              <button className={reportFilter === 'PENDING' ? 'active' : ''} onClick={() => setReportFilter('PENDING')}>
                En attente
              </button>
              <button className={reportFilter === 'RESOLVED' ? 'active' : ''} onClick={() => setReportFilter('RESOLVED')}>
                Résolus
              </button>
              <button className={reportFilter === 'IGNORED' ? 'active' : ''} onClick={() => setReportFilter('IGNORED')}>
                Ignorés
              </button>
            </div>
            <span className="source-label">{reportsSourceLabel}</span>
          </div>

          {loadingReports ? (
            <div className="loading-box glass">
              <Clock className="spin" size={34} />
              <p>Chargement des signalements...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-box glass">
              <CheckCircle2 size={40} />
              <h3>Aucun signalement</h3>
              <p>Rien à traiter pour ce filtre.</p>
            </div>
          ) : (
            <div className="cards-grid">
              <AnimatePresence>
                {reports.map((report) => (
                  <motion.article
                    key={report.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="report-card glass"
                  >
                    <div className="report-meta">
                      <span className="type-chip">
                        {getTypeIcon(report.type)}
                        {getTypeLabel(report.type)}
                      </span>
                      <span className="date-chip">{new Date(report.created_at).toLocaleString()}</span>
                    </div>

                    <div className="event-preview glass">
                      {report.event_image ? <img src={report.event_image} alt={report.event_title} /> : <div className="image-fallback" />}
                      <div className="event-info">
                        <h4>{report.event_title}</h4>
                        <span>{report.event_date}</span>
                      </div>
                    </div>

                    {report.message ? <p className="report-message">{report.message}</p> : null}

                    {report.source === 'reports_table' && report.status === 'PENDING' ? (
                      <div className="report-actions">
                        <button className="action-btn resolve" onClick={() => updateStatus(report, 'RESOLVED')}>
                          <CheckCircle2 size={14} />
                          Résolu
                        </button>
                        <button className="action-btn ignore" onClick={() => updateStatus(report, 'IGNORED')}>
                          <XCircle size={14} />
                          Ignorer
                        </button>
                      </div>
                    ) : (
                      <div className="readonly-note">
                        {report.source === 'fallback_logs'
                          ? 'Signalement reçu via fallback logs (statut non éditable).'
                          : `Statut : ${report.status}`}
                      </div>
                    )}
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : loadingEmails ? (
        <div className="loading-box glass">
          <Clock className="spin" size={34} />
          <p>Chargement des emails...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="empty-box glass">
          <Inbox size={40} />
          <h3>Aucun email trouvé</h3>
          <p>
            Aucun log de type email/contact/support n&apos;a été trouvé dans <code>remote_debug_logs</code>.
          </p>
        </div>
      ) : (
        <div className="cards-grid">
          {emails.map((mailLog) => (
            <article key={mailLog.id} className="report-card glass">
              <div className="report-meta">
                <span className="type-chip">
                  <Mail size={16} />
                  {mailLog.category || 'email'}
                </span>
                <span className="date-chip">{new Date(mailLog.created_at).toLocaleString()}</span>
              </div>
              <p className="report-message">{mailLog.message}</p>
              <div className="mail-extra">
                <span>Utilisateur: {mailLog.user_id || 'anonyme'}</span>
                <span>Plateforme: {mailLog.platform || '-'}</span>
                <span>Version: {mailLog.app_version || '-'}</span>
              </div>
              {mailLog.data ? (
                <pre className="mail-data">{JSON.stringify(mailLog.data, null, 2)}</pre>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SignalementsPage;
