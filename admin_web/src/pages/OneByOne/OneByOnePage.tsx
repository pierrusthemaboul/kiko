import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Type, ImageOff, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import './OneByOnePage.css';

type InspectionStatus = 'VALIDATED' | 'TITLE_REVIEW' | 'IMAGE_REVIEW' | null;

interface EventRecord {
  id: string;
  titre: string;
  date: string;
  illustration_url: string | null;
  description_detaillee?: string | null;
  inspection_one_by_one_status?: InspectionStatus;
}

const OneByOnePage: React.FC = () => {
  const [totalCount, setTotalCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supportsInspectionColumns, setSupportsInspectionColumns] = useState(true);

  const statusLabel = useMemo(() => {
    switch (currentEvent?.inspection_one_by_one_status) {
      case 'VALIDATED':
        return { text: 'Inspecté: Validé', className: 'validated' };
      case 'TITLE_REVIEW':
        return { text: 'Inspecté: Titre à revoir', className: 'title' };
      case 'IMAGE_REVIEW':
        return { text: 'Inspecté: Image à revoir', className: 'image' };
      default:
        return { text: 'Non inspecté', className: 'none' };
    }
  }, [currentEvent?.inspection_one_by_one_status]);

  const loadCount = useCallback(async () => {
    const { count } = await supabase.from('evenements').select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);
  }, []);

  const loadEvent = useCallback(async (index: number) => {
    setLoading(true);
    let data: any[] | null = null;
    let error: any = null;

    const primary = await supabase
      .from('evenements')
      .select('id, titre, date, illustration_url, description_detaillee, inspection_one_by_one_status')
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(index, index);

    data = primary.data;
    error = primary.error;

    if (error && /inspection_one_by_one_status|column/i.test(String(error.message || ''))) {
      setSupportsInspectionColumns(false);
      const fallback = await supabase
        .from('evenements')
        .select('id, titre, date, illustration_url, description_detaillee')
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(index, index);

      data = fallback.data?.map((row: any) => ({ ...row, inspection_one_by_one_status: null })) || null;
      error = fallback.error;
    }

    if (!error && data && data.length > 0) {
      setCurrentEvent(data[0] as EventRecord);
      setCurrentIndex(index);
    } else {
      setCurrentEvent(null);
    }
    setLoading(false);
  }, []);

  const findFirstUncontrolledIndex = useCallback(async () => {
    // 1. Find the first event with no status
    const { data: firstNull, error: findError } = await supabase
      .from('evenements')
      .select('date, id')
      .is('inspection_one_by_one_status', null)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !firstNull) return 0;

    // 2. Count how many events are before it in the same sort order
    // Order: date DESC, id DESC
    // So "before" means: (date > firstNull.date) OR (date == firstNull.date AND id > firstNull.id)
    const { count, error: countError } = await supabase
      .from('evenements')
      .select('*', { count: 'exact', head: true })
      .or(`date.gt.${firstNull.date},and(date.eq.${firstNull.date},id.gt.${firstNull.id})`);

    if (countError) return 0;
    return count || 0;
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadCount();
      const firstIndex = await findFirstUncontrolledIndex();
      await loadEvent(firstIndex);
    };
    init();
  }, [loadCount, loadEvent, findFirstUncontrolledIndex]);

  const updateInspectionStatus = async (status: Exclude<InspectionStatus, null>) => {
    if (!currentEvent) return;
    if (!supportsInspectionColumns) {
      alert("La colonne d'inspection n'est pas encore disponible en base. Applique la migration SQL puis réessaie.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('evenements')
      .update({
        inspection_one_by_one_status: status,
        inspection_one_by_one_updated_at: new Date().toISOString()
      })
      .eq('id', currentEvent.id)
      .select('id, titre, date, illustration_url, description_detaillee, inspection_one_by_one_status')
      .single();

    if (!error && data) {
      const hasNext = currentIndex < totalCount - 1;
      if (hasNext) {
        await loadEvent(currentIndex + 1);
      } else {
        setCurrentEvent(data as EventRecord);
      }
    } else if (error) {
      alert(`Erreur mise à jour inspection: ${error.message}`);
    }
    setBusy(false);
  };

  const deleteCurrentEvent = async () => {
    if (!currentEvent) return;
    if (!window.confirm('Supprimer définitivement cet événement ?')) return;

    setBusy(true);
    const { error } = await supabase.from('evenements').delete().eq('id', currentEvent.id);

    if (error) {
      alert(`Erreur suppression: ${error.message}`);
      setBusy(false);
      return;
    }

    const newTotal = Math.max(0, totalCount - 1);
    setTotalCount(newTotal);

    const nextIndex = Math.min(currentIndex, Math.max(0, newTotal - 1));
    if (newTotal === 0) {
      setCurrentEvent(null);
      setCurrentIndex(0);
      setBusy(false);
      return;
    }

    await loadEvent(nextIndex);
    setBusy(false);
  };

  const goPrev = async () => {
    if (currentIndex <= 0 || busy) return;
    await loadEvent(currentIndex - 1);
  };

  const goNext = async () => {
    if (currentIndex >= totalCount - 1 || busy) return;
    await loadEvent(currentIndex + 1);
  };

  return (
    <div className="onebyone-page">
      <header className="onebyone-header">
        <h1>Inspection 1 par 1</h1>
        <p>{totalCount > 0 ? `Événement ${currentIndex + 1} sur ${totalCount}` : 'Aucun événement en base.'}</p>
      </header>

      {loading ? (
        <div className="onebyone-loading"><Loader2 className="spin" size={22} /> Chargement...</div>
      ) : !currentEvent ? (
        <div className="onebyone-empty">Aucun événement à afficher.</div>
      ) : (
        <div className="onebyone-card">
          <div className="onebyone-nav-row">
            <button onClick={goPrev} disabled={busy || currentIndex <= 0}>
              <ChevronLeft size={16} /> Précédent
            </button>
            <span className={`inspection-pill ${statusLabel.className}`}>{statusLabel.text}</span>
            <button onClick={goNext} disabled={busy || currentIndex >= totalCount - 1}>
              Suivant <ChevronRight size={16} />
            </button>
          </div>

          <div className="onebyone-main">
            <div className="onebyone-image">
              {currentEvent.illustration_url ? (
                <img src={currentEvent.illustration_url} alt={currentEvent.titre} />
              ) : (
                <div className="onebyone-image-empty">Pas d'image</div>
              )}
            </div>

            <div className="onebyone-content">
              <div className="onebyone-date">{currentEvent.date}</div>
              <h2>{currentEvent.titre}</h2>
              <p>{currentEvent.description_detaillee || 'Pas de description.'}</p>
            </div>
          </div>

          <div className="onebyone-actions">
            <button className="action validated" disabled={busy} onClick={() => updateInspectionStatus('VALIDATED')}>
              <CheckCircle2 size={16} /> Valider
            </button>
            <button className="action title" disabled={busy} onClick={() => updateInspectionStatus('TITLE_REVIEW')}>
              <Type size={16} /> Titre
            </button>
            <button className="action image" disabled={busy} onClick={() => updateInspectionStatus('IMAGE_REVIEW')}>
              <ImageOff size={16} /> Image
            </button>
            <button className="action delete" disabled={busy} onClick={deleteCurrentEvent}>
              <Trash2 size={16} /> Supprimer
            </button>
          </div>

          <div className="onebyone-note">
            Sur cette page, seule l'action <strong>Supprimer</strong> modifie réellement l'événement. Les actions
            <strong> Valider</strong>, <strong>Titre</strong> et <strong>Image</strong> marquent uniquement un statut d'inspection.
          </div>
        </div>
      )}
    </div>
  );
};

export default OneByOnePage;
