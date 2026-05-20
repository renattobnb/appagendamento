create or replace function public.get_guest_appointments(telefone_param text)
returns table (
  id uuid,
  servico_id uuid,
  cliente_id uuid,
  cliente_nome text,
  cliente_telefone text,
  profissional_id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  status public.status_agendamento,
  observacoes text,
  created_at timestamptz,
  servico_nome text,
  profissional_nome text
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.servico_id,
    a.cliente_id,
    a.cliente_nome,
    a.cliente_telefone,
    a.profissional_id,
    a.data,
    a.hora_inicio,
    a.hora_fim,
    a.status,
    a.observacoes,
    a.created_at,
    s.nome as servico_nome,
    p.nome as profissional_nome
  from public.agendamentos a
  join public.servicos s on s.id = a.servico_id
  join public.profissionais p on p.id = a.profissional_id
  where regexp_replace(coalesce(a.cliente_telefone, ''), '\\D', '', 'g')
    = regexp_replace(coalesce(telefone_param, ''), '\\D', '', 'g')
  order by a.data desc, a.hora_inicio desc;
$$;

grant execute on function public.get_guest_appointments(text) to anon, authenticated;
