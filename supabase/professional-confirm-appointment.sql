create or replace function public.confirm_professional_appointment(
  appointment_id_param uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agendamentos
  set status = 'confirmado'
  where id = appointment_id_param
    and profissional_id = public.current_professional_id()
    and estabelecimento_id = public.current_user_establishment()
    and status = 'pendente'
    and (data + hora_inicio) > now();

  return found;
end;
$$;

grant execute on function public.confirm_professional_appointment(uuid) to authenticated;
