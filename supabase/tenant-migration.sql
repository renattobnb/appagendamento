-- 1. Criar tabela de estabelecimentos se nao existir
create table if not exists public.estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.estabelecimentos enable row level security;

drop policy if exists "estabelecimentos publicos para leitura" on public.estabelecimentos;
create policy "estabelecimentos publicos para leitura"
on public.estabelecimentos for select
using (true);

drop policy if exists "admin cadastra estabelecimentos" on public.estabelecimentos;
create policy "admin cadastra estabelecimentos"
on public.estabelecimentos for insert
with check (public.is_admin());

drop policy if exists "admin atualiza estabelecimentos" on public.estabelecimentos;
create policy "admin atualiza estabelecimentos"
on public.estabelecimentos for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin exclui estabelecimentos" on public.estabelecimentos;
create policy "admin exclui estabelecimentos"
on public.estabelecimentos for delete
using (public.is_admin());

-- 2. Inserir estabelecimento padrao para migracao de dados existentes
insert into public.estabelecimentos (id, nome, slug)
values ('11111111-1111-1111-1111-111111111111', 'Estabelecimento Padrão', 'padrao')
on conflict (id) do nothing;

-- 3. Adicionar coluna estabelecimento_id nas tabelas
alter table public.users add column if not exists estabelecimento_id uuid;
alter table public.servicos add column if not exists estabelecimento_id uuid;
alter table public.profissionais add column if not exists estabelecimento_id uuid;
alter table public.agendamentos add column if not exists estabelecimento_id uuid;
alter table public.disponibilidade add column if not exists estabelecimento_id uuid;

-- 4. Associar registros existentes ao estabelecimento padrao
update public.users set estabelecimento_id = '11111111-1111-1111-1111-111111111111' where estabelecimento_id is null;
update public.servicos set estabelecimento_id = '11111111-1111-1111-1111-111111111111' where estabelecimento_id is null;
update public.profissionais set estabelecimento_id = '11111111-1111-1111-1111-111111111111' where estabelecimento_id is null;

-- Desabilita temporariamente o trigger de conflitos para atualizar os agendamentos antigos (que podem estar no passado)
alter table public.agendamentos disable trigger agendamentos_prevent_conflict;
update public.agendamentos set estabelecimento_id = '11111111-1111-1111-1111-111111111111' where estabelecimento_id is null;
alter table public.agendamentos enable trigger agendamentos_prevent_conflict;

update public.disponibilidade set estabelecimento_id = '11111111-1111-1111-1111-111111111111' where estabelecimento_id is null;


-- 5. Definir colunas como NOT NULL e adicionar constraints de chave estrangeira
alter table public.users alter column estabelecimento_id set not null;
alter table public.users drop constraint if exists fk_users_estabelecimento;
alter table public.users add constraint fk_users_estabelecimento foreign key (estabelecimento_id) references public.estabelecimentos(id) on delete cascade;

alter table public.servicos alter column estabelecimento_id set not null;
alter table public.servicos drop constraint if exists fk_servicos_estabelecimento;
alter table public.servicos add constraint fk_servicos_estabelecimento foreign key (estabelecimento_id) references public.estabelecimentos(id) on delete cascade;

alter table public.profissionais alter column estabelecimento_id set not null;
alter table public.profissionais drop constraint if exists fk_profissionais_estabelecimento;
alter table public.profissionais add constraint fk_profissionais_estabelecimento foreign key (estabelecimento_id) references public.estabelecimentos(id) on delete cascade;

alter table public.agendamentos alter column estabelecimento_id set not null;
alter table public.agendamentos drop constraint if exists fk_agendamentos_estabelecimento;
alter table public.agendamentos add constraint fk_agendamentos_estabelecimento foreign key (estabelecimento_id) references public.estabelecimentos(id) on delete cascade;

alter table public.disponibilidade alter column estabelecimento_id set not null;
alter table public.disponibilidade drop constraint if exists fk_disponibilidade_estabelecimento;
alter table public.disponibilidade add constraint fk_disponibilidade_estabelecimento foreign key (estabelecimento_id) references public.estabelecimentos(id) on delete cascade;

-- 6. Criar indices para performance
create index if not exists users_estabelecimento_idx on public.users(estabelecimento_id);
create index if not exists servicos_estabelecimento_idx on public.servicos(estabelecimento_id);
create index if not exists profissionais_estabelecimento_idx on public.profissionais(estabelecimento_id);
create index if not exists agendamentos_estabelecimento_idx on public.agendamentos(estabelecimento_id);
create index if not exists disponibilidade_estabelecimento_idx on public.disponibilidade(estabelecimento_id);

-- 7. Atualizar funcoes auxiliares
create or replace function public.current_user_establishment()
returns uuid
language sql
security definer
set search_path = public
as $$
  select estabelecimento_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'administrador', false);
$$;

-- 8. Remover RLS policies antigas
drop policy if exists "usuarios leem proprio perfil ou admin le todos" on public.users;
drop policy if exists "admin atualiza proprio perfil" on public.users;
drop policy if exists "admin gerencia usuarios" on public.users;

drop policy if exists "servicos ativos sao publicos" on public.servicos;
drop policy if exists "admin gerencia servicos" on public.servicos;

drop policy if exists "profissionais ativos sao publicos" on public.profissionais;
drop policy if exists "admin gerencia profissionais" on public.profissionais;

drop policy if exists "disponibilidade publica para leitura" on public.disponibilidade;
drop policy if exists "admin gerencia disponibilidade" on public.disponibilidade;

