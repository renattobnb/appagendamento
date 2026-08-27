-- A trigger compartilhada não pode acessar NEW.servico_id ao rodar sobre
-- disponibilidade, pois essa tabela não possui essa coluna. Mantemos cada
-- validação no escopo da tabela que contém os campos consultados.
drop trigger if exists disponibilidade_estabelecimento_consistente on public.disponibilidade;
drop trigger if exists profissional_servicos_estabelecimento_consistente on public.profissional_servicos;
drop trigger if exists agendamentos_estabelecimento_consistente on public.agendamentos;

drop function if exists public.assert_estabelecimento_consistente();

create function public.assert_disponibilidade_estabelecimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profissionais profissional
    where profissional.id = new.profissional_id
      and profissional.estabelecimento_id = new.estabelecimento_id
  ) then
    raise exception 'Profissional nao pertence ao estabelecimento';
  end if;

  return new;
end;
$$;

create function public.assert_profissional_servicos_estabelecimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profissionais profissional
    join public.servicos servico on servico.id = new.servico_id
    where profissional.id = new.profissional_id
      and profissional.estabelecimento_id = new.estabelecimento_id
      and servico.estabelecimento_id = new.estabelecimento_id
  ) then
    raise exception 'Vinculo entre estabelecimentos distintos';
  end if;

  return new;
end;
$$;

create function public.assert_agendamento_estabelecimento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profissionais profissional
    join public.servicos servico on servico.id = new.servico_id
    join public.profissional_servicos vinculo
      on vinculo.profissional_id = profissional.id
      and vinculo.servico_id = servico.id
    where profissional.id = new.profissional_id
      and profissional.estabelecimento_id = new.estabelecimento_id
      and servico.estabelecimento_id = new.estabelecimento_id
      and vinculo.estabelecimento_id = new.estabelecimento_id
  ) then
    raise exception 'Agendamento referencia dados de outro estabelecimento';
  end if;

  return new;
end;
$$;

revoke all on function public.assert_disponibilidade_estabelecimento() from public;
revoke all on function public.assert_profissional_servicos_estabelecimento() from public;
revoke all on function public.assert_agendamento_estabelecimento() from public;

create trigger disponibilidade_estabelecimento_consistente
before insert or update on public.disponibilidade
for each row execute function public.assert_disponibilidade_estabelecimento();

create trigger profissional_servicos_estabelecimento_consistente
before insert or update on public.profissional_servicos
for each row execute function public.assert_profissional_servicos_estabelecimento();

create trigger agendamentos_estabelecimento_consistente
before insert or update on public.agendamentos
for each row execute function public.assert_agendamento_estabelecimento();
