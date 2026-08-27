import { createHash, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const PROFESSIONAL_ACCESS_COOKIE = "agenda_professional_access";
export const PROFESSIONAL_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;

type AccessToken = {
  id: string;
  professional_id: string;
  establishment_id: string;
};

export function hashProfessionalAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hasValidProfessionalAccessTokenShape(token: string) {
  return /^[A-Za-z0-9_-]{64}$/.test(token);
}

export async function resolveProfessionalAccess(token: string): Promise<AccessToken | null> {
  if (!hasValidProfessionalAccessTokenShape(token)) return null;

  const tokenHash = hashProfessionalAccessToken(token);
  const service = createServiceClient();
  const { data } = await service
    .from("professional_access_tokens")
    .select("id, professional_id, establishment_id, token_hash")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data || !timingSafeEqual(Buffer.from(data.token_hash), Buffer.from(tokenHash))) return null;

  const { data: professional } = await service
    .from("profissionais")
    .select("id")
    .eq("id", data.professional_id)
    .eq("estabelecimento_id", data.establishment_id)
    .eq("ativo", true)
    .maybeSingle();

  if (!professional) return null;
  return { id: data.id, professional_id: data.professional_id, establishment_id: data.establishment_id };
}

export async function touchProfessionalAccess(token: string, access: AccessToken) {
  const service = createServiceClient();
  await service
    .from("professional_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", access.id)
    .eq("professional_id", access.professional_id)
    .eq("establishment_id", access.establishment_id)
    .eq("token_hash", hashProfessionalAccessToken(token))
    .is("revoked_at", null);
}
