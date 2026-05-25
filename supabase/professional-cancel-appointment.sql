alter table public.agendamentos
  add column if not exists cancelado_por text,
  add column if not exists motivo_cancelamento text,
  add column if not exists cancelado_em timestamptz;

create or replace function public.cancel_professional_appointment(
  appointment_id_param uuid,
  motivo_param text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if length(trim(coalesce(motivo_param, ''))) < 5 then
    raise exception 'Informe uma justificativa para o cancelamento';
  end if;

  update public.agendamentos
  set
    status = 'cancelado',
    cancelado_por = 'profissional',
    motivo_cancelamento = trim(motivo_param),
    cancelado_em = now()
  where id = appointment_id_param
    and profissional_id = public.current_professional_id()
    and estabelecimento_id = public.current_user_establishment()
    and status in ('pendente', 'confirmado')
    and (data + hora_inicio) > now();

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.cancel_professional_appointment(uuid, text) to authenticated;
