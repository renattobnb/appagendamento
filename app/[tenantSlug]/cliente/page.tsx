import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { CancelAppointmentButton } from "@/components/forms/cancel-appointment-button";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { timeRange } from "@/lib/utils";
import { getEstablishmentBySlug } from "@/lib/establishments";

export const dynamic = "force-dynamic";

function isFutureAppointment(appointment: { data: string; hora_inicio: string }) {
  return new Date(`${appointment.data}T${appointment.hora_inicio}`) > new Date();
}

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
      ? (
          await supabase.rpc("get_guest_appointments", {
            telefone_param: guestPhone,
            estabelecimento_id_param: establishment.id
          })
        ).data?.map((appointment: ClientAppointment) => ({
          ...appointment,
          servicos: { nome: appointment.servico_nome },
          profissionais: { nome: appointment.profissional_nome }
        })) as ClientAppointment[] | undefined
      : demoAppointments;

  const upcoming = (appointments ?? []).filter(
    (appointment) =>
      ["confirmado", "pendente"].includes(appointment.status) &&
      isFutureAppointment(appointment)
  );

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold">Painel do cliente</h1>
            <p className="mt-2 text-muted-foreground">Acompanhe próximos horários e histórico em {establishment.nome}.</p>
          </div>
          <Link href={`/${tenantSlug}/agendar`}>
            <Button><CalendarPlus size={16} /> Novo agendamento</Button>
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <h2 className="text-lg font-semibold">Próximos agendamentos</h2>
            <div className="mt-4 space-y-3">
              {upcoming.slice(0, 4).map((appointment) => (
                <div key={appointment.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{appointment.servicos?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.data} - {timeRange(appointment.hora_inicio, appointment.hora_fim)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={appointment.status} />
                      {["confirmado", "pendente"].includes(appointment.status) &&
                        isFutureAppointment(appointment) && (
                          <CancelAppointmentButton
                            appointmentId={appointment.id}
                            estabelecimentoId={establishment.id}
                          />
                        )}
                    </div>
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Você ainda não tem próximos agendamentos.
                </p>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Histórico</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 font-medium">Serviço</th>
                    <th className="py-3 font-medium">Profissional</th>
                    <th className="py-3 font-medium">Data</th>
                    <th className="py-3 font-medium">Horário</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(appointments ?? []).map((appointment) => (
                    <tr key={appointment.id} className="border-b last:border-0">
                      <td className="py-3">{appointment.servicos?.nome}</td>
                      <td className="py-3">{appointment.profissionais?.nome}</td>
                      <td className="py-3">{appointment.data}</td>
                      <td className="py-3">{timeRange(appointment.hora_inicio, appointment.hora_fim)}</td>
                      <td className="py-3"><StatusBadge status={appointment.status} /></td>
                    </tr>
                  ))}
                  {(appointments ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum agendamento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
