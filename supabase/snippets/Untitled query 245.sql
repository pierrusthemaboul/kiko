select
  date_trunc('hour', created_at) as h,
  count(*) as n
from public.labo
where created_at > now() - interval '24 hours'
group by 1
order by 1 desc;