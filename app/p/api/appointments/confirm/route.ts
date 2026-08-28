import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({ appointment_id: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Atendimento inválido." }, { status: 422 });
  const token = (await cookies()).get(PROFESSIONAL_ACCESS_COOKIE)?.value;
  const access = token ? await resolveProfessionalAccess(token) : null;
  if (!access) return NextResponse.json({ error: "Acesso do profissional inválido ou revogado." }, { status: 401 });

  const { data, error } = await createServiceClient().from("agendamentos").update({ status: "confirmado" }).eq("id", parsed.data.appointment_id).eq("profissional_id", access.professional_id).eq("estabelecimento_id", access.establishment_id).eq("status", "pendente").select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível confirmar o atendimento." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Este atendimento foi atualizado. Recarregamos a agenda." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
