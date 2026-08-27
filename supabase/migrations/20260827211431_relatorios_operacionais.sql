create index if not exists agendamentos_relatorio_periodo_idx
  on public.agendamentos (estabelecimento_id, data, status);

create or replace function public.get_admin_report(
  p_estabelecimento_id uuid,
  p_start_date date,
  p_end_date date,
  p_inactive_days integer default 20
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  today_local date := timezone('America/Fortaleza', now())::date;
begin
  if p_start_date > p_end_date or p_inactive_days < 1 then
    raise exception 'Parâmetros de relatório inválidos';
  end if;
  if not public.is_tenant_admin(p_estabelecimento_id) then
    raise exception 'Acesso negado ao estabelecimento';
  end if;

  return (
    with period_appointments as (
      select a.*, coalesce(s.valor, 0)::numeric as valor_servico, s.nome as servico_nome, p.nome as profissional_nome
      from public.agendamentos a
      join public.servicos s on s.id = a.servico_id and s.estabelecimento_id = a.estabelecimento_id
      join public.profissionais p on p.id = a.profissional_id and p.estabelecimento_id = a.estabelecimento_id
      where a.estabelecimento_id = p_estabelecimento_id and a.data between p_start_date and p_end_date
    ), completed_history as (
      select a.*, s.nome as servico_nome, p.nome as profissional_nome,
        case when a.cliente_id is not null then 'id:' || a.cliente_id::text
          else 'phone:' || regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g') end as customer_key
      from public.agendamentos a
      join public.servicos s on s.id = a.servico_id and s.estabelecimento_id = a.estabelecimento_id
      join public.profissionais p on p.id = a.profissional_id and p.estabelecimento_id = a.estabelecimento_id
      where a.estabelecimento_id = p_estabelecimento_id and a.status = 'finalizado' and a.data <= today_local
        and nullif(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g'), '') is not null
    ), last_completed as (
      select distinct on (customer_key) customer_key, cliente_nome, cliente_telefone, data, servico_nome, profissional_nome
      from completed_history order by customer_key, data desc, hora_fim desc, id desc
    ), eligible_inactive as (
      select customer_key, coalesce(nullif(trim(cliente_nome), ''), 'Cliente') as name, cliente_telefone as phone,
        data as last_appointment_date, servico_nome as last_service, profissional_nome as last_professional,
        (today_local - data) as inactive_days
      from last_completed
      where today_local - data >= p_inactive_days
        and regexp_replace(cliente_telefone, '\D', '', 'g') ~ '^(55)?[1-9][0-9]9?[0-9]{8}$'
    ), period_completed as (select * from period_appointments where status = 'finalizado'),
    period_customers as (
      select distinct case when cliente_id is not null then 'id:' || cliente_id::text
        else 'phone:' || regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g') end as customer_key
      from period_completed where nullif(regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g'), '') is not null
    )
    select jsonb_build_object(
      'summary', jsonb_build_object(
        'appointments', (select count(*) from period_appointments),
        'completed', (select count(*) from period_completed),
        'cancelled', (select count(*) from period_appointments where status = 'cancelado'),
        'revenue', (select coalesce(sum(valor_servico), 0) from period_completed),
        'averageTicket', (select coalesce(avg(valor_servico), 0) from period_completed),
        'customers', (select count(*) from period_customers),
        'newCustomers', (select count(*) from period_customers pc where not exists (select 1 from completed_history h where h.customer_key = pc.customer_key and h.data < p_start_date)),
        'recurringCustomers', (select count(*) from period_customers pc where exists (select 1 from completed_history h where h.customer_key = pc.customer_key and h.data < p_start_date)),
        'cancellationRate', (select coalesce(round(100.0 * count(*) filter (where status = 'cancelado') / nullif(count(*), 0), 1), 0) from period_appointments),
        'topProfessional', (select profissional_nome from period_completed group by profissional_nome order by count(*) desc, profissional_nome limit 1),
        'topService', (select servico_nome from period_completed group by servico_nome order by count(*) desc, servico_nome limit 1)
      ),
      'inactive_customers', coalesce((select jsonb_agg(jsonb_build_object('key', customer_key, 'name', name, 'phone', phone, 'lastAppointmentDate', last_appointment_date, 'lastService', last_service, 'lastProfessional', last_professional, 'inactiveDays', inactive_days) order by inactive_days desc, name) from eligible_inactive), '[]'::jsonb),
      'services', coalesce((select jsonb_agg(jsonb_build_object('name', servico_nome, 'appointments', appointments, 'revenue', revenue) order by appointments desc, name) from (select servico_nome, count(*) as appointments, sum(valor_servico) as revenue from period_completed group by servico_nome) services), '[]'::jsonb),
      'professionals', coalesce((select jsonb_agg(jsonb_build_object('name', profissional_nome, 'appointments', appointments, 'revenue', revenue, 'cancelled', cancelled) order by appointments desc, name) from (select profissional_nome, count(*) filter (where status = 'finalizado') as appointments, coalesce(sum(valor_servico) filter (where status = 'finalizado'), 0) as revenue, count(*) filter (where status = 'cancelado') as cancelled from period_appointments group by profissional_nome) professionals), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.get_admin_report(uuid, date, date, integer) from public;
grant execute on function public.get_admin_report(uuid, date, date, integer) to authenticated;
