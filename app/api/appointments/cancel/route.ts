import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { sendPushToProfessional } from "@/lib/push-notifications";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { dateBR, timeRange } from "@/lib/utils";

const cancelAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  cliente_telefone: z.string().min(10),
  estabelecimento_id: z.string().uuid()
});

type CanceledAppointment = {
  cliente_nome: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  estabelecimento_id: string;
  profissional_id: string;
  estabelecimento_slug: string | null;
  servico_nome: string | null;
};

async function loadCanceledAppointment(appointmentId: string) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("agendamentos")
      .select(
        "cliente_nome,data,hora_inicio,hora_fim,estabelecimento_id,profissional_id,estabelecimentos(slug),servicos(nome)"
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (!data) return null;

    const establishment = Array.isArray(data.estabelecimentos)
      ? data.estabelecimentos[0]
      : data.estabelecimentos;
    const service = Array.isArray(data.servicos) ? data.servicos[0] : data.servicos;

    return {
      cliente_nome: data.cliente_nome,
      data: data.data,
      hora_inicio: data.hora_inicio,
      hora_fim: data.hora_fim,
      estabelecimento_id: data.estabelecimento_id,
      profissional_id: data.profissional_id,
      estabelecimento_slug: establishment?.slug ?? null,
      servico_nome: service?.nome ?? null
    } satisfies CanceledAppointment;
  }

  if (!process.env.SUPABASE_DB_URL) return null;

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const { rows } = await client.query<CanceledAppointment>(
      `
        select
          a.cliente_nome,
          a.data::text,
          left(a.hora_inicio::text, 5) as hora_inicio,
          left(a.hora_fim::text, 5) as hora_fim,
          a.estabelecimento_id::text,
          a.profissional_id::text,
          e.slug as estabelecimento_slug,
          s.nome as servico_nome
        from public.agendamentos a
        left join public.estabelecimentos e on e.id = a.estabelecimento_id
        left join public.servicos s on s.id = a.servico_id
        where a.id = $1
        limit 1
      `,
      [appointmentId]
    );

    return rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para cancelar agendamentos reais." },
      { status: 503 }
    );
  }

  const parsed = cancelAppointmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para cancelamento" }, { status: 422 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_guest_appointment", {
    appointment_id_param: parsed.data.appointment_id,
    telefone_param: parsed.data.cliente_telefone,
    estabelecimento_id_param: parsed.data.estabelecimento_id
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado ou ja cancelado." },
      { status: 404 }
    );
  }

  const appointment = await loadCanceledAppointment(parsed.data.appointment_id).catch((error) => {
    console.warn("Falha ao carregar agendamento cancelado para push", error);
    return null;
  });

  const pushResult = appointment
    ? await sendPushToProfessional({
        estabelecimentoId: appointment.estabelecimento_id,
        profissionalId: appointment.profissional_id,
        payload: {
          title: "Agendamento cancelado pelo cliente",
          body: `${appointment.cliente_nome ?? "Cliente"} cancelou ${
            appointment.servico_nome ?? "um atendimento"
          } de ${dateBR(appointment.data)} (${timeRange(appointment.hora_inicio, appointment.hora_fim)}).`,
          url: `/${appointment.estabelecimento_slug ?? "padrao"}/profissional`
        }
      }).catch((error) => ({
        sent: 0,
        failed: 1,
        reason: error instanceof Error ? error.message : "unknown_error"
      }))
    : {
        sent: 0,
        failed: 0,
        reason: "appointment_not_loaded"
      };

  if (!pushResult.sent) {
    console.warn("Falha ao enviar push de cancelamento para profissional", pushResult);
  }

  return NextResponse.json({ ok: true, push: pushResult });
}
