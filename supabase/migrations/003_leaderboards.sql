-- Daily top: best score per user for current day
create or replace function public.get_daily_top(limit_n int default 10)
returns table(user_id uuid, display_name text, score int)
language sql
stable
as $$
  with best_per_user as (
    select distinct on (user_id)
      user_id,
      display_name,
      score
    from public.game_scores
    where created_at >= date_trunc('day', now())
    order by user_id, score desc
  )
  select user_id, display_name, score
  from best_per_user
  order by score desc
  limit coalesce(limit_n, 10)
$$;

grant execute on function public.get_daily_top(int) to anon, authenticated, service_role;

-- Monthly top: best score per user for current month
create or replace function public.get_monthly_top(limit_n int default 10)
returns table(user_id uuid, display_name text, score int)
language sql
stable
as $$
  with best_per_user as (
    select distinct on (user_id)
      user_id,
      display_name,
      score
    from public.game_scores
    where created_at >= date_trunc('month', now())
    order by user_id, score desc
  )
  select user_id, display_name, score
  from best_per_user
  order by score desc
  limit coalesce(limit_n, 10)
$$;

grant execute on function public.get_monthly_top(int) to anon, authenticated, service_role;

-- All-time top: from profiles.high_score
create or replace function public.get_all_time_top(limit_n int default 10)
returns table(user_id uuid, display_name text, score int)
language sql
stable
as $$
  select id as user_id, display_name, high_score as score
  from public.profiles
  where high_score is not null
  order by high_score desc
  limit coalesce(limit_n, 10)
$$;

grant execute on function public.get_all_time_top(int) to anon, authenticated, service_role;
