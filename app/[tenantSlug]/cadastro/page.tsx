import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";
import { getEstablishmentBySlug } from "@/lib/establishments";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function SignupPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre-se para gerenciar serviços online em {establishment.nome}.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link className="text-primary hover:underline" href={`/${tenantSlug}/login`}>
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  );
}
