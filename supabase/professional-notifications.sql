create table if not exists public.notificacoes_profissionais (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete cascade,
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notificacoes_profissionais enable row level security;

create index if not exists notificacoes_profissionais_profissional_idx
on public.notificacoes_profissionais(profissional_id, lida, created_at desc);

drop policy if exists "profissional le suas notificacoes" on public.notificacoes_profissionais;
create policy "profissional le suas notificacoes"
on public.notificacoes_profissionais for select
using (
  profissional_id = public.current_professional_id()
  and estabelecimento_id = public.current_user_establishment()
);

drop policy if exists "profissional atualiza suas notificacoes" on public.notificacoes_profissionais;
create policy "profissional atualiza suas notificacoes"
on public.notificacoes_profissionais for update
using (
  profissional_id = public.current_professional_id()
  and estabelecimento_id = public.current_user_establishment()
)
with check (
  profissional_id = public.current_professional_id()
  and estabelecimento_id = public.current_user_establishment()
);

create or replace function public.notificar_profissional_agendamento(p_agendamento_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
  v_agendamento record;
begin
  select
    a.id,
    a.profissional_id,
    a.estabelecimento_id,
    a.cliente_nome,
    a.data,
    a.hora_inicio,
    s.nome as servico_nome
  into v_agendamento
  from public.agendamentos a
  join public.servicos s on s.id = a.servico_id
  where a.id = p_agendamento_id;

  if v_agendamento.id is null then
    return null;
  end if;

  insert into public.notificacoes_profissionais (
    profissional_id,
    agendamento_id,
    estabelecimento_id,
    titulo,
    mensagem
  )
  values (
    v_agendamento.profissional_id,
    v_agendamento.id,
    v_agendamento.estabelecimento_id,
    'Novo agendamento',
    concat(
      coalesce(v_agendamento.cliente_nome, 'Cliente'),
      ' agendou ',
      coalesce(v_agendamento.servico_nome, 'um servico'),
      ' para ',
      to_char(v_agendamento.data::date, 'DD/MM/YYYY'),
      ' as ',
      left(v_agendamento.hora_inicio::text, 5),
      '.'
    )
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

grant execute on function public.notificar_profissional_agendamento(uuid) to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.notificacoes_profissionais;
  end if;
exception
  when duplicate_object then null;
end $$;
