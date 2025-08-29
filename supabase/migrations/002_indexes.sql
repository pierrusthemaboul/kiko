-- Helpful indexes for common queries
create index if not exists idx_evenements_level_date on public.evenements (niveau_difficulte, date);
create index if not exists idx_game_scores_created_score on public.game_scores (created_at desc, score desc);
create index if not exists idx_profiles_high_score on public.profiles (high_score desc);

