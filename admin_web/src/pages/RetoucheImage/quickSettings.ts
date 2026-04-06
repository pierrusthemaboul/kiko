export interface QuickSettingOption {
  id: string;
  label: string;
  promptHint: string;
}

export interface QuickSettingGroup {
  id: string;
  label: string;
  categoryIds: string[];
  options: QuickSettingOption[];
}

export const QUICK_SETTING_GROUPS: QuickSettingGroup[] = [
  {
    id: 'visual_language',
    label: 'Langage visuel',
    categoryIds: ['arts_culture_media', 'societe_droits', 'religion_philosophie', 'autres'],
    options: [
      { id: 'visual_direct', label: 'Narration directe', promptHint: 'narration visuelle directe, éléments explicites et lisibles' },
      { id: 'visual_metonymy', label: 'Métonymie', promptHint: 'métonymie visuelle: représenter le sujet par objets/symboles associés, sans sur-explication' },
    ],
  },
  {
    id: 'medium_family',
    label: 'Famille visuelle',
    categoryIds: ['arts_culture_media', 'politique_guerre', 'exploration_transport', 'autres'],
    options: [
      { id: 'medium_cinema', label: 'Mode cinéma', promptHint: 'cinematic live-action style, film still look, photoreal rendering, natural human proportions, realistic textures' },
      { id: 'medium_photojournalism', label: 'Photojournalisme', promptHint: 'style photojournalisme réaliste, instant capturé, crédibilité documentaire' },
      { id: 'medium_comic', label: 'Dessin BD', promptHint: 'style dessin BD lisible, encrage maîtrisé, narration visuelle dynamique' },
      { id: 'medium_old_masters', label: 'Peintures grands peintres', promptHint: 'inspiration peinture des grands maîtres, composition classique, lumière picturale' },
    ],
  },
  {
    id: 'framing',
    label: 'Cadrage',
    categoryIds: ['arts_culture_media', 'exploration_transport', 'politique_guerre', 'catastrophes_sante', 'autres'],
    options: [
      { id: 'framing_hero', label: 'Hero shot cinématique', promptHint: 'cadrage hero shot, sujet central fort, lisibilité immédiate' },
      { id: 'framing_wide', label: 'Plan large narratif', promptHint: 'plan large narratif, décor contextualisé, profondeur claire' },
      { id: 'framing_closeup', label: 'Plan rapproché émotion', promptHint: 'plan rapproché émotionnel, expressions fortes, arrière-plan contrôlé' },
    ],
  },
  {
    id: 'lighting',
    label: 'Lumière',
    categoryIds: ['arts_culture_media', 'catastrophes_sante', 'societe_droits', 'religion_philosophie', 'autres'],
    options: [
      { id: 'light_dramatic', label: 'Dramatique', promptHint: 'lumière dramatique contrastée, ambiance intense' },
      { id: 'light_natural', label: 'Naturelle', promptHint: 'lumière naturelle crédible, rendu réaliste équilibré' },
      { id: 'light_cold', label: 'Froide mélancolique', promptHint: 'palette froide, atmosphère mélancolique, tons bleutés contrôlés' },
    ],
  },
  {
    id: 'historical_focus',
    label: 'Fidélité historique',
    categoryIds: ['politique_guerre', 'sciences_tech', 'exploration_transport', 'societe_droits', 'autres'],
    options: [
      { id: 'hist_strict', label: 'Très stricte', promptHint: 'exactitude historique stricte, accessoires et vêtements d’époque' },
      { id: 'hist_balanced', label: 'Équilibrée', promptHint: 'cohérence historique élevée, légère stylisation visuelle' },
      { id: 'hist_cinematic', label: 'Ciné prioritaire', promptHint: 'priorité à l’impact cinématique tout en conservant des repères d’époque' },
    ],
  },
  {
    id: 'character_policy',
    label: 'Personnages',
    categoryIds: ['arts_culture_media', 'sports', 'societe_droits', 'autres'],
    options: [
      { id: 'char_no_human', label: 'Sans humain', promptHint: 'strictly no humans, no person, no silhouette, no crowd, environment/objects only' },
      { id: 'char_iconic', label: 'Personnages iconiques suggérés', promptHint: 'personnages iconiques suggérés visuellement sans copie photo exacte' },
      { id: 'char_anonymous', label: 'Personnages anonymisés', promptHint: 'personnages anonymisés, traits non identifiables individuellement' },
      { id: 'char_environment', label: 'Focus décor/objet', promptHint: 'focus principal sur décor et objets, personnages secondaires' },
    ],
  },
  {
    id: 'color_mode',
    label: 'Couleur',
    categoryIds: ['arts_culture_media', 'politique_guerre', 'catastrophes_sante', 'exploration_transport', 'autres'],
    options: [
      { id: 'color_full', label: 'Couleur', promptHint: 'palette couleur riche, harmonies maîtrisées, contraste cinématique' },
      { id: 'color_bw', label: 'Noir et blanc', promptHint: 'rendu noir et blanc, contraste tonal fort, esthétique intemporelle' },
    ],
  },
  {
    id: 'texture_style',
    label: 'Rendu visuel',
    categoryIds: ['arts_culture_media', 'exploration_transport', 'catastrophes_sante', 'autres'],
    options: [
      { id: 'texture_clean', label: 'Propre premium', promptHint: 'rendu propre premium, détails nets, texture maîtrisée' },
      { id: 'texture_film', label: 'Filmique grain fin', promptHint: 'look filmique grain fin, contraste cinéma, profondeur atmosphérique' },
      { id: 'texture_documentary', label: 'Documentaire réaliste', promptHint: 'style documentaire réaliste, authenticité prioritaire, post-traitement discret' },
    ],
  },
];

export const getQuickSettingGroupsForCategory = (categoryId?: string | null) => {
  if (!categoryId) return QUICK_SETTING_GROUPS;
  const scoped = QUICK_SETTING_GROUPS.filter(
    (group) => group.categoryIds.includes(categoryId) || group.categoryIds.includes('autres')
  );
  return scoped.length > 0 ? scoped : QUICK_SETTING_GROUPS;
};

export const getDefaultQuickSelection = (categoryId?: string | null): Record<string, string> => {
  const groups = getQuickSettingGroupsForCategory(categoryId);
  return groups.reduce<Record<string, string>>((acc, group) => {
    if (group.options.length > 0) {
      acc[group.id] = group.options[0].id;
    }
    return acc;
  }, {});
};

export const resolveQuickSettingHints = (selectionByGroup: Record<string, string>, categoryId?: string | null) => {
  const groups = getQuickSettingGroupsForCategory(categoryId);
  const labels: string[] = [];
  const hints: string[] = [];

  groups.forEach((group) => {
    const selectedOptionId = selectionByGroup[group.id];
    if (!selectedOptionId) return;
    const option = group.options.find((item) => item.id === selectedOptionId);
    if (!option) return;
    labels.push(`${group.label}: ${option.label}`);
    hints.push(option.promptHint);
  });

  return { labels, hints };
};
