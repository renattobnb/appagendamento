import { notFound } from "next/navigation";
import { CalendarDays, Download, Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AdminMetrics } from "@/components/dashboard/admin-metrics";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments, demoProfessionals, demoServices } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { currency, timeRange } from "@/lib/utils";
import { getEstablishmentBySlug } from "@/lib/establishments";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const [{ data: appointments }, { data: services }, { data: professionals }, { data: users }] =
    supabase
      ? await Promise.all([
          supabase
            .from("agendamentos")
            .select("*, servicos(nome, valor), profissionais(nome)")
            .eq("estabelecimento_id", establishment.id)
            .order("data", { ascending: true }),
          supabase.from("servicos").select("*").eq("estabelecimento_id", establishment.id).order("nome"),
          supabase.from("profissionais").select("*").eq("estabelecimento_id", establishment.id).order("nome"),
          supabase.from("users").select("*").eq("estabelecimento_id", establishment.id).order("created_at", { ascending: false })
        ])
      : [
          { data: demoAppointments },
          { data: demoServices },
          { data: demoProfessionals },
          { data: [{ id: "demo", nome: "Cliente Demo" }] }
        ];

  const confirmed = (appointments ?? []).filter((item) => item.status !== "cancelado");
  const revenue = confirmed.reduce((sum, item) => sum + Number(item.servicos?.valor ?? 0), 0);
  const serviceRanking = (services ?? [])
    .map((service) => ({
      ...service,
      total: (appointments ?? []).filter((item) => item.servico_id === service.id).length
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold">Painel administrativo</h1>
            <p className="mt-2 text-muted-foreground">
              Controle agenda, usuários, profissionais, serviços e indicadores de {establishment.nome}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary"><Download size={16} /> Exportar</Button>
            <Button><Plus size={16} /> Novo item</Button>
          </div>
        </div>

        <AdminMetrics
          appointments={appointments?.length ?? 0}
          revenue={revenue}
          services={(services ?? []).filter((service) => service.ativo).length}
          professionals={(professionals ?? []).filter((professional) => professional.ativo).length}
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Calendário administrativo</h2>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays size={16} /> Visão operacional
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 font-medium">Cliente</th>
                    <th className="py-3 font-medium">Serviço</th>
                    <th className="py-3 font-medium">Profissional</th>
                    <th className="py-3 font-medium">Data</th>
                    <th className="py-3 font-medium">Horário</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(appointments ?? []).slice(0, 12).map((appointment) => (
                    <tr key={appointment.id} className="border-b last:border-0">
                      <td className="py-3">{appointment.cliente_nome ?? "Visitante"}</td>
                      <td className="py-3">{appointment.servicos?.nome}</td>
                      <td className="py-3">{appointment.profissionais?.nome}</td>
                      <td className="py-3">{appointment.data}</td>
                      <td className="py-3">{timeRange(appointment.hora_inicio, appointment.hora_fim)}</td>
                      <td className="py-3"><StatusBadge status={appointment.status} /></td>
                    </tr>
                  ))}
                  {(appointments ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum agendamento registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <h2 className="text-lg font-semibold">Serviços mais utilizados</h2>
              <div className="mt-4 space-y-3">
                {serviceRanking.slice(0, 5).map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{service.nome}</p>
                      <p className="text-sm text-muted-foreground">{currency(service.valor)}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm">{service.total}</span>
                  </div>
                ))}
                {serviceRanking.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">Nenhum serviço disponível.</p>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold">CRUDs essenciais</h2>
              <div className="mt-4 grid gap-3">
                {[
                  ["Serviços", services?.length ?? 0],
                  ["Profissionais", professionals?.length ?? 0],
                  ["Administradores", users?.length ?? 0],
                  ["Horários", "disponibilidade"]
                ].map(([label, value]) => (
                  <button
                    key={label}
                    className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted"
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">{value}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
