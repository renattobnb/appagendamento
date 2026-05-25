import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { CalendarDays, Download, Plus } from "lucide-react";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/navbar";
import { AdminMetrics } from "@/components/dashboard/admin-metrics";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { hasSupabaseEnv } from "@/lib/config";
import { demoAppointments, demoProfessionals, demoServices } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { currency, dateBR, timeRange } from "@/lib/utils";
import { getEstablishmentBySlug } from "@/lib/establishments";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

const weekdays = [
  ["0", "Domingo"],
  ["1", "Segunda-feira"],
  ["2", "Terca-feira"],
  ["3", "Quarta-feira"],
  ["4", "Quinta-feira"],
  ["5", "Sexta-feira"],
  ["6", "Sabado"]
];

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-semibold text-foreground">{children}</label>;
}

function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const establishmentId = establishment.id;
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

  async function createEstablishment(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const nome = String(formData.get("nome") ?? "").trim();
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugify(slugInput || nome);

    if (!nome || !slug) return;

    await supabase.from("estabelecimentos").insert({ nome, slug });
    revalidatePath(`/${tenantSlug}/admin`);
    revalidatePath("/");
  }

  async function createService(formData: FormData) {
    "use server";
    const supabase = await createClient();
    await supabase.from("servicos").insert({
      nome: String(formData.get("nome") ?? "").trim(),
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      valor: Number(formData.get("valor") ?? 0),
      duracao_minutos: Number(formData.get("duracao_minutos") ?? 30),
      ativo: true,
      estabelecimento_id: establishmentId
    });
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function createProfessional(formData: FormData) {
    "use server";
    const supabase = await createClient();
    await supabase.from("profissionais").insert({
      nome: String(formData.get("nome") ?? "").trim(),
      especialidade: String(formData.get("especialidade") ?? "").trim() || null,
      foto_url: String(formData.get("foto_url") ?? "").trim() || null,
      ativo: true,
      estabelecimento_id: establishmentId
    });
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function createAvailability(formData: FormData) {
    "use server";
    const supabase = await createClient();
    await supabase.from("disponibilidade").insert({
      profissional_id: String(formData.get("profissional_id")),
      dia_semana: Number(formData.get("dia_semana")),
      hora_inicio: String(formData.get("hora_inicio")),
      hora_fim: String(formData.get("hora_fim")),
      estabelecimento_id: establishmentId
    });
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function createUser(formData: FormData) {
    "use server";
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;

    const authClient = createSupabaseJsClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const tipoUsuario = String(formData.get("tipo_usuario"));
    const profissionalId = String(formData.get("profissional_id") ?? "");

    await authClient.auth.signUp({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      options: {
        data: {
          nome: String(formData.get("nome") ?? "").trim(),
          telefone: String(formData.get("telefone") ?? "").trim(),
          tipo_usuario: tipoUsuario,
          estabelecimento_slug: tenantSlug,
          profissional_id: tipoUsuario === "profissional" ? profissionalId : undefined
        }
      }
    });

    revalidatePath(`/${tenantSlug}/admin`);
  }

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

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de profissionais</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Inclua profissionais que poderao receber agendamentos.
              </p>
            </div>
            <form action={createProfessional} className="space-y-3">
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Nome</FieldLabel>
                  <Input name="nome" placeholder="Nome do profissional" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Especialidade</FieldLabel>
                  <Input name="especialidade" placeholder="Ex: Corte feminino" />
                </div>
              </FormGrid>
              <div className="space-y-2">
                <FieldLabel>Foto</FieldLabel>
                <Input name="foto_url" placeholder="URL da foto do profissional" />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <Plus size={16} /> Cadastrar profissional
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de servicos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure valores e duracao para liberar novos horarios.
              </p>
            </div>
            <form action={createService} className="space-y-3">
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Nome</FieldLabel>
                  <Input name="nome" placeholder="Nome do servico" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Valor</FieldLabel>
                  <Input name="valor" type="number" min="0" step="0.01" placeholder="0,00" required />
                </div>
              </FormGrid>
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Duracao em minutos</FieldLabel>
                  <Input name="duracao_minutos" type="number" min="5" step="5" defaultValue="30" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Descricao</FieldLabel>
                  <Input name="descricao" placeholder="Resumo do atendimento" />
                </div>
              </FormGrid>
              <Button type="submit" className="w-full sm:w-auto">
                <Plus size={16} /> Cadastrar servico
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de usuarios</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie acessos administrativos ou vincule um login ao profissional.
              </p>
            </div>
            <form action={createUser} className="space-y-3">
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Nome</FieldLabel>
                  <Input name="nome" placeholder="Nome do usuario" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Telefone</FieldLabel>
                  <Input name="telefone" placeholder="WhatsApp" />
                </div>
              </FormGrid>
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>E-mail</FieldLabel>
                  <Input name="email" type="email" placeholder="email@empresa.com" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Senha</FieldLabel>
                  <Input name="password" type="password" minLength={6} placeholder="Senha de acesso" required />
                </div>
              </FormGrid>
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Tipo de usuario</FieldLabel>
                  <Select name="tipo_usuario" defaultValue="profissional" required>
                    <option value="profissional">Profissional</option>
                    <option value="administrador">Administrador</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Vinculo profissional</FieldLabel>
                  <Select name="profissional_id" defaultValue="">
                    <option value="">Sem vinculo</option>
                    {(professionals ?? []).map((professional) => (
                      <option key={professional.id} value={professional.id}>
                        {professional.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </FormGrid>
              <Button type="submit" className="w-full sm:w-auto">
                <Plus size={16} /> Cadastrar usuario
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de disponibilidade</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Defina os dias e horarios em que cada profissional atende.
              </p>
            </div>
            <form action={createAvailability} className="space-y-3">
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Profissional</FieldLabel>
                  <Select name="profissional_id" required defaultValue="">
                    <option value="" disabled>
                      Selecione
                    </option>
                    {(professionals ?? []).map((professional) => (
                      <option key={professional.id} value={professional.id}>
                        {professional.nome}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel>Dia da semana</FieldLabel>
                  <Select name="dia_semana" required defaultValue="1">
                    {weekdays.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </FormGrid>
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Hora inicial</FieldLabel>
                  <Input name="hora_inicio" type="time" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Hora final</FieldLabel>
                  <Input name="hora_fim" type="time" required />
                </div>
              </FormGrid>
              <Button type="submit" className="w-full sm:w-auto" disabled={(professionals ?? []).length === 0}>
                <Plus size={16} /> Cadastrar disponibilidade
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Cadastro de estabelecimento</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie uma nova empresa com link proprio para agendamentos.
              </p>
            </div>
            <form action={createEstablishment} className="space-y-3">
              <FormGrid>
                <div className="space-y-2">
                  <FieldLabel>Nome</FieldLabel>
                  <Input name="nome" placeholder="Nome do estabelecimento" required />
                </div>
                <div className="space-y-2">
                  <FieldLabel>Slug</FieldLabel>
                  <Input name="slug" placeholder="ex: barbearia-centro" />
                </div>
              </FormGrid>
              <Button type="submit" className="w-full sm:w-auto">
                <Plus size={16} /> Cadastrar estabelecimento
              </Button>
            </form>
          </Card>
        </div>

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
                      <td className="py-3">{dateBR(appointment.data)}</td>
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
