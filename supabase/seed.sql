insert into public.servicos (id, nome, descricao, valor, duracao_minutos, ativo) values
  ('11111111-1111-1111-1111-111111111111', 'Consulta inicial', 'Avaliacao completa para entender necessidade, prioridade e melhor plano de atendimento.', 120.00, 60, true),
  ('22222222-2222-2222-2222-222222222222', 'Atendimento especializado', 'Sessao individual com profissional especialista e acompanhamento detalhado.', 180.00, 75, true),
  ('33333333-3333-3333-3333-333333333333', 'Retorno', 'Revisao de progresso, ajustes e proximos passos.', 90.00, 45, true)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  valor = excluded.valor,
  duracao_minutos = excluded.duracao_minutos,
  ativo = excluded.ativo;

insert into public.profissionais (id, nome, especialidade, foto_url, ativo) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ana Martins', 'Consultora senior', null, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bruno Rocha', 'Especialista operacional', null, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Camila Torres', 'Atendimento premium', null, true)
on conflict (id) do update set
  nome = excluded.nome,
  especialidade = excluded.especialidade,
  foto_url = excluded.foto_url,
  ativo = excluded.ativo;

insert into public.disponibilidade (profissional_id, dia_semana, hora_inicio, hora_fim)
select profissional_id, dia_semana, hora_inicio::time, hora_fim::time
from (
  values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 1, '08:00', '18:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 2, '08:00', '18:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 3, '08:00', '18:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 4, '08:00', '18:00'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 5, '08:00', '16:00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 1, '09:00', '17:00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 3, '09:00', '17:00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 5, '09:00', '17:00'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 2, '10:00', '19:00'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 4, '10:00', '19:00')
) as seed(profissional_id, dia_semana, hora_inicio, hora_fim)
where not exists (
  select 1 from public.disponibilidade d
  where d.profissional_id = seed.profissional_id
    and d.dia_semana = seed.dia_semana
    and d.hora_inicio = seed.hora_inicio::time
    and d.hora_fim = seed.hora_fim::time
);
