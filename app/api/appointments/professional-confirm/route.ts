import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true });
}
