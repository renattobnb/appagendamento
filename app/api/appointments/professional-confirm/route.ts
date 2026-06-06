import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { dateBR, timeRange } from "@/lib/utils";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const professionalConfirmSchema = z.object({
  appointment_id: z.string().uuid()
});

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para confirmar agendamentos reais." },
      { status: 503 }
    );
  }

  const parsed = professionalConfirmSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Agendamento invalido." }, { status: 422 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("confirm_professional_appointment", {
    appointment_id_param: parsed.data.appointment_id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado, ja confirmado ou fora do prazo." },
      { status: 404 }
    );
  }

  const { data: appointment } = await supabase
    .from("agendamentos")
    .select("cliente_nome,cliente_telefone,data,hora_inicio,hora_fim,profissionais(nome),servicos(nome)")
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
        "\u2705 Agendamento confirmado",
        "",
        `Ola, ${appointment.cliente_nome ?? "cliente"}.`,
        "Seu agendamento foi confirmado pelo profissional.",
        "",
        `Profissional: ${professional?.nome ?? "Profissional"}`,
        `Servico: ${service?.nome ?? "Servico"}`,
        `Data: ${dateBR(appointment.data)}`,
        `Horario: ${timeRange(appointment.hora_inicio, appointment.hora_fim)}`
      ].join("\n")
    }).catch((error) => ({
      sent: false,
      reason: error instanceof Error ? error.message : "unknown_error"
    }));

    if (!whatsappResult.sent) {
      console.warn("Falha ao enviar WhatsApp de confirmacao", whatsappResult.reason);
    }
  } else {
    whatsappResult = {
      sent: false,
      reason: "missing_client_phone"
    };
  }

  return NextResponse.json({ ok: true, whatsapp: whatsappResult });
}
