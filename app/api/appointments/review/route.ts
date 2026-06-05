import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  appointment_id: z.string().uuid(),
  estabelecimento_id: z.string().uuid(),
  cliente_telefone: z.string().min(10),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional()
});

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: "Configure o Supabase em .env.local para avaliar agendamentos reais." },
      { status: 503 }
    );
  }

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos para avaliacao." }, { status: 422 });
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_guest_review", {
    appointment_id_param: values.appointment_id,
    telefone_param: values.cliente_telefone,
    estabelecimento_id_param: values.estabelecimento_id,
    nota_param: values.nota,
    comentario_param: values.comentario ?? ""
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Agendamento nao encontrado para este cliente." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
