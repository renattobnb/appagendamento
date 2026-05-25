import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";
import { getEstablishmentBySlug } from "@/lib/establishments";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function AdminLoginPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const establishment = await getEstablishmentBySlug(tenantSlug);

  if (!establishment) {
    notFound();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Acesso administrativo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com a conta de administrador para gerenciar {establishment.nome}.
        </p>
        <div className="mt-6">
          <AdminLoginForm tenantSlug={tenantSlug} />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Ainda nao tem acesso?{" "}
          <Link className="text-primary hover:underline" href={`/${tenantSlug}/cadastro`}>
            Criar conta administrativa
          </Link>
        </p>
      </Card>
    </main>
  );
}
