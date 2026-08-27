import { AdminLoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";

export default function AdminMasterLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Acesso Admin Master</h1>
        <p className="mt-2 text-sm text-muted-foreground">Área exclusiva para gerenciar estabelecimentos e seus administradores.</p>
        <div className="mt-6"><AdminLoginForm tenantSlug="padrao" adminMaster /></div>
      </Card>
    </main>
  );
}
