create table if not exists public.professional_access_tokens (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profissionais(id) on delete cascade,
  establishment_id uuid not null references public.estabelecimentos(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.professional_access_tokens enable row level security;

alter table public.professional_access_tokens
  add column if not exists last_used_at timestamptz,
  add column if not exists revoked_at timestamptz;

create unique index if not exists professional_access_tokens_one_active_idx
  on public.professional_access_tokens(professional_id)
  where revoked_at is null;
create index if not exists professional_access_tokens_lookup_idx
  on public.professional_access_tokens(token_hash)
  where revoked_at is null;

create or replace function public.assert_professional_access_token_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profissionais p
    where p.id = new.professional_id
      and p.estabelecimento_id = new.establishment_id
  ) then
    raise exception 'Token de acesso com profissional ou estabelecimento inconsistente';
  end if;
  return new;
end;
$$;
revoke all on function public.assert_professional_access_token_tenant() from public;

drop trigger if exists professional_access_tokens_tenant_consistent on public.professional_access_tokens;
create trigger professional_access_tokens_tenant_consistent
before insert or update on public.professional_access_tokens
for each row execute function public.assert_professional_access_token_tenant();

create or replace function public.rotate_professional_access_token(
  p_professional_id uuid,
  p_token_hash text
)
returns table (created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_establishment_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Token de acesso invalido';
  end if;

  select p.estabelecimento_id into v_establishment_id
  from public.profissionais p
  where p.id = p_professional_id and p.ativo;

  if v_establishment_id is null or not public.is_tenant_admin(v_establishment_id) then
    raise exception 'Profissional nao encontrado ou sem permissao';
  end if;

  update public.professional_access_tokens
  set revoked_at = now()
  where professional_id = p_professional_id
    and establishment_id = v_establishment_id
    and revoked_at is null;

  insert into public.professional_access_tokens (professional_id, establishment_id, token_hash)
  values (p_professional_id, v_establishment_id, p_token_hash)
  returning professional_access_tokens.created_at into created_at;

  return next;
end;
$$;
revoke all on function public.rotate_professional_access_token(uuid, text) from public;
grant execute on function public.rotate_professional_access_token(uuid, text) to authenticated;

create or replace function public.revoke_professional_access_token(p_professional_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_establishment_id uuid;
begin
  select p.estabelecimento_id into v_establishment_id
  from public.profissionais p
  where p.id = p_professional_id;

  if v_establishment_id is null or not public.is_tenant_admin(v_establishment_id) then
    raise exception 'Profissional nao encontrado ou sem permissao';
  end if;

  update public.professional_access_tokens
  set revoked_at = now()
  where professional_id = p_professional_id
    and establishment_id = v_establishment_id
    and revoked_at is null;
end;
$$;
revoke all on function public.revoke_professional_access_token(uuid) from public;
grant execute on function public.revoke_professional_access_token(uuid) to authenticated;

create or replace function public.get_professional_access_status()
returns table (
  professional_id uuid,
  created_at timestamptz,
  last_used_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select t.professional_id, t.created_at, t.last_used_at
  from public.professional_access_tokens t
  where t.revoked_at is null
    and public.is_tenant_admin(t.establishment_id);
$$;
revoke all on function public.get_professional_access_status() from public;
grant execute on function public.get_professional_access_status() to authenticated;
