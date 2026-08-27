import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarPlus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ClientAppointmentsPanel } from "@/components/dashboard/client-appointments-panel";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { isHistoricalAppointment, isUpcomingAppointment } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ClientAppointment = {
  id: string;
  servico_id?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  cliente_telefone?: string | null;
  profissional_id?: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: "confirmado" | "pendente" | "cancelado" | "finalizado";
  observacoes?: string | null;
  created_at?: string;
  servico_nome?: string | null;
  profissional_nome?: string | null;
  servicos?: { nome: string | null } | null;
  profissionais?: { nome: string | null } | null;
};

export default async function ClientDashboardPage() {
  const cookieStore = await cookies();
  const guestPhone = cookieStore.get("agenda_guest")?.value
    ? decodeURIComponent(cookieStore.get("agenda_guest")!.value)
    : null;
  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const appointments =
    supabase && user
      ? (
          await supabase
            .from("agendamentos")
            .select("*, servicos(nome), profissionais(nome)")
            .eq("cliente_id", user.id)
            .order("data", { ascending: false })
            .order("hora_inicio", { ascending: false })
        ).data
      : supabase && guestPhone
        ? (
            await supabase.rpc("get_guest_appointments", {
              telefone_param: guestPhone
            })
          ).data?.map((appointment: ClientAppointment) => ({
            ...appointment,
            servicos: { nome: appointment.servico_nome },
            profissionais: { nome: appointment.profissional_nome }
          })) as ClientAppointment[] | undefined
        : demoAppointments;

  const upcoming = (appointments ?? []).filter(isUpcomingAppointment).toSorted((a, b) => `${a.data}T${a.hora_inicio}`.localeCompare(`${b.data}T${b.hora_inicio}`));
  const history = (appointments ?? []).filter(isHistoricalAppointment).toSorted((a, b) => `${b.data}T${b.hora_inicio}`.localeCompare(`${a.data}T${a.hora_inicio}`));

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold">Painel do cliente</h1>
            <p className="mt-1 text-muted-foreground">Acompanhe seus horários e atendimentos.</p>
          </div>
          <Link href="/agendar" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><CalendarPlus size={16} /> Agendar horário</Button>
          </Link>
        </div>
        <ClientAppointmentsPanel bookingHref="/agendar" upcoming={upcoming} history={history} />
      </section>
    </main>
  );
}
