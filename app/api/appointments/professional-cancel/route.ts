import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true });
}
