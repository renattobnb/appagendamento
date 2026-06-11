create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  tipo_destinatario text not null check (tipo_destinatario in ('cliente', 'profissional')),
  profissional_id uuid references public.profissionais(id) on delete cascade,
  cliente_telefone text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscription_target_check check (
    (tipo_destinatario = 'profissional' and profissional_id is not null)
    or
    (tipo_destinatario = 'cliente' and cliente_telefone is not null)
  )
);

create index if not exists push_subscriptions_profissional_idx
  on public.push_subscriptions (estabelecimento_id, profissional_id)
  where tipo_destinatario = 'profissional';

create index if not exists push_subscriptions_cliente_idx
  on public.push_subscriptions (estabelecimento_id, cliente_telefone)
  where tipo_destinatario = 'cliente';

alter table public.push_subscriptions enable row level security;

drop policy if exists "Service role can manage push subscriptions" on public.push_subscriptions;
create policy "Service role can manage push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
