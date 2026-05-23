create or replace function public.cancel_guest_appointment(
  appointment_id_param uuid,
  telefone_param text,
  estabelecimento_id_param uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.agendamentos
  set status = 'cancelado'
  where id = appointment_id_param
    and estabelecimento_id = estabelecimento_id_param
    and status in ('pendente', 'confirmado')
    and (data + hora_inicio) > now()
    and regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g')
      = regexp_replace(coalesce(telefone_param, ''), '\D', '', 'g');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.cancel_guest_appointment(uuid, text, uuid) to anon, authenticated;
