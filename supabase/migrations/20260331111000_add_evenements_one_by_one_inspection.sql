-- One-by-one inspection markers for admin_web
alter table public.evenements
  add column if not exists inspection_one_by_one_status text,
  add column if not exists inspection_one_by_one_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'evenements_inspection_one_by_one_status_check'
  ) then
    alter table public.evenements
      add constraint evenements_inspection_one_by_one_status_check
      check (
        inspection_one_by_one_status is null
        or inspection_one_by_one_status in ('VALIDATED', 'TITLE_REVIEW', 'IMAGE_REVIEW')
      );
  end if;
end $$;

create index if not exists idx_evenements_inspection_one_by_one_status
  on public.evenements (inspection_one_by_one_status)
  where inspection_one_by_one_status is not null;
