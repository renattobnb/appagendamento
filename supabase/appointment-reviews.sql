create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null unique references public.agendamentos(id) on delete cascade,
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  cliente_nome text,
  cliente_telefone text not null,
  nota integer not null check (nota between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

alter table public.avaliacoes enable row level security;

create index if not exists avaliacoes_agendamento_idx on public.avaliacoes(agendamento_id);
create index if not exists avaliacoes_estabelecimento_idx on public.avaliacoes(estabelecimento_id);

drop policy if exists "admin le avaliacoes" on public.avaliacoes;
create policy "admin le avaliacoes"
on public.avaliacoes for select
using (public.is_admin() and estabelecimento_id = public.current_user_establishment());

drop policy if exists "admin gerencia avaliacoes" on public.avaliacoes;
create policy "admin gerencia avaliacoes"
on public.avaliacoes for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create or replace function public.submit_guest_review(
  appointment_id_param uuid,
  telefone_param text,
  estabelecimento_id_param uuid,
  nota_param integer,
  comentario_param text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  appointment_record public.agendamentos%rowtype;
begin
  if nota_param < 1 or nota_param > 5 then
    raise exception 'Informe uma nota de 1 a 5';
  end if;

  select *
  into appointment_record
  from public.agendamentos
  where id = appointment_id_param
    and estabelecimento_id = estabelecimento_id_param
    and regexp_replace(regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g'), '^55', '')
      = regexp_replace(regexp_replace(coalesce(telefone_param, ''), '\D', '', 'g'), '^55', '')
  limit 1;

  if appointment_record.id is null then
    return false;
  end if;

  if appointment_record.status <> 'finalizado' then
    raise exception 'Avaliacao disponivel apenas apos atendimento finalizado';
  end if;

  insert into public.avaliacoes (
    agendamento_id,
    estabelecimento_id,
    cliente_nome,
    cliente_telefone,
    nota,
    comentario
  )
  values (
    appointment_record.id,
    appointment_record.estabelecimento_id,
    appointment_record.cliente_nome,
    appointment_record.cliente_telefone,
    nota_param,
    nullif(trim(coalesce(comentario_param, '')), '')
  )
  on conflict (agendamento_id) do update
  set
    nota = excluded.nota,
    comentario = excluded.comentario,
    created_at = now();

  return true;
end;
$$;

grant execute on function public.submit_guest_review(uuid, text, uuid, integer, text) to anon, authenticated;

drop function if exists public.get_guest_appointments(text, uuid);

create or replace function public.get_guest_appointments(telefone_param text, estabelecimento_id_param uuid)
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
  profissional_nome text,
  avaliacao_nota integer,
  avaliacao_comentario text,
  avaliacao_created_at timestamptz
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
    p.nome as profissional_nome,
    av.nota as avaliacao_nota,
    av.comentario as avaliacao_comentario,
    av.created_at as avaliacao_created_at
  from public.agendamentos a
  join public.servicos s on s.id = a.servico_id
  join public.profissionais p on p.id = a.profissional_id
  left join public.avaliacoes av on av.agendamento_id = a.id
  where regexp_replace(regexp_replace(coalesce(a.cliente_telefone, ''), '\D', '', 'g'), '^55', '')
    = regexp_replace(regexp_replace(coalesce(telefone_param, ''), '\D', '', 'g'), '^55', '')
    and a.estabelecimento_id = estabelecimento_id_param
  order by a.data desc, a.hora_inicio desc;
$$;

grant execute on function public.get_guest_appointments(text, uuid) to anon, authenticated;
