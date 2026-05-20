import Link from "next/link";
import { cookies } from "next/headers";
import { CalendarPlus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { timeRange } from "@/lib/utils";

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

  const upcoming = (appointments ?? []).filter((appointment) =>
    ["confirmado", "pendente"].includes(appointment.status)
  );

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold">Painel do cliente</h1>
            <p className="mt-2 text-muted-foreground">Acompanhe proximos horarios e historico.</p>
          </div>
          <Link href="/agendar">
            <Button><CalendarPlus size={16} /> Novo agendamento</Button>
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <h2 className="text-lg font-semibold">Proximos agendamentos</h2>
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
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Voce ainda nao tem proximos agendamentos.
                </p>
              )}
            </div>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Historico</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 font-medium">Servico</th>
                    <th className="py-3 font-medium">Profissional</th>
                    <th className="py-3 font-medium">Data</th>
                    <th className="py-3 font-medium">Horario</th>
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
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
