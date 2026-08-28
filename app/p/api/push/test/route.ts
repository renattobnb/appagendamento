import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess } from "@/lib/professional-access";
import { sendPushToCurrentProfessionalSubscription } from "@/lib/push-notifications";

const endpointSchema = z.object({ endpoint: z.string().url() });

export async function POST(request: NextRequest) {
  try {
    const parsed = endpointSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Inscrição push inválida." }, { status: 422 });

    const token = request.cookies.get(PROFESSIONAL_ACCESS_COOKIE)?.value;
    const access = token ? await resolveProfessionalAccess(token) : null;
    if (!access) return NextResponse.json({ error: "Acesso do profissional inválido ou revogado." }, { status: 401 });

    const result = await sendPushToCurrentProfessionalSubscription({
      estabelecimentoId: access.establishment_id,
      profissionalId: access.professional_id,
      accessTokenId: access.id,
      endpoint: parsed.data.endpoint,
      payload: {
        title: "Agenda Online",
        body: "Notificações funcionando corretamente.",
        url: "/p"
      }
    });

    if (result.invalid) return NextResponse.json({ invalid: true }, { status: 409 });
    if (!result.sent) return NextResponse.json({ error: "Não foi possível enviar a notificação de teste." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar a notificação de teste." }, { status: 500 });
  }
}
