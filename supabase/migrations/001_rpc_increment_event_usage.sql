-- Atomic increment RPC for event usage
create or replace function public.increment_event_usage(event_id uuid)
returns void
language sql
security definer
as $$
  update public.evenements
  set frequency_score = coalesce(frequency_score, 0) + 1,
      last_used = now()
  where id = event_id;
$$;

-- Grant execute to common roles
grant execute on function public.increment_event_usage(uuid) to anon, authenticated, service_role;

