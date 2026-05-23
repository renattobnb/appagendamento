import type { Database } from "@/types/database";

const DEMO_ESTABLISHMENT_ID = "11111111-1111-1111-1111-111111111111";

export const demoServices: Database["public"]["Tables"]["servicos"]["Row"][] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    nome: "Consulta inicial",
    descricao: "Avaliacao completa para entender necessidade, prioridade e melhor plano.",
    valor: 120,
    duracao_minutos: 60,
    ativo: true,
    estabelecimento_id: DEMO_ESTABLISHMENT_ID
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    nome: "Atendimento especializado",
    descricao: "Sessao individual com profissional especialista e acompanhamento detalhado.",
    valor: 180,
    duracao_minutos: 75,
    ativo: true,
    estabelecimento_id: DEMO_ESTABLISHMENT_ID
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    nome: "Retorno",
    descricao: "Revisao de progresso, ajustes e proximos passos.",
    valor: 90,
    duracao_minutos: 45,
    ativo: true,
    estabelecimento_id: DEMO_ESTABLISHMENT_ID
  }
];

export const demoProfessionals: Database["public"]["Tables"]["profissionais"]["Row"][] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    nome: "Ana Martins",
    especialidade: "Consultora senior",
    foto_url: null,
    ativo: true,
    estabelecimento_id: DEMO_ESTABLISHMENT_ID,
    user_id: null
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    nome: "Bruno Rocha",
    especialidade: "Especialista operacional",
    foto_url: null,
    ativo: true,
    estabelecimento_id: DEMO_ESTABLISHMENT_ID,
    user_id: null
  }
];

export const demoAppointments = [
  {
    id: "apt-1",
    servico_id: demoServices[0].id,
    cliente_id: null,
    profissional_id: demoProfessionals[0].id,
    data: new Date().toISOString().slice(0, 10),
    hora_inicio: "09:00",
    hora_fim: "10:00",
    status: "confirmado" as const,
    observacoes: null,
    created_at: new Date().toISOString(),
    estabelecimento_id: DEMO_ESTABLISHMENT_ID,
    servicos: { nome: demoServices[0].nome, valor: demoServices[0].valor },
    profissionais: { nome: demoProfessionals[0].nome },
    users: { nome: "Cliente Demo" }
  }
];