drop policy if exists "admin le agendamentos" on public.agendamentos;
drop policy if exists "visitante cria agendamento com identificacao" on public.agendamentos;
drop policy if exists "admin atualiza agendamentos" on public.agendamentos;
drop policy if exists "admin gerencia agendamentos" on public.agendamentos;

-- 9. Criar RLS policies multi-tenant baseadas em estabelecimento_id
create policy "usuarios leem proprio perfil ou admin le todos"
on public.users for select
using (id = auth.uid() or (public.is_admin() and estabelecimento_id = public.current_user_establishment()));

create policy "admin atualiza proprio perfil"
on public.users for update
using (id = auth.uid() and tipo_usuario = 'administrador' and estabelecimento_id = public.current_user_establishment())
with check (id = auth.uid() and tipo_usuario = 'administrador' and estabelecimento_id = public.current_user_establishment());

create policy "admin gerencia usuarios"
on public.users for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "servicos ativos sao publicos"
on public.servicos for select
using (ativo = true or (public.is_admin() and estabelecimento_id = public.current_user_establishment()));

create policy "admin gerencia servicos"
on public.servicos for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "profissionais ativos sao publicos"
on public.profissionais for select
using (ativo = true or (public.is_admin() and estabelecimento_id = public.current_user_establishment()));

create policy "admin gerencia profissionais"
on public.profissionais for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "disponibilidade publica para leitura"
on public.disponibilidade for select
using (true);

create policy "admin gerencia disponibilidade"
on public.disponibilidade for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "admin le agendamentos"
on public.agendamentos for select
using (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "visitante cria agendamento com identificacao"
on public.agendamentos for insert
with check (
  cliente_id is null
  and cliente_nome is not null
  and cliente_telefone is not null
);

create policy "admin atualiza agendamentos"
on public.agendamentos for update
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

create policy "admin gerencia agendamentos"
on public.agendamentos for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

-- 10. Atualizar a trigger de criacao de novos usuarios auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estabelecimento_id uuid;
  v_slug text;
  v_nome text;
begin
  v_slug := new.raw_user_meta_data->>'estabelecimento_slug';
  v_nome := coalesce(new.raw_user_meta_data->>'estabelecimento_nome', v_slug);

  if v_slug is not null then
    -- Find or create establishment
    select id into v_estabelecimento_id from public.estabelecimentos where slug = v_slug;
    
    if v_estabelecimento_id is null then
      insert into public.estabelecimentos (nome, slug)
      values (v_nome, v_slug)
      returning id into v_estabelecimento_id;
    end if;

    if new.raw_user_meta_data->>'tipo_usuario' = 'administrador' then
      insert into public.users (id, nome, email, telefone, tipo_usuario, estabelecimento_id)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'telefone',
        'administrador',
        v_estabelecimento_id
      )
      on conflict (id) do nothing;
    end if;
  else
    -- Se nao informou o slug do estabelecimento, vincula ao padrao
    select id into v_estabelecimento_id from public.estabelecimentos where slug = 'padrao';
    if v_estabelecimento_id is null then
      insert into public.estabelecimentos (id, nome, slug)
      values ('11111111-1111-1111-1111-111111111111', 'Estabelecimento Padrão', 'padrao')
      returning id into v_estabelecimento_id;
    end if;

    if new.raw_user_meta_data->>'tipo_usuario' = 'administrador' then
      insert into public.users (id, nome, email, telefone, tipo_usuario, estabelecimento_id)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        new.email,
        new.raw_user_meta_data->>'telefone',
        'administrador',
        v_estabelecimento_id
      )
      on conflict (id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- 11. Atualizar funcao de conflito de agendamentos
create or replace function public.prevent_appointment_conflict()
returns trigger
language plpgsql
as $$
begin
  if new.data < current_date or (new.data = current_date and new.hora_inicio < current_time) then
    raise exception 'Nao e permitido agendar em horarios passados';
  end if;

  -- Garantir que o profissional pertence ao mesmo estabelecimento que o agendamento
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

-- 12. Atualizar funcao get_guest_appointments
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
    and a.estabelecimento_id = estabelecimento_id_param
  order by a.data desc, a.hora_inicio desc;
$$;

grant execute on function public.get_guest_appointments(text, uuid) to anon, authenticated;

-- 13. Cancelamento seguro de agendamento por visitante
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

-- 13b. Cancelamento seguro de agendamento pelo profissional
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

-- 14. Acesso autenticado para profissionais
alter type public.tipo_usuario add value if not exists 'profissional';

alter table public.profissionais
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists profissionais_user_id_idx
on public.profissionais(user_id)
where user_id is not null;

alter table public.users
  drop constraint if exists users_apenas_administradores;

alter table public.users
  drop constraint if exists users_apenas_admins_ou_profissionais;

alter table public.users
  add constraint users_apenas_admins_ou_profissionais
  check (tipo_usuario in ('administrador', 'profissional'));

create or replace function public.is_professional()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'profissional', false);
$$;

create or replace function public.current_professional_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.profissionais where user_id = auth.uid();
$$;

drop policy if exists "profissional le proprio cadastro" on public.profissionais;
create policy "profissional le proprio cadastro"
on public.profissionais for select
using (user_id = auth.uid());

drop policy if exists "profissional le seus agendamentos" on public.agendamentos;
create policy "profissional le seus agendamentos"
on public.agendamentos for select
using (
  profissional_id = public.current_professional_id()
  and estabelecimento_id = public.current_user_establishment()
);
