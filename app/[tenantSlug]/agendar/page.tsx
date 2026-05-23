import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoProfessionals, demoServices } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import { getEstablishmentBySlug } from "@/lib/establishments";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SchedulePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const [{ data: services }, { data: professionals }] = supabase
    ? await Promise.all([
        supabase
          .from("servicos")
          .select("*")
          .eq("ativo", true)
          .eq("estabelecimento_id", establishment.id)
          .order("nome"),
        supabase
          .from("profissionais")
          .select("*")
          .eq("ativo", true)
          .eq("estabelecimento_id", establishment.id)
          .order("nome")
      ])
    : [{ data: demoServices }, { data: demoProfessionals }];

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Novo agendamento</h1>
          <p className="mt-2 text-muted-foreground">
            Escolha o serviço, o profissional e um horário livre. Horários ocupados são bloqueados automaticamente.
          </p>
        </div>
        <Card>
          <AppointmentForm
            services={services ?? []}
            professionals={professionals ?? []}
            estabelecimentoId={establishment.id}
          />
        </Card>
      </section>
    </main>
  );
}
