import { Client } from "pg";
import { createServiceClient } from "@/lib/supabase/server";

type PushSubscriptionInsert = {
  estabelecimento_id: string;
  tipo_destinatario: "cliente" | "profissional";
  profissional_id: string | null;
  access_token_id?: string | null;
  cliente_telefone: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type ProfessionalSubscriptionLookup = {
  estabelecimentoId: string;
  profissionalId: string;
  accessTokenId: string;
  endpoint: string;
};

function canUseServiceRole() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

async function withPgClient<T>(callback: (client: Client) => Promise<T>) {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_DB_URL para push notifications.");
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function upsertPushSubscription(values: PushSubscriptionInsert) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        ...values,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        revoked_at: null
      },
      { onConflict: "endpoint" }
    );

    if (error) throw new Error(error.message);
    return;
  }

  await withPgClient((client) =>
    client.query(
      `
        insert into public.push_subscriptions (
          estabelecimento_id,
          tipo_destinatario,
          profissional_id,
          cliente_telefone,
          access_token_id,
          endpoint,
          p256dh,
          auth,
          user_agent
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (endpoint) do update
        set
          estabelecimento_id = excluded.estabelecimento_id,
          tipo_destinatario = excluded.tipo_destinatario,
          profissional_id = excluded.profissional_id,
          cliente_telefone = excluded.cliente_telefone,
          access_token_id = excluded.access_token_id,
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          user_agent = excluded.user_agent,
          revoked_at = null,
          updated_at = now(),
          last_used_at = now()
      `,
      [
        values.estabelecimento_id,
        values.tipo_destinatario,
        values.profissional_id,
        values.cliente_telefone,
        values.access_token_id ?? null,
        values.endpoint,
        values.p256dh,
        values.auth,
        values.user_agent
      ]
    )
  );
}

export async function findCurrentProfessionalPushSubscription({
  estabelecimentoId,
  profissionalId,
  accessTokenId,
  endpoint
}: ProfessionalSubscriptionLookup) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_destinatario", "profissional")
      .eq("profissional_id", profissionalId)
      .eq("access_token_id", accessTokenId)
      .eq("endpoint", endpoint)
      .is("revoked_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as PushSubscriptionRecord | null) ?? null;
  }

  return withPgClient(async (client) => {
    const { rows } = await client.query<PushSubscriptionRecord>(
      `
        select id, endpoint, p256dh, auth
        from public.push_subscriptions
        where estabelecimento_id = $1
          and tipo_destinatario = 'profissional'
          and profissional_id = $2
          and access_token_id = $3
          and endpoint = $4
          and revoked_at is null
        limit 1
      `,
      [estabelecimentoId, profissionalId, accessTokenId, endpoint]
    );

    return rows[0] ?? null;
  });
}

export async function revokeCurrentProfessionalPushSubscription({
  estabelecimentoId,
  profissionalId,
  accessTokenId,
  endpoint
}: ProfessionalSubscriptionLookup) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_destinatario", "profissional")
      .eq("profissional_id", profissionalId)
      .eq("access_token_id", accessTokenId)
      .eq("endpoint", endpoint)
      .is("revoked_at", null);

    if (error) throw new Error(error.message);
    return;
  }

  await withPgClient((client) =>
    client.query(
      `
        update public.push_subscriptions
        set revoked_at = now(), updated_at = now()
        where estabelecimento_id = $1
          and tipo_destinatario = 'profissional'
          and profissional_id = $2
          and access_token_id = $3
          and endpoint = $4
          and revoked_at is null
      `,
      [estabelecimentoId, profissionalId, accessTokenId, endpoint]
    )
  );
}

export async function findProfessionalPushSubscriptions({
  estabelecimentoId,
  profissionalId
}: {
  estabelecimentoId: string;
  profissionalId: string;
}) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_destinatario", "profissional")
      .eq("profissional_id", profissionalId)
      .is("revoked_at", null);

    return (data ?? []) as PushSubscriptionRecord[];
  }

  return withPgClient(async (client) => {
    const { rows } = await client.query<PushSubscriptionRecord>(
      `
        select id, endpoint, p256dh, auth
        from public.push_subscriptions
        where estabelecimento_id = $1
          and tipo_destinatario = 'profissional'
          and profissional_id = $2
          and revoked_at is null
      `,
      [estabelecimentoId, profissionalId]
    );

    return rows;
  });
}

export async function findClientPushSubscriptions({
  estabelecimentoId,
  phoneVariants
}: {
  estabelecimentoId: string;
  phoneVariants: string[];
}) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_destinatario", "cliente")
      .in("cliente_telefone", phoneVariants);

    return (data ?? []) as PushSubscriptionRecord[];
  }

  return withPgClient(async (client) => {
    const { rows } = await client.query<PushSubscriptionRecord>(
      `
        select id, endpoint, p256dh, auth
        from public.push_subscriptions
        where estabelecimento_id = $1
          and tipo_destinatario = 'cliente'
          and cliente_telefone = any($2::text[])
      `,
      [estabelecimentoId, phoneVariants]
    );

    return rows;
  });
}

export async function deletePushSubscription(id: string) {
  if (canUseServiceRole()) {
    const supabase = createServiceClient();
    await supabase.from("push_subscriptions").delete().eq("id", id);
    return;
  }

  await withPgClient((client) =>
    client.query("delete from public.push_subscriptions where id = $1", [id])
  );
}
