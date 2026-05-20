import { NextRequest, NextResponse } from "next/server";
import { getDay, isBefore, parseISO } from "date-fns";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { appointmentSchema } from "@/lib/validations/appointment";
import { calculateEndTime, toMinutes } from "@/lib/appointments";

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para criar agendamentos reais." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const parsed = appointmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 422 });
  }

  const values = parsed.data;
  const clienteNome =
    values.cliente_nome?.trim() ||
    user?.user_metadata?.nome ||
    user?.email?.split("@")[0] ||
    null;
  const clienteTelefone =
    values.cliente_telefone?.trim() || user?.user_metadata?.telefone || null;

  if (!clienteNome || !clienteTelefone) {
    return NextResponse.json(
      { error: "Informe nome e WhatsApp para concluir o agendamento" },
      { status: 422 }
    );
  }

  if (user) {
    await supabase.from("users").upsert({
      id: user.id,
      nome: user.user_metadata?.nome ?? user.email?.split("@")[0] ?? "Cliente",
      email: user.email ?? `${user.id}@cliente.local`,
      telefone: user.user_metadata?.telefone ?? null,
      tipo_usuario: "cliente"
    });
  }

  const startDate = parseISO(`${values.data}T${values.hora_inicio}:00`);
  if (isBefore(startDate, new Date())) {
    return NextResponse.json({ error: "Nao e permitido agendar no passado" }, { status: 422 });
  }

  const { data: service } = await supabase
    .from("servicos")
    .select("duracao_minutos")
    .eq("id", values.servico_id)
    .eq("ativo", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Servico indisponivel" }, { status: 404 });
  }

  const horaFim = calculateEndTime(values.data, values.hora_inicio, service.duracao_minutos);

  const { data: availability } = await supabase
    .from("disponibilidade")
    .select("hora_inicio,hora_fim")
    .eq("profissional_id", values.profissional_id)
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
    .eq("data", values.data)
    .in("status", ["confirmado", "pendente"])
    .lt("hora_inicio", horaFim)
    .gt("hora_fim", values.hora_inicio);

  if (conflicts?.length) {
    return NextResponse.json({ error: "Horario ja ocupado" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("agendamentos")
    .insert({
      cliente_id: user?.id ?? null,
      cliente_nome: clienteNome,
      cliente_telefone: clienteTelefone,
      profissional_id: values.profissional_id,
      servico_id: values.servico_id,
      data: values.data,
      hora_inicio: values.hora_inicio,
      hora_fim: horaFim,
      status: "pendente",
      observacoes: values.observacoes
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/appointment-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointment_id: data.id })
  }).catch(() => undefined);

  return NextResponse.json({ appointment: data }, { status: 201 });
}
