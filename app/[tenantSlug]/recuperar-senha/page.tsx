import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";
import { getEstablishmentBySlug } from "@/lib/establishments";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seu e-mail para receber as instruções de redefinição de sua conta em {establishment.nome}.
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
        <Link className="mt-5 block text-sm text-primary hover:underline" href={`/${tenantSlug}/login`}>
          Voltar ao login
        </Link>
      </Card>
    </main>
  );
}
