import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { ProfessionalCancelButton } from "@/components/forms/professional-cancel-button";
import { ProfessionalConfirmButton } from "@/components/forms/professional-confirm-button";
import { Navbar } from "@/components/navbar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { getEstablishmentBySlug } from "@/lib/establishments";
import { createClient } from "@/lib/supabase/server";
import { dateBR, timeRange } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ProfessionalAppointment = {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: "confirmado" | "pendente" | "cancelado" | "finalizado";
  observacoes: string | null;
  motivo_cancelamento?: string | null;
  servicos?: { nome: string | null; valor: number | null } | null;
};

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ProfessionalDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  if (!hasSupabaseEnv()) {
    redirect(`/${tenantSlug}/profissional/login`);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${tenantSlug}/profissional/login`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tipo_usuario, estabelecimento_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.tipo_usuario !== "profissional" ||
    profile.estabelecimento_id !== establishment.id
  ) {
    redirect(`/${tenantSlug}/profissional/login`);
  }

  const { data: professional } = await supabase
    .from("profissionais")
    .select("id,nome,especialidade")
    .eq("user_id", user.id)
    .eq("estabelecimento_id", establishment.id)
    .maybeSingle();

  if (!professional) {
    redirect(`/${tenantSlug}/profissional/login`);
  }

  const { data: appointments } = await supabase
    .from("agendamentos")
    .select("id,cliente_nome,cliente_telefone,data,hora_inicio,hora_fim,status,observacoes,motivo_cancelamento,servicos(nome,valor)")
    .eq("profissional_id", professional.id)
    .eq("estabelecimento_id", establishment.id)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const activeAppointments = ((appointments ?? []) as unknown as Array<
    Omit<ProfessionalAppointment, "servicos"> & {
      servicos?: ProfessionalAppointment["servicos"] | ProfessionalAppointment["servicos"][];
    }
  >)
    .map((appointment) => ({
      ...appointment,
      servicos: Array.isArray(appointment.servicos)
        ? appointment.servicos[0] ?? null
        : appointment.servicos ?? null
    }))
    .filter((appointment) => appointment.status !== "cancelado");

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold">Painel do profissional</h1>
            <p className="mt-2 text-muted-foreground">
              {professional.nome} acompanha aqui os atendimentos agendados em {establishment.nome}.
            </p>
          </div>
          <Link href={`/${tenantSlug}`}>
            <Button variant="secondary">
              <CalendarDays size={16} />
              Ver agenda publica
            </Button>
          </Link>
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Meus atendimentos</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 font-medium">Cliente</th>
                  <th className="py-3 font-medium">WhatsApp</th>
                  <th className="py-3 font-medium">Servico</th>
                  <th className="py-3 font-medium">Data</th>
                  <th className="py-3 font-medium">Horario</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Observacoes</th>
                  <th className="py-3 text-right font-medium">Acao</th>
                </tr>
              </thead>
              <tbody>
                {activeAppointments.map((appointment) => (
                  <tr key={appointment.id} className="border-b last:border-0">
                    <td className="py-3">{appointment.cliente_nome ?? "Cliente"}</td>
                    <td className="py-3">{appointment.cliente_telefone ?? "-"}</td>
                    <td className="py-3">{appointment.servicos?.nome ?? "-"}</td>
                    <td className="py-3">{dateBR(appointment.data)}</td>
                    <td className="py-3">{timeRange(appointment.hora_inicio, appointment.hora_fim)}</td>
                    <td className="py-3"><StatusBadge status={appointment.status} /></td>
                    <td className="py-3">{appointment.observacoes || "-"}</td>
                    <td className="py-3 text-right">
                      {["confirmado", "pendente"].includes(appointment.status) &&
                        new Date(`${appointment.data}T${appointment.hora_inicio}`) > new Date() && (
                          <div className="flex flex-wrap justify-end gap-2">
                            {appointment.status === "pendente" && (
                              <ProfessionalConfirmButton appointmentId={appointment.id} />
                            )}
                            <ProfessionalCancelButton appointmentId={appointment.id} />
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
                {activeAppointments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum atendimento agendado para voce.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </main>
  );
}
