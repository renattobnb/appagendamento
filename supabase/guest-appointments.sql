alter table public.agendamentos
  add column if not exists cliente_nome text,
  add column if not exists cliente_telefone text;

alter table public.agendamentos
  alter column cliente_id drop not null;

alter table public.agendamentos
  drop constraint if exists agendamento_cliente_identificado;

alter table public.agendamentos
  add constraint agendamento_cliente_identificado
  check (
    cliente_id is null
    and cliente_nome is not null
    and length(trim(cliente_nome)) >= 2
    and cliente_telefone is not null
    and length(trim(cliente_telefone)) >= 10
  );

drop policy if exists "cliente cria agendamento proprio" on public.agendamentos;
drop policy if exists "cliente ou visitante cria agendamento" on public.agendamentos;
create policy "visitante cria agendamento com identificacao"
on public.agendamentos for insert
with check (
  cliente_id is null
  and cliente_nome is not null
  and cliente_telefone is not null
);
