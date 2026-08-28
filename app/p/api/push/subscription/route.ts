import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess } from "@/lib/professional-access";
import {
  findCurrentProfessionalPushSubscription,
  revokeCurrentProfessionalPushSubscription
} from "@/lib/push-subscriptions-store";

const endpointSchema = z.object({ endpoint: z.string().url() });

async function resolveAccess(request: NextRequest) {
  const token = request.cookies.get(PROFESSIONAL_ACCESS_COOKIE)?.value;
  return token ? resolveProfessionalAccess(decodeURIComponent(token)) : null;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = endpointSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Inscrição push inválida." }, { status: 422 });

    const access = await resolveAccess(request);
    if (!access) return NextResponse.json({ error: "Acesso do profissional inválido ou revogado." }, { status: 401 });

    const subscription = await findCurrentProfessionalPushSubscription({
      estabelecimentoId: access.establishment_id,
      profissionalId: access.professional_id,
      accessTokenId: access.id,
      endpoint: parsed.data.endpoint
    });

    return NextResponse.json({ active: Boolean(subscription) });
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar as notificações." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const parsed = endpointSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Inscrição push inválida." }, { status: 422 });

    const access = await resolveAccess(request);
    if (!access) return NextResponse.json({ error: "Acesso do profissional inválido ou revogado." }, { status: 401 });

    await revokeCurrentProfessionalPushSubscription({
      estabelecimentoId: access.establishment_id,
      profissionalId: access.professional_id,
      accessTokenId: access.id,
      endpoint: parsed.data.endpoint
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível desativar as notificações." }, { status: 500 });
  }
}
