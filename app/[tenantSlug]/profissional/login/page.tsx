import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfessionalLoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";
import { getEstablishmentBySlug } from "@/lib/establishments";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ProfessionalLoginPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Acesso do profissional</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre para visualizar apenas os seus atendimentos em {establishment.nome}.
        </p>
        <div className="mt-6">
          <ProfessionalLoginForm tenantSlug={tenantSlug} />
        </div>
        <Link className="mt-5 block text-sm text-primary hover:underline" href={`/${tenantSlug}`}>
          Voltar para a agenda
        </Link>
      </Card>
    </main>
  );
}
