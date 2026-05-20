import { Navbar } from "@/components/navbar";
import { AppointmentForm } from "@/components/forms/appointment-form";
import { Card } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/config";
import { demoProfessionals, demoServices } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = hasSupabaseEnv() ? await createClient() : null;
  const [{ data: services }, { data: professionals }] = supabase
    ? await Promise.all([
        supabase.from("servicos").select("*").eq("ativo", true).order("nome"),
        supabase.from("profissionais").select("*").eq("ativo", true).order("nome")
      ])
    : [{ data: demoServices }, { data: demoProfessionals }];

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Novo agendamento</h1>
          <p className="mt-2 text-muted-foreground">
            Escolha o servico, o profissional e um horario livre. Horarios ocupados sao bloqueados automaticamente.
          </p>
        </div>
        <Card>
          <AppointmentForm services={services ?? []} professionals={professionals ?? []} />
        </Card>
      </section>
    </main>
  );
}
