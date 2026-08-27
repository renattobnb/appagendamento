"use server";

import { revalidatePath } from "next/cache";
import { requireTenantAdministrator } from "@/lib/tenant-access";
import { createClient } from "@/lib/supabase/server";

type Intent = "createService" | "updateService" | "deleteService" | "createProfessional" | "updateProfessional" | "deleteProfessional" | "createAvailability" | "updateAvailability" | "deleteAvailability" | "createRelation" | "deleteRelation";
type Result = { ok: boolean; message?: string };
const fail = (message: string): Result => ({ ok: false, message });
const ok = (message: string): Result => ({ ok: true, message });

export async function executeTenantAdminAction(tenantSlug: string, intent: Intent, formData: FormData): Promise<Result> {
  const { supabase, establishment } = await requireTenantAdministrator(tenantSlug);
  const tenantId = establishment.id;
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("nome") ?? "").trim();
  const active = String(formData.get("ativo")) === "true";
  const service = { nome: name, descricao: String(formData.get("descricao") ?? "").trim() || null, valor: Number(formData.get("valor") ?? 0), duracao_minutos: Number(formData.get("duracao_minutos") ?? 30) };
  const professional = { nome: name, especialidade: String(formData.get("especialidade") ?? "").trim() || null, telefone: String(formData.get("telefone") ?? "").trim() || null };
  const availability = { profissional_id: String(formData.get("profissional_id") ?? ""), dia_semana: Number(formData.get("dia_semana")), hora_inicio: String(formData.get("hora_inicio") ?? ""), hora_fim: String(formData.get("hora_fim") ?? "") };
  const relation = { profissional_id: String(formData.get("profissional_id") ?? ""), servico_id: String(formData.get("servico_id") ?? "") };
  let error: { message: string } | null = null;
  if (intent === "createService") { if (!name) return fail("Informe o nome do serviço."); ({ error } = await supabase.from("servicos").insert({ ...service, ativo: true, estabelecimento_id: tenantId })); }
  if (intent === "updateService") { if (!id || !name) return fail("Serviço inválido."); ({ error } = await supabase.from("servicos").update({ ...service, ativo: active }).eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "deleteService") { ({ error } = await supabase.from("servicos").update({ ativo: false }).eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "createProfessional") {
    if (!name) return fail("Informe o nome do profissional.");
    const serviceIds = formData.getAll("servico_ids").map(String).filter(Boolean);
    if (!serviceIds.length) return fail("Selecione ao menos um serviço atendido.");
    const { data: validServices, error: servicesError } = await supabase.from("servicos").select("id").eq("estabelecimento_id", tenantId).eq("ativo", true).in("id", serviceIds);
    if (servicesError) return fail(servicesError.message);
    if ((validServices ?? []).length !== new Set(serviceIds).size) return fail("Serviço inválido para este estabelecimento.");
    const { data: createdProfessional, error: createError } = await supabase.from("profissionais").insert({ ...professional, ativo: true, estabelecimento_id: tenantId }).select("id").single();
    if (createError || !createdProfessional) return fail(createError?.message ?? "Não foi possível criar o profissional.");
    const { error: relationsError } = await supabase.from("profissional_servicos").insert(serviceIds.map((servico_id) => ({ profissional_id: createdProfessional.id, servico_id, estabelecimento_id: tenantId })));
    if (relationsError) {
      await supabase.from("profissionais").delete().eq("id", createdProfessional.id).eq("estabelecimento_id", tenantId);
      return fail(relationsError.message);
    }
  }
  if (intent === "updateProfessional") { if (!id || !name) return fail("Profissional inválido."); ({ error } = await supabase.from("profissionais").update({ ...professional, ativo: active }).eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "deleteProfessional") { ({ error } = await supabase.from("profissionais").update({ ativo: false }).eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "createAvailability") { ({ error } = await supabase.from("disponibilidade").insert({ ...availability, estabelecimento_id: tenantId })); }
  if (intent === "updateAvailability") { ({ error } = await supabase.from("disponibilidade").update(availability).eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "deleteAvailability") { ({ error } = await supabase.from("disponibilidade").delete().eq("id", id).eq("estabelecimento_id", tenantId)); }
  if (intent === "createRelation") { ({ error } = await supabase.from("profissional_servicos").upsert({ ...relation, estabelecimento_id: tenantId })); }
  if (intent === "deleteRelation") { ({ error } = await supabase.from("profissional_servicos").delete().eq("profissional_id", relation.profissional_id).eq("servico_id", relation.servico_id).eq("estabelecimento_id", tenantId)); }
  if (error) return fail(error.message);
  revalidatePath(`/${tenantSlug}/admin`);
  return ok("Alteração salva.");
}

async function executeForAuthenticatedTenant(intent: Intent, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Autenticação necessária.");
  const { data: profile } = await supabase.from("users").select("tipo_usuario, estabelecimento_id").eq("id", user.id).maybeSingle();
  if (profile?.tipo_usuario !== "administrador" || !profile.estabelecimento_id) return fail("Sem permissão administrativa.");
  const { data: establishment } = await supabase.from("estabelecimentos").select("slug").eq("id", profile.estabelecimento_id).maybeSingle();
  if (!establishment) return fail("Estabelecimento não encontrado.");
  return executeTenantAdminAction(establishment.slug, intent, formData);
}

export async function createServiceAction(data: FormData) { return executeForAuthenticatedTenant("createService", data); }
export async function updateServiceAction(data: FormData) { return executeForAuthenticatedTenant("updateService", data); }
export async function deleteServiceAction(data: FormData) { return executeForAuthenticatedTenant("deleteService", data); }
export async function createProfessionalAction(data: FormData) { return executeForAuthenticatedTenant("createProfessional", data); }
export async function updateProfessionalAction(data: FormData) { return executeForAuthenticatedTenant("updateProfessional", data); }
export async function deleteProfessionalAction(data: FormData) { return executeForAuthenticatedTenant("deleteProfessional", data); }
export async function createAvailabilityAction(data: FormData) { return executeForAuthenticatedTenant("createAvailability", data); }
export async function updateAvailabilityAction(data: FormData) { return executeForAuthenticatedTenant("updateAvailability", data); }
export async function deleteAvailabilityAction(data: FormData) { return executeForAuthenticatedTenant("deleteAvailability", data); }
export async function createRelationAction(data: FormData) { return executeForAuthenticatedTenant("createRelation", data); }
export async function deleteRelationAction(data: FormData) { return executeForAuthenticatedTenant("deleteRelation", data); }
