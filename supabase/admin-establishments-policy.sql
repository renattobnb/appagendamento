drop policy if exists "admin cadastra estabelecimentos" on public.estabelecimentos;
create policy "admin cadastra estabelecimentos"
on public.estabelecimentos for insert
with check (public.is_admin());

drop policy if exists "admin atualiza estabelecimentos" on public.estabelecimentos;
create policy "admin atualiza estabelecimentos"
on public.estabelecimentos for update
using (public.is_admin())
with check (public.is_admin());
