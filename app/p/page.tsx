import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfessionalMagicAgenda } from "@/components/professional-magic-agenda";
import { PROFESSIONAL_ACCESS_COOKIE, resolveProfessionalAccess, touchProfessionalAccess } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fortalezaDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "01";
  const date = new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")) + offsetDays, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function ProfessionalMagicAgendaPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const [{ period }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const token = cookieStore.get(PROFESSIONAL_ACCESS_COOKIE)?.value;
  if (!token) redirect("/p/acesso-invalido");
  const access = await resolveProfessionalAccess(token);
  if (!access) redirect("/p/acesso-invalido");

  const service = createServiceClient();
  const [{ data: professional }, { data: establishment }] = await Promise.all([
    service.from("profissionais").select("nome").eq("id", access.professional_id).eq("estabelecimento_id", access.establishment_id).eq("ativo", true).maybeSingle(),
    service.from("estabelecimentos").select("nome").eq("id", access.establishment_id).maybeSingle()
  ]);
  if (!professional || !establishment) redirect("/p/acesso-invalido");

  const today = fortalezaDate(), tomorrow = fortalezaDate(1);
  const selectedPeriod = period === "tomorrow" ? "tomorrow" : period === "upcoming" ? "upcoming" : "today";
  let query = service.from("agendamentos").select("id,cliente_nome,cliente_telefone,data,hora_inicio,hora_fim,status,observacoes,servicos(nome)").eq("profissional_id", access.professional_id).eq("estabelecimento_id", access.establishment_id).order("data").order("hora_inicio");
  query = selectedPeriod === "today" ? query.eq("data", today) : selectedPeriod === "tomorrow" ? query.eq("data", tomorrow) : query.gte("data", today).limit(50);
  const [{ data, error: appointmentsError }, { data: next, error: nextAppointmentError }] = await Promise.all([
    query,
    service.from("agendamentos").select("id,cliente_nome,cliente_telefone,data,hora_inicio,hora_fim,status,observacoes,servicos(nome)").eq("profissional_id", access.professional_id).eq("estabelecimento_id", access.establishment_id).gte("data", today).in("status", ["pendente", "confirmado"]).order("data").order("hora_inicio").limit(1)
  ]);
  if (appointmentsError || nextAppointmentError) throw new Error("Não foi possível carregar os atendimentos do profissional.");
  await touchProfessionalAccess(token, access);
  const normalize = (item: any) => ({ ...item, status: item.status as AppointmentStatus, servicoNome: (Array.isArray(item.servicos) ? item.servicos[0] : item.servicos)?.nome ?? null });
  return <ProfessionalMagicAgenda professionalName={professional.nome} establishmentName={establishment.nome} appointments={(data ?? []).map(normalize)} nextAppointment={next?.[0] ? normalize(next[0]) : null} today={today} tomorrow={tomorrow}/>;
}
