import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AppointmentForm } from "@/components/forms/appointment-form";
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
          .select("*, profissional_servicos(servico_id)")
          .eq("ativo", true)
          .eq("estabelecimento_id", establishment.id)
          .order("nome")
      ])
    : [{ data: demoServices }, { data: demoProfessionals }];

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-col gap-2 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Novo agendamento</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Escolha o serviço, o profissional e um horário livre.
            </p>
          </div>
          <Link href={`/${tenantSlug}/cliente`} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Meus agendamentos
          </Link>
        </div>
        <AppointmentForm services={services ?? []} professionals={professionals ?? []} estabelecimentoId={establishment.id} />
      </section>
    </main>
  );
}
