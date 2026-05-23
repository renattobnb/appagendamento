import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoServices } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { currency } from "@/lib/utils";
import { getEstablishmentBySlug } from "@/lib/establishments";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const services = hasSupabaseEnv()
    ? (
        await (await createClient())
          .from("servicos")
          .select("*")
          .eq("ativo", true)
          .eq("estabelecimento_id", establishment.id)
          .limit(6)
      ).data
    : demoServices;
  const serviceList = services ?? [];

  return (
    <main>
      <Navbar />
      <section className="border-b">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
              Agenda inteligente - {establishment.nome}
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              Agendamentos simples para {establishment.nome}.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
              Clientes escolhem serviço, profissional, data e horário em poucos cliques. Sua equipe acompanha tudo em um painel seguro com Supabase.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${tenantSlug}/agendar`}>
                <Button className="w-full sm:w-auto">
                  Agendamento rápido <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="flex items-center gap-2"><ShieldCheck size={16} /> RLS e permissões</span>
              <span className="flex items-center gap-2"><CalendarClock size={16} /> Calendário em tempo real</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Confirmação automática</span>
            </div>
          </div>
          <div className="surface rounded-lg border p-4 shadow-soft">
            <div className="rounded-lg bg-[linear-gradient(135deg,rgba(20,184,166,.20),rgba(249,115,22,.18)),url('/hero-pattern.svg')] p-5">
              <div className="grid gap-3">
                {["09:00", "10:30", "14:00", "16:15"].map((hour, index) => (
                  <div key={hour} className="flex items-center justify-between rounded-lg border bg-background/85 p-4">
                    <div>
                      <p className="font-semibold">{hour}</p>
                      <p className="text-sm text-muted-foreground">
                        {index % 2 ? "Consulta de avaliação" : "Atendimento especializado"}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      Disponível
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold">Serviços disponíveis</h2>
            <p className="mt-2 text-muted-foreground">Um catálogo claro para acelerar a decisão do cliente.</p>
          </div>
          <Link href={`/${tenantSlug}/agendar`}>
            <Button variant="secondary">Escolher horário</Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((service) => (
            <Card key={service.id}>
              <h3 className="text-lg font-semibold">{service.nome}</h3>
              <p className="mt-2 min-h-12 text-sm text-muted-foreground">{service.descricao}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-bold">{currency(service.valor)}</span>
                <span className="rounded-full bg-muted px-3 py-1 text-sm">{service.duracao_minutos} min</span>
              </div>
            </Card>
          ))}
          {serviceList.length === 0 && (
            <p className="text-muted-foreground col-span-full py-8 text-center">Nenhum serviço disponível no momento.</p>
          )}
        </div>
      </section>
    </main>
  );
}
