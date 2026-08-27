-- Run after 20260826235228, once the enum value is committed.
alter table public.users drop constraint if exists users_apenas_administradores;
alter table public.users drop constraint if exists users_apenas_admins_ou_profissionais;
alter table public.users add constraint users_tipos_permitidos check (tipo_usuario in ('administrador', 'profissional', 'admin_master'));

create or replace function public.is_admin_master() returns boolean language sql security definer set search_path = '' as $$ select exists (select 1 from public.users u where u.id = (select auth.uid()) and u.tipo_usuario = 'admin_master'); $$;
create or replace function public.is_tenant_admin(p_estabelecimento_id uuid) returns boolean language sql security definer set search_path = '' as $$ select exists (select 1 from public.users u where u.id = (select auth.uid()) and u.tipo_usuario = 'administrador' and u.estabelecimento_id = p_estabelecimento_id); $$;
revoke all on function public.is_admin_master() from public;
revoke all on function public.is_tenant_admin(uuid) from public;
grant execute on function public.is_admin_master() to authenticated;
grant execute on function public.is_tenant_admin(uuid) to authenticated;

create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin return new; end; $$;

do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename in ('users','estabelecimentos','servicos','profissionais','disponibilidade','agendamentos','profissional_servicos','notificacoes_profissionais','push_subscriptions','avaliacoes') loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.users enable row level security;
alter table public.estabelecimentos enable row level security;
alter table public.servicos enable row level security;
alter table public.profissionais enable row level security;
alter table public.disponibilidade enable row level security;
alter table public.agendamentos enable row level security;
alter table public.profissional_servicos enable row level security;
alter table public.notificacoes_profissionais enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.avaliacoes enable row level security;

create policy "catalogo publico por estabelecimento" on public.estabelecimentos for select to anon, authenticated using (true);
create policy "master gerencia estabelecimentos" on public.estabelecimentos for all to authenticated using ((select public.is_admin_master())) with check ((select public.is_admin_master()));
create policy "usuario le proprio perfil" on public.users for select to authenticated using (id = (select auth.uid()));
create policy "master le usuarios" on public.users for select to authenticated using ((select public.is_admin_master()));
create policy "master vincula administradores" on public.users for update to authenticated using ((select public.is_admin_master())) with check ((select public.is_admin_master()));
create policy "servicos ativos publicos" on public.servicos for select to anon, authenticated using (ativo);
create policy "admin tenant servicos" on public.servicos for all to authenticated using ((select public.is_tenant_admin(estabelecimento_id))) with check ((select public.is_tenant_admin(estabelecimento_id)));
create policy "profissionais ativos publicos" on public.profissionais for select to anon, authenticated using (ativo);
create policy "admin tenant profissionais" on public.profissionais for all to authenticated using ((select public.is_tenant_admin(estabelecimento_id))) with check ((select public.is_tenant_admin(estabelecimento_id)));
create policy "profissional le cadastro proprio" on public.profissionais for select to authenticated using (user_id = (select auth.uid()));
create policy "disponibilidade publica" on public.disponibilidade for select to anon, authenticated using (true);
create policy "admin tenant disponibilidade" on public.disponibilidade for all to authenticated using ((select public.is_tenant_admin(estabelecimento_id))) with check ((select public.is_tenant_admin(estabelecimento_id)));
create policy "admin tenant le agendamentos" on public.agendamentos for select to authenticated using ((select public.is_tenant_admin(estabelecimento_id)));
create policy "profissional le seus agendamentos" on public.agendamentos for select to authenticated using (profissional_id = (select public.current_professional_id()) and estabelecimento_id = (select public.current_user_establishment()));
create policy "cliente cria agendamento do tenant" on public.agendamentos for insert to anon, authenticated with check (cliente_id is null and cliente_nome is not null and cliente_telefone is not null and exists (select 1 from public.profissionais p join public.servicos s on s.id = agendamentos.servico_id join public.profissional_servicos ps on ps.profissional_id = p.id and ps.servico_id = s.id where p.id = agendamentos.profissional_id and p.estabelecimento_id = agendamentos.estabelecimento_id and s.estabelecimento_id = agendamentos.estabelecimento_id and ps.estabelecimento_id = agendamentos.estabelecimento_id and p.ativo and s.ativo));
create policy "admin tenant atualiza agendamentos" on public.agendamentos for update to authenticated using ((select public.is_tenant_admin(estabelecimento_id))) with check ((select public.is_tenant_admin(estabelecimento_id)));
create policy "vinculos catalogo publico" on public.profissional_servicos for select to anon, authenticated using (exists (select 1 from public.profissionais p join public.servicos s on s.id = profissional_servicos.servico_id where p.id = profissional_servicos.profissional_id and p.estabelecimento_id = profissional_servicos.estabelecimento_id and s.estabelecimento_id = profissional_servicos.estabelecimento_id and p.ativo and s.ativo));
create policy "admin tenant vinculos" on public.profissional_servicos for all to authenticated using ((select public.is_tenant_admin(estabelecimento_id))) with check ((select public.is_tenant_admin(estabelecimento_id)));
create policy "admin tenant notificacoes" on public.notificacoes_profissionais for select to authenticated using ((select public.is_tenant_admin(estabelecimento_id)));
create policy "admin tenant push" on public.push_subscriptions for select to authenticated using ((select public.is_tenant_admin(estabelecimento_id)));
create policy "admin tenant avaliacoes" on public.avaliacoes for select to authenticated using ((select public.is_tenant_admin(estabelecimento_id)));

