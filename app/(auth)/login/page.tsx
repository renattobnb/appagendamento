import { Suspense } from "react";
import { LoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Agendar atendimento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seu nome e WhatsApp para continuar. Sem senha, sem complicacao.
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
