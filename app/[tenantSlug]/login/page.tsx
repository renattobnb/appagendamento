import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";
import { getEstablishmentBySlug } from "@/lib/establishments";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function LoginPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Agendar atendimento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seu nome e WhatsApp para continuar em {establishment.nome}. Sem senha, sem complicação.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-44 animate-pulse rounded-lg bg-muted" />}>
            <LoginForm />
          </Suspense>
        </div>
      </Card>
    </main>
  );
}
