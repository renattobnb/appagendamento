import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { ClientAppointmentsPanel } from "@/components/dashboard/client-appointments-panel";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { isHistoricalAppointment, isUpcomingAppointment } from "@/lib/utils";
import { getEstablishmentBySlug } from "@/lib/establishments";

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
  avaliacao_nota?: number | null;
  avaliacao_comentario?: string | null;
  avaliacao_created_at?: string | null;
  servicos?: { nome: string | null } | null;
  profissionais?: { nome: string | null } | null;
};

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ClientDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const cookieStore = await cookies();
  const guestPhone = cookieStore.get("agenda_guest")?.value
    ? decodeURIComponent(cookieStore.get("agenda_guest")!.value)
    : null;
  const supabase = hasSupabaseEnv() ? await createClient() : null;

  const appointments =
    supabase && guestPhone
      ? ((await supabase.rpc("get_guest_appointments", {
          telefone_param: guestPhone,
          estabelecimento_id_param: establishment.id
        })).data?.map((appointment: ClientAppointment) => ({
          ...appointment,
          servicos: { nome: appointment.servico_nome },
          profissionais: { nome: appointment.profissional_nome }
        })) as ClientAppointment[] | undefined)
      : demoAppointments;

  const upcoming = (appointments ?? [])
    .filter(isUpcomingAppointment)
    .toSorted((a, b) => `${a.data}T${a.hora_inicio}`.localeCompare(`${b.data}T${b.hora_inicio}`));
  const history = (appointments ?? [])
    .filter(isHistoricalAppointment)
    .toSorted((a, b) => `${b.data}T${b.hora_inicio}`.localeCompare(`${a.data}T${a.hora_inicio}`));

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel do cliente</h1>
            <p className="mt-1 text-muted-foreground">{establishment.nome}</p>
          </div>
          <Link href={`/${tenantSlug}/agendar`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><CalendarPlus size={16} /> Agendar horário</Button>
          </Link>
        </div>
        <ClientAppointmentsPanel bookingHref={`/${tenantSlug}/agendar`} upcoming={upcoming} history={history} establishmentId={establishment.id} guestPhone={guestPhone} showReviews />
      </section>
    </main>
  );
}
