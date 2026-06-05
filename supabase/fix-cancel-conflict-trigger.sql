create or replace function public.prevent_appointment_conflict()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('confirmado', 'pendente') then
    return new;
  end if;

  if new.data < current_date or (new.data = current_date and new.hora_inicio < current_time) then
    raise exception 'Nao e permitido agendar em horarios passados';
  end if;

  if not exists (
    select 1
    from public.profissionais p
    where p.id = new.profissional_id
      and p.estabelecimento_id = new.estabelecimento_id
  ) then
    raise exception 'Profissional nao pertence a este estabelecimento';
  end if;

  if exists (
    select 1
    from public.agendamentos a
    where a.profissional_id = new.profissional_id
      and a.data = new.data
      and a.estabelecimento_id = new.estabelecimento_id
      and a.status in ('confirmado', 'pendente')
      and a.id <> coalesce(new.id, gen_random_uuid())
      and a.hora_inicio < new.hora_fim
      and a.hora_fim > new.hora_inicio
  ) then
    raise exception 'Conflito de horario para este profissional';
  end if;

  if not exists (
    select 1
    from public.disponibilidade d
    where d.profissional_id = new.profissional_id
      and d.dia_semana = extract(dow from new.data)
      and d.estabelecimento_id = new.estabelecimento_id
      and new.hora_inicio >= d.hora_inicio
      and new.hora_fim <= d.hora_fim
  ) then
    raise exception 'Horario fora da disponibilidade do profissional';
  end if;

  return new;
end;
$$;
