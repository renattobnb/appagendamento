import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CalendarDays, Download, Plus, Save, Trash2 } from "lucide-react";
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
import type { Database } from "@/types/database";

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

type AvailabilityRow = Database["public"]["Tables"]["disponibilidade"]["Row"] & {
  profissionais?: { nome: string | null } | { nome: string | null }[] | null;
};

type EstablishmentRow = Database["public"]["Tables"]["estabelecimentos"]["Row"];
type ProfessionalServiceRow = Database["public"]["Tables"]["profissional_servicos"]["Row"] & {
  profissionais?: { nome: string | null } | { nome: string | null }[] | null;
  servicos?: { nome: string | null } | { nome: string | null }[] | null;
};

function relatedProfessionalName(availability: AvailabilityRow) {
  const professional = Array.isArray(availability.profissionais)
    ? availability.profissionais[0]
    : availability.profissionais;

  return professional?.nome ?? "Profissional";
}

function relationName<T extends { nome: string | null }>(
  value: T | T[] | null | undefined,
  fallback: string
) {
  const item = Array.isArray(value) ? value[0] : value;
  return item?.nome ?? fallback;
}

export default async function AdminDashboardPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const establishmentId = establishment.id;
  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const [
    { data: appointments },
    { data: services },
    { data: professionals },
    { data: users },
    { data: availability },
    { data: establishments },
    { data: professionalServices }
  ] =
    supabase
      ? await Promise.all([
          supabase
            .from("agendamentos")
            .select("*, servicos(nome, valor), profissionais(nome)")
            .eq("estabelecimento_id", establishment.id)
            .order("data", { ascending: true }),
          supabase.from("servicos").select("*").eq("estabelecimento_id", establishment.id).order("nome"),
          supabase.from("profissionais").select("*").eq("estabelecimento_id", establishment.id).order("nome"),
          supabase.from("users").select("*").eq("estabelecimento_id", establishment.id).order("created_at", { ascending: false }),
          supabase
            .from("disponibilidade")
            .select("*, profissionais(nome)")
            .eq("estabelecimento_id", establishment.id)
            .order("dia_semana", { ascending: true })
            .order("hora_inicio", { ascending: true }),
          supabase.from("estabelecimentos").select("*").order("nome"),
          supabase
            .from("profissional_servicos")
            .select("*, profissionais(nome), servicos(nome)")
            .eq("estabelecimento_id", establishment.id)
            .order("created_at", { ascending: false })
        ])
      : [
          { data: demoAppointments },
          { data: demoServices },
          { data: demoProfessionals },
          { data: [{ id: "demo", nome: "Cliente Demo" }] },
          { data: [] },
          { data: [establishment] },
          { data: [] }
        ];
  const availabilityRows = (availability ?? []) as AvailabilityRow[];
  const establishmentRows = (establishments ?? []) as EstablishmentRow[];
  const professionalServiceRows = (professionalServices ?? []) as ProfessionalServiceRow[];

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

  async function createProfessionalService(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const profissionalId = String(formData.get("profissional_id") ?? "");
    const servicoId = String(formData.get("servico_id") ?? "");

    if (!profissionalId || !servicoId) return;

    await supabase.from("profissional_servicos").upsert({
      profissional_id: profissionalId,
      servico_id: servicoId,
      estabelecimento_id: establishmentId
    });
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function deleteProfessionalService(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const profissionalId = String(formData.get("profissional_id") ?? "");
    const servicoId = String(formData.get("servico_id") ?? "");

    if (!profissionalId || !servicoId) return;

    await supabase
      .from("profissional_servicos")
      .delete()
      .eq("profissional_id", profissionalId)
      .eq("servico_id", servicoId)
      .eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function updateEstablishment(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");
    const nome = String(formData.get("nome") ?? "").trim();
    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugify(slugInput || nome);

    if (!id || !nome || !slug) return;

    await supabase.from("estabelecimentos").update({ nome, slug }).eq("id", id);
    revalidatePath(`/${tenantSlug}/admin`);
    revalidatePath("/");
  }

  async function deleteEstablishment(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id || id === establishmentId) return;

    await supabase.from("estabelecimentos").delete().eq("id", id);
    revalidatePath(`/${tenantSlug}/admin`);
    revalidatePath("/");
  }

  async function updateService(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase
      .from("servicos")
      .update({
        nome: String(formData.get("nome") ?? "").trim(),
        descricao: String(formData.get("descricao") ?? "").trim() || null,
        valor: Number(formData.get("valor") ?? 0),
        duracao_minutos: Number(formData.get("duracao_minutos") ?? 30),
        ativo: String(formData.get("ativo")) === "true"
      })
      .eq("id", id)
      .eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function deleteService(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase.from("servicos").delete().eq("id", id).eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function updateProfessional(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase
      .from("profissionais")
      .update({
        nome: String(formData.get("nome") ?? "").trim(),
        especialidade: String(formData.get("especialidade") ?? "").trim() || null,
        foto_url: String(formData.get("foto_url") ?? "").trim() || null,
        ativo: String(formData.get("ativo")) === "true"
      })
      .eq("id", id)
      .eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function deleteProfessional(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase.from("profissionais").delete().eq("id", id).eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function updateAvailability(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase
      .from("disponibilidade")
      .update({
        profissional_id: String(formData.get("profissional_id")),
        dia_semana: Number(formData.get("dia_semana")),
        hora_inicio: String(formData.get("hora_inicio")),
        hora_fim: String(formData.get("hora_fim"))
      })
      .eq("id", id)
      .eq("estabelecimento_id", establishmentId);
    revalidatePath(`/${tenantSlug}/admin`);
  }

  async function deleteAvailability(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const id = String(formData.get("id") ?? "");

    if (!id) return;

    await supabase.from("disponibilidade").delete().eq("id", id).eq("estabelecimento_id", establishmentId);
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
          </div>
        </div>

        <AdminMetrics
          appointments={appointments?.length ?? 0}
          revenue={revenue}
          services={(services ?? []).filter((service) => service.ativo).length}
          professionals={(professionals ?? []).filter((professional) => professional.ativo).length}
        />

        <div className="mt-6 space-y-5">
          <Card>
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Servicos cadastrados</h2>
                <p className="text-sm text-muted-foreground">Altere valores, duracao e status dos servicos.</p>
              </div>
              <span className="text-sm text-muted-foreground">{services?.length ?? 0} registros</span>
            </div>
            <form
              action={createService}
              className="mb-3 grid gap-3 rounded-lg border border-dashed p-3 xl:grid-cols-[1.1fr_0.8fr_0.45fr_0.45fr_auto]"
            >
              <Input name="nome" placeholder="Novo servico" aria-label="Novo servico" required />
              <Input name="descricao" placeholder="Descricao" aria-label="Descricao do novo servico" />
              <Input name="valor" type="number" min="0" step="0.01" placeholder="Valor" aria-label="Valor" required />
              <Input
                name="duracao_minutos"
                type="number"
                min="5"
                step="5"
                defaultValue="30"
                aria-label="Duracao"
                required
              />
              <Button type="submit" title="Cadastrar servico">
                <Plus size={16} /> Adicionar
              </Button>
            </form>
            <div className="space-y-3">
              {(services ?? []).map((service) => (
                <div key={service.id} className="rounded-lg border p-3">
                  <form action={updateService} className="grid gap-3 xl:grid-cols-[1.1fr_0.8fr_0.45fr_0.45fr_0.5fr_auto]">
                    <input type="hidden" name="id" value={service.id} />
                    <Input name="nome" defaultValue={service.nome} aria-label="Nome do servico" required />
                    <Input name="descricao" defaultValue={service.descricao ?? ""} aria-label="Descricao" placeholder="Descricao" />
                    <Input name="valor" type="number" min="0" step="0.01" defaultValue={service.valor} aria-label="Valor" required />
                    <Input
                      name="duracao_minutos"
                      type="number"
                      min="5"
                      step="5"
                      defaultValue={service.duracao_minutos}
                      aria-label="Duracao"
                      required
                    />
                    <Select name="ativo" defaultValue={String(service.ativo)} aria-label="Status do servico">
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </Select>
                    <Button type="submit" className="w-full xl:w-11" title="Salvar servico">
                      <Save size={16} />
                    </Button>
                  </form>
                  <form action={deleteService} className="mt-2 flex justify-end">
                    <input type="hidden" name="id" value={service.id} />
                    <Button type="submit" variant="danger" title="Excluir servico">
                      <Trash2 size={16} /> Excluir
                    </Button>
                  </form>
                </div>
              ))}
              {(services ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum servico cadastrado.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Servicos por profissional</h2>
                <p className="text-sm text-muted-foreground">
                  Defina quais servicos cada profissional pode atender.
                </p>
              </div>
              <span className="text-sm text-muted-foreground">{professionalServiceRows.length} vinculos</span>
            </div>
            <form
              action={createProfessionalService}
              className="mb-3 grid gap-3 rounded-lg border border-dashed p-3 lg:grid-cols-[1fr_1fr_auto]"
            >
              <Select name="profissional_id" required defaultValue="" aria-label="Profissional">
                <option value="" disabled>
                  Profissional
                </option>
                {(professionals ?? []).map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.nome}
                  </option>
                ))}
              </Select>
              <Select name="servico_id" required defaultValue="" aria-label="Servico">
                <option value="" disabled>
                  Servico
                </option>
                {(services ?? []).map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.nome}
                  </option>
                ))}
              </Select>
              <Button type="submit" disabled={(professionals ?? []).length === 0 || (services ?? []).length === 0}>
                <Plus size={16} /> Vincular
              </Button>
            </form>
            <div className="space-y-3">
              {professionalServiceRows.map((link) => (
                <div
                  key={`${link.profissional_id}-${link.servico_id}`}
                  className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium">{relationName(link.profissionais, "Profissional")}</p>
                    <p className="text-sm text-muted-foreground">
                      {relationName(link.servicos, "Servico")}
                    </p>
                  </div>
                  <form action={deleteProfessionalService}>
                    <input type="hidden" name="profissional_id" value={link.profissional_id} />
                    <input type="hidden" name="servico_id" value={link.servico_id} />
                    <Button type="submit" variant="danger">
                      <Trash2 size={16} /> Remover vinculo
                    </Button>
                  </form>
                </div>
              ))}
              {professionalServiceRows.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum vinculo entre profissional e servico cadastrado.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Profissionais cadastrados</h2>
                <p className="text-sm text-muted-foreground">Gerencie dados e disponibilidade dos profissionais.</p>
              </div>
              <span className="text-sm text-muted-foreground">{professionals?.length ?? 0} registros</span>
            </div>
            <form
              action={createProfessional}
              className="mb-3 grid gap-3 rounded-lg border border-dashed p-3 xl:grid-cols-[1fr_0.8fr_1fr_auto]"
            >
              <Input name="nome" placeholder="Novo profissional" aria-label="Novo profissional" required />
              <Input name="especialidade" placeholder="Especialidade" aria-label="Especialidade" />
              <Input name="foto_url" placeholder="URL da foto" aria-label="Foto" />
              <Button type="submit" title="Cadastrar profissional">
                <Plus size={16} /> Adicionar
              </Button>
            </form>
            <div className="space-y-3">
              {(professionals ?? []).map((professional) => (
                <div key={professional.id} className="rounded-lg border p-3">
                  <form action={updateProfessional} className="grid gap-3 xl:grid-cols-[1fr_0.8fr_1fr_0.45fr_auto]">
                    <input type="hidden" name="id" value={professional.id} />
                    <Input name="nome" defaultValue={professional.nome} aria-label="Nome do profissional" required />
                    <Input
                      name="especialidade"
                      defaultValue={professional.especialidade ?? ""}
                      aria-label="Especialidade"
                      placeholder="Especialidade"
                    />
                    <Input name="foto_url" defaultValue={professional.foto_url ?? ""} aria-label="Foto" placeholder="URL da foto" />
                    <Select name="ativo" defaultValue={String(professional.ativo)} aria-label="Status do profissional">
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </Select>
                    <Button type="submit" className="w-full xl:w-11" title="Salvar profissional">
                      <Save size={16} />
                    </Button>
                  </form>
                  <form action={deleteProfessional} className="mt-2 flex justify-end">
                    <input type="hidden" name="id" value={professional.id} />
                    <Button type="submit" variant="danger" title="Excluir profissional">
                      <Trash2 size={16} /> Excluir
                    </Button>
                  </form>
                </div>
              ))}
              {(professionals ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum profissional cadastrado.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Disponibilidades cadastradas</h2>
                <p className="text-sm text-muted-foreground">Controle os dias e horarios de atendimento.</p>
              </div>
              <span className="text-sm text-muted-foreground">{availabilityRows.length} registros</span>
            </div>
            <form
              action={createAvailability}
              className="mb-3 grid gap-3 rounded-lg border border-dashed p-3 xl:grid-cols-[1fr_0.7fr_0.45fr_0.45fr_auto]"
            >
              <Select name="profissional_id" required defaultValue="" aria-label="Profissional">
                <option value="" disabled>
                  Profissional
                </option>
                {(professionals ?? []).map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.nome}
                  </option>
                ))}
              </Select>
              <Select name="dia_semana" required defaultValue="1" aria-label="Dia da semana">
                {weekdays.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input name="hora_inicio" type="time" aria-label="Hora inicial" required />
              <Input name="hora_fim" type="time" aria-label="Hora final" required />
              <Button type="submit" disabled={(professionals ?? []).length === 0} title="Cadastrar disponibilidade">
                <Plus size={16} /> Adicionar
              </Button>
            </form>
            <div className="space-y-3">
              {availabilityRows.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <form action={updateAvailability} className="grid gap-3 xl:grid-cols-[1fr_0.7fr_0.45fr_0.45fr_auto]">
                    <input type="hidden" name="id" value={item.id} />
                    <Select name="profissional_id" defaultValue={item.profissional_id} aria-label="Profissional" required>
                      {(professionals ?? []).map((professional) => (
                        <option key={professional.id} value={professional.id}>
                          {professional.nome}
                        </option>
                      ))}
                    </Select>
                    <Select name="dia_semana" defaultValue={String(item.dia_semana)} aria-label="Dia da semana" required>
                      {weekdays.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Input name="hora_inicio" type="time" defaultValue={item.hora_inicio} aria-label="Hora inicial" required />
                    <Input name="hora_fim" type="time" defaultValue={item.hora_fim} aria-label="Hora final" required />
                    <Button type="submit" className="w-full xl:w-11" title="Salvar disponibilidade">
                      <Save size={16} />
                    </Button>
                  </form>
                  <div className="mt-2 flex flex-col justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
                    <span>{relatedProfessionalName(item)} atende neste horario.</span>
                    <form action={deleteAvailability}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button type="submit" variant="danger" title="Excluir disponibilidade">
                        <Trash2 size={16} /> Excluir
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {availabilityRows.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhuma disponibilidade cadastrada.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Estabelecimentos cadastrados</h2>
                <p className="text-sm text-muted-foreground">Altere nome e link das empresas cadastradas.</p>
              </div>
              <span className="text-sm text-muted-foreground">{establishmentRows.length} registros</span>
            </div>
            <form
              action={createEstablishment}
              className="mb-3 grid gap-3 rounded-lg border border-dashed p-3 lg:grid-cols-[1fr_0.8fr_auto]"
            >
              <Input name="nome" placeholder="Novo estabelecimento" aria-label="Novo estabelecimento" required />
              <Input name="slug" placeholder="slug-da-url" aria-label="Slug" />
              <Button type="submit" title="Cadastrar estabelecimento">
                <Plus size={16} /> Adicionar
              </Button>
            </form>
            <div className="space-y-3">
              {establishmentRows.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <form action={updateEstablishment} className="grid gap-3 lg:grid-cols-[1fr_0.8fr_auto]">
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="nome" defaultValue={item.nome} aria-label="Nome do estabelecimento" required />
                    <Input name="slug" defaultValue={item.slug} aria-label="Slug do estabelecimento" required />
                    <Button type="submit" className="w-full lg:w-11" title="Salvar estabelecimento">
                      <Save size={16} />
                    </Button>
                  </form>
                  <div className="mt-2 flex flex-col justify-between gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
                    <span>{item.id === establishmentId ? "Estabelecimento atual" : `/${item.slug}`}</span>
                    <form action={deleteEstablishment}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button
                        type="submit"
                        variant="danger"
                        disabled={item.id === establishmentId}
                        title="Excluir estabelecimento"
                      >
                        <Trash2 size={16} /> Excluir
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
              {establishmentRows.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum estabelecimento cadastrado.
                </p>
              )}
            </div>
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
                  ["Horários", availabilityRows.length]
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
