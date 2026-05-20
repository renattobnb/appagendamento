create extension if not exists "pgcrypto";

create type public.tipo_usuario as enum ('cliente', 'administrador', 'prestador');
create type public.status_agendamento as enum ('confirmado', 'pendente', 'cancelado', 'finalizado');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  telefone text,
  tipo_usuario public.tipo_usuario not null default 'cliente',
  created_at timestamptz not null default now()
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  valor numeric(10, 2) not null check (valor >= 0),
  duracao_minutos integer not null check (duracao_minutos > 0),
  ativo boolean not null default true
);

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  especialidade text,
  foto_url text,
  ativo boolean not null default true
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.users(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  status public.status_agendamento not null default 'pendente',
  observacoes text,
  created_at timestamptz not null default now(),
  constraint hora_valida check (hora_fim > hora_inicio)
);

create table public.disponibilidade (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  dia_semana integer not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  constraint disponibilidade_hora_valida check (hora_fim > hora_inicio)
);

create index agendamentos_profissional_data_idx on public.agendamentos (profissional_id, data);
create index agendamentos_cliente_idx on public.agendamentos (cliente_id);
create index disponibilidade_profissional_dia_idx on public.disponibilidade (profissional_id, dia_semana);

alter table public.users enable row level security;
alter table public.servicos enable row level security;
alter table public.profissionais enable row level security;
alter table public.agendamentos enable row level security;
alter table public.disponibilidade enable row level security;

create or replace function public.current_user_role()
returns public.tipo_usuario
language sql
security definer
set search_path = public
as $$
  select tipo_usuario from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'administrador', false);
$$;

create policy "usuarios leem proprio perfil ou admin le todos"
on public.users for select
using (id = auth.uid() or public.is_admin());

create policy "usuarios atualizam proprio perfil"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "usuarios criam proprio perfil"
on public.users for insert
with check (id = auth.uid());

create policy "admin gerencia usuarios"
on public.users for all
using (public.is_admin())
with check (public.is_admin());

create policy "servicos ativos sao publicos"
on public.servicos for select
using (ativo = true or public.is_admin());

create policy "admin gerencia servicos"
on public.servicos for all
using (public.is_admin())
with check (public.is_admin());

create policy "profissionais ativos sao publicos"
on public.profissionais for select
using (ativo = true or public.is_admin());

create policy "admin gerencia profissionais"
on public.profissionais for all
using (public.is_admin())
with check (public.is_admin());

create policy "disponibilidade publica para leitura"
on public.disponibilidade for select
using (true);

create policy "admin gerencia disponibilidade"
on public.disponibilidade for all
using (public.is_admin())
with check (public.is_admin());

create policy "cliente le seus agendamentos"
on public.agendamentos for select
using (cliente_id = auth.uid() or public.is_admin());

create policy "cliente cria agendamento proprio"
on public.agendamentos for insert
with check (cliente_id = auth.uid());

create policy "cliente cancela ou reagenda agendamento proprio"
on public.agendamentos for update
using (cliente_id = auth.uid() or public.is_admin())
with check (cliente_id = auth.uid() or public.is_admin());

create policy "admin gerencia agendamentos"
on public.agendamentos for all
using (public.is_admin())
with check (public.is_admin());

create or replace function public.prevent_appointment_conflict()
returns trigger
language plpgsql
as $$
begin
  if new.data < current_date or (new.data = current_date and new.hora_inicio < current_time) then
    raise exception 'Nao e permitido agendar em horarios passados';
  end if;

  if exists (
    select 1
    from public.agendamentos a
    where a.profissional_id = new.profissional_id
      and a.data = new.data
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
      and new.hora_inicio >= d.hora_inicio
      and new.hora_fim <= d.hora_fim
  ) then
    raise exception 'Horario fora da disponibilidade do profissional';
  end if;

  return new;
end;
$$;

create trigger agendamentos_prevent_conflict
before insert or update on public.agendamentos
for each row execute function public.prevent_appointment_conflict();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, nome, email, telefone, tipo_usuario)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    coalesce((new.raw_user_meta_data->>'tipo_usuario')::public.tipo_usuario, 'cliente')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into storage.buckets (id, name, public)
values ('profissionais', 'profissionais', true)
on conflict (id) do nothing;

create policy "imagens de profissionais sao publicas"
on storage.objects for select
using (bucket_id = 'profissionais');

create policy "admin envia imagens de profissionais"
on storage.objects for insert
with check (bucket_id = 'profissionais' and public.is_admin());