create or replace function public.assert_estabelecimento_consistente() returns trigger language plpgsql security definer set search_path = '' as $$ begin
  if tg_table_name = 'disponibilidade' and not exists (select 1 from public.profissionais p where p.id = new.profissional_id and p.estabelecimento_id = new.estabelecimento_id) then raise exception 'Profissional nao pertence ao estabelecimento'; end if;
  if tg_table_name = 'profissional_servicos' and not exists (select 1 from public.profissionais p join public.servicos s on s.id = new.servico_id where p.id = new.profissional_id and p.estabelecimento_id = new.estabelecimento_id and s.estabelecimento_id = new.estabelecimento_id) then raise exception 'Vinculo entre estabelecimentos distintos'; end if;
  if tg_table_name = 'agendamentos' and not exists (select 1 from public.profissionais p join public.servicos s on s.id = new.servico_id join public.profissional_servicos ps on ps.profissional_id = p.id and ps.servico_id = s.id where p.id = new.profissional_id and p.estabelecimento_id = new.estabelecimento_id and s.estabelecimento_id = new.estabelecimento_id and ps.estabelecimento_id = new.estabelecimento_id) then raise exception 'Agendamento referencia dados de outro estabelecimento'; end if;
  return new;
end; $$;
revoke all on function public.assert_estabelecimento_consistente() from public;
drop trigger if exists disponibilidade_estabelecimento_consistente on public.disponibilidade;
create trigger disponibilidade_estabelecimento_consistente before insert or update on public.disponibilidade for each row execute function public.assert_estabelecimento_consistente();
drop trigger if exists profissional_servicos_estabelecimento_consistente on public.profissional_servicos;
create trigger profissional_servicos_estabelecimento_consistente before insert or update on public.profissional_servicos for each row execute function public.assert_estabelecimento_consistente();
drop trigger if exists agendamentos_estabelecimento_consistente on public.agendamentos;
create trigger agendamentos_estabelecimento_consistente before insert or update on public.agendamentos for each row execute function public.assert_estabelecimento_consistente();
create index if not exists users_tipo_estabelecimento_idx on public.users(tipo_usuario, estabelecimento_id);
create index if not exists profissional_servicos_tenant_idx on public.profissional_servicos(estabelecimento_id, profissional_id, servico_id);
