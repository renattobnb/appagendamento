import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

const cancelAppointmentSchema = z.object({
  appointment_id: z.string().uuid(),
  cliente_telefone: z.string().min(10),
  estabelecimento_id: z.string().uuid()
});

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

  return NextResponse.json({ ok: true });
}
