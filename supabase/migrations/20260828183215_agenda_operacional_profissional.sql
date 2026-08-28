-- A agenda por link seguro usa estas colunas para preservar a auditoria das
-- transições operacionais e detectar atualizações sem expor agendamentos.
alter table public.agendamentos
  add column if not exists finalizado_em timestamptz,
  add column if not exists finalizado_por text,
  add column if not exists atualizado_em timestamptz not null default now();

create or replace function public.tocar_agendamento_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

revoke all on function public.tocar_agendamento_atualizado_em() from public;

drop trigger if exists agendamentos_atualizado_em on public.agendamentos;
create trigger agendamentos_atualizado_em
before update on public.agendamentos
for each row execute function public.tocar_agendamento_atualizado_em();

alter table public.push_subscriptions
  add column if not exists access_token_id uuid references public.professional_access_tokens(id) on delete cascade,
  add column if not exists last_used_at timestamptz,
  add column if not exists revoked_at timestamptz;

create index if not exists push_subscriptions_access_token_idx
  on public.push_subscriptions(access_token_id)
  where revoked_at is null;

-- A revogação do link também encerra as inscrições push originadas nele.
create or replace function public.revogar_push_do_acesso_profissional()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    update public.push_subscriptions
    set revoked_at = now()
    where access_token_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

revoke all on function public.revogar_push_do_acesso_profissional() from public;

drop trigger if exists professional_access_tokens_revogar_push on public.professional_access_tokens;
create trigger professional_access_tokens_revogar_push
after update of revoked_at on public.professional_access_tokens
for each row execute function public.revogar_push_do_acesso_profissional();
