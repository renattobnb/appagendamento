import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseEnv } from "@/lib/config";
import { upsertPushSubscription } from "@/lib/push-subscriptions-store";

const pushSubscriptionSchema = z.object({
  estabelecimento_id: z.string().uuid(),
  tipo_destinatario: z.enum(["cliente", "profissional"]),
  profissional_id: z.string().uuid().optional().nullable(),
  cliente_telefone: z.string().min(10).optional().nullable(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(10),
      auth: z.string().min(5)
    })
  })
});

function normalizeBrazilianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return NextResponse.json({ error: "Supabase nao configurado." }, { status: 503 });
    }

    const parsed = pushSubscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Inscricao push invalida." }, { status: 422 });
    }

    const values = parsed.data;

    if (values.tipo_destinatario === "profissional" && !values.profissional_id) {
      return NextResponse.json({ error: "Profissional obrigatorio." }, { status: 422 });
    }

    if (values.tipo_destinatario === "cliente" && !values.cliente_telefone) {
      return NextResponse.json({ error: "Telefone do cliente obrigatorio." }, { status: 422 });
    }

    await upsertPushSubscription({
      estabelecimento_id: values.estabelecimento_id,
      tipo_destinatario: values.tipo_destinatario,
      profissional_id:
        values.tipo_destinatario === "profissional" ? values.profissional_id ?? null : null,
      cliente_telefone:
        values.tipo_destinatario === "cliente" && values.cliente_telefone
          ? normalizeBrazilianPhone(values.cliente_telefone)
          : null,
      endpoint: values.subscription.endpoint,
      p256dh: values.subscription.keys.p256dh,
      auth: values.subscription.keys.auth,
      user_agent: request.headers.get("user-agent")
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a inscricao push."
      },
      { status: 500 }
    );
  }
}
