import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { dateBR, timeRange } from "@/lib/utils";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const professionalCancelSchema = z.object({
  appointment_id: z.string().uuid(),
  motivo: z.string().min(5, "Informe uma justificativa")
});

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para cancelar agendamentos reais." },
      { status: 503 }
    );
  }

  const parsed = professionalCancelSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe uma justificativa valida." }, { status: 422 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("cancel_professional_appointment", {
    appointment_id_param: parsed.data.appointment_id,
    motivo_param: parsed.data.motivo
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado, ja cancelado ou fora do prazo." },
      { status: 404 }
    );
  }

  const { data: appointment } = await supabase
    .from("agendamentos")
    .select(
      "cliente_nome,cliente_telefone,data,hora_inicio,hora_fim,motivo_cancelamento,profissionais(nome),servicos(nome)"
    )
    .eq("id", parsed.data.appointment_id)
    .maybeSingle();

  let whatsappResult: Awaited<ReturnType<typeof sendWhatsAppMessage>> | null = null;

  if (!appointment) {
    return NextResponse.json({
      ok: true,
      whatsapp: {
        sent: false,
        reason: "appointment_not_loaded"
      }
    });
  }

  if (appointment.cliente_telefone) {
    const professional = Array.isArray(appointment.profissionais)
      ? appointment.profissionais[0]
      : appointment.profissionais;
    const service = Array.isArray(appointment.servicos)
      ? appointment.servicos[0]
      : appointment.servicos;

    whatsappResult = await sendWhatsAppMessage({
      to: appointment.cliente_telefone,
      message: [
        "\u26A0\uFE0F Agendamento cancelado",
        "",
        `Ola, ${appointment.cliente_nome ?? "cliente"}.`,
        "Seu agendamento foi cancelado pelo profissional.",
        "",
        `Profissional: ${professional?.nome ?? "Profissional"}`,
        `Servico: ${service?.nome ?? "Servico"}`,
        `Data: ${dateBR(appointment.data)}`,
        `Horario: ${timeRange(appointment.hora_inicio, appointment.hora_fim)}`,
        "",
        `Motivo: ${appointment.motivo_cancelamento ?? parsed.data.motivo}`
      ].join("\n")
    }).catch((error) => ({
      sent: false,
      reason: error instanceof Error ? error.message : "unknown_error"
    }));

    if (!whatsappResult.sent) {
      console.warn("Falha ao enviar WhatsApp de cancelamento", whatsappResult.reason);
    }
  } else {
    whatsappResult = {
      sent: false,
      reason: "missing_client_phone"
    };
  }

  return NextResponse.json({ ok: true, whatsapp: whatsappResult });
}
