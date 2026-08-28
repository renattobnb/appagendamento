import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({ appointment_id: z.string().uuid(), motivo: z.string().trim().min(5) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Informe um motivo de ao menos 5 caracteres." }, { status: 422 });

  const token = (await cookies()).get(PROFESSIONAL_ACCESS_COOKIE)?.value;
  const access = token ? await resolveProfessionalAccess(token) : null;
  if (!access) return NextResponse.json({ error: "Acesso do profissional inválido ou revogado." }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("agendamentos")
    .update({ status: "cancelado", cancelado_por: "profissional", motivo_cancelamento: parsed.data.motivo, cancelado_em: new Date().toISOString() })
    .eq("id", parsed.data.appointment_id)
    .eq("profissional_id", access.professional_id)
    .eq("estabelecimento_id", access.establishment_id)
    .in("status", ["pendente", "confirmado"])
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Não foi possível cancelar o atendimento." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Este atendimento foi atualizado. Recarregamos a agenda." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
