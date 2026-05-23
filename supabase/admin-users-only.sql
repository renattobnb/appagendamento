update public.agendamentos
set cliente_id = null
where cliente_id is not null;

delete from public.users
where tipo_usuario <> 'administrador';

alter table public.users
  alter column tipo_usuario set default 'administrador';

alter table public.users
  drop constraint if exists users_apenas_administradores;

alter table public.users
  add constraint users_apenas_administradores
  check (tipo_usuario = 'administrador');

drop policy if exists "usuarios criam proprio perfil" on public.users;
drop policy if exists "usuarios atualizam proprio perfil" on public.users;

create policy "admin atualiza proprio perfil"
on public.users for update
using (id = auth.uid() and tipo_usuario = 'administrador')
with check (id = auth.uid() and tipo_usuario = 'administrador');

drop policy if exists "cliente le seus agendamentos" on public.agendamentos;
drop policy if exists "cliente ou visitante cria agendamento" on public.agendamentos;
drop policy if exists "cliente cancela ou reagenda agendamento proprio" on public.agendamentos;

create policy "visitante cria agendamento com identificacao"
on public.agendamentos for insert
with check (
  cliente_id is null
  and cliente_nome is not null
  and cliente_telefone is not null
);

create policy "admin le agendamentos"
on public.agendamentos for select
using (public.is_admin());

create policy "admin atualiza agendamentos"
on public.agendamentos for update
using (public.is_admin())
with check (public.is_admin());

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'tipo_usuario' = 'administrador' then
    insert into public.users (id, nome, email, telefone, tipo_usuario)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data->>'telefone',
      'administrador'
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
