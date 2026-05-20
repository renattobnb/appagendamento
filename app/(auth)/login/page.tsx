import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesse sua agenda, acompanhe horarios e gerencie seus atendimentos.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-44 animate-pulse rounded-lg bg-muted" />}>
            <LoginForm />
          </Suspense>
        </div>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link className="text-primary hover:underline" href="/cadastro">
            Criar conta
          </Link>
          <Link className="text-muted-foreground hover:text-primary" href="/recuperar-senha">
            Esqueci minha senha
          </Link>
        </div>
      </Card>
    </main>
  );
}
