import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Navbar } from "@/components/navbar";
import { AdminWorkspace } from "@/components/dashboard/admin-workspace";
import { hasSupabaseEnv } from "@/lib/config";
import { getEstablishmentBySlug } from "@/lib/establishments";
import { requireTenantAdministrator } from "@/lib/tenant-access";
import { createAvailabilityAction, createProfessionalAction, createRelationAction, createServiceAction, deleteAvailabilityAction, deleteProfessionalAction, deleteRelationAction, deleteServiceAction, updateAvailabilityAction, updateProfessionalAction, updateServiceAction } from "@/lib/actions/tenant-admin";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";
type Result = { ok: boolean; message?: string };
const fail = (message: string): Result => ({ ok: false, message });
const ok = (message: string): Result => ({ ok: true, message });
const relatedName = (value: any) => (Array.isArray(value) ? value[0] : value)?.nome ?? null;

export default async function AdminDashboardPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);
  if (!establishment) notFound();
  if (!hasSupabaseEnv()) redirect(`/${tenantSlug}/admin/login`);
  let supabase: any;
  try { ({ supabase } = await requireTenantAdministrator(tenantSlug)); } catch { redirect(`/${tenantSlug}/admin/login`); }
  const establishmentId = establishment.id;
  const [appointmentResult, serviceResult, professionalResult, userResult, availabilityResult, relationResult] = await Promise.all([
    supabase.from("agendamentos").select("*, servicos(nome, valor), profissionais(nome)").eq("estabelecimento_id", establishmentId).order("data", { ascending: true }).order("hora_inicio", { ascending: true }),
    supabase.from("servicos").select("*").eq("estabelecimento_id", establishmentId).order("nome"),
    supabase.from("profissionais").select("*").eq("estabelecimento_id", establishmentId).order("nome"),
    supabase.from("users").select("id").eq("estabelecimento_id", establishmentId),
    supabase.from("disponibilidade").select("*, profissionais(nome)").eq("estabelecimento_id", establishmentId).order("dia_semana").order("hora_inicio"),
    supabase.from("profissional_servicos").select("*, profissionais(nome), servicos(nome)").eq("estabelecimento_id", establishmentId)
  ]);
  const appointments = appointmentResult.data ?? [], services = serviceResult.data ?? [], professionals = professionalResult.data ?? [], availability = availabilityResult.data ?? [], relations = relationResult.data ?? [];
  async function createService(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const nome = String(data.get("nome") ?? "").trim(); if (!nome) return fail("Informe o nome do serviço."); const { error } = await db.from("servicos").insert({ nome, descricao: String(data.get("descricao") ?? "").trim() || null, valor: Number(data.get("valor") ?? 0), duracao_minutos: Number(data.get("duracao_minutos") ?? 30), ativo: true, estabelecimento_id: establishmentId }); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Serviço criado."); }
  async function updateService(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const id = String(data.get("id") ?? ""); if (!id) return fail("Serviço inválido."); const { error } = await db.from("servicos").update({ nome: String(data.get("nome") ?? "").trim(), descricao: String(data.get("descricao") ?? "").trim() || null, valor: Number(data.get("valor") ?? 0), duracao_minutos: Number(data.get("duracao_minutos") ?? 30), ativo: String(data.get("ativo")) === "true" }).eq("id", id).eq("estabelecimento_id", establishmentId); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Serviço atualizado."); }
  async function deleteService(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const id = String(data.get("id") ?? ""); const { error, data: changed } = await db.from("servicos").update({ ativo: false }).eq("id", id).eq("estabelecimento_id", establishmentId).select("id").maybeSingle(); if (error) return fail(error.message); if (!changed) return fail("Serviço não encontrado ou sem permissão."); revalidatePath(`/${tenantSlug}/admin`); return ok("Serviço desativado; o histórico foi preservado."); }
  async function createProfessional(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const nome = String(data.get("nome") ?? "").trim(); if (!nome) return fail("Informe o nome do profissional."); const { error } = await db.from("profissionais").insert({ nome, especialidade: String(data.get("especialidade") ?? "").trim() || null, telefone: String(data.get("telefone") ?? "").trim() || null, foto_url: String(data.get("foto_url") ?? "").trim() || null, ativo: true, estabelecimento_id: establishmentId }); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Profissional criado."); }
  async function updateProfessional(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const id = String(data.get("id") ?? ""); if (!id) return fail("Profissional inválido."); const { error } = await db.from("profissionais").update({ nome: String(data.get("nome") ?? "").trim(), especialidade: String(data.get("especialidade") ?? "").trim() || null, telefone: String(data.get("telefone") ?? "").trim() || null, foto_url: String(data.get("foto_url") ?? "").trim() || null, ativo: String(data.get("ativo")) === "true" }).eq("id", id).eq("estabelecimento_id", establishmentId); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Profissional atualizado."); }
  async function deleteProfessional(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const id = String(data.get("id") ?? ""); const { error, data: changed } = await db.from("profissionais").update({ ativo: false }).eq("id", id).eq("estabelecimento_id", establishmentId).select("id").maybeSingle(); if (error) return fail(error.message); if (!changed) return fail("Profissional não encontrado ou sem permissão."); revalidatePath(`/${tenantSlug}/admin`); return ok("Profissional desativado; o histórico foi preservado."); }
  async function saveAvailability(data: FormData, id?: string) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const values = { profissional_id: String(data.get("profissional_id") ?? ""), dia_semana: Number(data.get("dia_semana")), hora_inicio: String(data.get("hora_inicio") ?? ""), hora_fim: String(data.get("hora_fim") ?? "") }; const query = id ? db.from("disponibilidade").update(values).eq("id", id).eq("estabelecimento_id", establishmentId) : db.from("disponibilidade").insert({ ...values, estabelecimento_id: establishmentId }); const { error } = await query; if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok(id ? "Disponibilidade atualizada." : "Disponibilidade criada."); }
  async function createAvailability(data: FormData) { "use server"; return saveAvailability(data); }
  async function updateAvailability(data: FormData) { "use server"; const id = String(data.get("id") ?? ""); if (!id) return fail("Disponibilidade inválida."); return saveAvailability(data, id); }
  async function deleteAvailability(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const id = String(data.get("id") ?? ""); const { error } = await db.from("disponibilidade").delete().eq("id", id).eq("estabelecimento_id", establishmentId); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Disponibilidade excluída."); }
  async function createRelation(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const profissional_id = String(data.get("profissional_id") ?? ""), servico_id = String(data.get("servico_id") ?? ""); if (!profissional_id || !servico_id) return fail("Vínculo inválido."); const { error } = await db.from("profissional_servicos").upsert({ profissional_id, servico_id, estabelecimento_id: establishmentId }); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Vínculo criado."); }
  async function deleteRelation(data: FormData) { "use server"; const { supabase: db } = await requireTenantAdministrator(tenantSlug); const profissional_id = String(data.get("profissional_id") ?? ""), servico_id = String(data.get("servico_id") ?? ""); if (!profissional_id || !servico_id) return fail("Vínculo inválido."); const { error } = await db.from("profissional_servicos").delete().eq("profissional_id", profissional_id).eq("servico_id", servico_id).eq("estabelecimento_id", establishmentId); if (error) return fail(error.message); revalidatePath(`/${tenantSlug}/admin`); return ok("Vínculo removido."); }

  return <main><Navbar/><AdminWorkspace establishmentName={establishment.nome} reportsHref={`/${tenantSlug}/admin/relatorios`} users={(userResult.data ?? []).length}
    appointments={appointments.map((item: any) => ({ id: item.id, cliente_nome: item.cliente_nome, data: item.data, hora_inicio: item.hora_inicio, hora_fim: item.hora_fim, status: item.status as AppointmentStatus, servicoNome: relatedName(item.servicos), profissionalNome: relatedName(item.profissionais), valor: Number((Array.isArray(item.servicos) ? item.servicos[0] : item.servicos)?.valor ?? 0) }))}
    services={services.map((item: any) => ({ id: item.id, nome: item.nome, descricao: item.descricao, valor: Number(item.valor), duracao_minutos: item.duracao_minutos, ativo: item.ativo }))}
    professionals={professionals.map((item: any) => ({ id: item.id, nome: item.nome, especialidade: item.especialidade, telefone: item.telefone, foto_url: item.foto_url, ativo: item.ativo }))}
    availability={availability.map((item: any) => ({ id: item.id, profissional_id: item.profissional_id, dia_semana: item.dia_semana, hora_inicio: item.hora_inicio, hora_fim: item.hora_fim, profissionalNome: relatedName(item.profissionais) ?? "Profissional" }))}
    relations={relations.map((item: any) => ({ profissional_id: item.profissional_id, servico_id: item.servico_id, profissionalNome: relatedName(item.profissionais) ?? "Profissional", servicoNome: relatedName(item.servicos) ?? "Serviço" }))}
    createService={createServiceAction} updateService={updateServiceAction} deleteService={deleteServiceAction}
    createProfessional={createProfessionalAction} updateProfessional={updateProfessionalAction} deleteProfessional={deleteProfessionalAction}
    createAvailability={createAvailabilityAction} updateAvailability={updateAvailabilityAction} deleteAvailability={deleteAvailabilityAction}
    createRelation={createRelationAction} deleteRelation={deleteRelationAction}/></main>;
}
