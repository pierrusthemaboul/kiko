import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Image as ImageIcon, Search, Sparkles, Star, AlertTriangle, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getQuickSettingGroupsForCategory, resolveQuickSettingHints } from './quickSettings';
import './RetoucheImagePage.css';

type SourceTable = 'sas' | 'evenements' | 'antichambre';

interface RetouchEvent {
  id: string;
  titre: string;
  date: string;
  description_detaillee?: string;
  description?: string;
  illustration_url?: string;
  created_at?: string;
  source: SourceTable;
}

interface ReviewResult {
  note_sur_10: number;
  points_forts: string[];
  points_faibles: string[];
  resume: string;
}

interface FluxPromptDraft {
  prompt: string;
  negativePrompt: string;
  rationale: string;
  generationParams: string;
}

interface FluxAgentConfig {
  includeNegativePrompt: boolean;
}

const LOCKED_FLUX_MODEL = 'flux_schnell';
const LOCKED_PROMPT_SIZE = 'medium';

type CategoryId =
  | 'politique_guerre'
  | 'sciences_tech'
  | 'arts_culture_media'
  | 'economie_industrie'
  | 'exploration_transport'
  | 'sports'
  | 'societe_droits'
  | 'catastrophes_sante'
  | 'religion_philosophie'
  | 'autres';

interface CategoryRule {
  id: CategoryId;
  label: string;
  keywords: string[];
}

interface EnrichedEvent extends RetouchEvent {
  categoryId: CategoryId;
  categoryLabel: string;
  centuryKey: string | null;
  centuryLabel: string | null;
}

const SOURCE_TABLES: SourceTable[] = ['sas', 'evenements', 'antichambre'];

const CATEGORY_RULES: CategoryRule[] = [
  { id: 'politique_guerre', label: 'Politique & Guerre', keywords: ['guerre', 'bataille', 'empereur', 'roi', 'reine', 'republique', 'revolution', 'traité', 'traité', 'independance', 'president', 'dictateur', 'parlement'] },
  { id: 'sciences_tech', label: 'Sciences & Technologie', keywords: ['invention', 'scientifique', 'decouverte', 'physique', 'chimie', 'medecine', 'ordinateur', 'internet', 'satellite', 'espace', 'nasa', 'ia', 'intelligence artificielle'] },
  { id: 'arts_culture_media', label: 'Arts, Culture & Médias', keywords: ['film', 'cinema', 'musique', 'album', 'theatre', 'roman', 'livre', 'auteur', 'peinture', 'exposition', 'festival', 'oscar', 'cameron', 'titanic'] },
  { id: 'economie_industrie', label: 'Économie & Industrie', keywords: ['bourse', 'crise', 'banque', 'industrie', 'entreprise', 'commerce', 'usine', 'inflation', 'monnaie', 'economie', 'capital'] },
  { id: 'exploration_transport', label: 'Exploration & Transport', keywords: ['expedition', 'exploration', 'voyage', 'train', 'avion', 'navire', 'bateau', 'titanic', 'metro', 'route', 'canal', 'pont'] },
  { id: 'sports', label: 'Sport', keywords: ['sport', 'jo', 'olympique', 'coupe du monde', 'football', 'tennis', 'nba', 'record', 'champion'] },
  { id: 'societe_droits', label: 'Société & Droits', keywords: ['droit', 'vote', 'femme', 'abolition', 'manifestation', 'greve', 'education', 'social', 'minorite', 'egalite'] },
  { id: 'catastrophes_sante', label: 'Catastrophes & Santé', keywords: ['pandemie', 'epidemie', 'virus', 'seisme', 'tsunami', 'incendie', 'catastrophe', 'naufrage', 'accident', 'maladie'] },
  { id: 'religion_philosophie', label: 'Religion & Philosophie', keywords: ['religion', 'eglise', 'pape', 'spirituel', 'philosophie', 'theologie', 'concile'] },
];

const FALLBACK_CATEGORY: CategoryRule = { id: 'autres', label: 'Autres', keywords: [] };

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const levenshteinDistance = (a: string, b: string) => {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const PAGE_SIZE = 1000;

const extractIllustrationTimestamp = (url?: string) => {
  if (!url) return null;
  const match = url.match(/_(\d{13})\.webp/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractYear = (dateValue?: string) => {
  if (!dateValue) return null;
  const cleaned = dateValue.trim();
  const signed4 = cleaned.match(/^-?\d{1,4}/);
  if (signed4) {
    const year = Number(signed4[0]);
    return Number.isFinite(year) ? year : null;
  }
  const anyYear = cleaned.match(/-?\d{1,4}/);
  if (!anyYear) return null;
  const year = Number(anyYear[0]);
  return Number.isFinite(year) ? year : null;
};

const toCentury = (year: number | null) => {
  if (!year || year === 0) return { key: null, label: null };
  if (year > 0) {
    const c = Math.floor((year - 1) / 100) + 1;
    return { key: `ce_${c}`, label: `${c}e siècle` };
  }
  const c = Math.ceil(Math.abs(year) / 100);
  return { key: `bce_${c}`, label: `${c}e siècle av. J.-C.` };
};

const detectCategory = (event: RetouchEvent) => {
  const haystack = normalizeText(`${event.titre || ''} ${event.description_detaillee || ''} ${event.description || ''}`);
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(normalizeText(kw)))) {
      return rule;
    }
  }
  return FALLBACK_CATEGORY;
};

