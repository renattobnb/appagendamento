import Link from "next/link";
import { SignupForm } from "@/components/forms/auth-forms";
import { Card } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre-se como cliente para reservar servicos online.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Ja tem conta?{" "}
          <Link className="text-primary hover:underline" href="/login">
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  );
}
