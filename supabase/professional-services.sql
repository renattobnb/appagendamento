create table if not exists public.profissional_servicos (
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profissional_id, servico_id)
);

alter table public.profissional_servicos enable row level security;

create index if not exists profissional_servicos_estabelecimento_idx
on public.profissional_servicos(estabelecimento_id);

insert into public.profissional_servicos (profissional_id, servico_id, estabelecimento_id)
select p.id, s.id, p.estabelecimento_id
from public.profissionais p
join public.servicos s on s.estabelecimento_id = p.estabelecimento_id
where p.ativo = true
  and s.ativo = true
on conflict (profissional_id, servico_id) do nothing;

drop policy if exists "vinculos profissional servico publicos" on public.profissional_servicos;
create policy "vinculos profissional servico publicos"
on public.profissional_servicos for select
using (
  exists (
    select 1
    from public.profissionais p
    join public.servicos s on s.id = profissional_servicos.servico_id
    where p.id = profissional_servicos.profissional_id
      and p.ativo = true
      and s.ativo = true
      and p.estabelecimento_id = profissional_servicos.estabelecimento_id
      and s.estabelecimento_id = profissional_servicos.estabelecimento_id
  )
);

drop policy if exists "admin gerencia vinculos profissional servico" on public.profissional_servicos;
create policy "admin gerencia vinculos profissional servico"
on public.profissional_servicos for all
using (
  public.is_admin()
  and estabelecimento_id = public.current_user_establishment()
)
with check (
  public.is_admin()
  and estabelecimento_id = public.current_user_establishment()
);