const fuzzyMatch = (haystackRaw: string, needleRaw: string) => {
  const haystack = normalizeText(haystackRaw);
  const needle = normalizeText(needleRaw);
  if (!needle) return true;
  if (haystack.includes(needle)) return true;

  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  const tolerance = needle.length >= 7 ? 2 : 1;
  return tokens.some((token) => {
    if (token.includes(needle)) return true;
    if (Math.abs(token.length - needle.length) > tolerance) return false;
    return levenshteinDistance(token, needle) <= tolerance;
  });
};

const truncateWords = (input: string, maxWords: number) => {
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return input.trim();
  return `${words.slice(0, maxWords).join(' ')}...`;
};

const compactList = (values: string[]) => {
  const seen = new Set<string>();
  return values
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((v) => {
      const key = normalizeText(v);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const HUMAN_CUE_KEYWORDS = [
  'foule', 'crowd', 'personne', 'personnes', 'person', 'people',
  'humain', 'humaine', 'humans', 'face', 'visage', 'body', 'corps',
  'silhouette', 'queue', 'file d attente', 'spectateur', 'spectators',
  'audience', 'portrait', 'figurant', 'characters', 'character'
];

const isHumanCue = (value: string) => {
  const normalized = normalizeText(value);
  return HUMAN_CUE_KEYWORDS.some((kw) => normalized.includes(normalizeText(kw)));
};

const buildFluxPromptDraft = (
  event: RetouchEvent,
  review: ReviewResult,
  config: FluxAgentConfig,
  quickHints: string[],
  selectedVisualLanguageId: string | undefined,
  selectedMediumId: string | undefined,
  selectedCharacterPolicyId: string | undefined,
  isLegalSafetyActive: boolean,
  isAntiFranchiseActive: boolean,
  freeInstruction: string
): FluxPromptDraft => {
  const dateLabel = event.date || 'date non précisée';
  const context = event.description_detaillee || event.description || '';

  const weaknesses = compactList(review.points_faibles || []).slice(0, 4);
  const strengths = compactList(review.points_forts || []).slice(0, 3);

  const maxWords = 140;

  const isMetonymyMode = selectedVisualLanguageId === 'visual_metonymy';
  const isNoHumanMode = selectedCharacterPolicyId === 'char_no_human';
  const isComicMode = selectedMediumId === 'medium_comic';
  const isOldMastersMode = selectedMediumId === 'medium_old_masters';
  const isCinemaMode = selectedMediumId === 'medium_cinema';
  const isPhotojournalismMode = selectedMediumId === 'medium_photojournalism';
  const isStylizedMode = isComicMode || isOldMastersMode;

  const strengthsForPrompt = isNoHumanMode ? strengths.filter((item) => !isHumanCue(item)) : strengths;
  const weaknessesForPrompt = isNoHumanMode ? weaknesses.filter((item) => !isHumanCue(item)) : weaknesses;

  const profileStyle = isComicMode
    ? 'style dessin BD lisible, encrage maîtrisé, narration visuelle dynamique'
    : isOldMastersMode
      ? 'inspiration peinture des grands maîtres, composition classique, lumière picturale'
      : isPhotojournalismMode
        ? 'style photojournalisme réaliste, instant capturé, crédibilité documentaire, texture photo naturelle'
        : isCinemaMode
          ? 'cinematic live-action photoreal style, film still look, realistic lens and textures'
          : 'photoréalisme live-action strict, rendu photo naturel, proportions réalistes, pas de stylisation dessinée';

  const mustHave = compactList([
    event.titre,
    context,
    ...strengthsForPrompt,
  ]).slice(0, 5);

  const corrections = weaknessesForPrompt.length
    ? `Corrections prioritaires: ${weaknessesForPrompt.join('; ')}.`
    : 'Corrections prioritaires: éviter toute ambiguïté sur le sujet principal.';

  const legalClause = isLegalSafetyActive
    ? `Contrainte légale NON NÉGOCIABLE (prioritaire sur toute autre consigne): Droit à l'image niveau MAXIMUM, ne pas reproduire le visage exact d'une personne réelle identifiable, éviter toute ressemblance photo fidèle avec une célébrité vivante, privilégier des traits génériques.`
    : `Droit à l'image niveau STANDARD: rester prudent sur les ressemblances directes et éviter la copie photo 1:1 d'une personne réelle.`;

  const antiFranchiseClause = isAntiFranchiseActive
    ? `Contrainte IP NON NÉGOCIABLE (prioritaire sur style et consignes libres): aucun personnage, costume, mascotte ou univers reconnaissable d'une franchise existante (film, animation, BD, jeu vidéo, marque). Ne citer aucun nom de marque, titre d'oeuvre, licence ou studio. Aucun logo, wordmark ou texte de franchise visible. Design entièrement original.`
    : `Contrainte IP STANDARD: éviter toute copie trop proche d'un personnage protégé ou d'une franchise connue.`;

  const nonDrawingClause = isStylizedMode
    ? ''
    : `Contrainte de rendu prioritaire: photoréalisme live-action, PAS de dessin, PAS de cartoon, PAS de BD, PAS de peinture, PAS de rendu illustré.`;

  const metonymyClause = isMetonymyMode
    ? `Contrainte narrative NON NÉGOCIABLE: métonymie visuelle explicite. Représenter l'événement par objets, symboles, lieux et indices matériels; éviter la représentation frontale littérale de la scène attendue.`
    : '';

  const noHumanCoherenceClause = isNoHumanMode
    ? `Contrainte de cohérence NON NÉGOCIABLE: mode Sans humain actif. Interdiction de foule, file d'attente, spectateurs, personnages ou silhouettes. Exprimer l'événement par traces matérielles et indices environnementaux uniquement.`
    : '';

  const promptHead = [
    `${isStylizedMode ? 'Illustration historique' : 'Scène historique photoréaliste'} de "${event.titre}" (${dateLabel}).`,
    freeInstruction ? `Consigne utilisateur prioritaire (à respecter avant les réglages rapides): ${freeInstruction}.` : '',
    `Sujet principal immédiatement identifiable, narration émotionnelle claire, cohérence temporelle stricte.${isMetonymyMode ? ' Approche indirecte par signes matériels et symboles concrets.' : ''}`,
    `Éléments clés à intégrer: ${mustHave.join(' ; ')}.`,
    quickHints.length > 0 ? `Réglages rapides (secondaires): ${quickHints.join(' ; ')}.` : '',
    `Direction artistique: ${profileStyle}.`,
    corrections
  ]
    .filter(Boolean)
    .join(' ');

  const promptTail = `${metonymyClause} ${noHumanCoherenceClause} ${nonDrawingClause} ${legalClause} ${antiFranchiseClause} Qualité finale: image nette, anatomie propre, sans texte, sans watermark.`;
  const optimizedHead = truncateWords(promptHead, Math.max(40, maxWords - 45));
  const optimizedPrompt = `${optimizedHead} ${promptTail}`;

  const negativePrompt = config.includeNegativePrompt
    ? [
      'low quality, blurry, noisy, pixelated',
      'wrong era, off-topic scene, generic composition',
      'bad anatomy, deformed face, duplicate limbs',
      'text, logo, watermark, frame'
    ].join(', ')
    : '';

  const generationParams = 'Profil verrouillé: FLUX Schnell uniquement, 4-8 steps, prompt court-moyen, guidance modérée.';

  const rationale = `Agent V2 (${LOCKED_FLUX_MODEL}): prompt reconstruit depuis la note ${review.note_sur_10}/10, compressé pour ${LOCKED_PROMPT_SIZE}.`;

  return { prompt: optimizedPrompt, negativePrompt, rationale, generationParams };
};

const RetoucheImagePage: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const querySource = searchParams.get('source') as SourceTable | null;
  const initialSource: SourceTable = SOURCE_TABLES.includes(querySource as SourceTable) ? (querySource as SourceTable) : 'sas';
  const rawStateEvent = (location.state as any)?.event as Partial<RetouchEvent> | undefined;
  const stateEvent = rawStateEvent
    ? {
        id: String(rawStateEvent.id || ''),
        titre: rawStateEvent.titre || '',
        date: rawStateEvent.date || '',
        description_detaillee: rawStateEvent.description_detaillee,
        description: rawStateEvent.description,
        illustration_url: rawStateEvent.illustration_url,
        source: (rawStateEvent.source as SourceTable) || initialSource,
      }
    : undefined;
  const queryEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<RetouchEvent[]>([]);
  const [search, setSearch] = useState('');
  const [listMode, setListMode] = useState<'all' | 'recent_illustrated'>('all');
  const [sourceScope, setSourceScope] = useState<'all' | SourceTable>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CategoryId>('all');
  const [centuryFilter, setCenturyFilter] = useState<string>('all');
  const [imageFilter, setImageFilter] = useState<'all' | 'with_image' | 'without_image'>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(
    queryEventId ? `${initialSource}:${queryEventId}` : stateEvent ? `${stateEvent.source}:${stateEvent.id}` : null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [fluxDraft, setFluxDraft] = useState<FluxPromptDraft | null>(null);
  const [isApplyingPrompt, setIsApplyingPrompt] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');
  const [lastApplyRequestId, setLastApplyRequestId] = useState('');
  const [lastPromptFrontend, setLastPromptFrontend] = useState('');
  const [lastPromptAfterGemini, setLastPromptAfterGemini] = useState('');
  const [lastPromptSentToFlux, setLastPromptSentToFlux] = useState('');
  const [lastApplyDebugTrace, setLastApplyDebugTrace] = useState('');
  const [lastFluxPromptUsed, setLastFluxPromptUsed] = useState('');
  const [isLegalSafetyActive, setIsLegalSafetyActive] = useState(true);
  const [isAntiFranchiseActive, setIsAntiFranchiseActive] = useState(true);
  const [quickSelectionByGroup, setQuickSelectionByGroup] = useState<Record<string, string>>({});
  const [activeQuickGroupId, setActiveQuickGroupId] = useState<string | null>(null);
  const [freeInstruction, setFreeInstruction] = useState('');
  const [directFluxPrompt, setDirectFluxPrompt] = useState('');
  const [fluxAgentConfig, setFluxAgentConfig] = useState<FluxAgentConfig>({
    includeNegativePrompt: false,
  });
  const [error, setError] = useState<string>('');
  const lastSessionEventKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchEvents = async () => {
      setIsLoading(true);
      setError('');

      if (!mounted) return;

      const fetchAllRowsForTable = async (table: SourceTable): Promise<any[]> => {
        const selectClause = table === 'sas'
          ? 'id, titre, date, description, illustration_url, created_at'
          : 'id, titre, date, description_detaillee, illustration_url, created_at';

        const allRows: any[] = [];
        let from = 0;

        while (true) {
          const to = from + PAGE_SIZE - 1;
          const { data, error: fetchError } = await supabase
            .from(table)
            .select(selectClause)
            .order('created_at', { ascending: false })
            .range(from, to);

          if (fetchError) throw new Error(`[${table}] ${fetchError.message}`);

          const chunk = data || [];
          allRows.push(...chunk);

          if (chunk.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }

        return allRows;
      };

      const results = await Promise.allSettled(
        SOURCE_TABLES.map(async (table) => {
          const rows = await fetchAllRowsForTable(table);
          return rows.map((ev) => ({
            id: ev.id,
            titre: ev.titre,
            date: ev.date || ev.date_evenement || '',
            description_detaillee: ev.description_detaillee,
            description: ev.description,
            illustration_url: ev.illustration_url,
            created_at: ev.created_at,
            source: table,
          })) as RetouchEvent[];
        })
      );

      if (!mounted) return;

      const fulfilled = results.filter((r): r is PromiseFulfilledResult<RetouchEvent[]> => r.status === 'fulfilled');
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

      const merged = fulfilled.flatMap((r) => r.value);
      const deduped = Array.from(new Map(merged.map((ev) => [`${ev.source}:${ev.id}`, ev])).values());
      const alreadyIncluded = stateEvent ? deduped.some((ev) => `${ev.source}:${ev.id}` === `${stateEvent.source}:${stateEvent.id}`) : false;
      const finalList = stateEvent && !alreadyIncluded ? [stateEvent, ...deduped] : deduped;

      setEvents(finalList);

      if (rejected.length === SOURCE_TABLES.length) {
        setError(`Erreur de chargement globale : ${rejected.map((r) => r.reason?.message || 'erreur').join(' | ')}`);
      } else if (rejected.length > 0) {
        setError(`Chargement partiel: ${rejected.map((r) => r.reason?.message || 'erreur').join(' | ')}`);
      }

      setSelectedKey((prev) => prev || (finalList.length > 0 ? `${finalList[0].source}:${finalList[0].id}` : prev));

      setIsLoading(false);
    };

    fetchEvents();

    return () => {
      mounted = false;
    };
  }, [stateEvent]);

  const eventsWithMeta = useMemo<EnrichedEvent[]>(() => {
    return events.map((ev) => {
      const category = detectCategory(ev);
      const year = extractYear(ev.date);
      const century = toCentury(year);
      return {
        ...ev,
        categoryId: category.id,
        categoryLabel: category.label,
        centuryKey: century.key,
        centuryLabel: century.label,
      };
    });
  }, [events]);

  const scopedEvents = useMemo(
    () => (sourceScope === 'all' ? eventsWithMeta : eventsWithMeta.filter((ev) => ev.source === sourceScope)),
    [eventsWithMeta, sourceScope]
  );

  const availableCenturies = useMemo(() => {
    const mapped = new Map<string, string>();
    scopedEvents.forEach((ev) => {
      if (ev.centuryKey && ev.centuryLabel) mapped.set(ev.centuryKey, ev.centuryLabel);
    });
    return Array.from(mapped.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [scopedEvents]);

  const filteredEvents = useMemo(() => {
    const normalized = search.trim();
    const matched = !normalized
      ? scopedEvents
      : scopedEvents.filter((ev) => {
      const haystack = `${ev.titre || ''} ${ev.description_detaillee || ''} ${ev.description || ''} ${ev.date || ''}`;
      return fuzzyMatch(haystack, normalized) || fuzzyMatch(ev.id || '', normalized);
      });

    const withCategory = categoryFilter === 'all' ? matched : matched.filter((ev) => ev.categoryId === categoryFilter);
    const withCentury = centuryFilter === 'all' ? withCategory : withCategory.filter((ev) => ev.centuryKey === centuryFilter);
    const withImage = imageFilter === 'all'
      ? withCentury
      : imageFilter === 'with_image'
        ? withCentury.filter((ev) => !!ev.illustration_url)
        : withCentury.filter((ev) => !ev.illustration_url);

    if (listMode !== 'recent_illustrated') return withImage;

    return withImage
      .filter((ev) => !!ev.illustration_url)
      .sort((a, b) => {
        const timeA = extractIllustrationTimestamp(a.illustration_url) || 0;
        const timeB = extractIllustrationTimestamp(b.illustration_url) || 0;
        if (timeA !== timeB) return timeB - timeA;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
  }, [scopedEvents, search, listMode, categoryFilter, centuryFilter, imageFilter]);

  const selectedEvent = useMemo(
    () => filteredEvents.find((ev) => `${ev.source}:${ev.id}` === selectedKey)
      || eventsWithMeta.find((ev) => `${ev.source}:${ev.id}` === selectedKey)
      || null,
    [filteredEvents, eventsWithMeta, selectedKey]
  );

  const selectedEventKey = selectedEvent ? `${selectedEvent.source}:${selectedEvent.id}` : null;

  const selectedIndex = useMemo(
    () => (selectedKey ? filteredEvents.findIndex((ev) => `${ev.source}:${ev.id}` === selectedKey) : -1),
    [filteredEvents, selectedKey]
  );

  const activeQuickGroups = useMemo(
    () => getQuickSettingGroupsForCategory(selectedEvent?.categoryId),
    [selectedEvent?.categoryId]
  );

  const resetPromptSessionForEvent = () => {
    setReview(null);
    setFluxDraft(null);
    setQuickSelectionByGroup({});
    setActiveQuickGroupId(null);
    setFreeInstruction('');
    setDirectFluxPrompt('');
    setAgentMessage('');
    setLastFluxPromptUsed('');
    setLastApplyRequestId('');
    setLastPromptFrontend('');
    setLastPromptAfterGemini('');
    setLastPromptSentToFlux('');
    setLastApplyDebugTrace('');
    setError('');
  };

  useEffect(() => {
    if (!selectedEventKey) {
      lastSessionEventKeyRef.current = null;
      return;
    }

    if (lastSessionEventKeyRef.current === null) {
      lastSessionEventKeyRef.current = selectedEventKey;
      return;
    }

    if (lastSessionEventKeyRef.current !== selectedEventKey) {
      resetPromptSessionForEvent();
      lastSessionEventKeyRef.current = selectedEventKey;
    }
  }, [selectedEventKey]);

  const goToPrevious = () => {
    if (selectedIndex <= 0) return;
    const prev = filteredEvents[selectedIndex - 1];
    if (!prev) return;
    setSelectedKey(`${prev.source}:${prev.id}`);
  };

  const goToNext = () => {
    if (selectedIndex < 0 || selectedIndex >= filteredEvents.length - 1) return;
    const next = filteredEvents[selectedIndex + 1];
    if (!next) return;
    setSelectedKey(`${next.source}:${next.id}`);
  };

  const runReview = async () => {
    if (!selectedEvent) return;
    if (!selectedEvent.illustration_url) {
      setError('Cet événement n\'a pas d\'illustration à analyser.');
      return;
    }

    setIsReviewing(true);
    setError('');
    setReview(null);
    setFluxDraft(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Erreur configuration: variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.');
      setIsReviewing(false);
      return;
    }

    let data: any = null;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-image-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          image_url: selectedEvent.illustration_url,
          titre: selectedEvent.titre,
          date: selectedEvent.date,
          description_detaillee: selectedEvent.description_detaillee || selectedEvent.description || ''
        })
      });

      data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }
    } catch (networkErr: any) {
      setError(`Erreur agent Gemini Vision : ${networkErr.message || 'échec réseau'}`);
      setIsReviewing(false);
      return;
    }

    if (!data?.review) {
      setError('Réponse agent invalide.');
      setIsReviewing(false);
      return;
    }

    setReview(data.review as ReviewResult);
    setIsReviewing(false);
  };

  const buildFluxPrompt = () => {
    if (!selectedEvent || !review) return;
    const { hints } = resolveQuickSettingHints(quickSelectionByGroup, selectedEvent.categoryId);
    const selectedVisualLanguageId = quickSelectionByGroup['visual_language'];
    const selectedMediumId = quickSelectionByGroup['medium_family'];
    const selectedCharacterPolicyId = quickSelectionByGroup['character_policy'];
    const draft = buildFluxPromptDraft(
      selectedEvent,
      review,
      fluxAgentConfig,
      hints,
      selectedVisualLanguageId,
      selectedMediumId,
      selectedCharacterPolicyId,
      isLegalSafetyActive,
      isAntiFranchiseActive,
      freeInstruction.trim()
    );
    setFluxDraft(draft);
    setAgentMessage('');
  };

  const applyPromptToFlux = async (promptOverride?: string) => {
    if (!selectedEvent) return;

    const rawPrompt = (promptOverride ?? fluxDraft?.prompt ?? '').trim();
    if (!rawPrompt) {
      setError('Aucun prompt à envoyer. Génère un prompt agent ou renseigne un prompt direct.');
      return;
    }

    const isDirectPromptMode = Boolean(promptOverride && promptOverride.trim().length > 0);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Erreur configuration: variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes.');
      return;
    }

    setIsApplyingPrompt(true);
    setError('');
    setAgentMessage('');
    setLastFluxPromptUsed('');
    setLastApplyRequestId('');
    setLastPromptFrontend('');
    setLastPromptAfterGemini('');
    setLastPromptSentToFlux('');
    setLastApplyDebugTrace('');

    try {
      const selectedVisualLanguageId = quickSelectionByGroup['visual_language'];
      const isMetonymyMode = selectedVisualLanguageId === 'visual_metonymy';
      const selectedMediumId = quickSelectionByGroup['medium_family'];
      const isCinemaMode = selectedMediumId === 'medium_cinema';
      const isComicMode = selectedMediumId === 'medium_comic';
      const isOldMastersMode = selectedMediumId === 'medium_old_masters';
      const shouldForceNonDrawing = !isComicMode && !isOldMastersMode;
      const isNoHumanMode = quickSelectionByGroup['character_policy'] === 'char_no_human';
      const promptForApply = isCinemaMode
        ? `${rawPrompt} Hard constraint: cinematic live-action photoreal frame, not illustration, not cartoon, not comic, not sketch, not painting, realistic skin texture, realistic lens depth, film still realism.`
        : rawPrompt;
      const promptForApplyWithNonDrawing = shouldForceNonDrawing
        ? `${promptForApply} Hard constraint: photoreal live-action output only; no drawing, no cartoon, no comic, no painting, no illustration look.`
        : promptForApply;
      const promptForApplyWithNoHuman = isNoHumanMode
        ? `${promptForApplyWithNonDrawing} Hard constraint: no humans at all, no person, no face, no body, no silhouette, no crowd, no human shadow, environment and objects only.`
        : promptForApplyWithNonDrawing;
      const promptForApplyNoHumanCoherent = isNoHumanMode
        ? `${promptForApplyWithNoHuman} Hard constraint: do not mention or depict queues, crowds, spectators, audience, or any human attendance; represent attendance only via environmental traces (barriers, empty lanes, signage supports, objects).`
        : promptForApplyWithNoHuman;
      const promptForApplyWithIpSafety = isAntiFranchiseActive
        ? `${promptForApplyNoHumanCoherent} Hard constraint: do not depict or imitate any existing copyrighted/trademarked character or franchise; create fully original character shapes, proportions, costume language, and facial design. Hard constraint: do not include any brand name, franchise title, studio/publisher name, logo, wordmark, or recognizable product packaging text; use generic unbranded signage and typography-free visual cues only.`
        : promptForApplyNoHumanCoherent;
      const promptForApplyFinal = isMetonymyMode
        ? `${promptForApplyWithIpSafety} Hard constraint: visual metonymy required; represent the event through symbolic objects, environment clues, props, typography-free signage cues, and indirect narrative markers; avoid direct literal scene depiction.`
        : promptForApplyWithIpSafety;

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-retouch-apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          id: selectedEvent.id,
          source: selectedEvent.source,
          prompt: promptForApplyFinal,
          legal_safety: isLegalSafetyActive,
          anti_franchise: isAntiFranchiseActive,
          force_cinematic: isCinemaMode,
          bypass_gemini: isDirectPromptMode,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      if (data?.request_id) setLastApplyRequestId(String(data.request_id));
      if (data?.prompt_received_from_frontend) setLastPromptFrontend(String(data.prompt_received_from_frontend));
      if (data?.flux_prompt_after_gemini) setLastPromptAfterGemini(String(data.flux_prompt_after_gemini));
      if (data?.flux_prompt_sent_to_replicate) setLastPromptSentToFlux(String(data.flux_prompt_sent_to_replicate));
      if (data?.debug_trace) setLastApplyDebugTrace(JSON.stringify(data.debug_trace, null, 2));

      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('Aucune URL image retournée.');

      if (data?.flux_prompt) {
        setLastFluxPromptUsed(String(data.flux_prompt));
      }

      setEvents((prev) => prev.map((ev) => (
        ev.id === selectedEvent.id && ev.source === selectedEvent.source
          ? { ...ev, illustration_url: publicUrl, created_at: ev.created_at || new Date().toISOString() }
          : ev
      )));

      setAgentMessage('Nouvelle illustration générée et enregistrée dans la table source.');
    } catch (err: any) {
      setError(`Erreur application prompt Flux: ${err.message || 'échec'}`);
    } finally {
      setIsApplyingPrompt(false);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError('Copie impossible depuis le navigateur.');
    }
  };

  return (
    <div className="retouch-page">
      <aside className="retouch-list-panel">
        <div className="retouch-list-header">
          <h2>Retouche Image</h2>
          <p>Source: toutes les tables</p>
          {error && <p className="retouch-inline-error">{error}</p>}
          <div className="retouch-mode-row">
            <button
              className={`retouch-mode-btn ${listMode === 'all' ? 'active' : ''}`}
              onClick={() => setListMode('all')}
            >
              Tous
            </button>
            <button
              className={`retouch-mode-btn ${listMode === 'recent_illustrated' ? 'active' : ''}`}
              onClick={() => setListMode('recent_illustrated')}
            >
              Dernières illustrations
            </button>
          </div>
          <div className="retouch-filter-grid">
            <select value={sourceScope} onChange={(e) => setSourceScope(e.target.value as 'all' | SourceTable)}>
              <option value="all">Toutes sources</option>
              <option value="sas">SAS uniquement</option>
              <option value="evenements">Événements officiels</option>
              <option value="antichambre">Antichambre</option>
            </select>

            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | CategoryId)}>
              <option value="all">Toutes catégories</option>
              {CATEGORY_RULES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
              <option value="autres">Autres</option>
            </select>

            <select value={centuryFilter} onChange={(e) => setCenturyFilter(e.target.value)}>
              <option value="all">Tous siècles</option>
              {availableCenturies.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <select value={imageFilter} onChange={(e) => setImageFilter(e.target.value as 'all' | 'with_image' | 'without_image')}>
              <option value="all">Avec ou sans image</option>
              <option value="with_image">Avec image</option>
              <option value="without_image">Sans image</option>
            </select>
          </div>
          <div className="retouch-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un événement..."
            />
          </div>
        </div>

        <div className="retouch-list-content">
          {isLoading ? (
            <div className="retouch-empty"><Loader2 className="spin" size={18} /> Chargement...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="retouch-empty">Aucun événement trouvé.</div>
          ) : (
            filteredEvents.map((ev) => (
              <button
                key={`${ev.source}:${ev.id}`}
                className={`retouch-list-item ${selectedKey === `${ev.source}:${ev.id}` ? 'active' : ''}`}
                onClick={() => {
                  setSelectedKey(`${ev.source}:${ev.id}`);
                }}
              >
                <span className="title">{ev.titre}</span>
                <span className="meta">{ev.source.toUpperCase()} • {ev.centuryLabel || 'Siècle inconnu'} • {ev.date || 'Sans date'}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="retouch-main-panel">
        {!selectedEvent ? (
          <div className="retouch-main-empty">Sélectionne un événement pour lancer l'analyse.</div>
        ) : (
          <div className="retouch-main-content">
            <header className="retouch-main-header">
              <div>
                <h1>{selectedEvent.titre}</h1>
                <p>{selectedEvent.date}</p>
              </div>
              <div className="retouch-header-actions">
                <div className="retouch-nav-group">
                  <button className="btn-nav" onClick={goToPrevious} disabled={selectedIndex <= 0}>
                    <ChevronLeft size={15} />
                    Précédent
                  </button>
                  <span className="retouch-nav-index">
                    {selectedIndex >= 0 ? `${selectedIndex + 1}/${filteredEvents.length}` : `0/${filteredEvents.length}`}
                  </span>
                  <button className="btn-nav" onClick={goToNext} disabled={selectedIndex < 0 || selectedIndex >= filteredEvents.length - 1}>
                    Suivant
                    <ChevronRight size={15} />
                  </button>
                </div>
                <button className="btn-review" disabled={isReviewing} onClick={runReview}>
                  {isReviewing ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                  Analyser avec Gemini Vision
                </button>
              </div>
            </header>

            <section className="retouch-content-grid">
              <article className="retouch-image-card">
                {selectedEvent.illustration_url ? (
                  <img src={selectedEvent.illustration_url} alt={selectedEvent.titre} />
                ) : (
                  <div className="retouch-image-placeholder">
                    <ImageIcon size={34} />
                    <span>Pas d'illustration</span>
                  </div>
                )}
              </article>

              <article className="retouch-data-card">
                <h3>Contexte transmis à l'agent</h3>
                <p><strong>Titre:</strong> {selectedEvent.titre}</p>
                <p><strong>Date:</strong> {selectedEvent.date || 'Non renseignée'}</p>
                <p>
                  <strong>Description:</strong>{' '}
                  {selectedEvent.description_detaillee || selectedEvent.description || 'Aucune description.'}
                </p>
              </article>
            </section>

            {error && selectedEvent && (
              <div className="retouch-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <section className="retouch-review-card">
                {review ? (
                  <>
                    <div className="review-score">
                      <Star size={18} />
                      <span>Note: {review.note_sur_10}/10</span>
                    </div>
                    <p className="review-summary">{review.resume}</p>

                    <div className="review-columns">
                      <div>
                        <h4><CheckCircle2 size={15} /> Points forts</h4>
                        <ul>
                          {(review.points_forts || []).map((item, idx) => <li key={`f-${idx}`}>{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4><AlertTriangle size={15} /> Points faibles</h4>
                        <ul>
                          {(review.points_faibles || []).map((item, idx) => <li key={`w-${idx}`}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="retouch-prompt-rationale">
                    Analyse Gemini non lancée. Tu peux injecter un prompt direct vers Flux Schnell ci-dessous.
                  </p>
                )}

                <div className="retouch-prompt-actions">
                  <div className="retouch-quick-settings">
                    <div className="retouch-quick-header-row">
                      <span>Réglages rapides (accordéon, optionnels)</span>
                      <button
                        className="btn-nav"
                        onClick={() => setQuickSelectionByGroup({})}
                        type="button"
                      >
                        Tout vider
                      </button>
                    </div>
                    {activeQuickGroups.map((group) => (
                      <div key={group.id} className="retouch-quick-group">
                        <button
                          className="retouch-accordion-trigger"
                          onClick={() => setActiveQuickGroupId((prev) => (prev === group.id ? null : group.id))}
                          type="button"
                        >
                          <span>{group.label}</span>
                          <small>{group.options.find((o) => o.id === quickSelectionByGroup[group.id])?.label || 'Aucun'}</small>
                        </button>

                        {activeQuickGroupId === group.id && (
                          <div className="retouch-quick-options">
                            <button
                              className={`retouch-radio-option ${!quickSelectionByGroup[group.id] ? 'active' : ''}`}
                              onClick={() => setQuickSelectionByGroup((prev) => {
                                const next = { ...prev };
                                delete next[group.id];
                                return next;
                              })}
                              type="button"
                            >
                              Aucun
                            </button>
                            {group.options.map((option) => (
                              <button
                                key={option.id}
                                className={`retouch-radio-option ${quickSelectionByGroup[group.id] === option.id ? 'active' : ''}`}
                                onClick={() => setQuickSelectionByGroup((prev) => ({ ...prev, [group.id]: option.id }))}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="retouch-prompt-config">
                    <div className="retouch-locked-model">Modèle verrouillé: FLUX Schnell</div>
                    <div className="retouch-locked-model">Longueur verrouillée: moyenne (recommandée)</div>

                    <div className="retouch-safety-row">
                      <button
                        className={`btn-legal-safety-v3 ${isLegalSafetyActive ? 'active' : ''}`}
                        onClick={() => setIsLegalSafetyActive((prev) => !prev)}
                        type="button"
                      >
                        <Shield size={18} className={isLegalSafetyActive ? 'pulse-shield' : ''} />
                        <div className="txt">
                          <span>Droit à l'Image</span>
                          <small>{isLegalSafetyActive ? 'MAXIMUM' : 'STANDARD'}</small>
                        </div>
                      </button>

                      <button
                        className={`btn-legal-safety-v3 btn-anti-franchise ${isAntiFranchiseActive ? 'active' : ''}`}
                        onClick={() => setIsAntiFranchiseActive((prev) => !prev)}
                        type="button"
                      >
                        <AlertTriangle size={18} className={isAntiFranchiseActive ? 'pulse-shield' : ''} />
                        <div className="txt">
                          <span>Anti-franchise</span>
                          <small>{isAntiFranchiseActive ? 'MAXIMUM' : 'STANDARD'}</small>
                        </div>
                      </button>
                    </div>

                    <label className="retouch-free-instruction">
                      Consigne libre (prioritaire sur réglages rapides)
                      <textarea
                        value={freeInstruction}
                        onChange={(e) => setFreeInstruction(e.target.value)}
                        placeholder="Ex: Je veux un rendu sobriété visuelle, aucun personnage identifiable, focus sur le paquebot et la météo."
                        rows={3}
                      />
                    </label>

                    <label className="retouch-free-instruction">
                      Prompt direct Flux Schnell (cas difficiles, bypass Gemini)
                      <textarea
                        value={directFluxPrompt}
                        onChange={(e) => setDirectFluxPrompt(e.target.value)}
                        placeholder="Colle un prompt final EN/FR. Les contraintes Droit à l'image et Anti-franchise restent appliquées."
                        rows={4}
                      />
                    </label>

                    <button
                      className="btn-nav"
                      type="button"
                      onClick={() => applyPromptToFlux(directFluxPrompt)}
                      disabled={isApplyingPrompt || !directFluxPrompt.trim()}
                    >
                      Injection directe vers Flux Schnell
                    </button>

                    <label className="retouch-checkbox">
                      <input
                        type="checkbox"
                        checked={fluxAgentConfig.includeNegativePrompt}
                        onChange={(e) => setFluxAgentConfig((prev) => ({ ...prev, includeNegativePrompt: e.target.checked }))}
                      />
                      Ajouter negative prompt
                    </label>
                  </div>

                  <button className="btn-review" onClick={buildFluxPrompt} disabled={!review}>
                    Générer prompt Flux Schnell
                  </button>
                </div>

                {fluxDraft && (
                  <div className="retouch-prompt-card">
                    <p className="retouch-prompt-rationale">{fluxDraft.rationale}</p>
                    <p className="retouch-prompt-rationale">{fluxDraft.generationParams}</p>

                    <label>Prompt Flux Schnell</label>
                    <textarea value={fluxDraft.prompt} readOnly rows={8} />
                    <button className="btn-nav" onClick={() => copyText(fluxDraft.prompt)}>Copier prompt</button>

                    {fluxDraft.negativePrompt ? (
                      <>
                        <label>Negative prompt</label>
                        <textarea value={fluxDraft.negativePrompt} readOnly rows={4} />
                        <button className="btn-nav" onClick={() => copyText(fluxDraft.negativePrompt)}>Copier negative</button>
                      </>
                    ) : (
                      <p className="retouch-prompt-rationale">Negative prompt désactivé (recommandé pour Schnell, sauf besoin spécifique).</p>
                    )}

                    <button className="btn-review" onClick={() => applyPromptToFlux()} disabled={isApplyingPrompt}>
                      {isApplyingPrompt ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                      Générer via Flux Schnell et remplacer l'image
                    </button>

                    {agentMessage && <p className="retouch-prompt-rationale">{agentMessage}</p>}
                    {lastApplyRequestId && <p className="retouch-prompt-rationale">request_id: {lastApplyRequestId}</p>}
                    {lastPromptFrontend && (
                      <>
                        <label>Prompt reçu du frontend (avant Gemini)</label>
                        <textarea value={lastPromptFrontend} readOnly rows={4} />
                      </>
                    )}
                    {lastPromptAfterGemini && (
                      <>
                        <label>Prompt après Gemini (EN)</label>
                        <textarea value={lastPromptAfterGemini} readOnly rows={4} />
                      </>
                    )}
                    {lastPromptSentToFlux && (
                      <>
                        <label>Prompt EXACT envoyé à Flux Schnell (Replicate)</label>
                        <textarea value={lastPromptSentToFlux} readOnly rows={6} />
                      </>
                    )}
                    {lastFluxPromptUsed && (
                      <>
                        <label>Flux prompt réellement utilisé</label>
                        <textarea value={lastFluxPromptUsed} readOnly rows={5} />
                      </>
                    )}
                    {lastApplyDebugTrace && (
                      <>
                        <label>Logs complets admin-retouch-apply</label>
                        <textarea value={lastApplyDebugTrace} readOnly rows={12} />
                      </>
                    )}
                  </div>
                )}
              </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default RetoucheImagePage;
