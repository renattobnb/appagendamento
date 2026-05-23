alter table public.estabelecimentos enable row level security;

drop policy if exists "estabelecimentos publicos para leitura" on public.estabelecimentos;
create policy "estabelecimentos publicos para leitura"
on public.estabelecimentos for select
using (true);
