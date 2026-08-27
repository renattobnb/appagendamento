import { createClient } from "@/lib/supabase/server";
import { isTenantAdministrator } from "@/lib/tenant-authorization";

export type TenantAccess = {
  id: string;
  nome: string;
  slug: string;
};

export async function requireTenantAdministrator(tenantSlug: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTHENTICATION_REQUIRED");

  const [{ data: establishment }, { data: profile }] = await Promise.all([
    supabase.from("estabelecimentos").select("id, nome, slug").eq("slug", tenantSlug).maybeSingle(),
    supabase.from("users").select("tipo_usuario, estabelecimento_id").eq("id", user.id).maybeSingle()
  ]);

  if (!establishment) throw new Error("TENANT_NOT_FOUND");
  if (!isTenantAdministrator(profile, establishment.id)) throw new Error("TENANT_ACCESS_DENIED");
  return { supabase, user, establishment: establishment as TenantAccess };
}

export async function requireAdminMaster() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTHENTICATION_REQUIRED");
  const { data: profile } = await supabase
    .from("users")
    .select("tipo_usuario")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.tipo_usuario !== "admin_master") throw new Error("MASTER_ACCESS_DENIED");
  return { supabase, user };
}
