import { NextRequest, NextResponse } from "next/server";
import { getDay, isBefore, parseISO } from "date-fns";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { appointmentSchema } from "@/lib/validations/appointment";
import { calculateEndTime, toMinutes } from "@/lib/appointments";
import { dateBR } from "@/lib/utils";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para criar agendamentos reais." },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  const parsed = appointmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const values = parsed.data;
  const clienteNome =
    values.cliente_nome?.trim() || null;
  const clienteTelefone = values.cliente_telefone?.trim() || null;

  if (!clienteNome || !clienteTelefone) {
    return NextResponse.json(
      { error: "Informe nome e WhatsApp para concluir o agendamento" },
      { status: 422 }
    );
  }

  const startDate = parseISO(`${values.data}T${values.hora_inicio}:00`);
  if (isBefore(startDate, new Date())) {
    return NextResponse.json({ error: "Nao e permitido agendar no passado" }, { status: 422 });
  }

  const { data: service } = await supabase
    .from("servicos")
    .select("duracao_minutos,nome")
    .eq("id", values.servico_id)
    .eq("estabelecimento_id", values.estabelecimento_id)
    .eq("ativo", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Servico indisponivel" }, { status: 404 });
  }

  const { data: professionalService } = await supabase
    .from("profissional_servicos")
    .select("profissional_id")
    .eq("profissional_id", values.profissional_id)
    .eq("servico_id", values.servico_id)
    .eq("estabelecimento_id", values.estabelecimento_id)
    .maybeSingle();

  if (!professionalService) {
    return NextResponse.json(
      { error: "Este profissional nao atende o servico selecionado" },
      { status: 422 }
    );
  }

  const { data: professional } = await supabase
    .from("profissionais")
    .select("nome,telefone")
    .eq("id", values.profissional_id)
    .eq("estabelecimento_id", values.estabelecimento_id)
    .eq("ativo", true)
    .maybeSingle();

  if (!professional) {
    return NextResponse.json({ error: "Profissional indisponivel" }, { status: 404 });
  }

  const horaFim = calculateEndTime(values.data, values.hora_inicio, service.duracao_minutos);

  const { data: availability } = await supabase
    .from("disponibilidade")
    .select("hora_inicio,hora_fim")
    .eq("profissional_id", values.profissional_id)
    .eq("estabelecimento_id", values.estabelecimento_id)
    .eq("dia_semana", getDay(new Date(`${values.data}T00:00:00`)))
    .single();

  const isInsideAvailability =
    availability &&
    toMinutes(values.hora_inicio) >= toMinutes(availability.hora_inicio) &&
    toMinutes(horaFim) <= toMinutes(availability.hora_fim);

  if (!isInsideAvailability) {
    return NextResponse.json({ error: "Horario fora da disponibilidade" }, { status: 422 });
  }

  const { data: conflicts } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("profissional_id", values.profissional_id)
    .eq("estabelecimento_id", values.estabelecimento_id)
    .eq("data", values.data)
    .in("status", ["confirmado", "pendente"])
    .lt("hora_inicio", horaFim)
    .gt("hora_fim", values.hora_inicio);

  if (conflicts?.length) {
    return NextResponse.json({ error: "Horario ja ocupado" }, { status: 409 });
  }

  const appointmentId = crypto.randomUUID();

  const { error } = await supabase
    .from("agendamentos")
    .insert({
      id: appointmentId,
      cliente_id: null,
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone,
      profissional_id: values.profissional_id,
      servico_id: values.servico_id,
      data: values.data,
      hora_inicio: values.hora_inicio,
      hora_fim: horaFim,
      status: "pendente",
      observacoes: values.observacoes,
      estabelecimento_id: values.estabelecimento_id
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.rpc("notificar_profissional_agendamento", {
    p_agendamento_id: appointmentId
  });

  const whatsappMessage = [
    "📅 Novo Agendamento",
    "",
    `Cliente: ${clienteNome}`,
    `📞 Telefone: ${clienteTelefone}`,
    "",
    `Serviço: ${service.nome}`,
    `Data: ${dateBR(values.data)}`,
    `Horário: ${values.hora_inicio}`,
    "",
    `Observação: ${values.observacoes?.trim() || ""}`
  ].join("\n");

  await sendWhatsAppMessage({
    to: professional.telefone,
    message: whatsappMessage
  }).catch(() => undefined);

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/appointment-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone,
      data: values.data,
      hora_inicio: values.hora_inicio
    })
  }).catch(() => undefined);

  return NextResponse.json({ ok: true }, { status: 201 });
}
