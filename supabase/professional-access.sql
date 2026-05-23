alter type public.tipo_usuario add value if not exists 'profissional';

alter table public.profissionais
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists profissionais_user_id_idx
on public.profissionais(user_id)
where user_id is not null;

alter table public.users
  drop constraint if exists users_apenas_administradores;

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

drop policy if exists "usuarios leem proprio perfil ou admin le todos" on public.users;
create policy "usuarios leem proprio perfil ou admin le todos"
on public.users for select
using (
  id = auth.uid()
  or (
    public.is_admin()
    and estabelecimento_id = public.current_user_establishment()
  )
);

drop policy if exists "admin gerencia profissionais" on public.profissionais;
create policy "admin gerencia profissionais"
on public.profissionais for all
using (public.is_admin() and estabelecimento_id = public.current_user_establishment())
with check (public.is_admin() and estabelecimento_id = public.current_user_establishment());

drop policy if exists "profissional le proprio cadastro" on public.profissionais;
create policy "profissional le proprio cadastro"
on public.profissionais for select
using (user_id = auth.uid());

drop policy if exists "admin le agendamentos" on public.agendamentos;
create policy "admin le agendamentos"
on public.agendamentos for select
using (
  public.is_admin()
  and estabelecimento_id = public.current_user_establishment()
);

drop policy if exists "profissional le seus agendamentos" on public.agendamentos;
create policy "profissional le seus agendamentos"
on public.agendamentos for select
using (
  profissional_id = public.current_professional_id()
  and estabelecimento_id = public.current_user_establishment()
);

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
  v_tipo public.tipo_usuario;
  v_profissional_id uuid;
begin
  v_slug := new.raw_user_meta_data->>'estabelecimento_slug';
  v_nome := coalesce(new.raw_user_meta_data->>'estabelecimento_nome', v_slug);
  v_tipo := (new.raw_user_meta_data->>'tipo_usuario')::public.tipo_usuario;
  v_profissional_id := nullif(new.raw_user_meta_data->>'profissional_id', '')::uuid;

  if v_tipo not in ('administrador', 'profissional') then
    return new;
  end if;

  if v_slug is not null then
    select id into v_estabelecimento_id from public.estabelecimentos where slug = v_slug;

    if v_estabelecimento_id is null then
      insert into public.estabelecimentos (nome, slug)
      values (v_nome, v_slug)
      returning id into v_estabelecimento_id;
    end if;
  else
    select id into v_estabelecimento_id from public.estabelecimentos where slug = 'padrao';

    if v_estabelecimento_id is null then
      insert into public.estabelecimentos (id, nome, slug)
      values ('11111111-1111-1111-1111-111111111111', 'Estabelecimento Padrão', 'padrao')
      returning id into v_estabelecimento_id;
    end if;
  end if;

  insert into public.users (id, nome, email, telefone, tipo_usuario, estabelecimento_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefone',
    v_tipo,
    v_estabelecimento_id
  )
  on conflict (id) do update set
    nome = excluded.nome,
    email = excluded.email,
    telefone = excluded.telefone,
    tipo_usuario = excluded.tipo_usuario,
    estabelecimento_id = excluded.estabelecimento_id;

  if v_tipo = 'profissional' and v_profissional_id is not null then
    update public.profissionais
    set user_id = new.id
    where id = v_profissional_id
      and estabelecimento_id = v_estabelecimento_id;
  end if;

  return new;
end;
$$;
