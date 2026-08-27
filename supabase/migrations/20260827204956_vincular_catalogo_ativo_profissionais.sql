-- O fluxo público filtra profissionais pelos serviços que eles atendem.
-- Preenche os vínculos ausentes apenas dentro do mesmo estabelecimento e
-- preserva qualquer vínculo existente.
insert into public.profissional_servicos (
  profissional_id,
  servico_id,
  estabelecimento_id
)
select
  profissional.id,
  servico.id,
  profissional.estabelecimento_id
from public.profissionais profissional
join public.servicos servico
  on servico.estabelecimento_id = profissional.estabelecimento_id
where profissional.ativo
  and servico.ativo
on conflict (profissional_id, servico_id) do nothing;
